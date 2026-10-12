import type { AddressInfo } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { env } from '../src/config/env.js';
import { authService } from '../src/services/auth.service.js';
import { ApiError } from '../src/utils/ApiError.js';
import { authLimiter } from '../src/middlewares/rateLimiter.js';
import { getRefreshCookieOptions } from '../src/utils/jwt.js';

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
  (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 0;
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
    const regJson = (await regRes.json()) as { data?: { user?: { role?: string }; accessToken?: string } };
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
    const wrongLoginJson = (await wrongLoginRes.json()) as { message?: string };
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
    const loginJson = (await loginRes.json()) as { data?: { accessToken?: string } };
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
    const meJson = (await meRes.json()) as { data?: { user?: { email?: string; passwordHash?: unknown; refreshTokens?: unknown; lockUntil?: unknown; failedLoginAttempts?: unknown } } };
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
        .catch((err: unknown) => ({
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
    } catch (err: unknown) {
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
    const pwdLoginJson = (await user1LoginForPwd.json()) as { data?: { accessToken?: string } };
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

    // 10. REFRESH TOKEN GRACE WINDOW & CONCURRENCY RACE (STEP 7-FIX-2)
    console.log('\n10. Refresh Token Grace Window & Concurrency:');
    const app10 = createApp();
    const server10 = app10.listen(0);
    const address10 = server10.address() as AddressInfo;
    const baseUrl10 = `http://127.0.0.1:${address10.port}/api/auth`;
    let failedHttpCount10 = 0;

    try {
      const limiter = authLimiter as unknown as { resetKey?: (k: string) => Promise<void> };
      if (typeof limiter.resetKey === 'function') {
        await limiter.resetKey('127.0.0.1');
        await limiter.resetKey('::1');
        await limiter.resetKey('::ffff:127.0.0.1');
      }
      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 30000;
      // (a) Old token presented within grace window => 200 with new token, sessions NOT revoked
      const g1Email = `verify-auth-${testRunId}-g1@athletiq.test`;
      const g1Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grace User 1', email: g1Email, password: 'Password123' }),
      });
      const g1RegJson = (await g1Reg.json()) as { data?: { user?: { id: string } } };
      if (g1RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g1RegJson.data.user.id));
      }
      const cookie1 = extractCookie(g1Reg.headers.get('set-cookie'));

      // First rotation
      const rot1Res = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: cookie1 },
      });
      assert(rot1Res.status === 200, 'Initial token rotation succeeds (200 OK)');
      extractCookie(rot1Res.headers.get('set-cookie'));

      // Re-present cookie1 within grace window (e.g. rapid reload F5)
      const graceRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: cookie1 },
      });
      if (graceRes.status !== 200) {
        console.log('graceRes error response:', await graceRes.json());
      }
      assert(
        graceRes.status === 200,
        'Old token presented within grace window returns 200 with new token (test a)'
      );
      const userG1 = await User.findOne({ email: g1Email }).select('+refreshTokens');
      assert(
        (userG1?.refreshTokens?.length ?? 0) === 1,
        'Sessions not revoked on grace reuse (test a)'
      );

      // (b) Same old token after window (expired) => 401 and ALL sessions revoked
      const originalGraceMs = env.REFRESH_GRACE_MS;
      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 100; // 100ms
      await new Promise((resolve) => setTimeout(resolve, 150)); // wait past window

      const expiredGraceRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: cookie1 },
      });
      failedHttpCount10++;
      assert(
        expiredGraceRes.status === 401,
        'Old token presented after grace window returns 401 (test b)'
      );
      const userG1AfterExpire = await User.findOne({ email: g1Email }).select('+refreshTokens');
      assert(
        (userG1AfterExpire?.refreshTokens?.length ?? 0) === 0,
        'ALL sessions revoked when token presented after grace window (test b)'
      );
      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = originalGraceMs;

      // (c) Promise.all of 2 refreshes with same token => no 500, and BOTH returned tokens can each do ONE refresh
      const g2Email = `verify-auth-${testRunId}-g2@athletiq.test`;
      const g2Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grace User 2', email: g2Email, password: 'Password123' }),
      });
      const g2RegJson = (await g2Reg.json()) as { data?: { user?: { id: string } } };
      if (g2RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g2RegJson.data.user.id));
      }
      const g2CookieInitial = extractCookie(g2Reg.headers.get('set-cookie'));

      const [raceRes1, raceRes2] = await Promise.all([
        fetch(`${baseUrl10}/refresh`, { method: 'POST', headers: { Cookie: g2CookieInitial } }),
        fetch(`${baseUrl10}/refresh`, { method: 'POST', headers: { Cookie: g2CookieInitial } }),
      ]);
      assert(
        raceRes1.status === 200 && raceRes2.status === 200,
        'Parallel refreshes with same token both succeed with 200 without 500 (test c)'
      );

      const returnedCookie1 = extractCookie(raceRes1.headers.get('set-cookie'));
      const returnedCookie2 = extractCookie(raceRes2.headers.get('set-cookie'));

      const postRaceRes1 = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: returnedCookie1 },
      });
      assert(
        postRaceRes1.status === 200,
        'First returned token can successfully refresh inside window (test c)'
      );

      const postRaceRes2 = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: returnedCookie2 },
      });
      assert(
        postRaceRes2.status === 200,
        'Second returned token can successfully refresh inside window (test c)'
      );

      // (d) Window is not extendable: present old token A inside window, then after original window ends => 401
      const g3Email = `verify-auth-${testRunId}-g3@athletiq.test`;
      const g3Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grace User 3', email: g3Email, password: 'Password123' }),
      });
      const g3RegJson = (await g3Reg.json()) as { data?: { user?: { id: string } } };
      if (g3RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g3RegJson.data.user.id));
      }
      const tokenA = extractCookie(g3Reg.headers.get('set-cookie'));

      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 300; // 300ms window

      // Replace token A -> token B
      const repRes = await fetch(`${baseUrl10}/refresh`, { method: 'POST', headers: { Cookie: tokenA } });
      assert(repRes.status === 200, 'Token A rotated to Token B (200 OK)');

      // At 50ms (well inside 300ms window), present token A
      await new Promise((resolve) => setTimeout(resolve, 50));
      const graceReuseA = await fetch(`${baseUrl10}/refresh`, { method: 'POST', headers: { Cookie: tokenA } });
      assert(graceReuseA.status === 200, 'Grace rotation of Token A succeeds inside window (test d)');

      // Wait 350ms (total time since Token A was replaced is ~400ms > 300ms window)
      await new Promise((resolve) => setTimeout(resolve, 350));
      const lateReuseA = await fetch(`${baseUrl10}/refresh`, { method: 'POST', headers: { Cookie: tokenA } });
      failedHttpCount10++;
      assert(
        lateReuseA.status === 401,
        'Re-presenting Token A after original window ended returns 401 (unextendable window) (test d)'
      );
      const userG3 = await User.findOne({ email: g3Email }).select('+refreshTokens');
      assert(
        (userG3?.refreshTokens?.length ?? 0) === 0,
        'Sessions revoked when old token reused after original window expired (test d)'
      );
      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = originalGraceMs;

      // (e) Random token => 401 with no side effect on second user's sessions
      const g4Email = `verify-auth-${testRunId}-g4@athletiq.test`;
      const g4Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grace User 4', email: g4Email, password: 'Password123' }),
      });
      const g4RegJson = (await g4Reg.json()) as { data?: { user?: { id: string } } };
      if (g4RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g4RegJson.data.user.id));
      }

      const randomRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: 'refreshToken=definitely.invalid.token' },
      });
      failedHttpCount10++;
      assert(randomRes.status === 401, 'Random invalid token returns 401 (test e)');
      const userG4 = await User.findOne({ email: g4Email }).select('+refreshTokens');
      assert(
        (userG4?.refreshTokens?.length ?? 0) === 1,
        'Second user sessions completely untouched by random token (test e)'
      );

      // (f) User with TWO sessions: grace rotation of session 1 does not touch session 2
      const g5Email = `verify-auth-${testRunId}-g5@athletiq.test`;
      const g5Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'DesktopBrowser' },
        body: JSON.stringify({ name: 'Grace User 5', email: g5Email, password: 'Password123' }),
      });
      const g5RegJson = (await g5Reg.json()) as { data?: { user?: { id: string } } };
      if (g5RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g5RegJson.data.user.id));
      }
      const sess1Cookie = extractCookie(g5Reg.headers.get('set-cookie'));

      // Login from mobile device to create session 2
      const g5Login2 = await fetch(`${baseUrl10}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'MobileBrowser' },
        body: JSON.stringify({ email: g5Email, password: 'Password123' }),
      });
      const sess2Cookie = extractCookie(g5Login2.headers.get('set-cookie'));

      // Rotate session 1
      const sess1Rot = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: sess1Cookie },
      });
      assert(sess1Rot.status === 200, 'Session 1 rotated (200 OK)');

      // Grace rotate session 1 using old sess1Cookie
      const sess1Grace = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: sess1Cookie },
      });
      assert(
        sess1Grace.status === 200,
        'User with two sessions: grace rotation of session 1 succeeds (test f)'
      );

      // Session 2 is untouched and can still refresh
      const sess2Rot = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: sess2Cookie },
      });
      assert(
        sess2Rot.status === 200,
        'Session 2 remains active and valid after grace rotation of session 1 (test f)'
      );

      // (g) Audit action REFRESH_GRACE_REUSE exists with IDs only
      const graceAudit = await AuditLog.findOne({ action: 'REFRESH_GRACE_REUSE' }).sort({ createdAt: -1 });
      assert(
        graceAudit !== null,
        'AuditLog entry exists for REFRESH_GRACE_REUSE (test g)'
      );
      const auditMetaKeys = Object.keys(graceAudit?.meta ?? {});
      const hasOnlyIds = auditMetaKeys.every((k) => k.toLowerCase().includes('id'));
      assert(
        hasOnlyIds,
        'AuditLog meta contains IDs only with zero sensitive fields (test g)'
      );

      // (h) Cross-element match prevention & grace hardening:
      // A session with TWO recentHashes entries: X older than window and Y fresh.
      // Presenting X => 401, ALL sessions revoked, NO access token returned.
      const g6Email = `verify-auth-${testRunId}-g6@athletiq.test`;
      const g6Reg = await fetch(`${baseUrl10}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grace User 6', email: g6Email, password: 'Password123' }),
      });
      const g6RegJson = (await g6Reg.json()) as { data?: { user?: { id: string } } };
      if (g6RegJson.data?.user?.id) {
        createdUserIds.push(new Types.ObjectId(g6RegJson.data.user.id));
      }
      const tokenX = extractCookie(g6Reg.headers.get('set-cookie'));

      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 250; // 250ms window

      // First rotation: Token X replaced by Token Y (X enters recentHashes at T0)
      const rotXRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: tokenX },
      });
      assert(rotXRes.status === 200, 'First rotation (X -> Y) succeeds (200 OK)');
      const tokenY = extractCookie(rotXRes.headers.get('set-cookie'));

      // Wait 130ms
      await new Promise((resolve) => setTimeout(resolve, 130));

      // Second rotation: Token Y replaced by Token Z (Y enters recentHashes at T1)
      const rotYRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: tokenY },
      });
      assert(rotYRes.status === 200, 'Second rotation (Y -> Z) succeeds (200 OK)');

      // Wait 140ms (now elapsed since T0 is ~270ms > 250ms, so X is expired; elapsed since T1 is ~140ms < 250ms, so Y is fresh)
      await new Promise((resolve) => setTimeout(resolve, 140));

      // Presenting expired token X must NOT match against fresh entry Y's timestamp
      const expiredXRes = await fetch(`${baseUrl10}/refresh`, {
        method: 'POST',
        headers: { Cookie: tokenX },
      });
      failedHttpCount10++;
      assert(
        expiredXRes.status === 401,
        'Presenting expired token X when session contains another fresh entry returns 401 (test h)'
      );

      const expiredXJson = (await expiredXRes.json()) as { data?: { accessToken?: string } };
      assert(
        expiredXJson.data?.accessToken === undefined,
        'NO access token is returned when presenting expired token X (test h)'
      );

      const userG6 = await User.findOne({ email: g6Email }).select('+refreshTokens');
      assert(
        (userG6?.refreshTokens?.length ?? 0) === 0,
        'ALL sessions revoked when expired token X is presented (test h)'
      );

      (env as { REFRESH_GRACE_MS: number }).REFRESH_GRACE_MS = 30000;

      assert(
        failedHttpCount10 <= 8,
        `Group 10 failed HTTP requests count: ${failedHttpCount10} (strictly <= 8)`
      );
    } finally {
      server10.close();
    }

    // 11. Production Cookie & CORS Verification (Step 11A)
    console.log('\n11. Production Cookie & CORS Verification:');

    // 11a. Pure-function matrix
    const devOpts = getRefreshCookieOptions({ sameSite: 'lax', secure: false });
    assert(
      devOpts.httpOnly === true &&
        devOpts.secure === false &&
        devOpts.sameSite === 'lax' &&
        devOpts.path === '/api/auth',
      'Cookie pure matrix: development default (httpOnly=true, secure=false, sameSite=lax, path=/api/auth)'
    );

    const prodOpts = getRefreshCookieOptions({ sameSite: 'lax', secure: true });
    assert(
      prodOpts.httpOnly === true &&
        prodOpts.secure === true &&
        prodOpts.sameSite === 'lax' &&
        prodOpts.path === '/api/auth',
      'Cookie pure matrix: production default (httpOnly=true, secure=true, sameSite=lax, path=/api/auth)'
    );

    const noneSecureOpts = getRefreshCookieOptions({ sameSite: 'none', secure: true });
    assert(
      noneSecureOpts.httpOnly === true &&
        noneSecureOpts.secure === true &&
        noneSecureOpts.sameSite === 'none' &&
        noneSecureOpts.path === '/api/auth',
      'Cookie pure matrix: none+secure (httpOnly=true, secure=true, sameSite=none, path=/api/auth)'
    );

    let noneInsecureThrew = false;
    try {
      getRefreshCookieOptions({ sameSite: 'none', secure: false });
    } catch {
      noneInsecureThrew = true;
    }
    assert(noneInsecureThrew, 'Cookie pure matrix: sameSite=none without secure=true throws error');

    const setOpts = getRefreshCookieOptions({ sameSite: 'lax', secure: true, domain: 'athletiq.app' });
    const clearOpts = getRefreshCookieOptions({ sameSite: 'lax', secure: true, domain: 'athletiq.app', isClear: true });
    assert(
      setOpts.path === clearOpts.path &&
        setOpts.domain === clearOpts.domain &&
        setOpts.sameSite === clearOpts.sameSite &&
        setOpts.secure === clearOpts.secure &&
        setOpts.httpOnly === clearOpts.httpOnly,
      'Cookie pure matrix: clear options equal set options (path, domain, sameSite, secure, httpOnly parity)'
    );

    // 11b. HTTP Set-Cookie header contains "SameSite=Lax" by default
    const defaultCookie = regRes.headers.get('set-cookie') || '';
    assert(
      defaultCookie.includes('SameSite=Lax'),
      'Default HTTP Set-Cookie header contains "SameSite=Lax"'
    );

    // 11c. Configured Set-Cookie header contains "SameSite=None" and "Secure"
    const origSameSite = env.COOKIE_SAMESITE;
    const origSecure = env.COOKIE_SECURE;
    (env as { COOKIE_SAMESITE: string; COOKIE_SECURE: boolean }).COOKIE_SAMESITE = 'none';
    (env as { COOKIE_SAMESITE: string; COOKIE_SECURE: boolean }).COOKIE_SECURE = true;

    const appProd = createApp();
    const serverProd = appProd.listen(0);
    const prodAddress = serverProd.address() as AddressInfo;
    const prodUrl = `http://127.0.0.1:${prodAddress.port}/api/auth`;

    try {
      const prodLoginRes = await fetch(`${prodUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user1Email,
          password: 'NewPassword123',
        }),
      });
      const prodSetCookie = prodLoginRes.headers.get('set-cookie') || '';
      assert(
        prodSetCookie.includes('SameSite=None') && prodSetCookie.includes('Secure'),
        'Configured Set-Cookie header contains "SameSite=None" and "Secure"'
      );

      const prodLogoutRes = await fetch(`${prodUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: extractCookie(prodSetCookie),
        },
      });
      const prodClearCookie = prodLogoutRes.headers.get('set-cookie') || '';
      assert(
        prodClearCookie.includes('SameSite=None') &&
          prodClearCookie.includes('Secure') &&
          prodClearCookie.includes('Path=/api/auth'),
        'Logout clearCookie clears with matching SameSite=None, Secure, and Path=/api/auth attributes'
      );
    } finally {
      serverProd.close();
      (env as { COOKIE_SAMESITE: string; COOKIE_SECURE: boolean }).COOKIE_SAMESITE = origSameSite;
      (env as { COOKIE_SAMESITE: string; COOKIE_SECURE: boolean }).COOKIE_SECURE = origSecure;
    }

    // 11d. CORS Preflight: allowed origin vs disallowed origin
    const appCors = createApp({ corsOrigins: ['https://athletiq-frontend.vercel.app'] });
    const serverCors = appCors.listen(0);
    const corsAddress = serverCors.address() as AddressInfo;
    const corsUrl = `http://127.0.0.1:${corsAddress.port}/api/auth`;

    try {
      const allowedPreflight = await fetch(`${corsUrl}/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://athletiq-frontend.vercel.app',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert(
        allowedPreflight.headers.get('access-control-allow-origin') ===
          'https://athletiq-frontend.vercel.app',
        'CORS preflight from allowed origin returns exactly that origin'
      );
      assert(
        allowedPreflight.headers.get('access-control-allow-credentials') === 'true',
        'CORS preflight from allowed origin returns Access-Control-Allow-Credentials: true'
      );

      const disallowedPreflight = await fetch(`${corsUrl}/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://unauthorized-domain.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert(
        disallowedPreflight.headers.get('access-control-allow-origin') === null,
        'CORS preflight from disallowed origin returns no Access-Control-Allow-Origin header'
      );
    } finally {
      serverCors.close();
    }
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
