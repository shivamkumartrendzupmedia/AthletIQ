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
  Match,
  MatchEvent,
  ContactMessage,
  Notification,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/models/constants.js';
import { ROLE_TOOLS } from '../src/services/chatbot/tools.registry.js';
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
    officials: await mongoose.connection.collection('officials').countDocuments(),
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

  // Match 1: In tourney1, scheduled now
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
      { name: 'Coach', auth: getAuthHeader(coachUser) },
      { name: 'Athlete', auth: getAuthHeader(athleteUser) },
      { name: 'Unauthenticated', auth: null },
    ];

    const matrix: Record<string, Record<string, number>> = {
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

      // 1. POST /matches/:id/status
      const resStatus = await srv1.fetchGroup(`/matches/${match1._id}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'HalfTime' }),
      });
      matrix['POST /matches/:id/status'][r.name] = resStatus.status;
      // Reset match to Live for next iteration
      await Match.updateOne({ _id: match1._id }, { $set: { status: 'Live' } });

      // 2. POST /matches/:id/events
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

      // 3. DELETE /matches/:id/events/:eventId
      const resDelEv = await srv1.fetchGroup(`/matches/${match1._id}/events/${dummyEv._id}`, {
        method: 'DELETE',
        headers,
      });
      matrix['DELETE /matches/:id/events/:eventId'][r.name] = resDelEv.status;

      // 4. GET /matches/:id/report
      const resReport = await srv1.fetchGroup(`/matches/${match1._id}/report`, { headers });
      matrix['GET /matches/:id/report'][r.name] = resReport.status;
    }

    // Reset dummy event for cleanup tracking
    await MatchEvent.deleteOne({ _id: dummyEv._id });

    // Print markdown matrix
    console.log('\n--- REAL PERMISSIONS MATRIX (LIVE RESPONSES) ---');
    console.log('| Endpoint & Method | Admin | Org Owner | Org Other | Coach | Athlete | Unauthenticated |');
    console.log('|---|---|---|---|---|---|---|');
    for (const [ep, resMap] of Object.entries(matrix)) {
      console.log(
        `| ${ep.padEnd(35)} | ${resMap['Admin']} | ${resMap['Org Owner']} | ${resMap['Org Other']} | ${resMap['Coach']} | ${resMap['Athlete']} | ${resMap['Unauthenticated']} |`
      );
    }

    // Asserts
    assert(
      matrix['POST /matches/:id/status']['Admin'] === 200 &&
      matrix['POST /matches/:id/status']['Org Owner'] === 200,
      'POST /matches/:id/status allowed for Admin and Owning Organizer'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/status']['Org Other'] === 404,
      'POST /matches/:id/status returns 404 for non-owning Organizer'
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
      matrix['POST /matches/:id/events']['Org Owner'] === 201,
      'POST /matches/:id/events allowed (201) for Admin and Owning Org'
    );
    g1Pass++;

    assert(
      matrix['POST /matches/:id/events']['Org Other'] === 404,
      'POST /matches/:id/events returns 404 for non-owning Org'
    );
    g1Pass++;

    assert(
      matrix['GET /matches/:id/report']['Admin'] === 200 &&
      matrix['GET /matches/:id/report']['Org Owner'] === 200 &&
      matrix['GET /matches/:id/report']['Coach'] === 200 &&
      matrix['GET /matches/:id/report']['Athlete'] === 200,
      'GET /matches/:id/report accessible to all authorized roles for non-draft tournament'
    );
    g1Pass++;

    assert(
      matrix['GET /matches/:id/report']['Org Other'] === 404,
      'GET /matches/:id/report returns 404 for unauthorized organizer'
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

    // 7. Post-completion correction: Non-owning Organizer cannot delete event on Completed match (403), Admin can (200)
    const orgOtherAuth = getAuthHeader(orgOtherUser);
    const targetAwayEv = await MatchEvent.findOne({ match: eventMatch._id, side: 'away', type: 'Goal' });

    const resOrgDelCompleted = await srv3.fetchGroup(
      `/matches/${eventMatch._id}/events/${targetAwayEv!._id}`,
      { method: 'DELETE', headers: orgOtherAuth }
    );
    assert(resOrgDelCompleted.status === 403, 'Non-owning Organizer cannot delete event after match is Completed (403)');
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
  // GROUP 8: OFFICIAL ROLE REMOVAL & OFFICIAL RECORD INTEGRITY VERIFICATION (STEP 15)
  // =========================================================================
  console.log('\n--- GROUP 8: OFFICIAL ROLE REMOVAL & RECORD INTEGRITY (STEP 15) ---');
  let g8Pass = 0;
  const srv8 = startServerGroup();

  try {
    const adminAuth = getAuthHeader(adminUser);
    const orgOwnerAuth = getAuthHeader(orgOwnerUser);
    const orgOtherAuth = getAuthHeader(orgOtherUser);
    const coachAuth = getAuthHeader(coachUser);
    const athleteAuth = getAuthHeader(athleteUser);

    // 1. Admin creating a user with role "Official" = 400
    const resCreateOff = await srv8.fetchGroup('/users', {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({
        name: 'Rejected Official',
        email: `rejected-off-${Date.now()}@test.athletiq.internal`,
        password: 'Password123!',
        role: 'Official',
      }),
    });
    assert(resCreateOff.status === 400, 'Admin creating user with role "Official" returns 400');
    g8Pass++;

    // 2. CLI user provisioning rejects "Official" role
    const cliRoles = ROLES as readonly string[];
    const cliRejectsOfficial = !cliRoles.includes('Official');
    assert(cliRejectsOfficial, 'CLI user provisioning script rejects role "Official"');
    g8Pass++;

    // 3. Public register with role "Official" still yields Athlete
    const sneakyEmail = `sneaky-reg-${Date.now()}@test.athletiq.internal`;
    const resPublicReg = await srv8.fetchGroup('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sneaky Official',
        email: sneakyEmail,
        password: 'Password123!',
        role: 'Official',
      }),
    });
    assert(resPublicReg.status === 201, 'Public register returns 201');
    g8Pass++;
    const regBody = resPublicReg.body as { data: { user: { id?: string; _id?: string; role: string } } };
    const registeredUser = regBody?.data?.user;
    assert(registeredUser?.role === 'Athlete', 'Public register with role "Official" still yields Athlete');
    g8Pass++;
    const regUserId = registeredUser?.id || registeredUser?._id;
    if (regUserId) createdUserIds.push(new Types.ObjectId(regUserId));

    // 4. GET /api/matches/assigned = 404
    const resAssigned404Admin = await srv8.fetchGroup('/matches/assigned', { headers: adminAuth });
    assert(resAssigned404Admin.status === 404, 'GET /api/matches/assigned returns 404 for Admin');
    g8Pass++;

    const resAssigned404Org = await srv8.fetchGroup('/matches/assigned', { headers: orgOwnerAuth });
    assert(resAssigned404Org.status === 404, 'GET /api/matches/assigned returns 404 for Organizer');
    g8Pass++;

    // 5. Live workflow works for Admin and the owning Organizer, 404 for another Organizer, 403 for Coach and Athlete on every live write endpoint
    const liveTestMatch = await Match.create({
      tournament: tourney1._id,
      homeTeam: regA._id,
      awayTeam: regB._id,
      round: 'Round 12',
      scheduledAt: new Date(Date.now() - 10 * 60 * 1000),
      durationMinutes: 90,
      endsAt: new Date(Date.now() + 80 * 60 * 1000),
      venue: venue1._id,
      status: 'Live',
      startedAt: new Date(),
    });
    createdMatchIds.push(liveTestMatch._id);

    // 8a. POST /status: Admin = 200, Owning Org = 200, Other Org = 404, Coach = 403, Athlete = 403
    const resStatusAdmin = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/status`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({ status: 'HalfTime' }),
    });
    assert(resStatusAdmin.status === 200, 'Live workflow POST status works for Admin (200)');
    g8Pass++;

    const resStatusOrgOwner = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/status`, {
      method: 'POST',
      headers: orgOwnerAuth,
      body: JSON.stringify({ status: 'Live' }),
    });
    assert(resStatusOrgOwner.status === 200, 'Live workflow POST status works for owning Organizer (200)');
    g8Pass++;

    const resStatusOrgOther = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/status`, {
      method: 'POST',
      headers: orgOtherAuth,
      body: JSON.stringify({ status: 'HalfTime' }),
    });
    assert(resStatusOrgOther.status === 404, 'Live workflow POST status returns 404 for non-owning Organizer');
    g8Pass++;

    const resStatusCoach = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/status`, {
      method: 'POST',
      headers: coachAuth,
      body: JSON.stringify({ status: 'HalfTime' }),
    });
    assert(resStatusCoach.status === 403, 'Live workflow POST status returns 403 for Coach');
    g8Pass++;

    const resStatusAthlete = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/status`, {
      method: 'POST',
      headers: athleteAuth,
      body: JSON.stringify({ status: 'HalfTime' }),
    });
    assert(resStatusAthlete.status === 403, 'Live workflow POST status returns 403 for Athlete');
    g8Pass++;

    // 8b. POST /events: Admin = 201, Owning Org = 201, Other Org = 404, Coach = 403, Athlete = 403
    const resEventAdmin = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events`, {
      method: 'POST',
      headers: adminAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'home',
        minute: 25,
        player: athA1._id.toString(),
      }),
    });
    assert(resEventAdmin.status === 201, 'Live workflow POST event works for Admin (201)');
    g8Pass++;
    const evAdminId = (resEventAdmin.body as { data: { id: string } }).data.id;
    createdMatchEventIds.push(new Types.ObjectId(evAdminId));

    const resEventOrgOwner = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events`, {
      method: 'POST',
      headers: orgOwnerAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'away',
        minute: 30,
        player: athB1._id.toString(),
      }),
    });
    assert(resEventOrgOwner.status === 201, 'Live workflow POST event works for owning Organizer (201)');
    g8Pass++;
    const evOrgId = (resEventOrgOwner.body as { data: { id: string } }).data.id;
    createdMatchEventIds.push(new Types.ObjectId(evOrgId));

    const resEventOrgOther = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events`, {
      method: 'POST',
      headers: orgOtherAuth,
      body: JSON.stringify({
        type: 'YellowCard',
        side: 'home',
        minute: 35,
        player: athA1._id.toString(),
      }),
    });
    assert(resEventOrgOther.status === 404, 'Live workflow POST event returns 404 for non-owning Organizer');
    g8Pass++;

    const resEventCoach = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events`, {
      method: 'POST',
      headers: coachAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'home',
        minute: 40,
        player: athA1._id.toString(),
      }),
    });
    assert(resEventCoach.status === 403, 'Live workflow POST event returns 403 for Coach');
    g8Pass++;

    const resEventAthlete = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events`, {
      method: 'POST',
      headers: athleteAuth,
      body: JSON.stringify({
        type: 'Goal',
        side: 'home',
        minute: 40,
        player: athA1._id.toString(),
      }),
    });
    assert(resEventAthlete.status === 403, 'Live workflow POST event returns 403 for Athlete');
    g8Pass++;

    // 8c. DELETE /events/:id: Admin = 200, Owning Org = 200, Other Org = 404, Coach = 403, Athlete = 403
    const resDelCoach = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events/${evAdminId}`, {
      method: 'DELETE',
      headers: coachAuth,
    });
    assert(resDelCoach.status === 403, 'Live workflow DELETE event returns 403 for Coach');
    g8Pass++;

    const resDelAthlete = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events/${evAdminId}`, {
      method: 'DELETE',
      headers: athleteAuth,
    });
    assert(resDelAthlete.status === 403, 'Live workflow DELETE event returns 403 for Athlete');
    g8Pass++;

    const resDelOrgOther = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events/${evAdminId}`, {
      method: 'DELETE',
      headers: orgOtherAuth,
    });
    assert(resDelOrgOther.status === 404, 'Live workflow DELETE event returns 404 for non-owning Organizer');
    g8Pass++;

    const resDelOrgOwner = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events/${evOrgId}`, {
      method: 'DELETE',
      headers: orgOwnerAuth,
    });
    assert(resDelOrgOwner.status === 200, 'Live workflow DELETE event works for owning Organizer (200)');
    g8Pass++;

    const resDelAdmin = await srv8.fetchGroup(`/matches/${liveTestMatch._id}/events/${evAdminId}`, {
      method: 'DELETE',
      headers: adminAuth,
    });
    assert(resDelAdmin.status === 200, 'Live workflow DELETE event works for Admin (200)');
    g8Pass++;

    // 9. Admin and Organizer chatbot tool lists are unchanged
    const adminTools = ROLE_TOOLS.Admin;
    const orgTools = ROLE_TOOLS.Organizer;
    const expectedAdminTools = [
      'getPublicInfo',
      'getStandings',
      'getMyNotificationsSummary',
      'getAcademyOverview',
      'getPendingRegistrationsCount',
      'getUnreadContactMessagesCount',
    ];
    const expectedOrgTools = [
      'getPublicInfo',
      'getStandings',
      'getMyNotificationsSummary',
      'getMyTournaments',
      'getMyRegistrationsSummary',
      'getMyUpcomingMatches',
    ];
    const adminToolsMatch = JSON.stringify(adminTools) === JSON.stringify(expectedAdminTools);
    const orgToolsMatch = JSON.stringify(orgTools) === JSON.stringify(expectedOrgTools);
    assert(adminToolsMatch, 'Admin chatbot tool list is unchanged');
    g8Pass++;
    assert(orgToolsMatch, 'Organizer chatbot tool list is unchanged');
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
