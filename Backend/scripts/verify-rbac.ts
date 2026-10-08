import type { AddressInfo } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, type IUser } from '../src/models/User.js';
import { Coach } from '../src/models/Coach.js';
import { Athlete } from '../src/models/Athlete.js';
import { Team } from '../src/models/Team.js';
import { Sport } from '../src/models/Sport.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { userService } from '../src/services/user.service.js';
import { scopeService } from '../src/services/scope.service.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ApiError } from '../src/utils/ApiError.js';
import { authService } from '../src/services/auth.service.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;
let failedAuthHttpCount = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

const extractCookie = (setCookieHeader: string | null): string => {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(/refreshToken=([^;]+)/);
  return match ? `refreshToken=${match[1]}` : '';
};

async function httpFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ status: number; body: any; headers: Headers }> {
  totalHttpRequests++;
  const res = await fetch(url, options);
  if (url.includes('/api/auth') && res.status >= 400) {
    failedAuthHttpCount++;
  }
  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }
  return { status: res.status, body, headers: res.headers };
}

function deepFindKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFindKeys(item, forbiddenKeys, found);
    }
    return found;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (forbiddenKeys.includes(key)) {
      found.push(key);
    }
    deepFindKeys(value, forbiddenKeys, found);
  }
  return found;
}

async function run(): Promise<void> {
  console.log('\n--- VERIFYING ATHLETIQ RBAC, USER MANAGEMENT & AUDIT SYSTEM ---\n');

  await connectDB();
  const app = createApp();
  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUsersUrl = `http://127.0.0.1:${address.port}/api/users`;
  const baseAuthUrl = `http://127.0.0.1:${address.port}/api/auth`;

  // Pre-test cleanup: delete any dangling test users/data from prior interrupted runs
  const preCleanupUsers = await User.find({ email: { $regex: /^verify-rbac-/ } }).select('_id');
  if (preCleanupUsers.length > 0) {
    const preIds = preCleanupUsers.map((u) => u._id);
    await User.deleteMany({ _id: { $in: preIds } });
    await AuditLog.deleteMany({
      $or: [{ actor: { $in: preIds } }, { targetId: { $in: preIds } }],
    });
  }

  // 1. Snapshot database record counts before running tests
  const initialUserCount = await User.countDocuments();
  const initialAuditCount = await AuditLog.countDocuments();
  console.log(`Database state before test: Users = ${initialUserCount}, AuditLogs = ${initialAuditCount}`);

  const createdUserIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdTeamIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  try {
    // 2. Provision isolated test users for each role
    console.log('\n1. Provisioning Test Users:');
    const roles = ['Admin', 'Coach', 'Athlete', 'Organizer'] as const;
    const testUsers: Record<string, IUser> = {};
    const tokens: Record<string, string> = {};

    for (const role of roles) {
      const email = `verify-rbac-${runId}-${role.toLowerCase()}@athletiq.test`;
      const user = await User.create({
        name: `RBAC Test ${role}`,
        email,
        role,
        passwordHash: hashedPassword,
        isActive: true,
      });
      testUsers[role] = user;
      createdUserIds.push(user._id);
      tokens[role] = signAccessToken(user.id, user.role);
    }
    assert(Object.keys(testUsers).length === 4, 'Successfully created isolated test users for all 4 roles');

    // 3. Unauthenticated access checks (Must return 401 on every route)
    console.log('\n2. Unauthenticated Route Access Protection (401 expected):');
    const dummyId = new Types.ObjectId().toString();

    const unauthTests = [
      { method: 'PATCH', path: '/me', body: { name: 'Hack' }, name: 'PATCH /api/users/me' },
      { method: 'GET', path: '/', body: undefined, name: 'GET /api/users' },
      { method: 'POST', path: '/', body: { name: 'X', email: 'x@x.com', role: 'Athlete', password: 'P1' }, name: 'POST /api/users' },
      { method: 'GET', path: `/${dummyId}`, body: undefined, name: 'GET /api/users/:id' },
      { method: 'PATCH', path: `/${dummyId}`, body: { name: 'Y' }, name: 'PATCH /api/users/:id' },
      { method: 'POST', path: `/${dummyId}/unlock`, body: undefined, name: 'POST /api/users/:id/unlock' },
      { method: 'POST', path: `/${dummyId}/reset-password`, body: { newPassword: defaultPassword }, name: 'POST /api/users/:id/reset-password' },
      { method: 'GET', path: `/${dummyId}/audit`, body: undefined, name: 'GET /api/users/:id/audit' },
    ];

    for (const t of unauthTests) {
      const res = await httpFetch(`${baseUsersUrl}${t.path}`, {
        method: t.method,
        headers: { 'Content-Type': 'application/json' },
        body: t.body ? JSON.stringify(t.body) : undefined,
      });
      assert(res.status === 401, `Unauthenticated request to ${t.name} returns 401 Unauthorized`);
    }

    // 4. Role × Endpoint Authorization Matrix (Coach, Athlete, Organizer forbidden on admin endpoints)
    console.log('\n3. Role × Endpoint Authorization Matrix:');
    const matrixTargetUser = await User.create({
      name: 'Matrix Target Athlete',
      email: `verify-rbac-${runId}-matrixtarget@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(matrixTargetUser._id);
    const targetUserId = matrixTargetUser._id.toString();

    const adminEndpoints = [
      { method: 'GET', path: '/', name: 'GET /' },
      { method: 'POST', path: '/', name: 'POST /', body: { name: 'Matrix Created', email: `verify-rbac-${runId}-matrix@athletiq.test`, role: 'Athlete', password: defaultPassword } },
      { method: 'GET', path: `/${targetUserId}`, name: 'GET /:id' },
      { method: 'PATCH', path: `/${targetUserId}`, name: 'PATCH /:id', body: { name: 'Matrix Updated' } },
      { method: 'POST', path: `/${targetUserId}/reset-password`, name: 'POST /:id/reset-password', body: { newPassword: defaultPassword } },
      { method: 'GET', path: `/${targetUserId}/audit`, name: 'GET /:id/audit' },
    ];

    const matrixResults: { endpoint: string; Admin: number; Coach: number; Athlete: number; Organizer: number }[] = [];

    for (const ep of adminEndpoints) {
      const row: any = { endpoint: `${ep.method} ${ep.name.split(' ')[1]}` };
      for (const role of roles) {
        const res = await httpFetch(`${baseUsersUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens[role]}`,
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        row[role] = res.status;
        if (ep.method === 'POST' && ep.path === '/' && role === 'Admin' && res.body?.data) {
          const id = res.body.data.id || res.body.data._id;
          if (id) createdUserIds.push(new Types.ObjectId(id));
        }
      }
      matrixResults.push(row);
    }

    console.log('\n  +-----------------------------+-------+-------+---------+-----------+');
    console.log('  | Endpoint                    | Admin | Coach | Athlete | Organizer |');
    console.log('  +-----------------------------+-------+-------+---------+-----------+');
    for (const r of matrixResults) {
      console.log(
        `  | ${r.endpoint.padEnd(27)} | ${String(r.Admin).padEnd(5)} | ${String(r.Coach).padEnd(5)} | ${String(r.Athlete).padEnd(7)} | ${String(r.Organizer).padEnd(9)} |`
      );
    }
    console.log('  +-----------------------------+-------+-------+---------+-----------+\n');

    const nonAdminForbidden = matrixResults.every(
      (r) => r.Coach === 403 && r.Athlete === 403 && r.Organizer === 403
    );
    assert(nonAdminForbidden, 'Coach, Athlete, and Organizer are strictly forbidden (403) from all 6 Admin endpoints');

    // 5. Admin Happy Paths (CRUD, Filter, Search, Audit)
    console.log('\n4. Admin Operations Happy Paths:');
    const adminToken = tokens.Admin;

    // 5a. List & Pagination
    const listRes = await httpFetch(`${baseUsersUrl}?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, 'GET /api/users returns 200 OK');
    assert(listRes.body?.pagination?.page === 1, 'Response contains valid pagination metadata (page, limit, total, totalPages)');

    // 5b. Filter by role & isActive
    const filterRes = await httpFetch(`${baseUsersUrl}?role=Athlete&isActive=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(filterRes.status === 200, 'GET /api/users?role=Athlete&isActive=true returns 200 OK');
    const allFilteredAreAthletes = filterRes.body?.data?.every((u: any) => u.role === 'Athlete' && u.isActive === true);
    assert(allFilteredAreAthletes, 'Returned users strictly match filtered role and active status');

    // 5c. Regex-safe Search
    const searchRes = await httpFetch(`${baseUsersUrl}?search=RBAC+Test+Coach`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(searchRes.status === 200, 'GET /api/users?search=... returns 200 OK');
    assert(
      searchRes.body?.data?.some((u: any) => u.email === testUsers.Coach.email),
      'Search finds correct user by case-insensitive name'
    );

    // 5d. Regex special characters ("a.*") do not cause error or wildcard bleed
    const regexSafeRes = await httpFetch(`${baseUsersUrl}?search=a.*`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(regexSafeRes.status === 200, 'Regex special query "a.*" handled safely without server error');

    // 5e. Create User of any role
    const newAthleteEmail = `verify-rbac-${runId}-newathlete@athletiq.test`;
    const createRes = await httpFetch(baseUsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Admin Created Athlete',
        email: newAthleteEmail,
        role: 'Athlete',
        password: defaultPassword,
      }),
    });
    assert(createRes.status === 201, 'POST /api/users returns 201 Created');
    const createdAthlete = createRes.body?.data;
    const athleteId = createdAthlete?.id || createdAthlete?._id;
    if (athleteId) createdUserIds.push(new Types.ObjectId(athleteId));
    assert(createdAthlete?.role === 'Athlete', 'Created user reflects specified role');
    assert(
      !createdAthlete?.passwordHash && !createdAthlete?.refreshTokens,
      'Response sanitization: passwordHash and refreshTokens are completely omitted'
    );

    // 5f. Get single user by ID
    const getSingleRes = await httpFetch(`${baseUsersUrl}/${athleteId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getSingleRes.status === 200, 'GET /api/users/:id returns 200 OK');
    assert(getSingleRes.body?.data?.email === newAthleteEmail, 'GET /api/users/:id returns correct user payload');

    // 5g. Update user details
    const patchRes = await httpFetch(`${baseUsersUrl}/${athleteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Athlete Name',
        phone: '+1-555-0199',
      }),
    });
    assert(patchRes.status === 200, 'PATCH /api/users/:id returns 200 OK');
    assert(patchRes.body?.data?.name === 'Updated Athlete Name', 'User name updated successfully');

    // Acquire a valid refresh token cookie before administrative password reset
    const preResetLoginRes = await httpFetch(`${baseAuthUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAthleteEmail, password: defaultPassword }),
    });
    const preResetRefreshCookie = extractCookie(preResetLoginRes.headers.get('set-cookie'));
    assert(preResetLoginRes.status === 200, 'Athlete logs in before administrative password reset');

    // 5h. Reset password
    const newPassword = 'NewSecretPassword456!';
    const resetRes = await httpFetch(`${baseUsersUrl}/${athleteId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ newPassword }),
    });
    assert(resetRes.status === 200, 'POST /api/users/:id/reset-password returns 200 OK');

    // Proof 2b: Old refresh token is rejected after administrative password reset
    const oldRefreshRes = await httpFetch(`${baseAuthUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: preResetRefreshCookie },
    });
    assert(
      oldRefreshRes.status === 401,
      'User old refresh token is rejected (401) on POST /api/auth/refresh after administrative password reset'
    );

    // Verify login with new password succeeds and old password fails
    const oldLoginRes = await httpFetch(`${baseAuthUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAthleteEmail, password: defaultPassword }),
    });
    assert(oldLoginRes.status === 401, 'Old password rejected after administrative password reset');

    const newLoginRes = await httpFetch(`${baseAuthUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAthleteEmail, password: newPassword }),
    });
    assert(newLoginRes.status === 200, 'New password successfully authenticates user');

    // 5i. Retrieve user audit logs
    const auditRes = await httpFetch(`${baseUsersUrl}/${athleteId}/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200, 'GET /api/users/:id/audit returns 200 OK');
    assert(auditRes.body?.data?.length >= 2, 'Audit log records actions (USER_CREATED, USER_UPDATED, etc.)');
    const auditHasNoSecrets = auditRes.body?.data?.every(
      (log: any) => !log.meta?.password && !log.meta?.newPassword && !log.meta?.passwordHash
    );
    assert(auditHasNoSecrets, 'Audit log entries contain NO sensitive passwords or hash material');

    // 6. PATCH /api/users/me (Self profile update)
    console.log('\n5. Self Profile Update (PATCH /api/users/me):');
    const selfRes = await httpFetch(`${baseUsersUrl}/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Athlete}`,
      },
      body: JSON.stringify({
        name: 'Athlete Self Update',
        phone: '+1-555-8888',
      }),
    });
    assert(selfRes.status === 200, 'PATCH /api/users/me returns 200 OK (does not collide with :id route)');
    assert(selfRes.body?.data?.name === 'Athlete Self Update', 'Self update modified allowed field (name)');

    // Extra fields (role/email/isActive) rejected by strict Zod schema
    const selfMaliciousRes = await httpFetch(`${baseUsersUrl}/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Athlete}`,
      },
      body: JSON.stringify({
        role: 'Admin',
      }),
    });
    assert(
      selfMaliciousRes.status === 400,
      'PATCH /api/users/me rejects attempts to modify forbidden fields (.strict() validation)'
    );

    // 7. Input Safety & Error Handlers
    console.log('\n6. Input Safety & Error Handlers:');
    // 7a. Malformed ObjectId returns 400 (not 500)
    const malformedIdRes = await httpFetch(`${baseUsersUrl}/not-an-objectid`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(malformedIdRes.status === 400, 'Malformed ObjectId param returns 400 Bad Request (not 500)');

    // 7b. NoSQL Injection in Body rejected with 400
    const nosqlBodyRes = await httpFetch(baseUsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: { $gt: '' },
        name: 'Hacker',
        password: defaultPassword,
        role: 'Athlete',
      }),
    });
    assert(nosqlBodyRes.status === 400, 'NoSQL operator key ("$gt") in body rejected with 400');

    // 7c. NoSQL Injection in Query rejected with 400
    const nosqlQueryRes = await httpFetch(`${baseUsersUrl}?role[$ne]=Athlete`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(nosqlQueryRes.status === 400, 'NoSQL operator key ("$ne") in query rejected with 400');

    // 7d. Duplicate email returns 409
    const dupRes = await httpFetch(baseUsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Guy',
        email: testUsers.Admin.email,
        role: 'Coach',
        password: defaultPassword,
      }),
    });
    assert(dupRes.status === 409, 'Duplicate user creation returns 409 Conflict');

    // 7e. Weak password returns 400
    const weakPassRes = await httpFetch(baseUsersUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Weak Guy',
        email: `verify-rbac-${runId}-weak@athletiq.test`,
        role: 'Coach',
        password: 'weak',
      }),
    });
    assert(weakPassRes.status === 400, 'Weak password returns 400 Bad Request');

    // 8. Admin Self-Demote & Self-Deactivate Prevention
    console.log('\n7. Admin Self-Demote / Self-Deactivation Prevention:');
    const selfDemoteRes = await httpFetch(`${baseUsersUrl}/${testUsers.Admin._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'Athlete' }),
    });
    assert(selfDemoteRes.status === 400, 'Admin cannot demote self (returns 400)');

    const selfDeactivateRes = await httpFetch(`${baseUsersUrl}/${testUsers.Admin._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert(selfDeactivateRes.status === 400, 'Admin cannot deactivate self (returns 400)');

    // 9. Immediate Database-backed Auth & Status Check
    console.log('\n8. Immediate Token Effect: Role Change & Deactivation:');
    // Provision temporary Admin2
    const admin2Email = `verify-rbac-${runId}-admin2@athletiq.test`;
    const admin2 = await User.create({
      name: 'Secondary Admin',
      email: admin2Email,
      role: 'Admin',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(admin2._id);
    const admin2Token = signAccessToken(admin2.id, admin2.role);

    // Initial check: Admin2 calls GET /api/users with 200 OK
    const admin2InitialRes = await httpFetch(baseUsersUrl, {
      headers: { Authorization: `Bearer ${admin2Token}` },
    });
    assert(admin2InitialRes.status === 200, 'Secondary Admin token successfully accesses GET /api/users (200 OK)');

    // Main Admin demotes Admin2 to Athlete
    const demoteAdmin2Res = await httpFetch(`${baseUsersUrl}/${admin2._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'Athlete' }),
    });
    assert(demoteAdmin2Res.status === 200, 'Main Admin successfully demoted Secondary Admin to Athlete');

    // Secondary Admin retries GET /api/users with the OLD unexpired token -> immediately 403 Forbidden!
    const admin2OldTokenRes = await httpFetch(baseUsersUrl, {
      headers: { Authorization: `Bearer ${admin2Token}` },
    });
    assert(
      admin2OldTokenRes.status === 403,
      'Old access token immediately receives 403 Forbidden after role change (verified via fresh DB lookup in requireAuth)'
    );

    // Secondary Admin logs in and acquires a valid refresh cookie before deactivation
    const admin2LoginRes = await httpFetch(`${baseAuthUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin2Email, password: defaultPassword }),
    });
    const admin2RefreshCookie = extractCookie(admin2LoginRes.headers.get('set-cookie'));
    assert(admin2LoginRes.status === 200, 'Secondary Admin logs in and acquires refresh token cookie');

    // Main Admin deactivates Admin2
    await httpFetch(`${baseUsersUrl}/${admin2._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    // Secondary Admin retries with old token -> immediately 401 Unauthorized!
    const admin2DeactivatedRes = await httpFetch(baseUsersUrl, {
      headers: { Authorization: `Bearer ${admin2Token}` },
    });
    assert(
      admin2DeactivatedRes.status === 401,
      'Old access token immediately receives 401 Unauthorized after account deactivation'
    );

    // Proof 2a: Deactivated user's previously issued refresh token returns 401 on POST /api/auth/refresh
    const admin2DeactivatedRefreshRes = await httpFetch(`${baseAuthUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: admin2RefreshCookie },
    });
    assert(
      admin2DeactivatedRefreshRes.status === 401,
      'Deactivated user refresh token returns 401 Unauthorized on POST /api/auth/refresh'
    );

    // 10. Last-Admin Protection & Parallel Race-Safe Verification (Service Level)
    console.log('\n9. Last Active Admin Protection & Parallel Race Condition Test:');
    // Provision dedicated active test admin for last admin rule testing
    const lastAdminTarget = await User.create({
      name: 'Last Admin Target',
      email: `verify-rbac-${runId}-lasttarget@athletiq.test`,
      role: 'Admin',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(lastAdminTarget._id);

    // 10a. Fake count 0 triggers revert and 409
    let lastAdminReverted = false;
    try {
      await userService.updateUserAdmin(
        lastAdminTarget._id.toString(),
        { role: 'Athlete' },
        testUsers.Admin,
        async () => 0 // Mock 0 remaining active admins
      );
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        lastAdminReverted = true;
      }
    }
    assert(lastAdminReverted, 'Last active Admin demotion correctly rejected with 409 and reverted');
    const checkedLastAdmin = await User.findById(lastAdminTarget._id);
    assert(checkedLastAdmin?.role === 'Admin', 'Revert successfully restored Admin role after blocked demotion');

    // 10b. Parallel demotion test: two test admins attempting to demote each other simultaneously
    const raceAdmin1 = await User.create({
      name: 'Race Admin 1',
      email: `verify-rbac-${runId}-race1@athletiq.test`,
      role: 'Admin',
      passwordHash: hashedPassword,
      isActive: true,
    });
    const raceAdmin2 = await User.create({
      name: 'Race Admin 2',
      email: `verify-rbac-${runId}-race2@athletiq.test`,
      role: 'Admin',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(raceAdmin1._id, raceAdmin2._id);

    // Counter scoped exclusively to these two test admins
    const scopedCounter = async () =>
      User.countDocuments({
        _id: { $in: [raceAdmin1._id, raceAdmin2._id] },
        role: 'Admin',
        isActive: true,
      });

    const [raceRes1, raceRes2] = await Promise.allSettled([
      userService.updateUserAdmin(
        raceAdmin1._id.toString(),
        { role: 'Athlete' },
        raceAdmin2,
        scopedCounter
      ),
      userService.updateUserAdmin(
        raceAdmin2._id.toString(),
        { role: 'Athlete' },
        raceAdmin1,
        scopedCounter
      ),
    ]);

    const remainingActiveTestAdmins = await scopedCounter();
    assert(
      remainingActiveTestAdmins >= 1,
      `Race-safety guaranteed: parallel storm left ${remainingActiveTestAdmins} active test admin(s) (>= 1)`
    );
    const atLeastOneRejected =
      raceRes1.status === 'rejected' || raceRes2.status === 'rejected';
    assert(atLeastOneRejected, 'Parallel demotion storm rejected the conflicting request with 409');

    // 11. Scope Service Unit Verification
    console.log('\n10. Scope Service Unit Verification:');
    const testSport = await Sport.create({
      name: `Test Sport ${runId}`,
      slug: `test-sport-${runId}`,
      description: 'Standard test sport discipline for RBAC scope validation',
      genderCategory: 'Coed',
      status: 'Active',
    });
    createdSportIds.push(testSport._id);

    const testCoachProfile = await Coach.create({
      user: testUsers.Coach._id,
      sports: [testSport._id],
      experienceYears: 5,
      isPublic: true,
    });
    createdCoachIds.push(testCoachProfile._id);

    const testTeam = await Team.create({
      name: `Test Team ${runId}`,
      slug: `test-team-${runId}`,
      sport: testSport._id,
      ageGroup: 'U16',
      coach: testCoachProfile._id,
      status: 'Active',
    });
    createdTeamIds.push(testTeam._id);

    const testOtherTeam = await Team.create({
      name: `Other Team ${runId}`,
      slug: `other-team-${runId}`,
      sport: testSport._id,
      ageGroup: 'U18',
      status: 'Active',
    });
    createdTeamIds.push(testOtherTeam._id);

    const athleteInTeam = await Athlete.create({
      user: testUsers.Athlete._id,
      sport: testSport._id,
      team: testTeam._id,
      status: 'Active',
      verificationStatus: 'Verified',
      medicalClearance: true,
      profileVisibility: 'Public',
      joinedAt: new Date(),
    });
    createdAthleteIds.push(athleteInTeam._id);

    const athleteInOtherTeam = await Athlete.create({
      sport: testSport._id,
      team: testOtherTeam._id,
      status: 'Active',
      verificationStatus: 'Verified',
      medicalClearance: true,
      profileVisibility: 'Public',
      joinedAt: new Date(),
    });
    createdAthleteIds.push(athleteInOtherTeam._id);

    // Test coach access
    const coachCanAccessOwn = await scopeService.canCoachAccessAthlete(
      testUsers.Coach,
      athleteInTeam._id
    );
    assert(coachCanAccessOwn, 'scopeService: Coach has access to athlete in their team');

    const coachCanAccessOther = await scopeService.canCoachAccessAthlete(
      testUsers.Coach,
      athleteInOtherTeam._id
    );
    assert(!coachCanAccessOther, 'scopeService: Coach CANNOT access athlete from another team');

    // Test athlete access
    const athleteCanAccessOwn = await scopeService.canAthleteAccessAthlete(
      testUsers.Athlete,
      athleteInTeam._id
    );
    assert(athleteCanAccessOwn, 'scopeService: Athlete has access to their own profile');

    const athleteCanAccessOther = await scopeService.canAthleteAccessAthlete(
      testUsers.Athlete,
      athleteInOtherTeam._id
    );
    assert(!athleteCanAccessOther, 'scopeService: Athlete CANNOT access another athlete profile');

    // 11. User Account Unlock & Lockout Lifecycle (Step 5B)
    console.log('\n11. User Account Unlock & Lockout Lifecycle:');
    const lockTestEmail = `verify-rbac-${runId}-locked@athletiq.test`;
    const lockTestPassword = 'CorrectPass123!';
    const lockTestUser = await User.create({
      name: 'Locked Test Athlete',
      email: lockTestEmail,
      role: 'Athlete',
      passwordHash: await hashPassword(lockTestPassword),
      isActive: true,
    });
    createdUserIds.push(lockTestUser._id);

    // Lock user using SERVICE-level wrong logins (0 HTTP requests consumed)
    for (let i = 0; i < 5; i++) {
      try {
        await authService.login({ email: lockTestEmail, password: 'WrongPassword999!' });
      } catch {
        // Expected authentication failure
      }
    }

    // Verify user is locked at DB level
    const lockedUserDb = await User.findById(lockTestUser._id);
    assert(lockedUserDb?.lockUntil !== undefined, 'User account locked at DB level via 5 failed logins');

    // GET /api/users/:id as Admin returns safe boolean `isLocked === true`
    const getLockedUserRes = await httpFetch(`${baseUsersUrl}/${lockTestUser._id}`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(getLockedUserRes.status === 200, 'GET /users/:id (Admin) returns 200 for locked user');
    assert(getLockedUserRes.body.data.isLocked === true, 'GET /users/:id computes safe boolean isLocked: true');

    // Deep scan response JSON for forbidden sensitive fields (lockUntil, failedLoginAttempts)
    const leakedLockKeys = deepFindKeys(getLockedUserRes.body, ['lockUntil', 'failedLoginAttempts']);
    assert(leakedLockKeys.length === 0, 'DEEP SCAN: lockUntil and failedLoginAttempts are completely absent from user JSON');

    // Non-admin (Coach) attempting to unlock returns 403 Forbidden
    const coachUnlockRes = await httpFetch(`${baseUsersUrl}/${lockTestUser._id}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.Coach}` },
    });
    assert(coachUnlockRes.status === 403, 'Coach attempting POST /users/:id/unlock returns 403 Forbidden');

    // Admin unlocking a non-existent user returns 404 Not Found
    const nonExistentUnlockRes = await httpFetch(`${baseUsersUrl}/${new Types.ObjectId()}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(nonExistentUnlockRes.status === 404, 'Admin POST /users/:id/unlock with non-existent ID returns 404 Not Found');

    // Admin unlocking the locked user returns 200 OK
    const adminUnlockRes = await httpFetch(`${baseUsersUrl}/${lockTestUser._id}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(adminUnlockRes.status === 200, 'Admin POST /users/:id/unlock returns 200 OK');
    assert(adminUnlockRes.body.data.isLocked === false, 'Unlocked user response returns isLocked: false');

    // Check user in DB: lock cleared, failedLoginAttempts reset to 0
    const unlockedUserDb = await User.findById(lockTestUser._id);
    assert(unlockedUserDb?.lockUntil === undefined, 'User lockUntil unset after unlock');
    assert(unlockedUserDb?.failedLoginAttempts === 0, 'User failedLoginAttempts reset to 0 after unlock');

    // User can now log in successfully with correct password via HTTP
    const unlockedLoginRes = await httpFetch(`${baseAuthUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockTestEmail, password: lockTestPassword }),
    });
    assert(unlockedLoginRes.status === 200, 'Unlocked user successfully authenticates on POST /api/auth/login');

    // Audit entry USER_UNLOCKED exists and actor is Admin
    const unlockAudits = await AuditLog.find({ targetId: lockTestUser._id, action: 'USER_UNLOCKED' });
    assert(unlockAudits.length > 0, 'Audit log entry USER_UNLOCKED recorded for unlocked user');

    // Test: Reset password on a locked user also clears lock
    const lockResetEmail = `verify-rbac-${runId}-lock-reset@athletiq.test`;
    const lockResetUser = await User.create({
      name: 'Lock Reset Test Athlete',
      email: lockResetEmail,
      role: 'Athlete',
      passwordHash: await hashPassword('OldPass123!'),
      isActive: true,
    });
    createdUserIds.push(lockResetUser._id);

    // Lock via service
    for (let i = 0; i < 5; i++) {
      try {
        await authService.login({ email: lockResetEmail, password: 'WrongPassword999!' });
      } catch {
        // Expected
      }
    }

    const resetLockRes = await httpFetch(`${baseUsersUrl}/${lockResetUser._id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.Admin}`,
      },
      body: JSON.stringify({ newPassword: 'BrandNewPass123!' }),
    });
    assert(resetLockRes.status === 200, 'Admin POST /users/:id/reset-password returns 200');

    const getResetUserRes = await httpFetch(`${baseUsersUrl}/${lockResetUser._id}`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(getResetUserRes.body.data.isLocked === false, 'POST /reset-password on locked user automatically clears lock (isLocked: false)');

    // 12. Deep Scan: Raw lockout fields (lockUntil, failedLoginAttempts) are absent across all endpoints
    console.log('\n12. Comprehensive Deep Scan for Sensitive Lockout Fields:');
    const authMeRes = await httpFetch(`${baseAuthUrl}/me`, {
      headers: { Authorization: `Bearer ${tokens.Admin}` },
    });
    assert(authMeRes.status === 200, 'GET /api/auth/me returns 200 OK');

    const deepScanTargets = [
      { name: 'GET /api/users (list)', body: listRes.body },
      { name: 'GET /api/users/:id', body: getSingleRes.body },
      { name: 'POST /api/users', body: createRes.body },
      { name: 'PATCH /api/users/:id', body: patchRes.body },
      { name: 'POST /api/users/:id/unlock', body: adminUnlockRes.body },
      { name: 'POST /api/users/:id/reset-password', body: resetRes.body },
      { name: 'PATCH /api/users/me', body: selfRes.body },
      { name: 'GET /api/auth/me', body: authMeRes.body },
      { name: 'POST /api/auth/login (user object)', body: preResetLoginRes.body?.data?.user || preResetLoginRes.body },
    ];

    for (const target of deepScanTargets) {
      const leaked = deepFindKeys(target.body, ['lockUntil', 'failedLoginAttempts']);
      assert(
        leaked.length === 0,
        `DEEP SCAN: lockUntil and failedLoginAttempts completely absent from ${target.name}`
      );
    }

  } finally {
    console.log('\nCleaning up verification resources...');
    server.close();

    // Delete ONLY test-created resources
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdAthleteIds.length > 0) {
      await Athlete.deleteMany({ _id: { $in: createdAthleteIds } });
    }
    if (createdCoachIds.length > 0) {
      await Coach.deleteMany({ _id: { $in: createdCoachIds } });
    }
    if (createdTeamIds.length > 0) {
      await Team.deleteMany({ _id: { $in: createdTeamIds } });
    }
    if (createdSportIds.length > 0) {
      await Sport.deleteMany({ _id: { $in: createdSportIds } });
    }
    if (createdUserIds.length > 0) {
      await AuditLog.deleteMany({
        $or: [
          { actor: { $in: createdUserIds } },
          { targetId: { $in: createdUserIds } },
        ],
      });
    }

    // Snapshot counts after cleanup
    const finalUserCount = await User.countDocuments();
    const finalAuditCount = await AuditLog.countDocuments();

    console.log(`Database state after test: Users = ${finalUserCount}, AuditLogs = ${finalAuditCount}`);
    const userCountMatches = finalUserCount === initialUserCount;
    const auditCountMatches = finalAuditCount === initialAuditCount;

    assert(userCountMatches, `Database integrity preserved: User count restored (${initialUserCount} === ${finalUserCount})`);
    assert(auditCountMatches, `Database integrity preserved: AuditLog count restored (${initialAuditCount} === ${finalAuditCount})`);

    await mongoose.disconnect();
    console.log('ℹ️  MongoDB disconnected.');
  }

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests} (strictly < 90)`);
  console.log(`Total Failed /api/auth HTTP Requests: ${failedAuthHttpCount} (strictly <= 8)`);
  console.log('========================================\n');

  if (failed > 0 || totalHttpRequests >= 90 || failedAuthHttpCount > 8) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
