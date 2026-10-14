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
  Official,
  Match,
  MatchEvent,
  AuditLog,
  ContactMessage,
  Notification,
  PasswordReset,
} from '../src/models/index.js';
import { getMondayUtc, generateWeeklyBuckets } from '../src/services/analytics.service.js';
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

function deepFindKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (!obj || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) deepFindKeys(item, forbiddenKeys, found);
    return found;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (forbiddenKeys.includes(key)) {
      found.push(key);
    }
    deepFindKeys(value, forbiddenKeys, found);
  }
  return found;
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
  console.log('--- VERIFYING ANALYTICS SUITE (STEP 10) ---');
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
  const defaultPw = await hashPassword('AthletiqAnalytics2026!');

  async function createTestUser(role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer', name: string) {
    const user = await User.create({
      name,
      email: `test-analytics-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@athletiq.test`,
      passwordHash: defaultPw,
      role,
      isActive: true,
    });
    createdUserIds.push(user._id);
    return user;
  }

  // GROUP 1: RBAC & Route Authorization Matrix
  console.log('\n--- GROUP 1: RBAC & ROUTE AUTHORIZATION ---');
  const { group: group1, fetchGroup: fetch1 } = startServerGroup();

  const unauthRes = await fetch1('/analytics/overview');
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/analytics/overview returns 401 Unauthorized');

  const adminUser = await createTestUser('Admin', 'Analytics Admin');
  const coachUser = await createTestUser('Coach', 'Analytics Coach');
  const athleteUser = await createTestUser('Athlete', 'Analytics Athlete');
  const organizerUser = await createTestUser('Organizer', 'Analytics Organizer');

  const orgRes = await fetch1('/analytics/overview', { headers: getAuthHeader(organizerUser) });
  assert(orgRes.status === 403, 'Organizer access to GET /api/analytics/overview returns 403 Forbidden');

  const admRes = await fetch1('/analytics/overview', { headers: getAuthHeader(adminUser) });
  assert(admRes.status === 200, 'Admin access to GET /api/analytics/overview returns 200 OK');

  const cchRes = await fetch1('/analytics/overview', { headers: getAuthHeader(coachUser) });
  assert(cchRes.status === 200, 'Coach access to GET /api/analytics/overview returns 200 OK');

  const athRes = await fetch1('/analytics/overview', { headers: getAuthHeader(athleteUser) });
  assert(athRes.status === 200, 'Athlete access to GET /api/analytics/overview returns 200 OK');

  const g1Count = group1.getRequestCount();
  assert(g1Count < 90, `Group 1 request count (${g1Count}) strictly below 90`);
  await group1.close();

  // GROUP 2: Weekly Bucketing Mathematics (Monday 00:00:00.000 UTC)
  console.log('\n--- GROUP 2: WEEKLY BUCKETING MATHEMATICS ---');

  // Test Sunday: 2026-10-11T15:30:00.000Z -> Monday 2026-10-05T00:00:00.000Z
  const sundayTest = new Date('2026-10-11T15:30:00.000Z');
  const mondayFromSunday = getMondayUtc(sundayTest);
  assert(mondayFromSunday.toISOString() === '2026-10-05T00:00:00.000Z', 'Sunday maps to preceding Monday 00:00:00.000 UTC');

  // Test Monday: 2026-10-12T09:15:00.000Z -> Monday 2026-10-12T00:00:00.000Z
  const mondayTest = new Date('2026-10-12T09:15:00.000Z');
  const mondayFromMonday = getMondayUtc(mondayTest);
  assert(mondayFromMonday.toISOString() === '2026-10-12T00:00:00.000Z', 'Monday maps to same Monday 00:00:00.000 UTC');

  // Test Wednesday: 2026-10-14T22:00:00.000Z -> Monday 2026-10-12T00:00:00.000Z
  const wednesdayTest = new Date('2026-10-14T22:00:00.000Z');
  const mondayFromWed = getMondayUtc(wednesdayTest);
  assert(mondayFromWed.toISOString() === '2026-10-12T00:00:00.000Z', 'Wednesday maps to preceding Monday 00:00:00.000 UTC');

  // Test Saturday: 2026-10-17T03:00:00.000Z -> Monday 2026-10-12T00:00:00.000Z
  const saturdayTest = new Date('2026-10-17T03:00:00.000Z');
  const mondayFromSat = getMondayUtc(saturdayTest);
  assert(mondayFromSat.toISOString() === '2026-10-12T00:00:00.000Z', 'Saturday maps to preceding Monday 00:00:00.000 UTC');

  // Generate 8 weekly buckets
  const buckets = generateWeeklyBuckets(8);
  assert(buckets.length === 8, 'generateWeeklyBuckets(8) returns exactly 8 buckets');
  for (let i = 0; i < buckets.length; i++) {
    const d = new Date(buckets[i].weekStart);
    assert(d.getUTCDay() === 1, `Bucket ${i} starts on Monday (UTC day === 1)`);
    assert(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0, `Bucket ${i} starts at 00:00:00.000 UTC`);
    if (i > 0) {
      const prevD = new Date(buckets[i - 1].weekStart);
      const diffDays = (d.getTime() - prevD.getTime()) / (1000 * 60 * 60 * 24);
      assert(diffDays === 7, `Bucket ${i} is exactly 7 days after bucket ${i - 1}`);
    }
  }

  // GROUP 3: Admin Overview Metrics & Privacy Scan
  console.log('\n--- GROUP 3: ADMIN OVERVIEW METRICS & PRIVACY SCAN ---');
  const { group: group3, fetchGroup: fetch3 } = startServerGroup();

  const adminOverviewRes = await fetch3('/analytics/overview', { headers: getAuthHeader(adminUser) });
  assert(adminOverviewRes.status === 200, 'GET /analytics/overview for Admin returns 200');
  const adminBody = adminOverviewRes.body as {
    data: {
      role: string;
      weeklyRegistrations: { weekStart: string; label: string; count: number }[];
      weeklySessions: { weekStart: string; label: string; count: number }[];
      attendanceRate: number;
      tournamentSummary: { totalTournaments: number; totalMatches: number; completedMatches: number };
    };
  };

  assert(adminBody.data.role === 'Admin', 'Admin overview role is "Admin"');
  assert(Array.isArray(adminBody.data.weeklyRegistrations) && adminBody.data.weeklyRegistrations.length === 8, 'weeklyRegistrations contains exactly 8 weeks');
  assert(Array.isArray(adminBody.data.weeklySessions) && adminBody.data.weeklySessions.length === 8, 'weeklySessions contains exactly 8 weeks');
  assert(typeof adminBody.data.attendanceRate === 'number', 'attendanceRate is a numeric percentage');
  assert(typeof adminBody.data.tournamentSummary.totalTournaments === 'number', 'tournamentSummary.totalTournaments is a number');
  assert(typeof adminBody.data.tournamentSummary.completedMatches === 'number', 'tournamentSummary.completedMatches is a number');

  // Sensitive leak deep scan
  const adminLeaks = deepFindKeys(adminBody.data, ['passwordHash', 'refreshTokens', 'phone', 'medicalNotes']);
  assert(adminLeaks.length === 0, `No sensitive fields leaked in Admin analytics overview (found: ${adminLeaks.join(', ')})`);

  const g3Count = group3.getRequestCount();
  assert(g3Count < 90, `Group 3 request count (${g3Count}) strictly below 90`);
  await group3.close();

  // GROUP 4: Coach Overview Metrics & Privacy Scan
  console.log('\n--- GROUP 4: COACH OVERVIEW METRICS & PRIVACY SCAN ---');
  const { group: group4, fetchGroup: fetch4 } = startServerGroup();

  const coachOverviewRes = await fetch4('/analytics/overview', { headers: getAuthHeader(coachUser) });
  assert(coachOverviewRes.status === 200, 'GET /analytics/overview for Coach returns 200');
  const coachBody = coachOverviewRes.body as {
    data: {
      role: string;
      teamCount: number;
      athleteCount: number;
      weeklyAttendance: { weekStart: string; label: string; rate: number }[];
      skillAssessmentsTrend: { weekStart: string; label: string; averageScore: number }[];
    };
  };

  assert(coachBody.data.role === 'Coach', 'Coach overview role is "Coach"');
  assert(typeof coachBody.data.teamCount === 'number', 'teamCount is a number');
  assert(typeof coachBody.data.athleteCount === 'number', 'athleteCount is a number');
  assert(Array.isArray(coachBody.data.weeklyAttendance) && coachBody.data.weeklyAttendance.length === 8, 'weeklyAttendance contains 8 weekly items');
  assert(Array.isArray(coachBody.data.skillAssessmentsTrend) && coachBody.data.skillAssessmentsTrend.length === 8, 'skillAssessmentsTrend contains 8 weekly items');

  const coachLeaks = deepFindKeys(coachBody.data, ['passwordHash', 'refreshTokens', 'phone', 'medicalNotes']);
  assert(coachLeaks.length === 0, `No sensitive fields leaked in Coach analytics overview (found: ${coachLeaks.join(', ')})`);

  const g4Count = group4.getRequestCount();
  assert(g4Count < 90, `Group 4 request count (${g4Count}) strictly below 90`);
  await group4.close();

  // GROUP 5: Athlete Overview Metrics & Privacy Scan
  console.log('\n--- GROUP 5: ATHLETE OVERVIEW METRICS & PRIVACY SCAN ---');
  const { group: group5, fetchGroup: fetch5 } = startServerGroup();

  const athleteOverviewRes = await fetch5('/analytics/overview', { headers: getAuthHeader(athleteUser) });
  assert(athleteOverviewRes.status === 200, 'GET /analytics/overview for Athlete returns 200');
  const athleteBody = athleteOverviewRes.body as {
    data: {
      role: string;
      weeklyAttendance: { weekStart: string; label: string; attended: number; total: number }[];
      skillProgression: { date: string; overall: number; technical: number }[];
      goalsSummary: { active: number; achieved: number; total: number };
    };
  };

  assert(athleteBody.data.role === 'Athlete', 'Athlete overview role is "Athlete"');
  assert(Array.isArray(athleteBody.data.weeklyAttendance) && athleteBody.data.weeklyAttendance.length === 8, 'Athlete weeklyAttendance contains 8 weekly items');
  assert(Array.isArray(athleteBody.data.skillProgression), 'skillProgression is an array');
  assert(typeof athleteBody.data.goalsSummary.active === 'number', 'goalsSummary.active is a number');
  assert(typeof athleteBody.data.goalsSummary.achieved === 'number', 'goalsSummary.achieved is a number');

  const athleteLeaks = deepFindKeys(athleteBody.data, ['passwordHash', 'refreshTokens', 'phone', 'medicalNotes']);
  assert(athleteLeaks.length === 0, `No sensitive fields leaked in Athlete analytics overview (found: ${athleteLeaks.join(', ')})`);

  const g5Count = group5.getRequestCount();
  assert(g5Count < 90, `Group 5 request count (${g5Count}) strictly below 90`);
  await group5.close();

  // CLEANUP TEST CREATED RESOURCES
  console.log('\n--- CLEANING UP TEST CREATED RESOURCES ---');
  const delUsers = await User.deleteMany({ _id: { $in: createdUserIds } });
  console.log(`Deleted test Users: ${delUsers.deletedCount}`);

  const afterCounts = await getDbCounts();
  console.log('Database Counts After Cleanup:');
  console.log(JSON.stringify(afterCounts, null, 2));

  assert(beforeCounts.users === afterCounts.users, `Users count restored (${beforeCounts.users} === ${afterCounts.users})`);
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
  console.error('Fatal verify:analytics error:', err);
  process.exit(1);
});
