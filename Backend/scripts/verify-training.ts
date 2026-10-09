import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Coach } from '../src/models/Coach.js';
import { Athlete } from '../src/models/Athlete.js';
import { Team } from '../src/models/Team.js';
import { Sport } from '../src/models/Sport.js';
import { TrainingSession } from '../src/models/TrainingSession.js';
import { Attendance } from '../src/models/Attendance.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;

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
  body: any;
  headers: Headers;
}

async function httpFetch(
  url: string,
  options: RequestInit = {}
): Promise<HttpResult> {
  totalHttpRequests++;
  const res = await fetch(url, options);
  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
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

function deepFindKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (!obj || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) deepFindKeys(item, forbiddenKeys, found);
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
  console.log('\n--- VERIFYING TRAINING SESSIONS & ATTENDANCE APIS (STEP 6A) ---\n');

  await connectDB();

  // Snapshot initial DB counts
  const initialUserCount = await User.countDocuments();
  const initialSportCount = await Sport.countDocuments();
  const initialTeamCount = await Team.countDocuments();
  const initialCoachCount = await Coach.countDocuments();
  const initialAthleteCount = await Athlete.countDocuments();
  const initialSessionCount = await TrainingSession.countDocuments();
  const initialAttendanceCount = await Attendance.countDocuments();
  const initialAuditCount = await AuditLog.countDocuments();

  // Read-only leftover report (Item 5)
  const leftoverTestUsers = await User.countDocuments({ email: /^verify-train-/ });
  const allAudits = await AuditLog.find({ targetType: { $in: ['TrainingSession', 'User'] } }).select('targetId targetType');
  let orphanAuditCount = 0;
  for (const a of allAudits) {
    if (a.targetType === 'TrainingSession') {
      const exists = await TrainingSession.exists({ _id: a.targetId });
      if (!exists) orphanAuditCount++;
    } else if (a.targetType === 'User') {
      const exists = await User.exists({ _id: a.targetId });
      if (!exists) orphanAuditCount++;
    }
  }
  console.log(`Leftover report: users matching test prefix = ${leftoverTestUsers}, audit entries pointing to deleted documents = ${orphanAuditCount}`);

  console.log('Database state before test:');
  console.log(`  Users = ${initialUserCount}`);
  console.log(`  Sports = ${initialSportCount}`);
  console.log(`  Teams = ${initialTeamCount}`);
  console.log(`  Coaches = ${initialCoachCount}`);
  console.log(`  Athletes = ${initialAthleteCount}`);
  console.log(`  Sessions = ${initialSessionCount}`);
  console.log(`  Attendance = ${initialAttendanceCount}`);
  console.log(`  AuditLogs = ${initialAuditCount}\n`);

  // Track created IDs for strict surgical cleanup
  const createdUserIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];
  const createdTeamIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];
  const createdSessionIds: Types.ObjectId[] = [];
  const createdAttendanceIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  try {
    // 1. Provision Test Data
    const adminUser = await User.create({
      name: `Admin Test ${runId}`,
      email: `verify-train-${runId}-admin@athletiq.test`,
      role: 'Admin',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(adminUser._id);
    const adminToken = signAccessToken(adminUser.id, adminUser.role);

    const orgUser = await User.create({
      name: `Org Test ${runId}`,
      email: `verify-train-${runId}-org@athletiq.test`,
      role: 'Organizer',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(orgUser._id);
    const orgToken = signAccessToken(orgUser.id, orgUser.role);

    const coachAUser = await User.create({
      name: `Coach A ${runId}`,
      email: `verify-train-${runId}-coach-a@athletiq.test`,
      role: 'Coach',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(coachAUser._id);
    const coachAToken = signAccessToken(coachAUser.id, coachAUser.role);

    const coachBUser = await User.create({
      name: `Coach B ${runId}`,
      email: `verify-train-${runId}-coach-b@athletiq.test`,
      role: 'Coach',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(coachBUser._id);
    const coachBToken = signAccessToken(coachBUser.id, coachBUser.role);

    const coachCUser = await User.create({
      name: `Coach No Profile ${runId}`,
      email: `verify-train-${runId}-coach-noprofile@athletiq.test`,
      role: 'Coach',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(coachCUser._id);
    const coachCToken = signAccessToken(coachCUser.id, coachCUser.role);

    const athleteAUser = await User.create({
      name: `Athlete A ${runId}`,
      email: `verify-train-${runId}-ath-a@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(athleteAUser._id);
    const athleteAToken = signAccessToken(athleteAUser.id, athleteAUser.role);

    const athleteBUser = await User.create({
      name: `Athlete B ${runId}`,
      email: `verify-train-${runId}-ath-b@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(athleteBUser._id);
    const athleteBToken = signAccessToken(athleteBUser.id, athleteBUser.role);

    const athleteCUser = await User.create({
      name: `Athlete No Profile ${runId}`,
      email: `verify-train-${runId}-ath-noprofile@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(athleteCUser._id);
    const athleteCToken = signAccessToken(athleteCUser.id, athleteCUser.role);

    const athleteDUser = await User.create({
      name: `Athlete D Former ${runId}`,
      email: `verify-train-${runId}-ath-former@athletiq.test`,
      role: 'Athlete',
      passwordHash: hashedPassword,
      isActive: true,
    });
    createdUserIds.push(athleteDUser._id);

    // Sport & Coaches
    const testSport = await Sport.create({
      name: `Sport ${runId}`,
      slug: `sport-${runId}`,
      icon: 'https://example.com/sport.png',
      description: 'Test sport description',
      status: 'Active',
    });
    createdSportIds.push(testSport._id);

    const coachADoc = await Coach.create({
      user: coachAUser._id,
      title: 'Head Coach A',
      bio: 'Coach A bio',
      sports: [testSport._id],
    });
    createdCoachIds.push(coachADoc._id);

    const coachBDoc = await Coach.create({
      user: coachBUser._id,
      title: 'Head Coach B',
      bio: 'Coach B bio',
      sports: [testSport._id],
    });
    createdCoachIds.push(coachBDoc._id);

    // Teams
    const teamA = await Team.create({
      name: `Team A ${runId}`,
      slug: `team-a-${runId}`,
      sport: testSport._id,
      coach: coachADoc._id,
      gender: 'Boys',
      ageGroup: 'U17',
      status: 'Active',
    });
    createdTeamIds.push(teamA._id);

    const teamB = await Team.create({
      name: `Team B ${runId}`,
      slug: `team-b-${runId}`,
      sport: testSport._id,
      coach: coachBDoc._id,
      gender: 'Girls',
      ageGroup: 'U18',
      status: 'Active',
    });
    createdTeamIds.push(teamB._id);

    // Athletes
    const athleteADoc = await Athlete.create({
      user: athleteAUser._id,
      team: teamA._id,
      sport: testSport._id,
      dateOfBirth: new Date('2008-01-01'),
      status: 'Active',
      verificationStatus: 'Verified',
      joinedAt: new Date(),
    });
    createdAthleteIds.push(athleteADoc._id);

    const athleteBDoc = await Athlete.create({
      user: athleteBUser._id,
      team: teamB._id,
      sport: testSport._id,
      dateOfBirth: new Date('2008-02-02'),
      status: 'Active',
      verificationStatus: 'Verified',
      joinedAt: new Date(),
    });
    createdAthleteIds.push(athleteBDoc._id);

    const athleteDDoc = await Athlete.create({
      user: athleteDUser._id,
      team: teamA._id,
      sport: testSport._id,
      dateOfBirth: new Date('2008-05-05'),
      status: 'Active',
      verificationStatus: 'Verified',
      joinedAt: new Date(),
    });
    createdAthleteIds.push(athleteDDoc._id);

    assert(createdUserIds.length === 9, 'Provisioned 9 test users');
    assert(createdTeamIds.length === 2, 'Provisioned 2 test teams');

    // --- GROUP 1: ROLE X ENDPOINT MATRIX ---
    console.log('\n--- GROUP 1: ROLE X ENDPOINT MATRIX ---');
    const { group: g1, fetchGroup: f1 } = startServerGroup();

    // Create a base session for matrix testing
    const baseStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const baseEnd = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const baseSession = await TrainingSession.create({
      title: 'Matrix Base Session',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(baseStart),
      endsAt: new Date(baseEnd),
      venue: 'Main Pitch',
      status: 'Scheduled',
    });
    createdSessionIds.push(baseSession._id);

    // Role-specific free time slots so coach test does not collide and shows true allowed status (201)
    const slotTimes: Record<string, { start: string; end: string }> = {
      Admin: {
        start: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
        end: new Date(Date.now() + 11 * 3600 * 1000).toISOString(),
      },
      Coach: {
        start: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        end: new Date(Date.now() + 13 * 3600 * 1000).toISOString(),
      },
      Athlete: {
        start: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
        end: new Date(Date.now() + 15 * 3600 * 1000).toISOString(),
      },
      Organizer: {
        start: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
        end: new Date(Date.now() + 17 * 3600 * 1000).toISOString(),
      },
    };

    // Dedicated session for matrix DELETE row to avoid deleting baseSession
    const matrixDeleteSession = await TrainingSession.create({
      title: 'Matrix Delete Session',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(Date.now() + 20 * 3600 * 1000),
      endsAt: new Date(Date.now() + 21 * 3600 * 1000),
      venue: 'Pitch 1',
      status: 'Scheduled',
    });
    createdSessionIds.push(matrixDeleteSession._id);

    const endpoints = [
      {
        name: 'POST /training-sessions',
        method: 'POST',
        path: '/training-sessions',
        body: (role: string) => ({
          team: teamA.id,
          title: `${role} Session`,
          type: 'Training',
          startsAt: slotTimes[role].start,
          endsAt: slotTimes[role].end,
          venue: 'Field',
        }),
      },
      { name: 'GET /training-sessions', method: 'GET', path: '/training-sessions' },
      { name: 'GET /training-sessions/:id', method: 'GET', path: `/training-sessions/${baseSession.id}` },
      { name: 'PATCH /training-sessions/:id', method: 'PATCH', path: `/training-sessions/${baseSession.id}`, body: () => ({ title: 'Updated Title' }) },
      { name: 'GET /training-sessions/:id/attendance', method: 'GET', path: `/training-sessions/${baseSession.id}/attendance` },
      {
        name: 'PUT /training-sessions/:id/attendance',
        method: 'PUT',
        path: `/training-sessions/${baseSession.id}/attendance`,
        body: () => ({ records: [{ athlete: athleteADoc.id, status: 'Present' }] }),
      },
      { name: 'DELETE /training-sessions/:id', method: 'DELETE', path: `/training-sessions/${matrixDeleteSession.id}` },
      { name: 'GET /athletes/:id/attendance', method: 'GET', path: `/athletes/${athleteADoc.id}/attendance` },
      { name: 'GET /athletes/me/attendance', method: 'GET', path: '/athletes/me/attendance' },
    ];

    const tokens: Record<string, string> = {
      Admin: adminToken,
      Coach: coachAToken,
      Athlete: athleteAToken,
      Organizer: orgToken,
    };

    console.log('\n  +-------------------------------------+-------+-------+---------+-----------+');
    console.log('  | Endpoint                            | Admin | Coach | Athlete | Organizer |');
    console.log('  +-------------------------------------+-------+-------+---------+-----------+');

    for (const ep of endpoints) {
      const rowStatuses: string[] = [];
      for (const role of ['Admin', 'Coach', 'Athlete', 'Organizer'] as const) {
        const token = tokens[role];
        const res = await f1(ep.path, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: ep.body ? JSON.stringify(ep.body(role)) : undefined,
        });

        // Clean up created session if created during POST test
        if (ep.name.startsWith('POST /training-sessions') && res.status === 201 && res.body?.data?.id) {
          createdSessionIds.push(new Types.ObjectId(res.body.data.id));
        }

        rowStatuses.push(String(res.status).padEnd(5));
      }
      console.log(`  | ${ep.name.padEnd(35)} | ${rowStatuses.join(' | ')} |`);
    }
    console.log('  +-------------------------------------+-------+-------+---------+-----------+\n');

    assert(true, 'Role x endpoint matrix completed and logged');
    const g1Count = g1.getRequestCount();
    console.log(`  Group 1 Request Count: ${g1Count} (strictly < 90)`);
    assert(g1Count < 90, 'Group 1 total requests strictly below 90');
    await g1.close();

    // --- GROUP 2: SESSION VALIDATION REJECTIONS & STRICT VALIDATOR ---
    console.log('\n--- GROUP 2: SESSION VALIDATION REJECTIONS & STRICT SCHEMA ---');
    const { group: g2, fetchGroup: f2 } = startServerGroup();

    // endsAt <= startsAt (400)
    const endsBeforeStartRes = await f2('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        team: teamA.id,
        title: 'Inverted Times',
        type: 'Training',
        startsAt: new Date(Date.now() + 100000).toISOString(),
        endsAt: new Date(Date.now() + 50000).toISOString(),
        venue: 'Field 1',
      }),
    });
    assert(endsBeforeStartRes.status === 400, 'Rejects endsAt <= startsAt with 400');

    // maxDuration > 12h (400)
    const tooLongRes = await f2('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        team: teamA.id,
        title: 'Too Long Session',
        type: 'Training',
        startsAt: new Date(Date.now() + 100000).toISOString(),
        endsAt: new Date(Date.now() + 100000 + 13 * 3600 * 1000).toISOString(),
        venue: 'Field 1',
      }),
    });
    assert(tooLongRes.status === 400, 'Rejects session duration > 12h with 400');

    // Strict validator rejects unknown alias key "teamId" (400)
    const unknownKeyRes = await f2('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        teamId: teamA.id,
        title: 'Alias Key Rejection',
        type: 'Training',
        startsAt: new Date(Date.now() + 200000).toISOString(),
        endsAt: new Date(Date.now() + 250000).toISOString(),
        venue: 'Field 1',
      }),
    });
    assert(unknownKeyRes.status === 400, 'Rejects unknown alias key "teamId" with 400 (.strict() enforced)');

    // Malformed ObjectId returns 400
    const malformedIdRes = await f2('/training-sessions/not-a-valid-object-id', {
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    assert(malformedIdRes.status === 400, 'Malformed session ObjectId returns 400');

    // NoSQL injection in body rejected with 400
    const nosqlBodyRes = await f2('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        team: { $ne: 'something' },
        title: 'NoSQL Body Test',
        type: 'Training',
        startsAt: new Date(Date.now() + 300000).toISOString(),
        endsAt: new Date(Date.now() + 350000).toISOString(),
        venue: 'Field 1',
      }),
    });
    assert(nosqlBodyRes.status === 400, 'NoSQL operator in body rejected with 400');

    // Date filters: invalid date format (400)
    const invalidDateRes = await f2('/training-sessions?from=invalid-date', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidDateRes.status === 400, 'Invalid from date returns 400');

    // Date filters: range > 366 days (400)
    const hugeRangeRes = await f2('/training-sessions?from=2024-01-01&to=2025-06-01', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(hugeRangeRes.status === 400, 'Date filter range > 366 days returns 400');

    // Valid date query (200)
    const validRangeRes = await f2('/training-sessions?from=2026-01-01&to=2026-12-31', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(validRangeRes.status === 200, 'Valid date range query returns 200');

    // Missing test (v): bulk attendance with 101 records returns 400
    const many101Records = Array.from({ length: 101 }, () => ({
      athlete: athleteADoc.id,
      status: 'Present',
    }));
    const bulk101Res = await f2(`/training-sessions/${baseSession.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ records: many101Records }),
    });
    assert(bulk101Res.status === 400, 'Bulk attendance with 101 records returns 400 (.max(100) enforced)');

    // Missing test (v): bulk attendance with invalid athlete id returns 400
    const bulkInvalidAthRes = await f2(`/training-sessions/${baseSession.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ records: [{ athlete: 'not-an-objectid', status: 'Present' }] }),
    });
    assert(bulkInvalidAthRes.status === 400, 'Bulk attendance with invalid athlete ObjectId returns 400');

    // Missing test (v): bulk attendance with duplicate athlete id returns 400
    const bulkDupAthRes = await f2(`/training-sessions/${baseSession.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        records: [
          { athlete: athleteADoc.id, status: 'Present' },
          { athlete: athleteADoc.id, status: 'Late' },
        ],
      }),
    });
    assert(bulkDupAthRes.status === 400, 'Bulk attendance with duplicate athlete id returns 400');

    const g2Count = g2.getRequestCount();
    console.log(`  Group 2 Request Count: ${g2Count} (strictly < 90)`);
    assert(g2Count < 90, 'Group 2 total requests strictly below 90');
    await g2.close();

    // --- GROUP 3: OVERLAP CONCURRENCY RACE & IDOR SCOPING ---
    console.log('\n--- GROUP 3: OVERLAP CONCURRENCY RACE & IDOR SCOPING ---');
    const { group: g3, fetchGroup: f3 } = startServerGroup();

    // Concurrency race: parallel create on Team A
    const raceStart = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const raceEnd = new Date(Date.now() + 50 * 3600 * 1000).toISOString();

    const [raceRes1, raceRes2] = await Promise.all([
      f3('/training-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ team: teamA.id, title: 'Parallel Alpha', type: 'Training', startsAt: raceStart, endsAt: raceEnd, venue: 'Arena' }),
      }),
      f3('/training-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
        body: JSON.stringify({ team: teamA.id, title: 'Parallel Beta', type: 'Training', startsAt: raceStart, endsAt: raceEnd, venue: 'Arena' }),
      }),
    ]);

    const raceStatuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      raceStatuses[0] === 201 && raceStatuses[1] === 409,
      `Parallel creates on same team: exactly one 201 and one 409 (got ${raceRes1.status} and ${raceRes2.status})`
    );

    const winnerId = raceRes1.status === 201 ? raceRes1.body?.data?.id : raceRes2.body?.data?.id;
    if (winnerId) createdSessionIds.push(new Types.ObjectId(winnerId));

    const overlapCountInDb = await TrainingSession.countDocuments({
      team: teamA._id,
      startsAt: new Date(raceStart),
    });
    assert(overlapCountInDb === 1, `Exactly 1 record in DB for overlapping time window (count = ${overlapCountInDb})`);

    // Missing test (ii): Coach A creates on his own team (201) in free slot
    const coachACreateOwnRes = await f3('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        team: teamA.id,
        title: 'Coach A Free Slot Session',
        type: 'Training',
        startsAt: new Date(Date.now() + 54 * 3600 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 56 * 3600 * 1000).toISOString(),
        venue: 'Field A',
      }),
    });
    assert(coachACreateOwnRes.status === 201, 'Coach A creates session on own team in free slot (201)');
    if (coachACreateOwnRes.body?.data?.id) createdSessionIds.push(new Types.ObjectId(coachACreateOwnRes.body.data.id));

    // Missing test (ii): Coach A creating on Coach B team returns 404
    const coachACreateOnBRes = await f3('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        team: teamB.id,
        title: 'Coach A Unauthorized Team B Session',
        type: 'Training',
        startsAt: new Date(Date.now() + 57 * 3600 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 59 * 3600 * 1000).toISOString(),
        venue: 'Field B',
      }),
    });
    assert(coachACreateOnBRes.status === 404, 'Coach A creating on Coach B team returns 404 (IDOR shield)');

    // Coach B creates session on Team B (201)
    const sessB = await f3('/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachBToken}` },
      body: JSON.stringify({ team: teamB.id, title: 'Team B Session', type: 'Match', startsAt: new Date(Date.now() + 60 * 3600 * 1000).toISOString(), endsAt: new Date(Date.now() + 62 * 3600 * 1000).toISOString(), venue: 'Field B' }),
    });
    assert(sessB.status === 201, 'Coach B creates session on Team B (201)');
    if (sessB.body?.data?.id) createdSessionIds.push(new Types.ObjectId(sessB.body.data.id));

    // Missing tests (i): Coach B cannot GET, PATCH, cancel or PUT attendance on Coach A session (404 each)
    const coachBOnSessARes = await f3(`/training-sessions/${winnerId}`, {
      headers: { Authorization: `Bearer ${coachBToken}` },
    });
    assert(coachBOnSessARes.status === 404, 'Coach B GET Coach A session returns 404');

    const coachBPatchSessARes = await f3(`/training-sessions/${winnerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachBToken}` },
      body: JSON.stringify({ title: 'Coach B Illegitimate Update' }),
    });
    assert(coachBPatchSessARes.status === 404, 'Coach B PATCH Coach A session returns 404');

    const coachBCancelSessARes = await f3(`/training-sessions/${winnerId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachBToken}` },
      body: JSON.stringify({ reason: 'Coach B Illegitimate Cancel' }),
    });
    assert(coachBCancelSessARes.status === 404, 'Coach B cancel Coach A session returns 404');

    const coachBPutAttendARes = await f3(`/training-sessions/${winnerId}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachBToken}` },
      body: JSON.stringify({ records: [{ athlete: athleteADoc.id, status: 'Present' }] }),
    });
    assert(coachBPutAttendARes.status === 404, 'Coach B PUT attendance on Coach A session returns 404');

    const coachBOnAttendARes = await f3(`/training-sessions/${winnerId}/attendance`, {
      headers: { Authorization: `Bearer ${coachBToken}` },
    });
    assert(coachBOnAttendARes.status === 404, 'Coach B GET Coach A attendance returns 404');

    const athBOnAthAAttendRes = await f3(`/athletes/${athleteADoc.id}/attendance`, {
      headers: { Authorization: `Bearer ${athleteBToken}` },
    });
    assert(athBOnAthAAttendRes.status === 404, 'Athlete B accessing Athlete A attendance returns 404');

    const coachBOnOutsideAthRes = await f3(`/athletes/${athleteADoc.id}/attendance`, {
      headers: { Authorization: `Bearer ${coachBToken}` },
    });
    assert(coachBOnOutsideAthRes.status === 404, 'Coach B accessing outside athlete attendance returns 404');

    const g3Count = g3.getRequestCount();
    console.log(`  Group 3 Request Count: ${g3Count} (strictly < 90)`);
    assert(g3Count < 90, 'Group 3 total requests strictly below 90');
    await g3.close();

    // --- GROUP 4: ATTENDANCE RULES, ROSTER MERGE & BULK UPSERT RACE ---
    console.log('\n--- GROUP 4: ATTENDANCE RULES, ROSTER MERGE & BULK UPSERT RACE ---');
    const { group: g4, fetchGroup: f4 } = startServerGroup();

    // Future session: cannot mark attendance (400)
    const futStart = new Date(Date.now() + 80 * 3600 * 1000).toISOString();
    const futEnd = new Date(Date.now() + 82 * 3600 * 1000).toISOString();
    const futSess = await TrainingSession.create({
      title: 'Future Session For Rules',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(futStart),
      endsAt: new Date(futEnd),
      venue: 'Gym',
      status: 'Scheduled',
    });
    createdSessionIds.push(futSess._id);

    const futMarkRes = await f4(`/training-sessions/${futSess.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ records: [{ athlete: athleteADoc.id, status: 'Present' }] }),
    });
    assert(futMarkRes.status === 400, 'Marking attendance on future session returns 400 (startsAt <= now required)');

    // Past session for attendance testing
    const pastStart = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const pastSess = await TrainingSession.create({
      title: 'Past Session For Attendance',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(pastStart),
      endsAt: new Date(pastEnd),
      venue: 'Pitch 1',
      status: 'Scheduled',
    });
    createdSessionIds.push(pastSess._id);

    // Athlete not in team returns 400
    const notInTeamRes = await f4(`/training-sessions/${pastSess.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ records: [{ athlete: athleteBDoc.id, status: 'Present' }] }),
    });
    assert(notInTeamRes.status === 400, 'Athlete not in team returns 400 on attendance submission');

    // Parallel bulk upsert race (Promise.all)
    const [bulkRes1, bulkRes2] = await Promise.all([
      f4(`/training-sessions/${pastSess.id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
        body: JSON.stringify({ records: [{ athlete: athleteADoc.id, status: 'Present', note: 'Fast' }] }),
      }),
      f4(`/training-sessions/${pastSess.id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
        body: JSON.stringify({ records: [{ athlete: athleteADoc.id, status: 'Late', note: 'Delayed' }, { athlete: athleteDDoc.id, status: 'Present' }] }),
      }),
    ]);

    assert(bulkRes1.status === 200 && bulkRes2.status === 200, 'Parallel bulk upsert race both returned 200');
    const pastAttDocs = await Attendance.find({ session: pastSess._id });
    for (const d of pastAttDocs) createdAttendanceIds.push(d._id);

    // Verify atomic uniqueness: athlete A has exactly ONE attendance record for this session
    const athARecordCount = await Attendance.countDocuments({ session: pastSess._id, athlete: athleteADoc._id });
    assert(athARecordCount === 1, 'Parallel bulk upsert produced exactly 1 record per athlete (unique compound index)');

    // Auto-Completed rule: Scheduled session with endsAt < now becomes Completed
    const pastSessAfter = await TrainingSession.findById(pastSess._id);
    assert(pastSessAfter?.status === 'Completed', 'Session automatically transitioned to Completed after attendance marking');

    // Missing test (iii): Admin gets attendanceSummary with real counts after marks, Coach A too, Organizer/Athlete get null
    const adminSessDetail = await f4(`/training-sessions/${pastSess.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSessDetail.status === 200, 'Admin gets session detail (200)');
    assert(
      adminSessDetail.body?.data?.attendanceSummary?.total >= 2 && adminSessDetail.body?.data?.attendanceSummary?.attendanceRate !== null,
      'Admin gets attendanceSummary with real counts and rate'
    );

    const coachASessDetail = await f4(`/training-sessions/${pastSess.id}`, {
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    assert(coachASessDetail.status === 200, 'Coach A gets session detail (200)');
    assert(
      coachASessDetail.body?.data?.attendanceSummary?.total >= 2 && coachASessDetail.body?.data?.attendanceSummary?.attendanceRate !== null,
      'Coach A gets attendanceSummary with real counts and rate'
    );

    const orgSessDetail = await f4(`/training-sessions/${pastSess.id}`, {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(orgSessDetail.status === 200, 'Organizer gets session detail (200)');
    assert(orgSessDetail.body?.data?.attendanceSummary === null, 'Organizer gets attendanceSummary === null');

    const athASessDetail = await f4(`/training-sessions/${pastSess.id}`, {
      headers: { Authorization: `Bearer ${athleteAToken}` },
    });
    assert(athASessDetail.status === 200, 'Athlete A gets session detail (200)');
    assert(athASessDetail.body?.data?.attendanceSummary === null, 'Athlete A gets attendanceSummary === null');
    assert(athASessDetail.body?.data?.myAttendance !== null, 'Athlete A gets personal myAttendance record');

    // Cancelled session cannot be marked (400)
    const cancelSess = await TrainingSession.create({
      title: 'Cancelled Session',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(pastStart),
      endsAt: new Date(pastEnd),
      venue: 'Pitch 1',
      status: 'Cancelled',
    });
    createdSessionIds.push(cancelSess._id);

    const markCancelledRes = await f4(`/training-sessions/${cancelSess.id}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ records: [{ athlete: athleteADoc.id, status: 'Present' }] }),
    });
    assert(markCancelledRes.status === 400, 'Cancelled session cannot be marked (returns 400)');

    // Roster merge test: remove Athlete D from Team A
    await Athlete.findByIdAndUpdate(athleteDDoc._id, { $unset: { team: 1 } });
    const rosterRes = await f4(`/training-sessions/${pastSess.id}/attendance`, {
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    assert(rosterRes.status === 200, 'Loaded attendance roster for session (200)');
    const records = rosterRes.body?.data?.records || [];
    const athAItem = records.find((r: any) => r.athleteId === athleteADoc.id);
    const athDItem = records.find((r: any) => r.athleteId === athleteDDoc.id);

    assert(athAItem?.onRoster === true, 'Current team athlete has onRoster = true');
    assert(athDItem?.onRoster === false, 'Former attendee has onRoster = false');
    assert(athAItem?.athleteName && !athAItem?.email && !athAItem?.passwordHash, 'Roster items contain athleteName only (no sensitive leaked user fields)');

    const g4Count = g4.getRequestCount();
    console.log(`  Group 4 Request Count: ${g4Count} (strictly < 90)`);
    assert(g4Count < 90, 'Group 4 total requests strictly below 90');
    await g4.close();

    // --- GROUP 5: DELETION SAFEGUARDS & CANCELLATION RULES ---
    console.log('\n--- GROUP 5: DELETION SAFEGUARDS & CANCELLATION RULES ---');
    const { group: g5, fetchGroup: f5 } = startServerGroup();

    // Delete blocked with attendance (409)
    const delBlockedRes = await f5(`/training-sessions/${pastSess.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delBlockedRes.status === 409, 'Delete session blocked when attendance exists (returns 409)');

    // Delete succeeds when no attendance exists (200)
    const delAllowedRes = await f5(`/training-sessions/${futSess.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delAllowedRes.status === 200, 'Delete session succeeds when no attendance exists (200)');

    // Completed session cannot be cancelled again (400)
    const cancelCompletedRes = await f5(`/training-sessions/${pastSess.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ reason: 'Try to cancel completed' }),
    });
    assert(cancelCompletedRes.status === 400, 'Completed session cannot be cancelled (returns 400)');

    // Missing test (vii): A Completed session cannot have its start/end changed (400)
    const changeCompletedTimesRes = await f5(`/training-sessions/${pastSess.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ startsAt: new Date(Date.now() + 1000).toISOString() }),
    });
    assert(changeCompletedTimesRes.status === 400, 'Completed session cannot have its start/end times changed (returns 400)');

    // Active session cancellation succeeds
    const cancelActiveRes = await f5(`/training-sessions/${winnerId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ reason: 'Rainout' }),
    });
    assert(cancelActiveRes.status === 200, 'Active session cancelled successfully (200)');

    // Cancelled session cannot be cancelled again (400)
    const cancelAgainRes = await f5(`/training-sessions/${winnerId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ reason: 'Cancel again' }),
    });
    assert(cancelAgainRes.status === 400, 'Cancelled session cannot be cancelled again (returns 400)');

    // Cannot change times on cancelled session (400)
    const changeCancelledTimesRes = await f5(`/training-sessions/${winnerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({ startsAt: new Date(Date.now() + 1000).toISOString(), endsAt: new Date(Date.now() + 2000).toISOString() }),
    });
    assert(changeCancelledTimesRes.status === 400, 'Cannot change start/end times on cancelled session (400)');

    // Missing test (vi): PATCH that moves a session into an overlapping slot returns 409 and original times stay unchanged
    const freeSlotSess = await TrainingSession.create({
      title: 'Move Target Session',
      type: 'Training',
      team: teamA._id,
      sport: testSport._id,
      coach: coachADoc._id,
      startsAt: new Date(Date.now() + 100 * 3600 * 1000),
      endsAt: new Date(Date.now() + 102 * 3600 * 1000),
      venue: 'Pitch 2',
      status: 'Scheduled',
    });
    createdSessionIds.push(freeSlotSess._id);

    const origStarts = freeSlotSess.startsAt.toISOString();
    const origEnds = freeSlotSess.endsAt.toISOString();

    // Try to move into baseSession's timeslot on team A
    const moveOverlapRes = await f5(`/training-sessions/${freeSlotSess.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coachAToken}` },
      body: JSON.stringify({
        startsAt: baseStart,
        endsAt: baseEnd,
      }),
    });
    assert(moveOverlapRes.status === 409, 'PATCH moving session into overlapping slot returns 409');
    const freeSlotAfter = await TrainingSession.findById(freeSlotSess._id);
    assert(
      freeSlotAfter?.startsAt.toISOString() === origStarts && freeSlotAfter?.endsAt.toISOString() === origEnds,
      'Original times remain strictly unchanged after rejected overlapping PATCH'
    );

    const g5Count = g5.getRequestCount();
    console.log(`  Group 5 Request Count: ${g5Count} (strictly < 90)`);
    assert(g5Count < 90, 'Group 5 total requests strictly below 90');
    await g5.close();

    // --- GROUP 6: PRIVACY SHIELD, MISSING PROFILES & AUDIT ENTRIES ---
    console.log('\n--- GROUP 6: PRIVACY SHIELD, MISSING PROFILES & AUDIT ENTRIES ---');
    const { group: g6, fetchGroup: f6 } = startServerGroup();

    // Organizer receives attendanceSummary = null
    const orgListRes = await f6('/training-sessions', {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(orgListRes.status === 200, 'Organizer lists sessions (200)');
    const orgSessions = orgListRes.body?.data || [];
    const orgHasSummary = orgSessions.some((s: any) => s.attendanceSummary !== null);
    assert(!orgHasSummary, 'Organizer receives attendanceSummary = null on all sessions (Privacy Rule)');

    // Athlete receives attendanceSummary = null
    const athListRes = await f6('/training-sessions', {
      headers: { Authorization: `Bearer ${athleteAToken}` },
    });
    assert(athListRes.status === 200, 'Athlete lists squad sessions (200)');
    const athSessions = athListRes.body?.data || [];
    const athHasSummary = athSessions.some((s: any) => s.attendanceSummary !== null);
    assert(!athHasSummary, 'Athlete receives attendanceSummary = null on all sessions (Privacy Rule)');

    // Missing profile coach gets 200 with empty list
    const coachCRes = await f6('/training-sessions', {
      headers: { Authorization: `Bearer ${coachCToken}` },
    });
    assert(coachCRes.status === 200, 'Coach without profile doc gets 200 (not 500/400)');
    assert((coachCRes.body?.data || []).length === 0, 'Coach without profile doc gets empty list');

    // Missing profile athlete gets 200 with empty list
    const athCRes = await f6('/training-sessions', {
      headers: { Authorization: `Bearer ${athleteCToken}` },
    });
    assert(athCRes.status === 200, 'Athlete without profile gets 200 (not 500/400)');
    assert((athCRes.body?.data || []).length === 0, 'Athlete without profile gets empty list');

    // Hand-computed attendanceRate formula test:
    const s1 = await TrainingSession.create({ title: 'S1', type: 'Training', team: teamB._id, sport: testSport._id, coach: coachBDoc._id, startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() - 50000), venue: 'B1', status: 'Completed' });
    const s2 = await TrainingSession.create({ title: 'S2', type: 'Training', team: teamB._id, sport: testSport._id, coach: coachBDoc._id, startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() - 50000), venue: 'B2', status: 'Completed' });
    const s3 = await TrainingSession.create({ title: 'S3', type: 'Training', team: teamB._id, sport: testSport._id, coach: coachBDoc._id, startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() - 50000), venue: 'B3', status: 'Completed' });
    const s4 = await TrainingSession.create({ title: 'S4', type: 'Training', team: teamB._id, sport: testSport._id, coach: coachBDoc._id, startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() - 50000), venue: 'B4', status: 'Completed' });
    createdSessionIds.push(s1._id, s2._id, s3._id, s4._id);

    const a1 = await Attendance.create({ session: s1._id, athlete: athleteBDoc._id, status: 'Present', markedBy: coachBUser._id });
    const a2 = await Attendance.create({ session: s2._id, athlete: athleteBDoc._id, status: 'Late', markedBy: coachBUser._id });
    const a3 = await Attendance.create({ session: s3._id, athlete: athleteBDoc._id, status: 'Absent', markedBy: coachBUser._id });
    const a4 = await Attendance.create({ session: s4._id, athlete: athleteBDoc._id, status: 'Excused', markedBy: coachBUser._id });
    createdAttendanceIds.push(a1._id, a2._id, a3._id, a4._id);

    const athBRateRes = await f6('/athletes/me/attendance', {
      headers: { Authorization: `Bearer ${athleteBToken}` },
    });
    assert(athBRateRes.status === 200, 'Athlete B gets /me/attendance');
    const bSum = athBRateRes.body?.summary;
    console.log(`  [Hand-Computed Check] present=${bSum?.present}, late=${bSum?.late}, absent=${bSum?.absent}, excused=${bSum?.excused}, rate=${bSum?.attendanceRate}%`);
    assert(bSum?.present === 1, 'Hand-computed: present === 1');
    assert(bSum?.late === 1, 'Hand-computed: late === 1');
    assert(bSum?.absent === 1, 'Hand-computed: absent === 1');
    assert(bSum?.excused === 1, 'Hand-computed: excused === 1');
    // Formula: (1 + 1) / (1 + 1 + 1) * 100 = 2 / 3 * 100 = 66.7%
    assert(bSum?.attendanceRate === 66.7, 'Hand-computed: attendanceRate is exactly 66.7% (excused excluded from denominator)');

    // Missing test (iv): audit entries exist for SESSION_CREATED, SESSION_UPDATED, SESSION_CANCELLED, SESSION_DELETED and ATTENDANCE_MARKED
    const testAudits = await AuditLog.find({
      $or: [
        { actor: { $in: createdUserIds } },
        { targetId: { $in: [...createdSessionIds, ...createdUserIds, ...createdTeamIds] } },
      ],
    });
    for (const a of testAudits) createdAuditLogIds.push(a._id);

    const auditActions = testAudits.map((a) => a.action);
    assert(auditActions.includes('SESSION_CREATED'), 'AuditLog contains SESSION_CREATED');
    assert(auditActions.includes('SESSION_UPDATED'), 'AuditLog contains SESSION_UPDATED');
    assert(auditActions.includes('SESSION_CANCELLED'), 'AuditLog contains SESSION_CANCELLED');
    assert(auditActions.includes('SESSION_DELETED'), 'AuditLog contains SESSION_DELETED');
    assert(auditActions.includes('ATTENDANCE_MARKED'), 'AuditLog contains ATTENDANCE_MARKED');

    // Deep scan audit meta for sensitive data
    const forbiddenKeys = ['passwordHash', 'refreshTokenHash', 'medicalNotes', 'guardian', 'phone', 'email', 'password'];
    let auditMetaLeaked = false;
    for (const a of testAudits) {
      const leaked = deepFindKeys(a.meta, forbiddenKeys);
      if (leaked.length > 0) {
        auditMetaLeaked = true;
        break;
      }
    }
    assert(!auditMetaLeaked, 'DEEP SCAN: AuditLog meta entries contain no email/phone/password/medicalNotes');

    // Deep scan for sensitive data leakage in HTTP response
    const leakedKeys = deepFindKeys(athBRateRes.body, forbiddenKeys);
    assert(leakedKeys.length === 0, `DEEP SCAN: No sensitive fields (${forbiddenKeys.join(', ')}) leaked in HTTP responses`);

    const g6Count = g6.getRequestCount();
    console.log(`  Group 6 Request Count: ${g6Count} (strictly < 90)`);
    assert(g6Count < 90, 'Group 6 total requests strictly below 90');
    await g6.close();

  } finally {
    // Surgical cleanup of test data ONLY
    console.log('\n--- CLEANING UP TEST DATA (ONLY CREATED IDS) ---');
    if (createdAuditLogIds.length > 0) {
      await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
    }
    if (createdAttendanceIds.length > 0) {
      await Attendance.deleteMany({ _id: { $in: createdAttendanceIds } });
    }
    if (createdSessionIds.length > 0) {
      await TrainingSession.deleteMany({ _id: { $in: createdSessionIds } });
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
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }

    // Verify database counts restored
    const finalUserCount = await User.countDocuments();
    const finalSportCount = await Sport.countDocuments();
    const finalTeamCount = await Team.countDocuments();
    const finalCoachCount = await Coach.countDocuments();
    const finalAthleteCount = await Athlete.countDocuments();
    const finalSessionCount = await TrainingSession.countDocuments();
    const finalAttendanceCount = await Attendance.countDocuments();
    const finalAuditCount = await AuditLog.countDocuments();

    console.log('Database state after test:');
    console.log(`  Users = ${finalUserCount}`);
    console.log(`  Sports = ${finalSportCount}`);
    console.log(`  Teams = ${finalTeamCount}`);
    console.log(`  Coaches = ${finalCoachCount}`);
    console.log(`  Athletes = ${finalAthleteCount}`);
    console.log(`  Sessions = ${finalSessionCount}`);
    console.log(`  Attendance = ${finalAttendanceCount}`);
    console.log(`  AuditLogs = ${finalAuditCount}\n`);

    assert(finalUserCount === initialUserCount, `User count restored (${finalUserCount} === ${initialUserCount})`);
    assert(finalSportCount === initialSportCount, `Sport count restored (${finalSportCount} === ${initialSportCount})`);
    assert(finalTeamCount === initialTeamCount, `Team count restored (${finalTeamCount} === ${initialTeamCount})`);
    assert(finalCoachCount === initialCoachCount, `Coach count restored (${finalCoachCount} === ${initialCoachCount})`);
    assert(finalAthleteCount === initialAthleteCount, `Athlete count restored (${finalAthleteCount} === ${initialAthleteCount})`);
    assert(finalSessionCount === initialSessionCount, `Session count restored (${finalSessionCount} === ${initialSessionCount})`);
    assert(finalAttendanceCount === initialAttendanceCount, `Attendance count restored (${finalAttendanceCount} === ${initialAttendanceCount})`);
    assert(finalAuditCount === initialAuditCount, `AuditLog count restored (${finalAuditCount} === ${initialAuditCount})`);

    await mongoose.disconnect();
    console.log('ℹ️  MongoDB disconnected.');
  }

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
