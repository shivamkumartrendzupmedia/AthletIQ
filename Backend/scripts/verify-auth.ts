import type { AddressInfo } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { authService } from '../src/services/auth.service.js';
import { ApiError } from '../src/utils/ApiError.js';

let passed = 0;
let failed = 0;
let failedHttpCount = 0;

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

async function run(): Promise<void> {
  console.log('\n--- VERIFYING ATHLETIQ AUTHENTICATION SYSTEM ---\n');

  await connectDB();
  const app = createApp();

  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;

  const createdUserIds: Types.ObjectId[] = [];
  const testRunId = Math.random().toString(36).substring(2, 10);
  const user1Email = `verify-auth-${testRunId}-1@athletiq.test`;
  const user2Email = `verify-auth-${testRunId}-2@athletiq.test`;

  try {
    // 1. Registration
    console.log('1. Registration Flow:');
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Athlete One',
        email: user1Email,
        password: 'Password123',
        role: 'Admin', // Must be ignored and role forced to Athlete
      }),
    });
    const regJson = (await regRes.json()) as any;
    assert(regRes.status === 201, 'POST /register returns 201 Created');
    assert(
      regJson.data?.user?.role === 'Athlete',
      'POST /register enforces role "Athlete" (ignores role "Admin" from body)'
    );
    assert(
      typeof regJson.data?.accessToken === 'string',
      'POST /register returns access token in body'
    );
    const regCookie = extractCookie(regRes.headers.get('set-cookie'));
    assert(
      regCookie.startsWith('refreshToken='),
      'POST /register sets httpOnly refreshToken cookie'
    );

    if (regJson.data?.user?.id) {
      createdUserIds.push(new Types.ObjectId(regJson.data.user.id));
    }

    // 2. Duplicate Email Rejection (Failed HTTP request #1)
    console.log('\n2. Validation & Duplicate Handling:');
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Athlete',
        email: user1Email,
        password: 'Password123',
      }),
    });
    failedHttpCount++;
    assert(dupRes.status === 409, 'POST /register rejects duplicate email with 409 Conflict');

    // 3. Weak Password Rejection (Failed HTTP request #2)
    const weakRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Password Athlete',
        email: `verify-auth-weak-${testRunId}@athletiq.test`,
        password: 'weak',
      }),
    });
    failedHttpCount++;
    assert(weakRes.status === 400, 'POST /register rejects weak password with 400 Bad Request');

    // 4. Login Wrong Password (Failed HTTP request #3)
    console.log('\n3. Login & Authentication Flow:');
    const wrongLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user1Email,
        password: 'WrongPassword999',
      }),
    });
    failedHttpCount++;
    const wrongLoginJson = (await wrongLoginRes.json()) as any;
    assert(wrongLoginRes.status === 401, 'POST /login with wrong password returns 401 Unauthorized');
    assert(
      wrongLoginJson.message === 'Invalid email or password',
      'POST /login returns generic "Invalid email or password" error message'
    );

    // 5. Successful Login
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user1Email,
        password: 'Password123',
      }),
    });
    const loginJson = (await loginRes.json()) as any;
    assert(loginRes.status === 200, 'POST /login with valid credentials returns 200 OK');
    const accessToken = loginJson.data?.accessToken as string;
    const cookie1 = extractCookie(loginRes.headers.get('set-cookie'));
    assert(
      typeof accessToken === 'string' && cookie1.length > 0,
      'POST /login provides valid access token and refresh cookie'
    );

    // 6. Protected Route /me without Token
    console.log('\n4. Protected Routes & User Sanitization:');
    const meWithoutTokenRes = await fetch(`${baseUrl}/me`);
    assert(
      meWithoutTokenRes.status === 401,
      'GET /me without authorization header returns 401 Unauthorized'
    );

    // 7. Protected Route /me with Token
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meJson = (await meRes.json()) as any;
    assert(meRes.status === 200, 'GET /me with valid Bearer token returns 200 OK');
    assert(
      meJson.data?.user?.email === user1Email,
      'GET /me returns current user profile'
    );
    assert(
      meJson.data?.user?.passwordHash === undefined &&
        meJson.data?.user?.refreshTokens === undefined &&
        meJson.data?.user?.lockUntil === undefined &&
        meJson.data?.user?.failedLoginAttempts === undefined,
      'GET /me omits all sensitive security fields (passwordHash, refreshTokens, lockUntil, failedLoginAttempts)'
    );

    // 8. Refresh Token Rotation
    console.log('\n5. Refresh Token Rotation & Session Reuse Detection:');
    const refreshRes = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
    });
    await refreshRes.json();
    assert(refreshRes.status === 200, 'POST /refresh with valid cookie returns 200 OK');
    const cookie2 = extractCookie(refreshRes.headers.get('set-cookie'));
    assert(
      cookie2.length > 0 && cookie2 !== cookie1,
      'POST /refresh rotates token (issued new cookie differs from old cookie)'
    );

    // 9. Refresh Token Reuse Detection (Failed HTTP request #4)
    const reuseOldRes = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
    });
    failedHttpCount++;
    assert(
      reuseOldRes.status === 401,
      'POST /refresh with reused old token returns 401 Unauthorized'
    );

    // Verify all sessions were purged on reuse detection (Failed HTTP request #5)
    const attemptWithCookie2Res = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    failedHttpCount++;
    assert(
      attemptWithCookie2Res.status === 401,
      'Reuse detection revokes ALL sessions: previously valid rotated token is now also rejected'
    );

    // 10. Logout Session Termination
    console.log('\n6. Logout Flow:');
    const freshLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Password123' }),
    });
    const cookie3 = extractCookie(freshLoginRes.headers.get('set-cookie'));
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Cookie: cookie3 },
    });
    assert(logoutRes.status === 200, 'POST /logout returns 200 OK');
    const logoutCookieHeader = logoutRes.headers.get('set-cookie') || '';
    assert(
      logoutCookieHeader.includes('refreshToken=;') ||
        logoutCookieHeader.includes('Max-Age=0') ||
        logoutCookieHeader.includes('Expires='),
      'POST /logout clears refreshToken cookie'
    );

    const afterLogoutRefresh = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookie3 },
    });
    failedHttpCount++;
    assert(
      afterLogoutRefresh.status === 401,
      'Refresh token revoked after logout cannot be refreshed'
    );

    // 11. Account Lockout & Parallel Race Condition Test at Service Level (Correction 2)
    console.log('\n7. Account Lockout & Parallel Race Condition Test (Service Level):');
    const user2Reg = await authService.register({
      name: 'Lockout Test Athlete',
      email: user2Email,
      password: 'Password123',
    });
    createdUserIds.push(new Types.ObjectId(user2Reg.user.id));

    // Fire 8 wrong-password attempts IN PARALLEL at service level (Promise.all)
    const parallelAttempts = Array.from({ length: 8 }, () =>
      authService
        .login({
          email: user2Email,
          password: 'WrongPassword999',
        })
        .then(() => ({ success: true, status: 200 }))
        .catch((err: any) => ({
          success: false,
          status: err instanceof ApiError ? err.statusCode : 500,
        }))
    );

    const parallelResults = await Promise.all(parallelAttempts);
    const lockedCount = parallelResults.filter((r) => r.status === 423).length;
    const unauthorizedCount = parallelResults.filter((r) => r.status === 401).length;

    assert(
      parallelResults.every((r) => !r.success),
      'All 8 parallel wrong-password attempts failed'
    );
    assert(
      unauthorizedCount === 4 && lockedCount === 4,
      `Atomic counter prevented race: exactly 4 returned 401 and 4 returned 423 Locked (total ${parallelResults.length})`
    );

    // Verify user document in DB is locked
    const lockedUserDoc = await User.findById(user2Reg.user.id);
    assert(
      lockedUserDoc?.lockUntil !== undefined && lockedUserDoc.lockUntil > new Date(),
      'User account ends up locked in database with active lockUntil timestamp'
    );

    // Attempt with the CORRECT password right after is still rejected with 423
    let correctAttemptLocked = false;
    try {
      await authService.login({
        email: user2Email,
        password: 'Password123', // CORRECT password
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 423) {
        correctAttemptLocked = true;
      }
    }
    assert(
      correctAttemptLocked,
      'Attempt with CORRECT password right after parallel storm is still rejected with 423 Locked'
    );

    // 12. Password Change & Token Revocation
    console.log('\n8. Password Change & Historical Token Invalidation:');
    const user1LoginForPwd = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Password123' }),
    });
    const pwdLoginJson = (await user1LoginForPwd.json()) as any;
    const oldAccessToken = pwdLoginJson.data?.accessToken as string;

    // Small pause to guarantee passwordChangedAt second is strictly after access token iat
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const changePwdRes = await fetch(`${baseUrl}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oldAccessToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      }),
    });
    assert(changePwdRes.status === 200, 'POST /change-password returns 200 OK');

    // Access token predating password change should now be rejected by requireAuth
    const oldTokenAccessRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${oldAccessToken}` },
    });
    assert(
      oldTokenAccessRes.status === 401,
      'Access token issued before password change is rejected by requireAuth (401)'
    );

    // Old password fails (Failed HTTP request #7)
    const oldPwdLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Password123' }),
    });
    failedHttpCount++;
    assert(
      oldPwdLoginRes.status === 401,
      'Old password no longer works after password change'
    );

    // New password succeeds
    const newPwdLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'NewPassword123' }),
    });
    assert(
      newPwdLoginRes.status === 200,
      'Login with new password succeeds (200 OK)'
    );

    console.log('\n9. Rate Limiter Audit:');
    assert(
      failedHttpCount <= 8,
      `Total failed HTTP requests on auth-limited endpoints: ${failedHttpCount} (strictly <= 8, safe from 10-failure threshold)`
    );
  } finally {
    // Guaranteed Cleanup of created test data and ephemeral server
    console.log('\nCleaning up verification resources...');
    let deletedCount = 0;
    if (createdUserIds.length > 0) {
      const resById = await User.deleteMany({ _id: { $in: createdUserIds } });
      deletedCount += resById.deletedCount;
    }
    const resByRegex = await User.deleteMany({
      email: new RegExp('^verify-auth-.*@athletiq\\.test$'),
    });
    deletedCount += resByRegex.deletedCount;
    server.close();
    await mongoose.disconnect();
    console.log(
      `✓ CONFIRMATION: All test users created during verification run were successfully deleted from database (total deleted: ${deletedCount}).`
    );
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Failed HTTP Requests count: ${failedHttpCount}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All authentication verification tests passed successfully!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
