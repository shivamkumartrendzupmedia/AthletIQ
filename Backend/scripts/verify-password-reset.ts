import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import {
  User,
  Sport,
  Team,
  Coach,
  Athlete,
  TrainingSession,
  Attendance,
  Announcement,
  AcademyDocument,
  SkillAssessment,
  CoachFeedback,
  AthleteGoal,
  Tournament,
  TournamentTeam,
  Venue,
  Official,
  Match,
  MatchEvent,
  AuditLog,
  ContactMessage,
  Notification,
  PasswordReset,
} from '../src/models/index.js';
import { mailerService } from '../src/services/mailer.service.js';
import { hashPassword } from '../src/utils/password.js';
import { findOrphans } from './cleanup-test-orphans.js';
import { resetForgotPasswordLimiter } from '../src/middlewares/rateLimiter.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;
let failedAuthRequests = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

interface HttpResult {
  status: number;
  body: unknown;
  headers: Headers;
}

async function httpFetch(url: string, options: RequestInit = {}): Promise<HttpResult> {
  totalHttpRequests++;
  const res = await fetch(url, options);
  let body: unknown = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }

  // Count failed /api/auth requests excluding intentional test invalidations
  if (url.includes('/api/auth') && res.status >= 400 && !url.includes('/forgot-password') && !url.includes('/reset-password')) {
    failedAuthRequests++;
  }

  return { status: res.status, body, headers: res.headers };
}

interface TestServerGroup {
  baseUrl: string;
  close: () => Promise<void>;
  getRequestCount: () => number;
}

function startServerGroup(): {
  group: TestServerGroup;
  fetchGroup: (path: string, options?: RequestInit) => Promise<HttpResult>;
} {
  const app = createApp();
  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  let groupRequests = 0;

  const group: TestServerGroup = {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
    getRequestCount: () => groupRequests,
  };

  const fetchGroup = async (path: string, options: RequestInit = {}) => {
    groupRequests++;
    return await httpFetch(`${baseUrl}${path}`, options);
  };

  return { group, fetchGroup };
}

async function getDbCounts() {
  return {
    users: await User.countDocuments(),
    sports: await Sport.countDocuments(),
    teams: await Team.countDocuments(),
    coaches: await Coach.countDocuments(),
    athletes: await Athlete.countDocuments(),
    sessions: await TrainingSession.countDocuments(),
    attendance: await Attendance.countDocuments(),
    announcements: await Announcement.countDocuments(),
    documents: await AcademyDocument.countDocuments(),
    assessments: await SkillAssessment.countDocuments(),
    feedback: await CoachFeedback.countDocuments(),
    goals: await AthleteGoal.countDocuments(),
    tournaments: await Tournament.countDocuments(),
    tournamentTeams: await TournamentTeam.countDocuments(),
    venues: await Venue.countDocuments(),
    officials: await Official.countDocuments(),
    matches: await Match.countDocuments(),
    matchEvents: await MatchEvent.countDocuments(),
    auditLogs: await AuditLog.countDocuments(),
    contactMessages: await ContactMessage.countDocuments(),
    notifications: await Notification.countDocuments(),
    passwordResets: await PasswordReset.countDocuments(),
  };
}

async function run(): Promise<void> {
  console.log('\n========================================');
  console.log('--- VERIFYING PASSWORD RESET SUITE (STEP 10) ---');
  console.log('========================================\n');

  await connectDB();

  // Refuse to run if orphans exist
  const initialOrphans = await findOrphans();
  if (initialOrphans.length > 0) {
    console.error(`\n[ABORT] Cannot run verification: ${initialOrphans.length} orphans already exist in DB.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('Pre-check: Verified 0 database orphans present.');

  const beforeCounts = await getDbCounts();
  console.log('Initial Database Baseline Counts:');
  console.log(JSON.stringify(beforeCounts, null, 2));

  const createdUserIds: Types.ObjectId[] = [];
  const createdPasswordResetIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];
  const initialAuditLogsCount = beforeCounts.auditLogs;

  const defaultPw = await hashPassword('AthletiqOld2026!');

  async function createTestUser(email: string, name: string) {
    const user = await User.create({
      name,
      email,
      passwordHash: defaultPw,
      role: 'Athlete',
      isActive: true,
    });
    createdUserIds.push(user._id);
    return user;
  }

  // GROUP 1: Forgot Password API & Rate Limiting
  console.log('\n--- GROUP 1: FORGOT PASSWORD ENDPOINT & DEFENSE-IN-DEPTH ---');
  const { group: group1, fetchGroup: fetch1 } = startServerGroup();
  resetForgotPasswordLimiter();
  mailerService.clearSentEmailsHistory();

  // 1. Unknown user email receives constant 200 response
  const unknownRes = await fetch1('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent-user@nowhere.test' }),
  });
  assert(unknownRes.status === 200, 'POST /auth/forgot-password with unknown email returns 200 constant response');
  assert(
    (unknownRes.body as { success: boolean; message: string }).message ===
      'If that email exists, password reset instructions have been sent.',
    'Response message is timing-safe constant statement'
  );
  assert(mailerService.getSentEmailsHistory().length === 0, 'No email dispatched for unknown address');

  // 2. Known user email receives identical constant 200 response
  const user1Email = `pw-reset-${Date.now()}@athletiq.test`;
  const user1 = await createTestUser(user1Email, 'Reset Athlete');

  const knownRes = await fetch1('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email }),
  });
  assert(knownRes.status === 200, 'POST /auth/forgot-password with known email returns 200');
  assert(
    (knownRes.body as { message: string }).message === (unknownRes.body as { message: string }).message,
    'Known and unknown responses return exact identical message'
  );

  // Check email sent
  const sentEmails = mailerService.getSentEmailsHistory();
  assert(sentEmails.length === 1, 'Transactional email dispatched to known user');
  assert(sentEmails[0].to === user1Email, 'Email addressed to correct recipient');
  const matchToken = sentEmails[0].text.match(/token=([a-f0-9]{64})/);
  assert(Boolean(matchToken), 'Email body contains 64-character hex reset token');
  const rawToken = matchToken ? matchToken[1] : '';

  // Verify DB record stores sha256 tokenHash, NEVER rawToken
  const resetDoc = await PasswordReset.findOne({ user: user1._id });
  assert(Boolean(resetDoc), 'PasswordReset document created in database');
  if (resetDoc) {
    createdPasswordResetIds.push(resetDoc._id);
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert(resetDoc.tokenHash === expectedHash, 'DB stores sha256 hash of token, not raw token');
    assert(resetDoc.tokenHash !== rawToken, 'Raw token is NOT persisted in DB');
    const lifetimeMs = resetDoc.expiresAt.getTime() - resetDoc.createdAt.getTime();
    assert(Math.abs(lifetimeMs - 30 * 60 * 1000) < 5000, 'Token expiration set to 30 minutes (within clock tolerance)');
  }

  // 3. 60-second cooldown: immediate second request returns 200 but sends no new email
  const cooldownRes = await fetch1('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email }),
  });
  assert(cooldownRes.status === 200, 'Immediate second request returns 200 during 60s cooldown');
  assert(mailerService.getSentEmailsHistory().length === 1, 'No duplicate email dispatched during 60s cooldown');

  // 4. Schema validation: extra keys rejected by .strict()
  const strictRes = await fetch1('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, extraField: 'bad' }),
  });
  assert(strictRes.status === 400, 'POST /auth/forgot-password rejects unknown keys with .strict() (400)');

  // 5. IP Rate limiter: 5 attempts per hour; 6th attempt triggers 429
  let hitRateLimit = false;
  for (let i = 0; i < 4; i++) {
    await fetch1('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `ratelimit-probe-${i}@athletiq.test` }),
    });
  }
  const sixthRes = await fetch1('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ratelimit-probe-6@athletiq.test' }),
  });
  if (sixthRes.status === 429) {
    hitRateLimit = true;
  }
  assert(hitRateLimit, 'Dedicated forgot-password rate limiter triggers 429 Too Many Requests after 5 attempts');

  const g1Count = group1.getRequestCount();
  assert(g1Count < 90, `Group 1 request count (${g1Count}) strictly below 90`);
  await group1.close();

  // GROUP 2: Reset Password API & Atomic Consumption
  console.log('\n--- GROUP 2: RESET PASSWORD ATOMIC CONSUMPTION & SECURITY ---');
  const { group: group2, fetchGroup: fetch2 } = startServerGroup();

  // 1. Invalid token returns 400
  const invalidTokenRes = await fetch2('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      password: 'AthletiqNew2026!',
      confirmPassword: 'AthletiqNew2026!',
    }),
  });
  assert(invalidTokenRes.status === 400, 'POST /auth/reset-password with invalid token returns 400 Bad Request');

  // 2. Mismatched passwords returns 400
  const mismatchRes = await fetch2('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'AthletiqNew2026!',
      confirmPassword: 'DifferentPassword2026!',
    }),
  });
  assert(mismatchRes.status === 400, 'POST /auth/reset-password with mismatched passwords returns 400');

  // 3. Weak password returns 400
  const weakPwRes = await fetch2('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'weak',
      confirmPassword: 'weak',
    }),
  });
  assert(weakPwRes.status === 400, 'POST /auth/reset-password with weak password returns 400');

  // 4. Lock user account beforehand to verify reset unlocks account
  await User.findByIdAndUpdate(user1._id, {
    isLocked: true,
    failedLoginAttempts: 5,
    lockUntil: new Date(Date.now() + 60 * 60 * 1000),
  });

  // 5. Valid reset-password execution
  const validResetRes = await fetch2('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'AthletiqNew2026!',
      confirmPassword: 'AthletiqNew2026!',
    }),
  });
  assert(validResetRes.status === 200, 'Valid reset password returns 200 OK');

  // Verify user can log in with new password
  const newLoginRes = await fetch2('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user1Email,
      password: 'AthletiqNew2026!',
    }),
  });
  assert(newLoginRes.status === 200, 'User successfully logs in with new password');

  // Verify account lockout was cleared
  const updatedUser = await User.findById(user1._id);
  assert(updatedUser?.isLocked === false, 'Account unlocked upon successful password reset');
  assert(updatedUser?.failedLoginAttempts === 0, 'Failed login attempts reset to 0');

  // 6. Old password fails
  const oldLoginRes = await fetch2('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user1Email,
      password: 'AthletiqOld2026!',
    }),
  });
  assert(oldLoginRes.status === 401, 'Login with old password fails (401 Unauthorized)');

  // 7. Atomic consumption: second attempt with same token fails
  const reuseRes = await fetch2('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'AthletiqThird2026!',
      confirmPassword: 'AthletiqThird2026!',
    }),
  });
  assert(reuseRes.status === 400, 'Token reuse rejected: already consumed token returns 400 Bad Request');

  const g2Count = group2.getRequestCount();
  assert(g2Count < 90, `Group 2 request count (${g2Count}) strictly below 90`);
  await group2.close();

  // Track created audit logs
  const testAuditLogs = await AuditLog.find({ actor: { $in: createdUserIds } }).select('_id');
  testAuditLogs.forEach((l) => createdAuditLogIds.push(l._id));

  // CLEANUP TEST DATA
  console.log('\n--- CLEANING UP TEST CREATED RESOURCES ---');
  const delResets = await PasswordReset.deleteMany({ _id: { $in: createdPasswordResetIds } });
  console.log(`Deleted test PasswordResets: ${delResets.deletedCount}`);
  const delAudit = await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
  console.log(`Deleted test AuditLogs: ${delAudit.deletedCount}`);
  const delUsers = await User.deleteMany({ _id: { $in: createdUserIds } });
  console.log(`Deleted test Users: ${delUsers.deletedCount}`);

  const afterCounts = await getDbCounts();
  console.log('Database Counts After Cleanup:');
  console.log(JSON.stringify(afterCounts, null, 2));

  assert(beforeCounts.users === afterCounts.users, `Users count restored (${beforeCounts.users} === ${afterCounts.users})`);
  assert(beforeCounts.passwordResets === afterCounts.passwordResets, `PasswordResets count restored (${beforeCounts.passwordResets} === ${afterCounts.passwordResets})`);
  assert(initialAuditLogsCount === afterCounts.auditLogs, `AuditLogs count restored (${initialAuditLogsCount} === ${afterCounts.auditLogs})`);

  const endingOrphans = await findOrphans();
  assert(endingOrphans.length === 0, `Ending orphans strictly 0 (found: ${endingOrphans.length})`);
  assert(failedAuthRequests <= 8, `Failed auth requests count (${failedAuthRequests}) strictly <= 8`);

  await mongoose.disconnect();

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal verify:password-reset error:', err);
  process.exit(1);
});
