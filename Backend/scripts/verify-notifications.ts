import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
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
  Match,
  MatchEvent,
  AuditLog,
  ContactMessage,
  Notification,
  PasswordReset,
} from '../src/models/index.js';
import { notify } from '../src/services/notification.service.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { findOrphans } from './cleanup-test-orphans.js';

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

  if (url.includes('/api/auth') && res.status >= 400) {
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

function getAuthHeader(user: { _id: Types.ObjectId; role: string }): {
  Authorization: string;
  'Content-Type': string;
} {
  const token = signAccessToken(
    user._id.toString(),
    user.role as 'Admin' | 'Coach' | 'Athlete' | 'Organizer'
  );
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
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
    officials: await mongoose.connection.collection('officials').countDocuments(),
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
  console.log('--- VERIFYING NOTIFICATIONS SUITE (STEP 10) ---');
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
  const createdNotificationIds: Types.ObjectId[] = [];
  const defaultPw = await hashPassword('AthletiqTest2026!');

  async function createTestUser(role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer', name: string) {
    const user = await User.create({
      name,
      email: `test-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@athletiq.test`,
      passwordHash: defaultPw,
      role,
      isActive: true,
    });
    createdUserIds.push(user._id);
    return user;
  }

  // GROUP 1: In-Memory / Service Model Validation & FIFO Cap 200
  console.log('\n--- GROUP 1: MODEL VALIDATION & FIFO CAP 200 ---');
  const user1 = await createTestUser('Athlete', 'FIFO Athlete');

  // Insert 205 notifications for user1 via notify()
  const burstPayloads = Array.from({ length: 205 }, (_, i) => ({
    type: 'System' as const,
    title: `Notification ${i + 1}`,
    body: `Body test message for index ${i + 1}`,
    link: '/dashboard',
  }));

  for (const p of burstPayloads) {
    await notify([user1._id], p);
  }

  const user1Notifs = await Notification.find({ user: user1._id }).sort({ createdAt: 1 });
  assert(user1Notifs.length === 200, `User notification count strictly capped at 200 (found: ${user1Notifs.length})`);
  assert(user1Notifs[0].title === 'Notification 6', `FIFO cap pruned oldest items (first item is Notification 6, found: ${user1Notifs[0].title})`);
  assert(user1Notifs[user1Notifs.length - 1].title === 'Notification 205', `Newest item preserved (last item is Notification 205)`);

  // Collect these IDs for cleanup
  user1Notifs.forEach((n) => createdNotificationIds.push(n._id));

  // Invalid link rejection
  const invalidLinkNotif = new Notification({
    user: user1._id,
    type: 'System',
    title: 'Test Invalid',
    body: 'Test body',
    link: 'https://evil.com', // Not starting with single slash
  });
  let linkValidationError = false;
  try {
    await invalidLinkNotif.validate();
  } catch {
    linkValidationError = true;
  }
  assert(linkValidationError, 'Notification link not starting with single slash fails validation');

  const doubleSlashNotif = new Notification({
    user: user1._id,
    type: 'System',
    title: 'Test Invalid',
    body: 'Test body',
    link: '//evil.com', // Double slash
  });
  let doubleSlashError = false;
  try {
    await doubleSlashNotif.validate();
  } catch {
    doubleSlashError = true;
  }
  assert(doubleSlashError, 'Notification link with double slash fails validation');

  // GROUP 2: HTTP Authentication & RBAC
  console.log('\n--- GROUP 2: HTTP AUTH & RBAC ---');
  const { group: group2, fetchGroup: fetch2 } = startServerGroup();

  const unauthRes = await fetch2('/notifications');
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/notifications returns 401');

  const unauthCountRes = await fetch2('/notifications/unread-count');
  assert(unauthCountRes.status === 401, 'Unauthenticated GET /api/notifications/unread-count returns 401');

  const unauthReadRes = await fetch2(`/notifications/${new Types.ObjectId()}/read`, { method: 'PATCH' });
  assert(unauthReadRes.status === 401, 'Unauthenticated PATCH /api/notifications/:id/read returns 401');

  const unauthReadAllRes = await fetch2('/notifications/read-all', { method: 'POST' });
  assert(unauthReadAllRes.status === 401, 'Unauthenticated POST /api/notifications/read-all returns 401');

  const g2Count = group2.getRequestCount();
  assert(g2Count < 90, `Group 2 request count (${g2Count}) strictly below 90`);
  await group2.close();

  // GROUP 3: Listing & Unread Count API
  console.log('\n--- GROUP 3: LISTING & UNREAD COUNT ---');
  const { group: group3, fetchGroup: fetch3 } = startServerGroup();
  const user2 = await createTestUser('Coach', 'Listing Coach');

  // Create 5 notifications for user2
  for (let i = 1; i <= 5; i++) {
    await notify([user2._id], {
      type: 'Announcement',
      title: `Coach Announcement ${i}`,
      body: `Details for announcement ${i}`,
      link: '/dashboard',
    });
  }
  const u2Docs = await Notification.find({ user: user2._id });
  u2Docs.forEach((d) => createdNotificationIds.push(d._id));

  const listRes = await fetch3('/notifications?page=1&limit=3', {
    headers: getAuthHeader(user2),
  });
  assert(listRes.status === 200, 'GET /api/notifications returns 200 OK');
  const listBody = listRes.body as { data: { title: string }[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
  assert(Array.isArray(listBody.data) && listBody.data.length === 3, 'Pagination limit=3 returns exactly 3 items');
  assert(listBody.pagination.total === 5, 'Pagination total reports 5 items');
  assert(listBody.pagination.totalPages === 2, 'Pagination totalPages correctly calculated as 2');
  assert(listBody.data[0].title === 'Coach Announcement 5', 'Notifications returned in newest-first order');

  const countRes = await fetch3('/notifications/unread-count', {
    headers: getAuthHeader(user2),
  });
  assert(countRes.status === 200, 'GET /api/notifications/unread-count returns 200 OK');
  const countBody = countRes.body as { data: { unreadCount: number } };
  assert(countBody.data.unreadCount === 5, 'Unread count accurately reports 5 unread');

  const g3Count = group3.getRequestCount();
  assert(g3Count < 90, `Group 3 request count (${g3Count}) strictly below 90`);
  await group3.close();

  // GROUP 4: Mark As Read & Cross-Tenant Isolation
  console.log('\n--- GROUP 4: MARK AS READ & CROSS-TENANT ISOLATION ---');
  const { group: group4, fetchGroup: fetch4 } = startServerGroup();
  const user3 = await createTestUser('Athlete', 'Tenant Athlete');

  const notifToRead = u2Docs[0];

  // user3 tries to read user2's notification
  const crossReadRes = await fetch4(`/notifications/${notifToRead._id}/read`, {
    method: 'PATCH',
    headers: getAuthHeader(user3),
  });
  assert(crossReadRes.status === 404, 'Cross-tenant reading another user notification returns 404');

  // user2 reads their own notification
  const readRes = await fetch4(`/notifications/${notifToRead._id}/read`, {
    method: 'PATCH',
    headers: getAuthHeader(user2),
  });
  assert(readRes.status === 200, 'PATCH /api/notifications/:id/read returns 200 OK');
  const readBody = readRes.body as { data: { readAt: string | null } };
  assert(readBody.data.readAt !== null, 'readAt timestamp successfully set on single read');

  // Check unread count after 1 read
  const countAfter1 = await fetch4('/notifications/unread-count', {
    headers: getAuthHeader(user2),
  });
  assert((countAfter1.body as { data: { unreadCount: number } }).data.unreadCount === 4, 'Unread count decreased to 4');

  // Mark all as read
  const readAllRes = await fetch4('/notifications/read-all', {
    method: 'POST',
    headers: getAuthHeader(user2),
  });
  assert(readAllRes.status === 200, 'POST /api/notifications/read-all returns 200 OK');

  const countAfterAll = await fetch4('/notifications/unread-count', {
    headers: getAuthHeader(user2),
  });
  assert((countAfterAll.body as { data: { unreadCount: number } }).data.unreadCount === 0, 'Unread count dropped to 0 after read-all');

  const g4Count = group4.getRequestCount();
  assert(g4Count < 90, `Group 4 request count (${g4Count}) strictly below 90`);
  await group4.close();

  // CLEANUP TEST DATA
  console.log('\n--- CLEANING UP TEST CREATED RESOURCES ---');
  const delNotifs = await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
  console.log(`Deleted test notifications: ${delNotifs.deletedCount}`);
  const delUsers = await User.deleteMany({ _id: { $in: createdUserIds } });
  console.log(`Deleted test users: ${delUsers.deletedCount}`);

  const afterCounts = await getDbCounts();
  console.log('Database Counts After Cleanup:');
  console.log(JSON.stringify(afterCounts, null, 2));

  assert(beforeCounts.users === afterCounts.users, `Users count restored (${beforeCounts.users} === ${afterCounts.users})`);
  assert(beforeCounts.notifications === afterCounts.notifications, `Notifications count restored (${beforeCounts.notifications} === ${afterCounts.notifications})`);
  assert(beforeCounts.auditLogs === afterCounts.auditLogs, `AuditLogs count restored (${beforeCounts.auditLogs} === ${afterCounts.auditLogs})`);

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
  console.error('Fatal verify:notifications error:', err);
  process.exit(1);
});
