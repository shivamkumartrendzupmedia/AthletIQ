import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, Athlete, Coach, AuditLog, Sport } from '../src/models/index.js';
import { getCounts, findOrphans } from './cleanup-test-orphans.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';

let totalPassed = 0;
let totalFailed = 0;

interface GroupMetrics {
  name: string;
  passed: number;
  failed: number;
  httpRequests: number;
  failedAuthRequests: number;
}

const groups: GroupMetrics[] = [];

function createGroupTracker(name: string) {
  const g: GroupMetrics = {
    name,
    passed: 0,
    failed: 0,
    httpRequests: 0,
    failedAuthRequests: 0,
  };
  groups.push(g);

  function pass(desc: string) {
    console.log(`  ✓ PASS: ${desc}`);
    g.passed++;
    totalPassed++;
  }

  function fail(desc: string) {
    console.error(`  ✗ FAIL: ${desc}`);
    g.failed++;
    totalFailed++;
  }

  function assert(cond: boolean, desc: string) {
    if (cond) pass(desc);
    else fail(desc);
  }

  async function fetchJson(
    url: string,
    options: RequestInit = {}
  ): Promise<{ status: number; body: Record<string, unknown> | null; headers: Headers; text: string }> {
    g.httpRequests++;
    const res = await fetch(url, options);
    if (url.includes('/api/auth') && res.status >= 400) {
      g.failedAuthRequests++;
    }
    const text = await res.text();
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Non-JSON response
    }
    return { status: res.status, body, headers: res.headers, text };
  }

  return { g, pass, fail, assert, fetchJson };
}

function deepScanForForbiddenKeys(obj: unknown, forbiddenKeys: string[]): string[] {
  const found: string[] = [];
  function recurse(val: unknown) {
    if (!val || typeof val !== 'object') return;
    if (Array.isArray(val)) {
      for (const item of val) recurse(item);
      return;
    }
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (forbiddenKeys.includes(k)) {
        found.push(k);
      }
      recurse(v);
    }
  }
  recurse(obj);
  return found;
}

async function run() {
  console.log('=== VERIFYING ATHLETIQ PROFILE EDIT API SUITE (STEP 17) ===\n');

  await connectDB();
  const dbName = mongoose.connection.name;
  console.log(`Connected Database: ${dbName}`);

  const initialOrphans = await findOrphans();
  if (initialOrphans.length > 0) {
    console.error(`Refusing to run: ${initialOrphans.length} orphans already exist in DB.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const initialCounts = await getCounts();
  console.log('Database Initial Counts:\n', JSON.stringify(initialCounts, null, 2));

  const createdUserIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const passwordHash = await hashPassword('ProfilePass123!');

  // Create shared Sport for athlete test
  const testSport = await Sport.create({
    name: `Profile Sport ${runId}`,
    slug: `profile-sport-${runId}`,
    description: 'Test sport description for profile verification suite',
    category: 'Team',
    status: 'Active',
  });
  createdSportIds.push(testSport._id);

  // Provision test users across all 4 roles
  const roles = ['Admin', 'Coach', 'Athlete', 'Organizer'] as const;
  const userMap = new Map<string, { id: Types.ObjectId; token: string; email: string }>();

  for (const role of roles) {
    const user = await User.create({
      name: `Profile Test ${role}`,
      email: `profile-${runId}-${role.toLowerCase()}@test.athletiq.internal`,
      passwordHash,
      role,
      isActive: true,
      emailVerified: true,
    });
    createdUserIds.push(user._id);
    const token = signAccessToken(user._id.toString(), user.role);
    userMap.set(role, { id: user._id, token, email: user.email });

    if (role === 'Coach') {
      const coach = await Coach.create({
        user: user._id,
        name: user.name,
        sport: testSport._id,
        status: 'Active',
      });
      createdCoachIds.push(coach._id);
    }

    if (role === 'Athlete') {
      const athlete = await Athlete.create({
        user: user._id,
        sport: testSport._id,
        dateOfBirth: new Date('2008-04-12'),
        status: 'Active',
      });
      createdAthleteIds.push(athlete._id);
    }
  }

  // Also provision an Athlete user WITHOUT an Athlete document
  const athleteNoDocUser = await User.create({
    name: `Profile Athlete NoDoc ${runId}`,
    email: `profile-${runId}-ath-nodoc@test.athletiq.internal`,
    passwordHash,
    role: 'Athlete',
    isActive: true,
    emailVerified: true,
  });
  createdUserIds.push(athleteNoDocUser._id);
  const athleteNoDocToken = signAccessToken(athleteNoDocUser._id.toString(), 'Athlete');

  // Also provision an additional User B to test cross-tenant isolation
  const userB = await User.create({
    name: `Profile User B ${runId}`,
    email: `profile-${runId}-userb@test.athletiq.internal`,
    passwordHash,
    role: 'Athlete',
    isActive: true,
    emailVerified: true,
  });
  createdUserIds.push(userB._id);

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 1: Role x Endpoint Matrix (GET & PATCH /api/profile)
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 1: Role x Endpoint Authorization Matrix ---');
    const { g, assert, fetchJson } = createGroupTracker('Role x Endpoint Matrix');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Unauthenticated requests to GET and PATCH return 401
      const unauthGet = await fetchJson(`${base}/api/profile`);
      assert(unauthGet.status === 401, 'Unauthenticated GET /api/profile returns 401 Unauthorized');

      const unauthPatch = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker' }),
      });
      assert(unauthPatch.status === 401, 'Unauthenticated PATCH /api/profile returns 401 Unauthorized');

      // 2. All 4 roles can GET /api/profile (200 OK)
      for (const r of roles) {
        const token = userMap.get(r)!.token;
        const res = await fetchJson(`${base}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert(res.status === 200, `${r} on GET /api/profile returns 200 OK`);
        const data = (res.body?.data || {}) as Record<string, unknown>;
        assert(data.id === userMap.get(r)!.id.toString(), `${r} GET returns own user id`);
        assert(data.role === r, `${r} GET returns correct role`);
      }

      // 3. All 4 roles can PATCH /api/profile (200 OK)
      for (const r of roles) {
        const token = userMap.get(r)!.token;
        const newName = `Updated ${r} Name`;
        const res = await fetchJson(`${base}/api/profile`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        });
        assert(res.status === 200, `${r} on PATCH /api/profile returns 200 OK`);
        const data = (res.body?.data || {}) as Record<string, unknown>;
        assert(data.name === newName, `${r} response reflects updated name`);
      }
    } finally {
      server.close();
    }
    console.log(`[Group 1 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2: Date of Birth, Dynamic Age Math & Date Boundaries
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 2: Date of Birth & Dynamic Age Mathematics ---');
    const { g, assert, fetchJson } = createGroupTracker('DOB & Age Math');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Case A: Fixed birthday 20 years ago, exactly on today's month and date -> age = 20
      const birthYear20 = currentYear - 20;
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dobExact20 = `${birthYear20}-${mm}-${dd}`;

      const adminToken = userMap.get('Admin')!.token;
      const resA = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dateOfBirth: dobExact20 }),
      });
      assert(resA.status === 200, 'Admin updates dateOfBirth to exact 20th birthday (200 OK)');
      const dataA = (resA.body?.data || {}) as Record<string, unknown>;
      assert(dataA.dateOfBirth === dobExact20, 'Response returns formatted dateOfBirth string');
      assert(dataA.age === 20, 'Response returns exact computed age: 20');

      // Case B: Boundary test - Birthday is TOMORROW (day before birthday) -> age = 19
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const mmTom = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const ddTom = String(tomorrow.getDate()).padStart(2, '0');
      const dobTomorrow20 = `${birthYear20}-${mmTom}-${ddTom}`;

      const coachToken = userMap.get('Coach')!.token;
      const resB = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${coachToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dateOfBirth: dobTomorrow20 }),
      });
      assert(resB.status === 200, 'Coach updates dateOfBirth to day before 20th birthday (200 OK)');
      const dataB = (resB.body?.data || {}) as Record<string, unknown>;
      assert(dataB.age === 19, 'Response returns computed age 19 (birthday has not occurred yet this year)');

      // Case C: Role Athlete updates dateOfBirth -> reflects in both GET /api/profile and Athlete model
      const athToken = userMap.get('Athlete')!.token;
      const birthYear16 = currentYear - 16;
      const dob16 = `${birthYear16}-01-15`;
      const resC = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${athToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dateOfBirth: dob16 }),
      });
      assert(resC.status === 200, 'Athlete updates dateOfBirth (200 OK)');
      const dataC = (resC.body?.data || {}) as Record<string, unknown>;
      assert(dataC.dateOfBirth === dob16, 'Athlete profile response dateOfBirth matches input');
      assert(dataC.age === 16, 'Athlete profile response age matches computed 16');

      // Verify that Athlete model document in DB was updated (single source of truth)
      const athleteDoc = await Athlete.findOne({ user: userMap.get('Athlete')!.id });
      assert(athleteDoc !== null, 'Athlete document exists in database');
      const isoDob = athleteDoc?.dateOfBirth ? athleteDoc.dateOfBirth.toISOString().split('T')[0] : null;
      assert(isoDob === dob16, 'Athlete document dateOfBirth was directly updated in DB');
      assert(athleteDoc?.age === 16, 'Athlete virtual age getter returns 16');

      // Case D: Role Coach name update reflected when coach profile populates user
      const resD = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${coachToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Coach Alex Morgan Sync' }),
      });
      assert(resD.status === 200, 'Coach name update returns 200 OK');
      const coachDoc = await Coach.findOne({ user: userMap.get('Coach')!.id }).populate<{ user: { name: string } }>('user', 'name');
      assert(coachDoc?.user?.name === 'Coach Alex Morgan Sync', 'Coach populated user name reflects updated name');
    } finally {
      server.close();
    }
    console.log(`[Group 2 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 3: Zod .strict() Validation & Malicious Payloads
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 3: Validation, Injection & Forbidden Keys ---');
    const { g, assert, fetchJson } = createGroupTracker('Validation & Security');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const adminToken = userMap.get('Admin')!.token;

      // 1. Empty body = 400
      const resEmpty = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert(resEmpty.status === 400, 'Empty PATCH body returns 400 Bad Request');

      // 2. Forbidden keys rejected by .strict(): role, email, isActive, password, passwordHash, id, user, athlete
      const forbiddenPayloads = [
        { role: 'Admin' },
        { email: 'newemail@test.com' },
        { isActive: false },
        { password: 'NewPassword123!' },
        { passwordHash: 'hash123' },
        { id: userB._id.toString() },
        { user: userB._id.toString() },
        { athlete: userB._id.toString() },
      ];

      for (const payload of forbiddenPayloads) {
        const key = Object.keys(payload)[0];
        const res = await fetchJson(`${base}/api/profile`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        assert(res.status === 400, `Body containing forbidden key "${key}" rejected with 400 Bad Request`);
      }

      // 3. Name validation rules: empty, 1 char, > 80 chars, only spaces
      const invalidNames = [
        { name: '' },
        { name: 'A' },
        { name: '   ' },
        { name: 'a'.repeat(81) },
      ];
      for (const invalid of invalidNames) {
        const res = await fetchJson(`${base}/api/profile`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(invalid),
        });
        assert(res.status === 400, `Invalid name "${invalid.name.slice(0, 10)}..." returns 400 Bad Request`);
      }

      // 4. DOB validation: future date, age < 5, age > 100, 31 Feb, malformed strings, arrays
      const currentYear = new Date().getFullYear();
      const invalidDates = [
        { dateOfBirth: '2099-01-01', desc: 'future date' },
        { dateOfBirth: `${currentYear - 4}-01-01`, desc: 'age 4 (< 5)' },
        { dateOfBirth: `${currentYear - 101}-01-01`, desc: 'age 101 (> 100)' },
        { dateOfBirth: '2020-02-31', desc: '31 February (invalid calendar day)' },
        { dateOfBirth: '15/01/2000', desc: 'non-ISO date format' },
        { dateOfBirth: 'not-a-date', desc: 'malformed string' },
      ];

      for (const item of invalidDates) {
        const res = await fetchJson(`${base}/api/profile`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateOfBirth: item.dateOfBirth }),
        });
        assert(res.status === 400, `Invalid dateOfBirth (${item.desc}) returns 400 Bad Request`);
      }

      // 5. NoSQL operator keys in body rejected
      const resNoSql = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ '$gt': 'malicious' }),
      });
      assert(resNoSql.status === 400, 'NoSQL operator key in body rejected with 400');

      // 6. <script> tag in name is stored and returned as plain text without execution
      const xssName = '<script>alert("xss")</script>';
      const resXss = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: xssName }),
      });
      assert(resXss.status === 200, '<script> tag in name accepted and saved safely (200 OK)');
      const dataXss = (resXss.body?.data || {}) as Record<string, unknown>;
      assert(dataXss.name === xssName, 'Response returns name as exact plain text string');
    } finally {
      server.close();
    }
    console.log(`[Group 3 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 4: Athlete Without Profile Doc & Deep Scan / Audit Logs
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 4: Profile-less Athlete, Deep Scan & AuditLog ---');
    const { g, assert, fetchJson } = createGroupTracker('Edge Cases & Audit');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Athlete without Athlete document: name update = 200
      const resName = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${athleteNoDocToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Athlete NoDoc Name' }),
      });
      assert(resName.status === 200, 'Athlete without profile document can update name (200 OK)');

      // 2. Athlete without Athlete document: dateOfBirth update = 400
      const resDob = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${athleteNoDocToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateOfBirth: '2005-06-15' }),
      });
      assert(resDob.status === 400, 'Athlete without profile document attempting dateOfBirth returns 400 Bad Request');
      assert(
        typeof resDob.body?.message === 'string' && (resDob.body.message as string).includes('Athlete profile document does not exist'),
        'Clear error message explaining athlete profile document is required for DOB'
      );

      // 3. Deep scan: verify sensitive fields are NEVER leaked in GET or PATCH
      const resGet = await fetchJson(`${base}/api/profile`, {
        headers: { Authorization: `Bearer ${athleteNoDocToken}` },
      });
      const forbiddenLeaked = deepScanForForbiddenKeys(resGet.body, [
        'email',
        'phone',
        'passwordHash',
        'refreshTokens',
        'medicalNotes',
        'guardian',
        'lockUntil',
        'failedLoginAttempts',
      ]);
      assert(forbiddenLeaked.length === 0, 'DEEP SCAN: No sensitive fields leaked in GET /api/profile');

      const resPatchScan = await fetchJson(`${base}/api/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${athleteNoDocToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Safe Scanned Name' }),
      });
      const forbiddenPatchLeaked = deepScanForForbiddenKeys(resPatchScan.body, [
        'email',
        'phone',
        'passwordHash',
        'refreshTokens',
        'medicalNotes',
        'guardian',
      ]);
      assert(forbiddenPatchLeaked.length === 0, 'DEEP SCAN: No sensitive fields leaked in PATCH /api/profile');

      // 4. AuditLog verification: PROFILE_UPDATED action exists with changed field names only (never values)
      const audit = await AuditLog.findOne({
        actor: athleteNoDocUser._id,
        action: 'PROFILE_UPDATED',
      }).sort({ createdAt: -1 });

      assert(audit !== null, 'AuditLog entry created for PROFILE_UPDATED');
      assert(audit?.targetType === 'User', 'AuditLog targetType is User');
      assert(audit?.targetId.toString() === athleteNoDocUser._id.toString(), 'AuditLog targetId is user ID');
      const changedFields = audit?.meta?.changedFields as string[] | undefined;
      assert(Array.isArray(changedFields) && changedFields.includes('name'), 'AuditLog meta contains changed field names ["name"]');
      assert(audit?.meta?.name === undefined, 'AuditLog meta does NOT store the actual name value');
      assert(audit?.meta?.dateOfBirth === undefined, 'AuditLog meta does NOT store the dateOfBirth value');

      // 5. Concurrency: 10 simultaneous PATCH calls via Promise.all
      const patchPromises = Array.from({ length: 10 }, (_, i) =>
        fetchJson(`${base}/api/profile`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${athleteNoDocToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Concurrent Name ${i}` }),
        })
      );
      const concurrentResults = await Promise.all(patchPromises);
      const allSuccess = concurrentResults.every((r) => r.status === 200);
      assert(allSuccess, '10 simultaneous PATCH calls all succeed with 200 (no 500 or race error)');
    } finally {
      server.close();
    }
    console.log(`[Group 4 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 5: Password Change & Historical Token Invalidation Flow
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 5: Password Change & Token Invalidation Flow ---');
    const { g, assert, fetchJson } = createGroupTracker('Password Change Flow');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Create a fresh dedicated user for password change testing
      const pwdTestUser = await User.create({
        name: `Password Test User ${runId}`,
        email: `profile-${runId}-pwd@test.athletiq.internal`,
        passwordHash: await hashPassword('InitialPass123!'),
        role: 'Athlete',
        isActive: true,
        emailVerified: true,
      });
      createdUserIds.push(pwdTestUser._id);

      // Log in to get initial access token and session
      const loginRes = await fetchJson(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pwdTestUser.email,
          password: 'InitialPass123!',
        }),
      });
      assert(loginRes.status === 200, 'Login with initial password succeeds (200 OK)');
      const initialAccessToken = (loginRes.body?.data as { accessToken?: string })?.accessToken || '';

      // Test access with initial token
      const meResBefore = await fetchJson(`${base}/api/profile`, {
        headers: { Authorization: `Bearer ${initialAccessToken}` },
      });
      assert(meResBefore.status === 200, 'Initial token can access GET /api/profile (200 OK)');

      // 2. Change password with incorrect current password -> returns 400
      const wrongPwdRes = await fetchJson(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${initialAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword123!',
          newPassword: 'BrandNewPass123!',
        }),
      });
      assert(wrongPwdRes.status === 400, 'Wrong current password returns 400 Bad Request');

      // 3. Change password with valid credentials -> returns 200
      // Sleep 1000ms to ensure iat < passwordChangedAt (second-level resolution in JWT)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const changeRes = await fetchJson(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${initialAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'InitialPass123!',
          newPassword: 'BrandNewPass123!',
        }),
      });
      assert(changeRes.status === 200, 'Valid change-password returns 200 OK');

      // 4. OLD access token is now REJECTED (401) on subsequent requests
      const meResAfter = await fetchJson(`${base}/api/profile`, {
        headers: { Authorization: `Bearer ${initialAccessToken}` },
      });
      assert(meResAfter.status === 401, 'Old access token is rejected with 401 after password change');

      // 5. Login with new password succeeds
      const newLoginRes = await fetchJson(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pwdTestUser.email,
          password: 'BrandNewPass123!',
        }),
      });
      assert(newLoginRes.status === 200, 'Login with new password succeeds (200 OK)');

      // Verify failed auth requests strictly <= 8
      assert(g.failedAuthRequests <= 8, `Failed auth requests in group (${g.failedAuthRequests}) strictly <= 8`);
    } finally {
      server.close();
    }
    console.log(`[Group 5 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLEANUP & INTEGRITY VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CLEANING UP VERIFICATION RESOURCES ---');

  if (createdAuditLogIds.length > 0) {
    await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
  }
  // Delete all audit logs created during this test run by our actors
  await AuditLog.deleteMany({ actor: { $in: createdUserIds } });

  if (createdAthleteIds.length > 0) {
    await Athlete.deleteMany({ _id: { $in: createdAthleteIds } });
  }
  if (createdCoachIds.length > 0) {
    await Coach.deleteMany({ _id: { $in: createdCoachIds } });
  }
  if (createdSportIds.length > 0) {
    await Sport.deleteMany({ _id: { $in: createdSportIds } });
  }
  if (createdUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }

  const finalCounts = await getCounts();
  console.log('Database Final Counts:\n', JSON.stringify(finalCounts, null, 2));

  let countsMatch = true;
  for (const [coll, count] of Object.entries(initialCounts)) {
    if (finalCounts[coll as keyof typeof finalCounts] !== count) {
      console.error(`Count mismatch for ${coll}: before=${count}, after=${finalCounts[coll as keyof typeof finalCounts]}`);
      countsMatch = false;
    }
  }

  if (countsMatch) {
    console.log('✓ PASS: All collection counts perfectly restored to initial state.');
    totalPassed++;
  } else {
    console.error('✗ FAIL: Collection count discrepancy detected after cleanup.');
    totalFailed++;
  }

  const endingOrphans = await findOrphans();
  if (endingOrphans.length === 0) {
    console.log('✓ PASS: Zero test orphans remain after cleanup.');
    totalPassed++;
  } else {
    console.error(`✗ FAIL: ${endingOrphans.length} orphans remained after cleanup.`);
    totalFailed++;
  }

  console.log('\n========================================');
  console.log(`Profile Suite Summary: ${totalPassed} passed, ${totalFailed} failed`);
  for (const grp of groups) {
    console.log(`- ${grp.name}: ${grp.passed} passed, ${grp.failed} failed, ${grp.httpRequests} requests, ${grp.failedAuthRequests} failed auth`);
  }
  console.log('========================================\n');

  await mongoose.disconnect();
  if (totalFailed > 0) process.exit(1);
}

run().catch(async (err) => {
  console.error('Fatal verify:profile error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
