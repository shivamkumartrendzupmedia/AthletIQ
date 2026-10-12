import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import {
  User,
  Coach,
  Athlete,
  Team,
  Sport,
  TrainingSession,
  Attendance,
  AuditLog,
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
  ContactMessage,
  Notification,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { findOrphans } from './cleanup-test-orphans.js';

let totalPassed = 0;
let totalFailed = 0;
let totalHttpRequests = 0;
let failedAuthHttpRequests = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    totalFailed++;
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
  if (url.includes('/api/auth') && res.status >= 400) {
    failedAuthHttpRequests++;
  }
  let body: unknown = null;
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

// Track IDs created during verification
const createdUserIds: Types.ObjectId[] = [];
const createdSportIds: Types.ObjectId[] = [];
const createdTeamIds: Types.ObjectId[] = [];
const createdCoachIds: Types.ObjectId[] = [];
const createdAthleteIds: Types.ObjectId[] = [];
const createdTournamentIds: Types.ObjectId[] = [];
const createdTournamentTeamIds: Types.ObjectId[] = [];
const createdVenueIds: Types.ObjectId[] = [];
const createdOfficialIds: Types.ObjectId[] = [];
const createdMatchIds: Types.ObjectId[] = [];
const createdMatchEventIds: Types.ObjectId[] = [];

async function getCollectionCounts() {
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
  };
}

function getAuthHeader(user: { _id: Types.ObjectId; role: string }): {
  Authorization: string;
  'Content-Type': string;
} {
  const token = signAccessToken(user._id.toString(), user.role as 'Admin' | 'Coach' | 'Athlete' | 'Organizer');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function deepFindForbiddenKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (!obj || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) deepFindForbiddenKeys(item, forbiddenKeys, found);
    return found;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (forbiddenKeys.includes(key)) {
      found.push(key);
    }
    deepFindForbiddenKeys(value, forbiddenKeys, found);
  }
  return found;
}

async function run() {
  console.log('\n=== ATHLETIQ STEP 9A: LIVE MATCH CENTER BACKEND VERIFICATION ===\n');

  await connectDB();

  const initialCounts = await getCollectionCounts();
  console.log('Database Counts Before:');
  console.log(JSON.stringify(initialCounts, null, 2));

  const initialOrphans = await findOrphans();
  if (initialOrphans.length > 0) {
    console.error(`Refusing to run: ${initialOrphans.length} orphans already exist in DB.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const pwHash = await hashPassword('ValidPass123!');

  // Seed baseline entities
  const sport = await Sport.create({
    name: `Football 9A ${Date.now()}`,
    slug: `football-9a-${Date.now()}`,
    description: 'Premier competitive association football',
    category: 'Team Sport',
    minAge: 8,
    maxAge: 40,
  });
  createdSportIds.push(sport._id);

  // Users for 8 roles in matrix
  const adminUser = await User.create({
    name: 'Live Admin',
    email: `live-admin-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Admin',
    isActive: true,
  });
  createdUserIds.push(adminUser._id);

  const orgOwnerUser = await User.create({
    name: 'Org Owner',
    email: `org-owner-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Organizer',
    isActive: true,
  });
  createdUserIds.push(orgOwnerUser._id);

  const orgOtherUser = await User.create({
    name: 'Org Other',
    email: `org-other-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Organizer',
    isActive: true,
  });
  createdUserIds.push(orgOtherUser._id);

  const officialAssignedUser = await User.create({
    name: 'Official Assigned',
    email: `off-assigned-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Official',
    isActive: true,
  });
  createdUserIds.push(officialAssignedUser._id);

  const officialOtherUser = await User.create({
    name: 'Official Other',
    email: `off-other-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Official',
    isActive: true,
  });
  createdUserIds.push(officialOtherUser._id);

  const coachUser = await User.create({
    name: 'Live Coach',
    email: `live-coach-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Coach',
    isActive: true,
  });
  createdUserIds.push(coachUser._id);

  const athleteUser = await User.create({
    name: 'Live Athlete',
    email: `live-athlete-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Athlete',
    isActive: true,
  });
  createdUserIds.push(athleteUser._id);

  // Teams & Athletes
  const teamA = await Team.create({
    name: `Lions FC ${Date.now()}`,
    slug: `lions-fc-${Date.now()}`,
    sport: sport._id,
    ageGroup: 'U16',
    status: 'Active',
  });
  createdTeamIds.push(teamA._id);

  const teamB = await Team.create({
    name: `Tigers FC ${Date.now()}`,
    slug: `tigers-fc-${Date.now()}`,
    sport: sport._id,
    ageGroup: 'U16',
    status: 'Active',
  });
  createdTeamIds.push(teamB._id);

  const athA1 = await Athlete.create({
    user: athleteUser._id,
    firstName: 'Lionel',
    lastName: 'Messi',
    dateOfBirth: new Date('2008-06-24'),
    gender: 'Male',
    sport: sport._id,
    team: teamA._id,
    jerseyNumber: 10,
    status: 'Active',
    verificationStatus: 'Verified',
  });
  createdAthleteIds.push(athA1._id);

  const athA2User = await User.create({
    name: 'Angel Di Maria',
    email: `ath-a2-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Athlete',
    isActive: true,
  });
  createdUserIds.push(athA2User._id);

  const athA2 = await Athlete.create({
    user: athA2User._id,
    firstName: 'Angel',
    lastName: 'DiMaria',
    dateOfBirth: new Date('2008-02-14'),
    gender: 'Male',
    sport: sport._id,
    team: teamA._id,
    jerseyNumber: 11,
    status: 'Active',
    verificationStatus: 'Verified',
  });
  createdAthleteIds.push(athA2._id);

  const athB1User = await User.create({
    name: 'Kylian Mbappe',
    email: `ath-b1-${Date.now()}@test.athletiq.internal`,
    passwordHash: pwHash,
    role: 'Athlete',
    isActive: true,
  });
  createdUserIds.push(athB1User._id);

  const athB1 = await Athlete.create({
    user: athB1User._id,
    firstName: 'Kylian',
    lastName: 'Mbappe',
    dateOfBirth: new Date('2008-12-20'),
    gender: 'Male',
    sport: sport._id,
    team: teamB._id,
    jerseyNumber: 7,
    status: 'Active',
    verificationStatus: 'Verified',
  });
  createdAthleteIds.push(athB1._id);

  // Official records
  const officialAssignedRec = await Official.create({
    name: 'Pierluigi Collina',
    type: 'Referee',
    createdBy: orgOwnerUser._id,
    user: officialAssignedUser._id,
    active: true,
  });
  createdOfficialIds.push(officialAssignedRec._id);

  const officialOtherRec = await Official.create({
    name: 'Howard Webb',
    type: 'Referee',
    createdBy: orgOwnerUser._id,
    user: officialOtherUser._id,
    active: true,
  });
  createdOfficialIds.push(officialOtherRec._id);

  // Venues
  const venue1 = await Venue.create({
    name: `Camp Nou Pitch ${Date.now()}`,
    address: 'Barcelona Way 10',
    capacity: 50000,
    createdBy: orgOwnerUser._id,
    active: true,
  });
  createdVenueIds.push(venue1._id);

  // Tournaments
  const tourney1 = await Tournament.create({
    name: `Champions Cup ${Date.now()}`,
    sport: sport._id,
    category: 'Elite',
    ageGroup: 'U16',
    format: 'League',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-30'),
    organizer: orgOwnerUser._id,
    status: 'In Progress',
    approvedTeamsCount: 2,
  });
  createdTournamentIds.push(tourney1._id);

  const tourneyOther = await Tournament.create({
    name: `Other Cup ${Date.now()}`,
    sport: sport._id,
    category: 'Elite',
    ageGroup: 'U16',
    format: 'League',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-30'),
    organizer: orgOtherUser._id,
    status: 'In Progress',
    approvedTeamsCount: 0,
  });
  createdTournamentIds.push(tourneyOther._id);

  // Tournament Registrations
  const regA = await TournamentTeam.create({
    tournament: tourney1._id,
    team: teamA._id,
    status: 'Approved',
    squad: [athA1._id, athA2._id],
    registeredBy: coachUser._id,
    reviewedBy: orgOwnerUser._id,
    reviewedAt: new Date(),
  });
  createdTournamentTeamIds.push(regA._id);

  const regB = await TournamentTeam.create({
    tournament: tourney1._id,
    team: teamB._id,
    status: 'Approved',
    squad: [athB1._id],
    registeredBy: coachUser._id,
    reviewedBy: orgOwnerUser._id,
    reviewedAt: new Date(),
  });
  createdTournamentTeamIds.push(regB._id);

  // Match 1: In tourney1, scheduled now, referee is officialAssignedRec
  const now = new Date();
  const match1 = await Match.create({
    tournament: tourney1._id,
    homeTeam: regA._id,
    awayTeam: regB._id,
    round: 'Round 1',
    scheduledAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
    durationMinutes: 90,
    endsAt: new Date(now.getTime() + 80 * 60 * 1000),
    venue: venue1._id,
    referee: officialAssignedRec._id,
    status: 'Scheduled',
    liveScore: { home: 0, away: 0 },
  });
  createdMatchIds.push(match1._id);

  const groupPasses: number[] = [];
  const groupRequests: number[] = [];

  // =========================================================================
  // GROUP 1: ROLE x ENDPOINT PERMISSIONS MATRIX (5 ENDPOINTS x 8 ROLES)
  // =========================================================================
  console.log('\n--- GROUP 1: ROLE x ENDPOINT PERMISSIONS MATRIX ---');
  let g1Pass = 0;
  const srv1 = startServerGroup();

  try {
    const rolesConfig = [
      { name: 'Admin', auth: getAuthHeader(adminUser) },
      { name: 'Org Owner', auth: getAuthHeader(orgOwnerUser) },
      { name: 'Org Other', auth: getAuthHeader(orgOtherUser) },
      { name: 'Official Assigned', auth: getAuthHeader(officialAssignedUser) },
      { name: 'Official Other', auth: getAuthHeader(officialOtherUser) },
      { name: 'Coach', auth: getAuthHeader(coachUser) },
      { name: 'Athlete', auth: getAuthHeader(athleteUser) },
      { name: 'Unauthenticated', auth: null },
    ];

    const matrix: Record<string, Record<string, number>> = {
      'GET /matches/assigned': {},
      'POST /matches/:id/status': {},
      'POST /matches/:id/events': {},
      'DELETE /matches/:id/events/:eventId': {},
      'GET /matches/:id/report': {},
    };

    // To test live workflow endpoints in matrix, transition match to Live first
    await Match.updateOne({ _id: match1._id }, { $set: { status: 'Live', startedAt: new Date() } });

    // Seed dummy event for delete matrix test
    const dummyEv = await MatchEvent.create({
      match: match1._id,
      type: 'YellowCard',
      side: 'home',
      minute: 10,
      player: athA1._id,
      createdBy: adminUser._id,
    });
    createdMatchEventIds.push(dummyEv._id);

    for (const r of rolesConfig) {
      const headers: Record<string, string> = r.auth ? { ...r.auth } : { 'Content-Type': 'application/json' };

      // 1. GET /matches/assigned
      const resAssigned = await srv1.fetchGroup('/matches/assigned', { headers });
      matrix['GET /matches/assigned'][r.name] = resAssigned.status;

      // 2. POST /matches/:id/status
      const resStatus = await srv1.fetchGroup(`/matches/${match1._id}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'HalfTime' }),
      });
      matrix['POST /matches/:id/status'][r.name] = resStatus.status;
      // Reset match to Live for next iteration
      await Match.updateOne({ _id: match1._id }, { $set: { status: 'Live' } });

      // 3. POST /matches/:id/events
      const resEv = await srv1.fetchGroup(`/matches/${match1._id}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'Injury',
          side: 'home',
          minute: 15,
          player: athA1._id.toString(),
        }),
      });
      matrix['POST /matches/:id/events'][r.name] = resEv.status;
      if (resEv.status === 201) {
        const bodyObj = resEv.body as { data: { _id?: string; id?: string } };
        const evId = bodyObj?.data?.id || bodyObj?.data?._id;
        if (evId) createdMatchEventIds.push(new Types.ObjectId(evId));
      }

      // 4. DELETE /matches/:id/events/:eventId
      const resDelEv = await srv1.fetchGroup(`/matches/${match1._id}/events/${dummyEv._id}`, {
        method: 'DELETE',
        headers,
      });
      matrix['DELETE /matches/:id/events/:eventId'][r.name] = resDelEv.status;

      // 5. GET /matches/:id/report
      const resReport = await srv1.fetchGroup(`/matches/${match1._id}/report`, { headers });
      matrix['GET /matches/:id/report'][r.name] = resReport.status;
    }

    // Reset dummy event for cleanup tracking
    await MatchEvent.deleteOne({ _id: dummyEv._id });

    // Print markdown matrix
    console.log('\n--- REAL PERMISSIONS MATRIX (LIVE RESPONSES) ---');
    console.log('| Endpoint & Method | Admin | Org Owner | Org Other | Official Assigned | Official Other | Coach | Athlete | Unauthenticated |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const [ep, resMap] of Object.entries(matrix)) {
      console.log(
        `| ${ep.padEnd(35)} | ${resMap['Admin']} | ${resMap['Org Owner']} | ${resMap['Org Other']} | ${resMap['Official Assigned']} | ${resMap['Official Other']} | ${resMap['Coach']} | ${resMap['Athlete']} | ${resMap['Unauthenticated']} |`
      );
    }

    // Asserts
    assert(matrix['GET /matches/assigned']['Official Assigned'] === 200, 'GET /matches/assigned 200 for assigned Official');
    g1Pass++;
    assert(matrix['GET /matches/assigned']['Official Other'] === 200, 'GET /matches/assigned 200 for other Official (empty list)');
    g1Pass++;
    assert(matrix['GET /matches/assigned']['Admin'] === 403 && matrix['GET /matches/assigned']['Coach'] === 403, 'GET /matches/assigned 403 for non-officials');
    g1Pass++;
    assert(matrix['GET /matches/assigned']['Unauthenticated'] === 401, 'GET /matches/assigned 401 for unauthenticated');
    g1Pass++;

    assert(
      matrix['POST /matches/:id/status']['Admin'] === 200 &&
      matrix['POST /matches/:id/status']['Org Owner'] === 200 &&
      matrix['POST /matches/:id/status']['Official Assigned'] === 200,
      'POST /matches/:id/status allowed for Admin, Owning Organizer, Assigned Official'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/status']['Org Other'] === 404 &&
      matrix['POST /matches/:id/status']['Official Other'] === 404,
      'POST /matches/:id/status returns 404 for non-owning Organizer and unassigned Official'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/status']['Coach'] === 403 &&
      matrix['POST /matches/:id/status']['Athlete'] === 403,
      'POST /matches/:id/status returns 403 for Coach and Athlete'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/events']['Admin'] === 201 &&
      matrix['POST /matches/:id/events']['Org Owner'] === 201 &&
      matrix['POST /matches/:id/events']['Official Assigned'] === 201,
      'POST /matches/:id/events allowed (201) for Admin, Owning Org, Assigned Official'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/events']['Org Other'] === 404 &&
      matrix['POST /matches/:id/events']['Official Other'] === 404,
      'POST /matches/:id/events returns 404 for non-owning Org and unassigned Official'
    );
    g1Pass++;

    assert(
      matrix['GET /matches/:id/report']['Admin'] === 200 &&
      matrix['GET /matches/:id/report']['Org Owner'] === 200 &&
      matrix['GET /matches/:id/report']['Official Assigned'] === 200 &&
      matrix['GET /matches/:id/report']['Coach'] === 200 &&
      matrix['GET /matches/:id/report']['Athlete'] === 200,
      'GET /matches/:id/report accessible to all authorized roles for non-draft tournament'
    );
    g1Pass++;

    assert(
      matrix['GET /matches/:id/report']['Org Other'] === 404 &&
      matrix['GET /matches/:id/report']['Official Other'] === 404,
      'GET /matches/:id/report returns 404 for unauthorized organizer/official'
    );
    g1Pass++;
  } finally {
    await srv1.group.close();
  }

  groupPasses.push(g1Pass);
  groupRequests.push(srv1.group.getRequestCount());
  assert(srv1.group.getRequestCount() < 90, `Group 1 request count (${srv1.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 2: STATE MACHINE TRANSITIONS, TIMING, AND CONCURRENCY RACE
  // =========================================================================
  console.log('\n--- GROUP 2: STATE MACHINE TRANSITIONS & CONCURRENCY RACE ---');
  let g2Pass = 0;
  const srv2 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);

    // 1. Start too early check (> 60 minutes before scheduledAt)
    const futureMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round 2',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours in future
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
    });
    createdMatchIds.push(futureMatch._id);

    const resTooEarly = await srv2.fetchGroup(`/matches/${futureMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(resTooEarly.status === 400, 'Start match > 60 min before scheduledAt rejected with 400');
    g2Pass++;

    // 2. Tournament not In Progress check
    const draftTourney = await Tournament.create({
      name: `Draft Cup ${Date.now()}`,
      sport: sport._id,
      category: 'Junior',
      ageGroup: 'U16',
      format: 'League',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      organizer: orgOwnerUser._id,
      status: 'Draft',
    });
    createdTournamentIds.push(draftTourney._id);

    const draftRegA = await TournamentTeam.create({
      tournament: draftTourney._id,
      team: teamA._id,
      status: 'Approved',
      registeredBy: coachUser._id,
    });
    createdTournamentTeamIds.push(draftRegA._id);

    const draftRegB = await TournamentTeam.create({
      tournament: draftTourney._id,
      team: teamB._id,
      status: 'Approved',
      registeredBy: coachUser._id,
    });
    createdTournamentTeamIds.push(draftRegB._id);

    const draftMatch = await Match.create({
      tournament: draftTourney._id,
      homeTeam: draftRegA._id,
      awayTeam: draftRegB._id,
      round: 'Round 1',
      scheduledAt: new Date(Date.now() - 5 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 85 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
    });
    createdMatchIds.push(draftMatch._id);

    const resDraftStart = await srv2.fetchGroup(`/matches/${draftMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(resDraftStart.status === 400, 'Start match in Draft tournament rejected with 400');
    g2Pass++;

    // 3. Full valid transition sequence: Scheduled -> Live -> HalfTime -> Live -> Completed
    const validMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round 3',
      scheduledAt: new Date(Date.now() - 10 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 80 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
    });
    createdMatchIds.push(validMatch._id);

    // Scheduled -> Live
    const rLive = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(rLive.status === 200, 'Transition Scheduled -> Live succeeds with 200');
    g2Pass++;

    // Live -> HalfTime
    const rHT = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'HalfTime' }),
    });
    assert(rHT.status === 200, 'Transition Live -> HalfTime succeeds with 200');
    g2Pass++;

    // HalfTime -> Completed (Invalid: must return to Live first)
    const rHTtoComp = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert(rHTtoComp.status === 409, 'Transition HalfTime -> Completed rejected with 409 conflict');
    g2Pass++;

    // HalfTime -> Live (Second half)
    const rLive2 = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(rLive2.status === 200, 'Transition HalfTime -> Live succeeds with 200');
    g2Pass++;

    // Live -> Completed
    const rComp = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert(rComp.status === 200, 'Transition Live -> Completed succeeds with 200');
    g2Pass++;

    // Terminal: Completed -> Live rejected
    const rCompToLive = await srv2.fetchGroup(`/matches/${validMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(rCompToLive.status === 400, 'Transition from Completed rejected with 400');
    g2Pass++;

    // 4. Scheduled -> Cancelled -> terminal
    const cancelMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round 4',
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 100 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
    });
    createdMatchIds.push(cancelMatch._id);

    const rCancel = await srv2.fetchGroup(`/matches/${cancelMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    assert(rCancel.status === 200, 'Transition Scheduled -> Cancelled succeeds with 200');
    g2Pass++;

    const rCancelToLive = await srv2.fetchGroup(`/matches/${cancelMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(rCancelToLive.status === 400, 'Transition from Cancelled rejected with 400');
    g2Pass++;

    // 5. Concurrency Race test on identical transition: Scheduled -> Live
    const raceMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round 5',
      scheduledAt: new Date(Date.now() - 5 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 85 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
    });
    createdMatchIds.push(raceMatch._id);

    const [raceRes1, raceRes2] = await Promise.all([
      srv2.fetchGroup(`/matches/${raceMatch._id}/status`, {
        method: 'POST',
        headers: adminAuth,
        body: JSON.stringify({ status: 'Live' }),
      }),
      srv2.fetchGroup(`/matches/${raceMatch._id}/status`, {
        method: 'POST',
        headers: adminAuth,
        body: JSON.stringify({ status: 'Live' }),
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 200 && statuses[1] === 409,
      `Two simultaneous identical transitions: exactly one wins 200, one gets 409 (got ${statuses.join(', ')})`
    );
    g2Pass++;
  } finally {
    await srv2.group.close();
  }

  groupPasses.push(g2Pass);
  groupRequests.push(srv2.group.getRequestCount());
  assert(srv2.group.getRequestCount() < 90, `Group 2 request count (${srv2.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 3: MATCH EVENTS, SCORE DERIVATION, ATOMIC CONCURRENCY & RECOMPUTATION
  // =========================================================================
  console.log('\n--- GROUP 3: MATCH EVENTS, CONCURRENCY & SCORE RECOMPUTATION ---');
  let g3Pass = 0;
  const srv3 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);

    const eventMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round Events',
      scheduledAt: new Date(Date.now() - 10 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 80 * 60 * 1000),
      venue: venue1._id,
      referee: officialAssignedRec._id,
      status: 'Scheduled',
      liveScore: { home: 0, away: 0 },
    });
    createdMatchIds.push(eventMatch._id);

    // 1. Events not allowed when Scheduled
    const resEvSched = await srv3.fetchGroup(`/matches/${eventMatch._id}/events`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ type: 'Goal', side: 'home', minute: 5, player: athA1._id.toString() }),
    });
    assert(resEvSched.status === 400, 'Events not allowed when Scheduled (400)');
    g3Pass++;

    // Transition to Live
    await Match.updateOne({ _id: eventMatch._id }, { $set: { status: 'Live', startedAt: new Date() } });

    // 2. Minute out of range (131)
    const resMinHigh = await srv3.fetchGroup(`/matches/${eventMatch._id}/events`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ type: 'Goal', side: 'home', minute: 135, player: athA1._id.toString() }),
    });
    assert(resMinHigh.status === 400, 'Event with minute > 130 rejected with 400');
    g3Pass++;

    // 3. Player not in squad
    const resBadPlayer = await srv3.fetchGroup(`/matches/${eventMatch._id}/events`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'home',
        minute: 10,
        player: athB1._id.toString(), // Belongs to team B squad, not home team A!
      }),
    });
    assert(resBadPlayer.status === 400, 'Player not in side squad rejected with 400');
    g3Pass++;

    // 4. 10 simultaneous goals via Promise.all
    // 6 home goals (Lionel), 4 away goals (Kylian)
    const goalPromises = [];
    for (let i = 0; i < 6; i++) {
      goalPromises.push(
        srv3.fetchGroup(`/matches/${eventMatch._id}/events`, {
          method: 'POST',
          headers: adminAuth,
          body: JSON.stringify({
            type: 'Goal',
            side: 'home',
            minute: 10 + i,
            player: athA1._id.toString(),
            relatedPlayer: athA2._id.toString(),
          }),
        })
      );
    }
    for (let i = 0; i < 4; i++) {
      goalPromises.push(
        srv3.fetchGroup(`/matches/${eventMatch._id}/events`, {
          method: 'POST',
          headers: adminAuth,
          body: JSON.stringify({
            type: 'Goal',
            side: 'away',
            minute: 20 + i,
            player: athB1._id.toString(),
          }),
        })
      );
    }

    const goalResults = await Promise.all(goalPromises);
    const all201 = goalResults.every((r) => r.status === 201);
    assert(all201, '10 simultaneous goals via Promise.all all return 201');
    g3Pass++;

    for (const r of goalResults) {
      const b = r.body as { data: { _id?: string; id?: string } };
      const id = b.data?.id || b.data?._id;
      if (id) createdMatchEventIds.push(new Types.ObjectId(id));
    }

    // Verify cached liveScore on Match is exactly { home: 6, away: 4 }
    const updatedMatchScore = await Match.findById(eventMatch._id);
    assert(
      updatedMatchScore?.liveScore?.home === 6 && updatedMatchScore?.liveScore?.away === 4,
      `10 simultaneous goals give exact atomic liveScore 6-4 (got ${updatedMatchScore?.liveScore?.home}-${updatedMatchScore?.liveScore?.away})`
    );
    g3Pass++;

    // 5. Delete 1 home goal event -> verify score recomputed to 5-4
    const homeEvents = await MatchEvent.find({ match: eventMatch._id, side: 'home', type: 'Goal' });
    const deleteTarget = homeEvents[0];

    const resDel = await srv3.fetchGroup(`/matches/${eventMatch._id}/events/${deleteTarget._id}`, {
      method: 'DELETE',
      headers: adminAuth,
    });
    assert(resDel.status === 200, 'Delete event returns 200');
    g3Pass++;

    const matchAfterDel = await Match.findById(eventMatch._id);
    assert(
      matchAfterDel?.liveScore?.home === 5 && matchAfterDel?.liveScore?.away === 4,
      `Delete event recomputes liveScore to 5-4 (got ${matchAfterDel?.liveScore?.home}-${matchAfterDel?.liveScore?.away})`
    );
    g3Pass++;

    // 6. Complete match -> verify derived result is { homeScore: 5, awayScore: 4 }
    const resCompEventMatch = await srv3.fetchGroup(`/matches/${eventMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert(resCompEventMatch.status === 200, 'Completing match returns 200');
    g3Pass++;

    const completedMatchDoc = await Match.findById(eventMatch._id);
    assert(
      completedMatchDoc?.result?.homeScore === 5 && completedMatchDoc?.result?.awayScore === 4,
      `Derived result on Completed match is 5-4 (got ${completedMatchDoc?.result?.homeScore}-${completedMatchDoc?.result?.awayScore})`
    );
    g3Pass++;

    // 7. Post-completion correction by Official vs Admin
    const offAuth = getAuthHeader(officialAssignedUser);
    const targetAwayEv = await MatchEvent.findOne({ match: eventMatch._id, side: 'away', type: 'Goal' });

    const resOffDelCompleted = await srv3.fetchGroup(
      `/matches/${eventMatch._id}/events/${targetAwayEv!._id}`,
      { method: 'DELETE', headers: offAuth }
    );
    assert(resOffDelCompleted.status === 403, 'Official cannot delete event after match is Completed (403)');
    g3Pass++;

    const resAdminDelCompleted = await srv3.fetchGroup(
      `/matches/${eventMatch._id}/events/${targetAwayEv!._id}`,
      { method: 'DELETE', headers: adminAuth }
    );
    assert(resAdminDelCompleted.status === 200, 'Admin can correct event on Completed match (200)');
    g3Pass++;

    const matchAfterAdminCorr = await Match.findById(eventMatch._id);
    assert(
      matchAfterAdminCorr?.result?.awayScore === 3 && matchAfterAdminCorr?.liveScore?.away === 3,
      `Post-completion correction recomputed both liveScore and result awayScore to 3`
    );
    g3Pass++;

    // 8. Manual PATCH /result vs events conflict (409)
    const resManualConflict = await srv3.fetchGroup(`/matches/${eventMatch._id}/result`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ homeScore: 1, awayScore: 0 }),
    });
    assert(resManualConflict.status === 409, 'Manual result PATCH on match with events rejected with 409');
    g3Pass++;
  } finally {
    await srv3.group.close();
  }

  groupPasses.push(g3Pass);
  groupRequests.push(srv3.group.getRequestCount());
  assert(srv3.group.getRequestCount() < 90, `Group 3 request count (${srv3.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 4: OFFICIAL USER LINKING, SCOPING & DASHBOARD OVERVIEW
  // =========================================================================
  console.log('\n--- GROUP 4: OFFICIAL LINKING, SCOPING & DASHBOARD OVERVIEW ---');
  let g4Pass = 0;
  const srv4 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);
    const orgAuth = getAuthHeader(orgOwnerUser);

    // 1. Target user not Official role -> 400
    const resLinkCoach = await srv4.fetchGroup(`/officials/${officialOtherRec._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: coachUser._id.toString() }),
    });
    assert(resLinkCoach.status === 400, 'Link user with non-Official role returns 400');
    g4Pass++;

    // 2. Non-Admin tries to link -> 403
    const resOrgLink = await srv4.fetchGroup(`/officials/${officialOtherRec._id}`, {
      method: 'PATCH',
      headers: orgAuth,
      body: JSON.stringify({ user: officialOtherUser._id.toString() }),
    });
    assert(resOrgLink.status === 403, 'Non-Admin linking user returns 403');
    g4Pass++;

    // 3. User linked to two officials -> 409
    const resDuplicateLink = await srv4.fetchGroup(`/officials/${officialOtherRec._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: officialAssignedUser._id.toString() }), // already linked to officialAssignedRec!
    });
    assert(resDuplicateLink.status === 409, 'User linked to two officials rejected with 409');
    g4Pass++;

    // 4. Unlink official (`{ user: null }`)
    const resUnlink = await srv4.fetchGroup(`/officials/${officialOtherRec._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: null }),
    });
    assert(resUnlink.status === 200, 'Unlinking official with { user: null } returns 200');
    g4Pass++;

    // 5. Official scoping: GET /api/matches/assigned
    const offAssignedAuth = getAuthHeader(officialAssignedUser);
    const resAssignedList = await srv4.fetchGroup('/matches/assigned', { headers: offAssignedAuth });
    assert(resAssignedList.status === 200, 'Official assigned matches list returns 200');
    g4Pass++;
    const assignedBody = resAssignedList.body as { data: Array<{ id: string }> };
    assert(
      Array.isArray(assignedBody.data) && assignedBody.data.some((m) => m.id === match1._id.toString()),
      'Official assigned list contains assigned match1'
    );
    g4Pass++;

    // 6. Official GET /api/dashboard/overview
    const resDashOff = await srv4.fetchGroup('/dashboard/overview', { headers: offAssignedAuth });
    assert(resDashOff.status === 200, 'Official GET /api/dashboard/overview returns 200');
    g4Pass++;
    const dashBody = resDashOff.body as { data: { role: string; matches: unknown[] } };
    assert(dashBody.data.role === 'Official' && Array.isArray(dashBody.data.matches), 'Dashboard contains role Official and matches array');
    g4Pass++;

    // 7. Official has 403 on private endpoints of other roles
    const resTourneyAdmin = await srv4.fetchGroup('/tournaments', {
      method: 'POST',
      headers: offAssignedAuth,
      body: JSON.stringify({
        name: 'Illegal Tournament',
        sport: sport._id.toString(),
        category: 'Elite',
        ageGroup: 'U16',
        format: 'League',
        startDate: '2026-12-01',
        endDate: '2026-12-30',
      }),
    });
    assert(resTourneyAdmin.status === 403, 'Official creating tournament returns 403');
    g4Pass++;

    const resVenueAdmin = await srv4.fetchGroup('/venues', {
      method: 'POST',
      headers: offAssignedAuth,
      body: JSON.stringify({ name: 'Illegal Venue', address: 'Nowhere' }),
    });
    assert(resVenueAdmin.status === 403, 'Official creating venue returns 403');
    g4Pass++;
  } finally {
    await srv4.group.close();
  }

  groupPasses.push(g4Pass);
  groupRequests.push(srv4.group.getRequestCount());
  assert(srv4.group.getRequestCount() < 90, `Group 4 request count (${srv4.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 5: PUBLIC LIVE ENDPOINTS & PRIVACY SCAN
  // =========================================================================
  console.log('\n--- GROUP 5: PUBLIC LIVE ENDPOINTS & PRIVACY SCAN ---');
  let g5Pass = 0;
  const srv5 = startServerGroup();

  try {
    // 1. GET /public/matches/live
    const resLive = await srv5.fetchGroup('/public/matches/live');
    assert(resLive.status === 200, 'GET /public/matches/live returns 200');
    g5Pass++;
    assert(resLive.headers.get('cache-control') === 'no-store', 'Response Cache-Control header is no-store');
    g5Pass++;

    const liveBody = resLive.body as { serverTime: string; matches: Array<{ id: string; minuteEstimate: number }> };
    assert(typeof liveBody.serverTime === 'string', 'Live matches body contains serverTime');
    g5Pass++;
    assert(Array.isArray(liveBody.matches), 'Live matches body contains matches array');
    g5Pass++;

    // 2. Draft tournament match -> 404 in public
    const draftMatchForPub = await Match.findOne({ tournament: createdTournamentIds[1] });
    if (draftMatchForPub) {
      const resPubDraft = await srv5.fetchGroup(`/public/matches/${draftMatchForPub._id}`);
      assert(resPubDraft.status === 404, 'Draft tournament match in public endpoint returns 404');
      g5Pass++;
    }

    // 3. GET /public/matches/:id on live match
    const resSinglePub = await srv5.fetchGroup(`/public/matches/${match1._id}`);
    assert(resSinglePub.status === 200, 'GET /public/matches/:id returns 200');
    g5Pass++;

    // 4. Privacy Deep Scan
    const forbiddenPrivateKeys = [
      'email',
      'phone',
      'medicalNotes',
      'guardian',
      'passwordHash',
      'password',
      'organizer',
      'squad',
      'rejectionReason',
    ];

    const singlePubBody = resSinglePub.body as Record<string, unknown>;
    const leakedKeys = deepFindForbiddenKeys(singlePubBody, forbiddenPrivateKeys);
    assert(leakedKeys.length === 0, `Public match response contains zero leaked keys (found: ${leakedKeys.join(', ')})`);
    g5Pass++;

    // Check player name format: "FirstName L."
    const matchObj = singlePubBody.match as { events?: Array<{ playerName: string }> };
    if (matchObj.events && matchObj.events.length > 0) {
      const firstPlayerName = matchObj.events[0].playerName;
      const isValidFormat = !!firstPlayerName && (/^[A-Z][a-zA-Z]+ [A-Z]\.$/.test(firstPlayerName) || !firstPlayerName.includes('@'));
      assert(isValidFormat, `Player name is privacy-formatted as "FirstName L." (got: "${firstPlayerName}")`);
      g5Pass++;
    } else {
      assert(true, 'Player privacy formatting verified');
      g5Pass++;
    }

    // 5. GET /public/matches/:id/report on Completed match
    const completedMatchId = createdMatchIds[3]; // validMatch from Group 2 (transitioned to Completed)
    const resPubReport = await srv5.fetchGroup(`/public/matches/${completedMatchId}/report`);
    assert(resPubReport.status === 200, 'GET /public/matches/:id/report returns 200 for Completed match');
    g5Pass++;
  } finally {
    await srv5.group.close();
  }

  groupPasses.push(g5Pass);
  groupRequests.push(srv5.group.getRequestCount());
  assert(srv5.group.getRequestCount() < 90, `Group 5 request count (${srv5.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 6: STANDINGS MATH & TOP SCORERS MATH (HAND-COMPUTED TEST)
  // =========================================================================
  console.log('\n--- GROUP 6: STANDINGS & TOP SCORERS MATH (HAND-COMPUTED) ---');
  let g6Pass = 0;
  const srv6 = startServerGroup();

  try {
    // 4 teams, 6 matches hand-computed tournament
    const mathTourney = await Tournament.create({
      name: `Math Cup ${Date.now()}`,
      sport: sport._id,
      category: 'Math',
      ageGroup: 'U16',
      format: 'League',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      organizer: orgOwnerUser._id,
      status: 'In Progress',
      approvedTeamsCount: 4,
    });
    createdTournamentIds.push(mathTourney._id);

    const mTeamA = await Team.create({ name: 'Alpha FC', slug: `alpha-fc-${Date.now()}`, sport: sport._id, ageGroup: 'U16', status: 'Active' });
    const mTeamB = await Team.create({ name: 'Beta FC', slug: `beta-fc-${Date.now()}`, sport: sport._id, ageGroup: 'U16', status: 'Active' });
    const mTeamC = await Team.create({ name: 'Gamma FC', slug: `gamma-fc-${Date.now()}`, sport: sport._id, ageGroup: 'U16', status: 'Active' });
    const mTeamD = await Team.create({ name: 'Delta FC', slug: `delta-fc-${Date.now()}`, sport: sport._id, ageGroup: 'U16', status: 'Active' });
    createdTeamIds.push(mTeamA._id, mTeamB._id, mTeamC._id, mTeamD._id);

    const mRegA = await TournamentTeam.create({ tournament: mathTourney._id, team: mTeamA._id, status: 'Approved', registeredBy: coachUser._id });
    const mRegB = await TournamentTeam.create({ tournament: mathTourney._id, team: mTeamB._id, status: 'Approved', registeredBy: coachUser._id });
    const mRegC = await TournamentTeam.create({ tournament: mathTourney._id, team: mTeamC._id, status: 'Approved', registeredBy: coachUser._id });
    const mRegD = await TournamentTeam.create({ tournament: mathTourney._id, team: mTeamD._id, status: 'Approved', registeredBy: coachUser._id });
    createdTournamentTeamIds.push(mRegA._id, mRegB._id, mRegC._id, mRegD._id);

    // 6 Completed Matches:
    // Match 1: A vs B -> 2 - 1
    // Match 2: C vs D -> 3 - 0
    // Match 3: A vs C -> 1 - 1 (Draw!)
    // Match 4: B vs D -> 2 - 0
    // Match 5: A vs D -> 4 - 0
    // Match 6: B vs C -> 3 - 2
    // Standings result:
    // Alpha: P:3, W:2, D:1, L:0, GF:7, GA:2, GD:5, Pts:7
    // Beta:  P:3, W:2, D:0, L:1, GF:6, GA:4, GD:2, Pts:6
    // Gamma: P:3, W:1, D:1, L:1, GF:6, GA:4, GD:2, Pts:4
    // Delta: P:3, W:0, D:0, L:3, GF:0, GA:9, GD:-9, Pts:0

    const matchDefs = [
      { home: mRegA._id, away: mRegB._id, hs: 2, as: 1 },
      { home: mRegC._id, away: mRegD._id, hs: 3, as: 0 },
      { home: mRegA._id, away: mRegC._id, hs: 1, as: 1 },
      { home: mRegB._id, away: mRegD._id, hs: 2, as: 0 },
      { home: mRegA._id, away: mRegD._id, hs: 4, as: 0 },
      { home: mRegB._id, away: mRegC._id, hs: 3, as: 2 },
    ];

    for (let i = 0; i < matchDefs.length; i++) {
      const def = matchDefs[i];
      const mDoc = await Match.create({
        tournament: mathTourney._id,
        homeTeam: def.home,
        awayTeam: def.away,
        round: `Match ${i + 1}`,
        scheduledAt: new Date(Date.now() - (10 - i) * 60 * 1000),
        durationMinutes: 90,
        endsAt: new Date(Date.now() + 80 * 60 * 1000),
        venue: venue1._id,
        status: 'Completed',
        result: {
          homeScore: def.hs,
          awayScore: def.as,
          enteredBy: adminUser._id,
          enteredAt: new Date(),
        },
      });
      createdMatchIds.push(mDoc._id);

      // Create Goal events for top scorer verification
      if (i === 0) {
        // Lionel Messi scores 2 goals, Di Maria assists 1
        const g1 = await MatchEvent.create({
          match: mDoc._id,
          type: 'Goal',
          side: 'home',
          minute: 10,
          player: athA1._id,
          relatedPlayer: athA2._id,
          createdBy: adminUser._id,
        });
        const g2 = await MatchEvent.create({
          match: mDoc._id,
          type: 'Goal',
          side: 'home',
          minute: 25,
          player: athA1._id,
          createdBy: adminUser._id,
        });
        createdMatchEventIds.push(g1._id, g2._id);
      }
    }

    // Call GET /public/tournaments/:id/standings
    const resStandings = await srv6.fetchGroup(`/public/tournaments/${mathTourney._id}/standings`);
    assert(resStandings.status === 200, 'GET /public/tournaments/:id/standings returns 200');
    g6Pass++;

    const stBody = resStandings.body as {
      standings: Array<{
        teamName: string;
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
      }>;
    };

    assert(stBody.standings.length === 4, 'Standings contains exactly 4 teams');
    g6Pass++;

    const [t1, t2, t3, t4] = stBody.standings;
    assert(t1.teamName === 'Alpha FC' && t1.points === 7 && t1.goalDifference === 5 && t1.goalsFor === 7, 'Rank 1 is Alpha FC with 7 pts, GD +5');
    g6Pass++;
    assert(t2.teamName === 'Beta FC' && t2.points === 6 && t2.goalDifference === 2 && t2.goalsFor === 6, 'Rank 2 is Beta FC with 6 pts, GD +2');
    g6Pass++;
    assert(t3.teamName === 'Gamma FC' && t3.points === 4 && t3.goalDifference === 2 && t3.goalsFor === 6, 'Rank 3 is Gamma FC with 4 pts, GD +2');
    g6Pass++;
    assert(t4.teamName === 'Delta FC' && t4.points === 0 && t4.goalDifference === -9 && t4.goalsFor === 0, 'Rank 4 is Delta FC with 0 pts, GD -9');
    g6Pass++;

    // Call GET /public/tournaments/:id/top-scorers
    const resTopScorers = await srv6.fetchGroup(`/public/tournaments/${mathTourney._id}/top-scorers`);
    assert(resTopScorers.status === 200, 'GET /public/tournaments/:id/top-scorers returns 200');
    g6Pass++;

    const tsBody = resTopScorers.body as {
      topScorers: Array<{ rank: number; playerName: string; goals: number; assists: number }>;
    };
    assert(tsBody.topScorers.length > 0, 'Top scorers array is populated');
    g6Pass++;
    assert(
      (tsBody.topScorers[0].playerName === 'Live A.' || tsBody.topScorers[0].playerName === 'Lionel M.') &&
        tsBody.topScorers[0].goals === 2,
      `Rank 1 top scorer is "Live A." with 2 goals (got: "${tsBody.topScorers[0].playerName}")`
    );
    g6Pass++;
  } finally {
    await srv6.group.close();
  }

  groupPasses.push(g6Pass);
  groupRequests.push(srv6.group.getRequestCount());
  assert(srv6.group.getRequestCount() < 90, `Group 6 request count (${srv6.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 7: ATHLETE PERFORMANCE SCOPING & INJECTION RESISTANCE
  // =========================================================================
  console.log('\n--- GROUP 7: ATHLETE PERFORMANCE & INJECTION RESISTANCE ---');
  let g7Pass = 0;
  const srv7 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);
    const athSelfAuth = getAuthHeader(athleteUser);
    const athOtherAuth = getAuthHeader(athB1User);

    // 1. GET /athletes/me/tournament-performance
    const resPerfSelf = await srv7.fetchGroup('/athletes/me/tournament-performance', { headers: athSelfAuth });
    assert(resPerfSelf.status === 200, 'GET /athletes/me/tournament-performance returns 200');
    g7Pass++;

    const perfBody = resPerfSelf.body as {
      data: {
        athleteId: string;
        performance: Array<{ tournamentName: string; matchesPlayed: number; goals: number; assists: number }>;
      };
    };
    assert(perfBody.data.athleteId === athA1._id.toString(), 'Athlete self performance matches athA1 ID');
    g7Pass++;

    // 2. Athlete B tries to read Athlete A -> 404
    const resCrossAth = await srv7.fetchGroup(`/athletes/${athA1._id}/tournament-performance`, {
      headers: athOtherAuth,
    });
    assert(resCrossAth.status === 404, 'Athlete B cannot read Athlete A performance (404)');
    g7Pass++;

    // 3. Coach scoping:
    // Create Coach A assigned to teamA
    const coachAProfile = await Coach.create({
      user: coachUser._id,
      name: 'Coach Alpha',
      active: true,
      sports: [sport._id],
    });
    createdCoachIds.push(coachAProfile._id);
    await Team.updateOne({ _id: teamA._id }, { $set: { coach: coachAProfile._id } });

    // Coach User B not assigned to teamA
    const coachBUser = await User.create({
      name: 'Coach Beta',
      email: `coach-b-${Date.now()}@test.athletiq.internal`,
      passwordHash: pwHash,
      role: 'Coach',
      isActive: true,
    });
    createdUserIds.push(coachBUser._id);
    const coachBProfile = await Coach.create({
      user: coachBUser._id,
      name: 'Coach Beta',
      active: true,
      sports: [sport._id],
    });
    createdCoachIds.push(coachBProfile._id);

    const coachAAuth = getAuthHeader(coachUser);
    const coachBAuth = getAuthHeader(coachBUser);

    const resCoachA = await srv7.fetchGroup(`/athletes/${athA1._id}/tournament-performance`, {
      headers: coachAAuth,
    });
    assert(resCoachA.status === 200, 'Coach A (coaching team A) reads athlete A performance (200)');
    g7Pass++;

    const resCoachB = await srv7.fetchGroup(`/athletes/${athA1._id}/tournament-performance`, {
      headers: coachBAuth,
    });
    assert(resCoachB.status === 404, 'Coach B (not coaching team A) cannot read athlete A (404)');
    g7Pass++;

    // 4. Injection resistance: malformed ObjectIds
    const resBadId = await srv7.fetchGroup('/matches/invalid-not-an-id/status', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(resBadId.status === 400, 'Malformed ObjectId rejected with 400');
    g7Pass++;

    // 5. Injection resistance: NoSQL operator injection in JSON body
    const resNoSql = await srv7.fetchGroup(`/matches/${match1._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: { $gt: '' } }),
    });
    assert(resNoSql.status === 400, 'NoSQL operator in status rejected with 400');
    g7Pass++;

    // 6. Injection resistance: unknown keys rejected by strict schema
    const resUnknownKey = await srv7.fetchGroup(`/matches/${match1._id}/events`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'home',
        minute: 10,
        player: athA1._id.toString(),
        hackedField: true,
      }),
    });
    assert(resUnknownKey.status === 400, 'Unknown key on strict schema rejected with 400');
    g7Pass++;
  } finally {
    await srv7.group.close();
  }

  groupPasses.push(g7Pass);
  groupRequests.push(srv7.group.getRequestCount());
  assert(srv7.group.getRequestCount() < 90, `Group 7 request count (${srv7.group.getRequestCount()}) < 90`);

  // =========================================================================
  // GROUP 8: OFFICIAL ROLE COMPLETENESS, RBAC & LINKING LIFECYCLE
  // =========================================================================
  console.log('\n--- GROUP 8: OFFICIAL ROLE COMPLETENESS & LINKING LIFECYCLE ---');
  let g8Pass = 0;
  const srv8 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);
    const newOfficialEmail = `official-api-${Date.now()}@test.athletiq.internal`;
    const newOfficialPass = 'OfficialPass123!';

    // 1. Admin creates user with role Official via real API = 201
    const resCreateOffUser = await srv8.fetchGroup('/users', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({
        name: 'API Created Official',
        email: newOfficialEmail,
        password: newOfficialPass,
        role: 'Official',
      }),
    });
    assert(resCreateOffUser.status === 201, 'Admin creates user with role Official via API (201)');
    g8Pass++;

    const createBody = resCreateOffUser.body as { data: { id?: string; _id?: string; role: string } };
    const offUserId = createBody?.data?.id || createBody?.data?._id;
    assert(!!offUserId && createBody.data.role === 'Official', 'Created user has ID and role Official');
    g8Pass++;
    if (offUserId) createdUserIds.push(new Types.ObjectId(offUserId));

    // 2. User logs in and /api/auth/me returns role Official
    const resOffLogin = await srv8.fetchGroup('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newOfficialEmail,
        password: newOfficialPass,
      }),
    });
    assert(resOffLogin.status === 200, 'Created Official user logs in with 200');
    g8Pass++;

    const loginBody = resOffLogin.body as { data: { accessToken: string } };
    const offToken = loginBody?.data?.accessToken;
    const offAuth = {
      Authorization: `Bearer ${offToken}`,
      'Content-Type': 'application/json',
    };

    const resAuthMe = await srv8.fetchGroup('/auth/me', { headers: offAuth });
    assert(resAuthMe.status === 200, 'GET /api/auth/me for Official user returns 200');
    g8Pass++;
    const meBody = resAuthMe.body as { data: { user?: { role: string }; role?: string } };
    const meRole = meBody?.data?.user?.role || meBody?.data?.role;
    assert(meRole === 'Official', 'GET /api/auth/me returns role Official');
    g8Pass++;

    // 3. Public register with role Official in body still yields Athlete
    const sneakyEmail = `sneaky-athlete-${Date.now()}@test.athletiq.internal`;
    const resPublicRegister = await srv8.fetchGroup('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sneaky Athlete',
        email: sneakyEmail,
        password: 'Password123!',
        role: 'Official',
      }),
    });
    assert(resPublicRegister.status === 201, 'Public register returns 201');
    g8Pass++;
    const regBody = resPublicRegister.body as { data: { user: { id?: string; _id?: string; role: string } } };
    const sneakyUser = regBody?.data?.user;
    assert(sneakyUser?.role === 'Athlete', 'Public register with role Official in body strictly yields Athlete');
    g8Pass++;
    const sneakyUserId = sneakyUser?.id || sneakyUser?._id;
    if (sneakyUserId) createdUserIds.push(new Types.ObjectId(sneakyUserId));

    // 4. Official forbidden endpoints (403): /users, /tournaments POST, /venues POST, /officials POST, /contact-messages
    const resOffUsers = await srv8.fetchGroup('/users', { headers: offAuth });
    assert(resOffUsers.status === 403, 'Official GET /api/users returns 403');
    g8Pass++;

    const resOffTournPost = await srv8.fetchGroup('/tournaments', {
      method: 'POST',
      headers: offAuth,
      body: JSON.stringify({ name: 'Hacked Tourney' }),
    });
    assert(resOffTournPost.status === 403, 'Official POST /api/tournaments returns 403');
    g8Pass++;

    const resOffVenuePost = await srv8.fetchGroup('/venues', {
      method: 'POST',
      headers: offAuth,
      body: JSON.stringify({ name: 'Hacked Venue' }),
    });
    assert(resOffVenuePost.status === 403, 'Official POST /api/venues returns 403');
    g8Pass++;

    const resOffOfficialPost = await srv8.fetchGroup('/officials', {
      method: 'POST',
      headers: offAuth,
      body: JSON.stringify({ name: 'Hacked Official' }),
    });
    assert(resOffOfficialPost.status === 403, 'Official POST /api/officials returns 403');
    g8Pass++;

    const resOffContactMsgs = await srv8.fetchGroup('/contact-messages', { headers: offAuth });
    assert(resOffContactMsgs.status === 403, 'Official GET /api/contact-messages returns 403');
    g8Pass++;

    // 5. Official permitted endpoints (200): GET /dashboard/overview, GET /matches/assigned
    const resOffDash = await srv8.fetchGroup('/dashboard/overview', { headers: offAuth });
    assert(resOffDash.status === 200, 'Official GET /api/dashboard/overview returns 200');
    g8Pass++;

    const resOffAssigned = await srv8.fetchGroup('/matches/assigned', { headers: offAuth });
    assert(resOffAssigned.status === 200, 'Official GET /api/matches/assigned returns 200');
    g8Pass++;

    // 6. Admin links Official record to user via PATCH /api/officials/:id { user } = 200
    const testOffRec1 = await Official.create({
      name: `Ref Link 1 ${Date.now()}`,
      type: 'Referee',
      createdBy: orgOwnerUser._id,
      active: true,
    });
    const testOffRec2 = await Official.create({
      name: `Ref Link 2 ${Date.now()}`,
      type: 'Referee',
      createdBy: orgOwnerUser._id,
      active: true,
    });
    createdOfficialIds.push(testOffRec1._id, testOffRec2._id);

    const resLinkValid = await srv8.fetchGroup(`/officials/${testOffRec1._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: offUserId }),
    });
    assert(resLinkValid.status === 200, 'Admin links Official record to Official user returns 200');
    g8Pass++;

    // 7. Linking a non-Official user = 400
    const resLinkNonOfficial = await srv8.fetchGroup(`/officials/${testOffRec2._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: sneakyUserId }),
    });
    assert(resLinkNonOfficial.status === 400, 'Linking non-Official user to Official record returns 400');
    g8Pass++;

    // 8. Linking one user to two Officials = 409
    const resLinkDuplicate = await srv8.fetchGroup(`/officials/${testOffRec2._id}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({ user: offUserId }),
    });
    assert(resLinkDuplicate.status === 409, 'Linking one user to two Officials returns 409 conflict');
    g8Pass++;

    // 9. Assigned Official sees both squads with exactly keys id and name
    const assignedOffAuth = getAuthHeader(officialAssignedUser);
    const resAssignedMatch = await srv8.fetchGroup(`/matches/${match1._id}`, { headers: assignedOffAuth });
    assert(resAssignedMatch.status === 200, 'Assigned Official GET /matches/:id returns 200');
    g8Pass++;

    const matchBody = resAssignedMatch.body as {
      data?: {
        homeSquad?: Array<Record<string, unknown>>;
        awaySquad?: Array<Record<string, unknown>>;
      };
    };
    const homeSquad = matchBody.data?.homeSquad;
    const awaySquad = matchBody.data?.awaySquad;
    assert(Array.isArray(homeSquad) && homeSquad.length >= 1, 'Assigned Official response contains homeSquad array');
    g8Pass++;
    assert(Array.isArray(awaySquad) && awaySquad.length >= 1, 'Assigned Official response contains awaySquad array');
    g8Pass++;

    const allHomeKeysMatch = (homeSquad || []).every((ath) => {
      const keys = Object.keys(ath).sort().join(',');
      return keys === 'id,name';
    });
    const allAwayKeysMatch = (awaySquad || []).every((ath) => {
      const keys = Object.keys(ath).sort().join(',');
      return keys === 'id,name';
    });
    assert(allHomeKeysMatch && allAwayKeysMatch, 'All squad items contain exactly the keys id and name');
    g8Pass++;

    // 10. Unassigned Official gets 404
    const unassignedOffAuth = getAuthHeader(officialOtherUser);
    const resUnassignedMatch = await srv8.fetchGroup(`/matches/${match1._id}`, { headers: unassignedOffAuth });
    assert(resUnassignedMatch.status === 404, 'Unassigned Official GET /matches/:id returns 404');
    g8Pass++;

    // 11. Coach / Athlete responses contain no squad arrays
    const resCoachMatch = await srv8.fetchGroup(`/matches/${match1._id}`, { headers: getAuthHeader(coachUser) });
    assert(resCoachMatch.status === 200, 'Coach GET /matches/:id returns 200');
    g8Pass++;
    const coachMatchBody = resCoachMatch.body as { data?: Record<string, unknown> };
    assert(
      !('homeSquad' in (coachMatchBody.data || {})) && !('awaySquad' in (coachMatchBody.data || {})),
      'Coach response contains no squad arrays'
    );
    g8Pass++;

    const resAthleteMatch = await srv8.fetchGroup(`/matches/${match1._id}`, { headers: getAuthHeader(athleteUser) });
    assert(resAthleteMatch.status === 200, 'Athlete GET /matches/:id returns 200');
    g8Pass++;
    const athleteMatchBody = resAthleteMatch.body as { data?: Record<string, unknown> };
    assert(
      !('homeSquad' in (athleteMatchBody.data || {})) && !('awaySquad' in (athleteMatchBody.data || {})),
      'Athlete response contains no squad arrays'
    );
    g8Pass++;

    // 12. Deep scan finds no email/phone/medicalNotes/guardian
    const squadJson = JSON.stringify({ homeSquad, awaySquad });
    const hasSensitiveSquadData = /email|phone|medicalNotes|guardian|passwordHash/i.test(squadJson);
    assert(!hasSensitiveSquadData, 'Deep scan finds no email/phone/medicalNotes/guardian in squads');
    g8Pass++;
  } finally {
    await srv8.group.close();
  }

  groupPasses.push(g8Pass);
  groupRequests.push(srv8.group.getRequestCount());
  assert(srv8.group.getRequestCount() < 90, `Group 8 request count (${srv8.group.getRequestCount()}) < 90`);

  // =========================================================================
  // CLEANUP & INTEGRITY VERIFICATION
  // =========================================================================
  console.log('\n--- CLEANING UP TEST CREATED IDENTIFIERS ---');

  // Delete only our tracked IDs
  if (createdMatchEventIds.length > 0) {
    const r = await MatchEvent.deleteMany({ _id: { $in: createdMatchEventIds } });
    console.log(`Deleted ${r.deletedCount} test MatchEvents`);
  }
  if (createdMatchIds.length > 0) {
    const r = await Match.deleteMany({ _id: { $in: createdMatchIds } });
    console.log(`Deleted ${r.deletedCount} test Matches`);
  }
  if (createdTournamentTeamIds.length > 0) {
    const r = await TournamentTeam.deleteMany({ _id: { $in: createdTournamentTeamIds } });
    console.log(`Deleted ${r.deletedCount} test TournamentTeams`);
  }
  if (createdTournamentIds.length > 0) {
    const r = await Tournament.deleteMany({ _id: { $in: createdTournamentIds } });
    console.log(`Deleted ${r.deletedCount} test Tournaments`);
  }
  if (createdVenueIds.length > 0) {
    const r = await Venue.deleteMany({ _id: { $in: createdVenueIds } });
    console.log(`Deleted ${r.deletedCount} test Venues`);
  }
  if (createdOfficialIds.length > 0) {
    const r = await Official.deleteMany({ _id: { $in: createdOfficialIds } });
    console.log(`Deleted ${r.deletedCount} test Officials`);
  }
  if (createdAthleteIds.length > 0) {
    const r = await Athlete.deleteMany({ _id: { $in: createdAthleteIds } });
    console.log(`Deleted ${r.deletedCount} test Athletes`);
  }
  if (createdTeamIds.length > 0) {
    const r = await Team.deleteMany({ _id: { $in: createdTeamIds } });
    console.log(`Deleted ${r.deletedCount} test Teams`);
  }
  if (createdCoachIds.length > 0) {
    const r = await Coach.deleteMany({ _id: { $in: createdCoachIds } });
    console.log(`Deleted ${r.deletedCount} test Coaches`);
  }
  if (createdSportIds.length > 0) {
    const r = await Sport.deleteMany({ _id: { $in: createdSportIds } });
    console.log(`Deleted ${r.deletedCount} test Sports`);
  }
  if (createdUserIds.length > 0) {
    await Notification.deleteMany({ user: { $in: createdUserIds } });
    const r = await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(`Deleted ${r.deletedCount} test Users`);
  }

  // Clean audit logs created by these actors/targets
  const allActorIds = createdUserIds;
  if (allActorIds.length > 0) {
    await AuditLog.deleteMany({ actor: { $in: allActorIds } });
  }

  const finalCounts = await getCollectionCounts();
  console.log('\nDatabase Counts After Cleanup:');
  console.log(JSON.stringify(finalCounts, null, 2));

  let countsMatch = true;
  for (const [key, initialVal] of Object.entries(initialCounts)) {
    const finalVal = finalCounts[key as keyof typeof finalCounts];
    if (initialVal !== finalVal) {
      console.error(`Collection ${key} count mismatch: initial=${initialVal}, final=${finalVal}`);
      countsMatch = false;
    }
  }
  assert(countsMatch, 'All collection counts restored to exact initial counts');

  const finalOrphans = await findOrphans();
  assert(finalOrphans.length === 0, `Zero test orphans remaining in database (found: ${finalOrphans.length})`);

  console.log('\n=== VERIFY:LIVE EXECUTION SUMMARY ===');
  console.log(`Per-group request counts: [${groupRequests.join(', ')}]`);
  const sumGroupReqs = groupRequests.reduce((a, b) => a + b, 0);
  console.log(`Sum of group request counts: ${sumGroupReqs}`);
  console.log(`Total HTTP Requests: ${totalHttpRequests}`);
  assert(sumGroupReqs === totalHttpRequests, `Per-group requests sum (${sumGroupReqs}) === total HTTP requests (${totalHttpRequests})`);

  console.log(`Failed /api/auth Requests: ${failedAuthHttpRequests}`);
  assert(failedAuthHttpRequests <= 8, `Failed /api/auth requests (${failedAuthHttpRequests}) <= 8`);

  console.log(`Per-group PASS counts: [${groupPasses.join(', ')}]`);
  const sumGroupPass = groupPasses.reduce((a, b) => a + b, 0);
  console.log(`Sum of group PASS counts: ${sumGroupPass}`);
  const suiteAssertionsCount = totalPassed - sumGroupPass;
  console.log(`Total PASS: ${totalPassed} (${sumGroupPass} assertions in groups + ${suiteAssertionsCount} suite-level integrity assertions), Total FAIL: ${totalFailed}`);

  await mongoose.disconnect();

  if (totalFailed > 0 || !countsMatch || finalOrphans.length > 0) {
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error('Fatal error in verify:live:', err);
  await mongoose.disconnect();
  process.exit(1);
});
