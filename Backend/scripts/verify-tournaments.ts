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
  Notification,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { findOrphans } from './cleanup-test-orphans.js';
import { ROLE_TOOLS } from '../src/services/chatbot/tools.registry.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;
let failedAuthHttpRequests = 0;

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
  if (url.includes('/api/auth')) {
    // will track failure if 4xx/5xx
  }
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

function getAuthHeader(user: { _id: Types.ObjectId; email: string; role: string }): {
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

async function run(): Promise<void> {
  console.log('\n--- VERIFYING ATHLETIQ TOURNAMENTS SYSTEM (STEP 8A & 8A-FIX) ---\n');

  await connectDB();

  // ==============================================================
  // 1. LEFTOVER ORPHAN PRE-CHECK (HARD REFUSAL IF POLLUTED)
  // ==============================================================
  console.log('--- CHECKING ATLAS FOR LEFTOVER ORPHAN RECORDS ---');
  const leftoverOrphans = await findOrphans();
  if (leftoverOrphans.length > 0) {
    console.error(`\n❌ [LEFTOVER ORPHAN REPORT] Found ${leftoverOrphans.length} orphan records:`);
    for (const o of leftoverOrphans) {
      console.error(`  - [${o.collection}] ID: ${o.id.toString()} | Name: "${o.name}" | Reason: ${o.reason}`);
    }
    console.error('\nRefusing to run tests on polluted database! Run "npm run cleanup:orphans -- --apply" first.\n');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('✅ Leftover orphan pre-check passed: 0 orphans found in database.\n');

  // Snapshot initial database counts dynamically (No hardcoding)
  const initialCounts = {
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
    matches: await Match.countDocuments(),
    auditLogs: await AuditLog.countDocuments(),
  };

  console.log('Initial Database Counts (Real Atlas Snapshot):', JSON.stringify(initialCounts));

  // Tracking arrays for cleanup of ONLY test-created documents
  const createdUserIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];
  const createdTeamIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];
  const createdTourneyIds: Types.ObjectId[] = [];
  const createdRegIds: Types.ObjectId[] = [];
  const createdVenueIds: Types.ObjectId[] = [];
  const createdMatchIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const passwordHash = await hashPassword('Password123');

  const groupCounts: { name: string; count: number }[] = [];

  try {
    // Shared baseline fixtures
    const [adminUser, orgAUser, orgBUser, coachAUser, coachBUser, athleteAUser, athleteBUser] =
      await Promise.all([
        User.create({
          name: 'Admin User',
          email: `admin-${runId}@test.com`,
          passwordHash,
          role: 'Admin',
        }),
        User.create({
          name: 'Organizer A',
          email: `orga-${runId}@test.com`,
          passwordHash,
          role: 'Organizer',
        }),
        User.create({
          name: 'Organizer B',
          email: `orgb-${runId}@test.com`,
          passwordHash,
          role: 'Organizer',
        }),
        User.create({
          name: 'Coach A',
          email: `coacha-${runId}@test.com`,
          passwordHash,
          role: 'Coach',
        }),
        User.create({
          name: 'Coach B',
          email: `coachb-${runId}@test.com`,
          passwordHash,
          role: 'Coach',
        }),
        User.create({
          name: 'Athlete A',
          email: `athleta-${runId}@test.com`,
          passwordHash,
          role: 'Athlete',
        }),
        User.create({
          name: 'Athlete B',
          email: `athletb-${runId}@test.com`,
          passwordHash,
          role: 'Athlete',
        }),
      ]);

    createdUserIds.push(
      adminUser._id,
      orgAUser._id,
      orgBUser._id,
      coachAUser._id,
      coachBUser._id,
      athleteAUser._id,
      athleteBUser._id
    );

    const testSport = await Sport.create({
      name: `Football ${runId}`,
      slug: `football-${runId}`,
      description: 'Football test sport description',
      status: 'Active',
    });
    createdSportIds.push(testSport._id);

    const otherSport = await Sport.create({
      name: `Cricket ${runId}`,
      slug: `cricket-${runId}`,
      description: 'Cricket test sport description',
      status: 'Active',
    });
    createdSportIds.push(otherSport._id);

    const coachA = await Coach.create({
      user: coachAUser._id,
      experienceYears: 5,
      specialties: ['tactics'],
      sports: [testSport._id],
    });
    createdCoachIds.push(coachA._id);

    const coachB = await Coach.create({
      user: coachBUser._id,
      experienceYears: 3,
      specialties: ['fitness'],
      sports: [testSport._id],
    });
    createdCoachIds.push(coachB._id);

    const [teamA, teamB, teamC] = await Promise.all([
      Team.create({
        name: `Red Lions ${runId}`,
        slug: `red-lions-${runId}`,
        sport: testSport._id,
        ageGroup: 'U18',
        coach: coachA._id,
        status: 'Active',
      }),
      Team.create({
        name: `Blue Eagles ${runId}`,
        slug: `blue-eagles-${runId}`,
        sport: testSport._id,
        ageGroup: 'U18',
        coach: coachB._id,
        status: 'Active',
      }),
      Team.create({
        name: `Cricket Kings ${runId}`,
        slug: `cricket-kings-${runId}`,
        sport: otherSport._id,
        ageGroup: 'U18',
        coach: coachA._id,
        status: 'Active',
      }),
    ]);
    createdTeamIds.push(teamA._id, teamB._id, teamC._id);

    const [athleteA1, athleteA2, athleteB1] = await Promise.all([
      Athlete.create({
        user: athleteAUser._id,
        sport: testSport._id,
        dateOfBirth: new Date('2008-01-01'),
        gender: 'Male',
        team: teamA._id,
        jerseyNumber: 7,
        status: 'Active',
        verificationStatus: 'Verified',
      }),
      Athlete.create({
        sport: testSport._id,
        dateOfBirth: new Date('2008-02-02'),
        gender: 'Male',
        team: teamA._id,
        jerseyNumber: 9,
        status: 'Active',
        verificationStatus: 'Verified',
      }),
      Athlete.create({
        user: athleteBUser._id,
        sport: testSport._id,
        dateOfBirth: new Date('2008-03-03'),
        gender: 'Male',
        team: teamB._id,
        jerseyNumber: 10,
        status: 'Active',
        verificationStatus: 'Verified',
      }),
    ]);
    createdAthleteIds.push(athleteA1._id, athleteA2._id, athleteB1._id);

    const adminAuth = getAuthHeader(adminUser);
    const orgAAuth = getAuthHeader(orgAUser);
    const orgBAuth = getAuthHeader(orgBUser);
    const coachAAuth = getAuthHeader(coachAUser);
    const coachBAuth = getAuthHeader(coachBUser);
    const athleteAAuth = getAuthHeader(athleteAUser);

    const roles = [
      { name: 'Admin', headers: adminAuth },
      { name: 'Organizer A', headers: orgAAuth },
      { name: 'Coach A', headers: coachAAuth },
      { name: 'Athlete A', headers: athleteAAuth },
      { name: 'Unauthenticated', headers: {} },
    ];

    const matrixRows: string[] = [];
    matrixRows.push('| Endpoint & Method | Admin | Organizer A | Coach A | Athlete A | Unauthenticated |');
    matrixRows.push('|---|---|---|---|---|---|');

    let baselineTourneyId = '';
    let baselineRegId = '';
    let baselineRegBId = '';
    let baselineVenueId = '';
    let baselineMatchId = '';

    // ==============================================================
    // GROUP 1A: TOURNAMENTS & REGISTRATIONS MATRIX (LIVE RESPONSES)
    // ==============================================================
    console.log('\n--- GROUP 1A: TOURNAMENTS & REGISTRATIONS MATRIX ---');
    const { group: group1A, fetchGroup: fetch1A } = startServerGroup();

    try {
      const tourneyPayload = {
        name: `Champions Trophy ${runId}`,
        sport: testSport._id.toString(),
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'Registration Open',
      };

      const tourneyCreateRes = await fetch1A('/tournaments', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify(tourneyPayload),
      });
      assert(tourneyCreateRes.status === 201, 'Organizer A creates baseline tournament (201)');
      baselineTourneyId = (tourneyCreateRes.body as { data: { id: string } }).data.id;
      createdTourneyIds.push(new Types.ObjectId(baselineTourneyId));

      const regRes = await fetch1A(`/tournaments/${baselineTourneyId}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
      });
      assert(regRes.status === 201, 'Coach A registers team A (201)');
      baselineRegId = (regRes.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(baselineRegId));

      const venueRes = await fetch1A('/venues', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({ name: `Main Arena ${runId}`, address: '123 Stadium Way', capacity: 5000 }),
      });
      assert(venueRes.status === 201, 'Organizer A creates baseline venue (201)');
      baselineVenueId = (venueRes.body as { data: { id: string } }).data.id;
      createdVenueIds.push(new Types.ObjectId(baselineVenueId));

      await fetch1A(`/registrations/${baselineRegId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });

      const regBRes = await fetch1A(`/tournaments/${baselineTourneyId}/registrations`, {
        method: 'POST',
        headers: coachBAuth,
        body: JSON.stringify({ team: teamB._id.toString(), squad: [athleteB1._id.toString()] }),
      });
      baselineRegBId = (regBRes.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(baselineRegBId));

      await fetch1A(`/registrations/${baselineRegBId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });

      const matchRes = await fetch1A(`/tournaments/${baselineTourneyId}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: baselineRegId,
          awayTeam: baselineRegBId,
          round: 'Quarterfinal',
          scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
          durationMinutes: 90,
          venue: baselineVenueId,
        }),
      });
      assert(matchRes.status === 201, 'Organizer A schedules baseline match (201)');
      baselineMatchId = (matchRes.body as { data: { id: string } }).data.id;
      createdMatchIds.push(new Types.ObjectId(baselineMatchId));

      // Dedicated records per role for clean access matrix (no state conflicts)
      const [delDraftAdmin, delDraftOrgA, delDraftOther] = await Promise.all([
        Tournament.create({ name: `Draft Adm ${runId}`, sport: testSport._id, category: 'Cup', ageGroup: 'U18', format: 'Knockout', startDate: new Date(), endDate: new Date(), organizer: adminUser._id }),
        Tournament.create({ name: `Draft Org ${runId}`, sport: testSport._id, category: 'Cup', ageGroup: 'U18', format: 'Knockout', startDate: new Date(), endDate: new Date(), organizer: orgAUser._id }),
        Tournament.create({ name: `Draft Oth ${runId}`, sport: testSport._id, category: 'Cup', ageGroup: 'U18', format: 'Knockout', startDate: new Date(), endDate: new Date(), organizer: orgAUser._id }),
      ]);
      createdTourneyIds.push(delDraftAdmin._id, delDraftOrgA._id, delDraftOther._id);

      // Teams for registration testing
      const [teamRegAdm, teamRegCoach, teamRegOth, teamPostAdm, teamPostCoach, teamPostOth] = await Promise.all([
        Team.create({ name: `Team RegAdm ${runId}`, slug: `regadm-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
        Team.create({ name: `Team RegCoach ${runId}`, slug: `regcoach-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
        Team.create({ name: `Team RegOth ${runId}`, slug: `regoth-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
        Team.create({ name: `Team PostAdm ${runId}`, slug: `postadm-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
        Team.create({ name: `Team PostCoach ${runId}`, slug: `postcoach-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
        Team.create({ name: `Team PostOth ${runId}`, slug: `postoth-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' }),
      ]);
      createdTeamIds.push(teamRegAdm._id, teamRegCoach._id, teamRegOth._id, teamPostAdm._id, teamPostCoach._id, teamPostOth._id);

      // Pending registrations for review testing
      const [pRevAdm, pRevOrg, pRevOth] = await Promise.all([
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamRegAdm._id, status: 'Pending', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamRegCoach._id, status: 'Pending', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamRegOth._id, status: 'Pending', registeredBy: coachAUser._id }),
      ]);
      createdRegIds.push(pRevAdm._id, pRevOrg._id, pRevOth._id);

      // Pending registrations for withdraw testing
      const teamW1 = await Team.create({ name: `Team W1 ${runId}`, slug: `w1-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      const teamW2 = await Team.create({ name: `Team W2 ${runId}`, slug: `w2-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      const teamW3 = await Team.create({ name: `Team W3 ${runId}`, slug: `w3-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      createdTeamIds.push(teamW1._id, teamW2._id, teamW3._id);

      const [pWithAdm, pWithCoach, pWithOth] = await Promise.all([
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamW1._id, status: 'Pending', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamW2._id, status: 'Pending', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: new Types.ObjectId(baselineTourneyId), team: teamW3._id, status: 'Pending', registeredBy: coachAUser._id }),
      ]);
      createdRegIds.push(pWithAdm._id, pWithCoach._id, pWithOth._id);

      const tourneyEndpoints = [
        {
          name: 'POST /tournaments',
          method: 'POST',
          getPath: () => '/tournaments',
          getBody: () => tourneyPayload,
        },
        {
          name: 'GET /tournaments',
          method: 'GET',
          getPath: () => '/tournaments',
        },
        {
          name: 'GET /tournaments/:id',
          method: 'GET',
          getPath: () => `/tournaments/${baselineTourneyId}`,
        },
        {
          name: 'PATCH /tournaments/:id',
          method: 'PATCH',
          getPath: () => `/tournaments/${baselineTourneyId}`,
          getBody: () => ({ rules: 'Updated Rules' }),
        },
        {
          name: 'DELETE /tournaments/:id',
          method: 'DELETE',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/tournaments/${delDraftAdmin._id}`;
            if (roleName === 'Organizer A') return `/tournaments/${delDraftOrgA._id}`;
            return `/tournaments/${delDraftOther._id}`;
          },
        },
        {
          name: 'POST /tournaments/:id/registrations',
          method: 'POST',
          getPath: () => `/tournaments/${baselineTourneyId}/registrations`,
          getBody: (roleName: string) => {
            if (roleName === 'Admin') return { team: teamPostAdm._id.toString() };
            if (roleName === 'Coach A') return { team: teamPostCoach._id.toString() };
            return { team: teamPostOth._id.toString() };
          },
        },
        {
          name: 'GET /tournaments/:id/registrations',
          method: 'GET',
          getPath: () => `/tournaments/${baselineTourneyId}/registrations`,
        },
        {
          name: 'PATCH /registrations/:id/squad',
          method: 'PATCH',
          getPath: () => `/registrations/${baselineRegId}/squad`,
          getBody: () => ({ squad: [athleteA1._id.toString()] }),
        },
        {
          name: 'PATCH /registrations/:id/review',
          method: 'PATCH',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/registrations/${pRevAdm._id}/review`;
            if (roleName === 'Organizer A') return `/registrations/${pRevOrg._id}/review`;
            return `/registrations/${pRevOth._id}/review`;
          },
          getBody: () => ({ status: 'Approved' }),
        },
        {
          name: 'DELETE /registrations/:id',
          method: 'DELETE',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/registrations/${pWithAdm._id}`;
            if (roleName === 'Coach A') return `/registrations/${pWithCoach._id}`;
            return `/registrations/${pWithOth._id}`;
          },
        },
      ];

      for (const ep of tourneyEndpoints) {
        const statuses: number[] = [];
        for (const role of roles) {
          const path = ep.getPath(role.name);
          const body = ep.getBody ? ep.getBody(role.name) : undefined;
          const res = await fetch1A(path, {
            method: ep.method,
            headers: role.headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          statuses.push(res.status);
          if (res.status === 201 && res.body && typeof res.body === 'object') {
            const bodyObj = res.body as { data?: { id?: string } };
            const createdIdStr = bodyObj.data?.id;
            if (createdIdStr) {
              const objId = new Types.ObjectId(createdIdStr);
              if (path === '/tournaments') createdTourneyIds.push(objId);
              else if (path.includes('/registrations')) createdRegIds.push(objId);
            }
          }
        }
        matrixRows.push(`| ${ep.name.padEnd(35)} | ${statuses[0]} | ${statuses[1]} | ${statuses[2]} | ${statuses[3]} | ${statuses[4]} |`);
      }

      assert(group1A.getRequestCount() < 90, `Group 1A request count (${group1A.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 1A', count: group1A.getRequestCount() });
    } finally {
      await group1A.close();
    }

    // ==============================================================
    // GROUP 1B: VENUES, OFFICIALS, MATCHES & PUBLIC MATRIX
    // ==============================================================
    console.log('\n--- GROUP 1B: VENUES, OFFICIALS, MATCHES & PUBLIC MATRIX ---');
    const { group: group1B, fetchGroup: fetch1B } = startServerGroup();

    try {
      // Dedicated unreferenced venues for DELETE testing
      const [vDelAdm, vDelOrg, vDelOth] = await Promise.all([
        Venue.create({ name: `VDelAdm ${runId}`, address: 'Addr', createdBy: adminUser._id }),
        Venue.create({ name: `VDelOrg ${runId}`, address: 'Addr', createdBy: orgAUser._id }),
        Venue.create({ name: `VDelOth ${runId}`, address: 'Addr', createdBy: orgAUser._id }),
      ]);
      createdVenueIds.push(vDelAdm._id, vDelOrg._id, vDelOth._id);

      // Dedicated past scheduled matches for result entry
      const pastTime = new Date(Date.now() - 4 * 3600000); // 4 hours ago
      const [pastMAdm, pastMOrg, pastMOth] = await Promise.all([
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'PastAdm', scheduledAt: pastTime, durationMinutes: 90, endsAt: new Date(pastTime.getTime() + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'PastOrg', scheduledAt: new Date(pastTime.getTime() - 20000000), durationMinutes: 90, endsAt: new Date(pastTime.getTime() - 20000000 + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'PastOth', scheduledAt: new Date(pastTime.getTime() - 40000000), durationMinutes: 90, endsAt: new Date(pastTime.getTime() - 40000000 + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
      ]);
      createdMatchIds.push(pastMAdm._id, pastMOrg._id, pastMOth._id);

      // Dedicated scheduled matches for DELETE testing
      const futTime = new Date(Date.now() + 30 * 86400000);
      const [delMAdm, delMOrg, delMOth] = await Promise.all([
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'DelAdm', scheduledAt: futTime, durationMinutes: 90, endsAt: new Date(futTime.getTime() + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'DelOrg', scheduledAt: new Date(futTime.getTime() + 10000000), durationMinutes: 90, endsAt: new Date(futTime.getTime() + 10000000 + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
        Match.create({ tournament: new Types.ObjectId(baselineTourneyId), homeTeam: new Types.ObjectId(baselineRegId), awayTeam: new Types.ObjectId(baselineRegBId), round: 'DelOth', scheduledAt: new Date(futTime.getTime() + 20000000), durationMinutes: 90, endsAt: new Date(futTime.getTime() + 20000000 + 90 * 60000), venue: new Types.ObjectId(baselineVenueId), status: 'Scheduled' }),
      ]);
      createdMatchIds.push(delMAdm._id, delMOrg._id, delMOth._id);

      const secondHalfEndpoints = [
        {
          name: 'POST /venues',
          method: 'POST',
          getPath: () => '/venues',
          getBody: () => ({ name: `V2 ${runId}`, address: 'Addr' }),
        },
        {
          name: 'GET /venues',
          method: 'GET',
          getPath: () => '/venues',
        },
        {
          name: 'PATCH /venues/:id',
          method: 'PATCH',
          getPath: () => `/venues/${baselineVenueId}`,
          getBody: () => ({ name: 'V-Edit' }),
        },
        {
          name: 'DELETE /venues/:id',
          method: 'DELETE',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/venues/${vDelAdm._id}`;
            if (roleName === 'Organizer A') return `/venues/${vDelOrg._id}`;
            return `/venues/${vDelOth._id}`;
          },
        },
        {
          name: 'POST /tournaments/:id/matches',
          method: 'POST',
          getPath: () => `/tournaments/${baselineTourneyId}/matches`,
          getBody: (roleName: string) => {
            const offset = roleName === 'Admin' ? 50 : roleName === 'Organizer A' ? 55 : 60;
            return {
              homeTeam: baselineRegId,
              awayTeam: baselineRegBId,
              round: 'MatrixSlot',
              scheduledAt: new Date(Date.now() + offset * 86400000).toISOString(),
              durationMinutes: 90,
              venue: baselineVenueId,
            };
          },
        },
        {
          name: 'GET /tournaments/:id/matches',
          method: 'GET',
          getPath: () => `/tournaments/${baselineTourneyId}/matches`,
        },
        {
          name: 'GET /matches/:id',
          method: 'GET',
          getPath: () => `/matches/${baselineMatchId}`,
        },
        {
          name: 'PATCH /matches/:id',
          method: 'PATCH',
          getPath: () => `/matches/${baselineMatchId}`,
          getBody: () => ({ round: 'MatrixUpdated' }),
        },
        {
          name: 'PATCH /matches/:id/result',
          method: 'PATCH',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/matches/${pastMAdm._id}/result`;
            if (roleName === 'Organizer A') return `/matches/${pastMOrg._id}/result`;
            return `/matches/${pastMOth._id}/result`;
          },
          getBody: () => ({ homeScore: 2, awayScore: 1 }),
        },
        {
          name: 'DELETE /matches/:id',
          method: 'DELETE',
          getPath: (roleName: string) => {
            if (roleName === 'Admin') return `/matches/${delMAdm._id}`;
            if (roleName === 'Organizer A') return `/matches/${delMOrg._id}`;
            return `/matches/${delMOth._id}`;
          },
        },
        {
          name: 'GET /public/tournaments',
          method: 'GET',
          getPath: () => '/public/tournaments',
        },
        {
          name: 'GET /public/tournaments/:id',
          method: 'GET',
          getPath: () => `/public/tournaments/${baselineTourneyId}`,
        },
        {
          name: 'GET /public/tournaments/:id/matches',
          method: 'GET',
          getPath: () => `/public/tournaments/${baselineTourneyId}/matches`,
        },
      ];

      for (const ep of secondHalfEndpoints) {
        const statuses: number[] = [];
        for (const role of roles) {
          const path = ep.getPath(role.name);
          const body = ep.getBody ? ep.getBody(role.name) : undefined;
          const res = await fetch1B(path, {
            method: ep.method,
            headers: role.headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          statuses.push(res.status);
          if (res.status === 201 && res.body && typeof res.body === 'object') {
            const bodyObj = res.body as { data?: { id?: string } };
            const createdIdStr = bodyObj.data?.id;
            if (createdIdStr) {
              const objId = new Types.ObjectId(createdIdStr);
              if (path === '/venues') createdVenueIds.push(objId);
              else if (path.includes('/matches')) createdMatchIds.push(objId);
            }
          }
        }
        matrixRows.push(`| ${ep.name.padEnd(35)} | ${statuses[0]} | ${statuses[1]} | ${statuses[2]} | ${statuses[3]} | ${statuses[4]} |`);
      }

      console.log('\n--- REAL PERMISSIONS MATRIX (GENERATED FROM LIVE HTTP RESPONSES) ---');
      matrixRows.forEach((r) => console.log(r));

      assert(true, 'Live role x endpoint permissions matrix generated successfully');
      assert(group1B.getRequestCount() < 90, `Group 1B request count (${group1B.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 1B', count: group1B.getRequestCount() });
    } finally {
      await group1B.close();
    }

    // ==============================================================
    // GROUP 2: SCOPING & IDOR ISOLATION
    // ==============================================================
    console.log('\n--- GROUP 2: SCOPING & IDOR ISOLATION ---');
    const { group: group2, fetchGroup: fetch2 } = startServerGroup();

    try {
      const tourneyA = await Tournament.create({
        name: `Org A Tourney ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(tourneyA._id);

      const venueA = await Venue.create({
        name: `Venue A ${runId}`,
        address: '123 Street',
        createdBy: orgAUser._id,
      });
      createdVenueIds.push(venueA._id);

      // Organizer B attempting to update/delete Org A's tournament => 404
      const orgBUpdateTourney = await fetch2(`/tournaments/${tourneyA._id}`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ rules: 'Hacked' }),
      });
      assert(orgBUpdateTourney.status === 404, 'Organizer B updating Organizer A tournament returns 404');

      const orgBDeleteTourney = await fetch2(`/tournaments/${tourneyA._id}`, {
        method: 'DELETE',
        headers: orgBAuth,
      });
      assert(orgBDeleteTourney.status === 404, 'Organizer B deleting Organizer A tournament returns 404');

      // Organizer B updating/deleting Org A's venue => 404
      const orgBUpdateVenue = await fetch2(`/venues/${venueA._id}`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ name: 'Hacked Venue' }),
      });
      assert(orgBUpdateVenue.status === 404, 'Organizer B updating Organizer A venue returns 404');

      const orgBDeleteVenue = await fetch2(`/venues/${venueA._id}`, {
        method: 'DELETE',
        headers: orgBAuth,
      });
      assert(orgBDeleteVenue.status === 404, 'Organizer B deleting Organizer A venue returns 404');

      // Coach B scoping: Coach B attempting to register Team A (coached by Coach A) => 404
      const coachBRegTeamA = await fetch2(`/tournaments/${tourneyA._id}/registrations`, {
        method: 'POST',
        headers: coachBAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
      });
      assert(coachBRegTeamA.status === 404, 'Coach B attempting to register Team A returns 404');

      const coachARegTeamA = await fetch2(`/tournaments/${tourneyA._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
      });
      assert(coachARegTeamA.status === 201, 'Coach A registers Team A (201)');
      const regAId = (coachARegTeamA.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(regAId));

      // Coach B attempting to update squad of Team A's registration => 404
      const coachBEditSquad = await fetch2(`/registrations/${regAId}/squad`, {
        method: 'PATCH',
        headers: coachBAuth,
        body: JSON.stringify({ squad: [athleteB1._id.toString()] }),
      });
      assert(coachBEditSquad.status === 404, 'Coach B attempting to edit Team A squad returns 404');

      // Organizer B attempting to review registration on Tourney A => 404
      const orgBReviewReg = await fetch2(`/registrations/${regAId}/review`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(orgBReviewReg.status === 404, 'Organizer B reviewing registration on Tourney A returns 404');

      // Coach B cannot withdraw Coach A's registration => 404
      const coachBWithdrawCoachA = await fetch2(`/registrations/${regAId}`, {
        method: 'DELETE',
        headers: coachBAuth,
      });
      assert(coachBWithdrawCoachA.status === 404, "Coach B cannot withdraw Coach A's registration (404)");

      // Create match under Tourney A for Org B isolation testing
      const regBForMatch = await TournamentTeam.create({
        tournament: tourneyA._id,
        team: teamB._id,
        status: 'Approved',
        registeredBy: coachBUser._id,
      });
      createdRegIds.push(regBForMatch._id);

      await TournamentTeam.findByIdAndUpdate(regAId, { status: 'Approved' });

      const matchA = await Match.create({
        tournament: tourneyA._id,
        homeTeam: new Types.ObjectId(regAId),
        awayTeam: regBForMatch._id,
        round: 'Semi',
        scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
        durationMinutes: 90,
        endsAt: new Date(Date.now() - 3600000 + 90 * 60000),
        venue: venueA._id,
        status: 'Scheduled',
      });
      createdMatchIds.push(matchA._id);

      // Organizer B on EVERY match endpoint of Organizer A's tournament => 404
      const orgBPostMatch = await fetch2(`/tournaments/${tourneyA._id}/matches`, {
        method: 'POST',
        headers: orgBAuth,
        body: JSON.stringify({
          homeTeam: regAId,
          awayTeam: regBForMatch._id.toString(),
          round: 'Final',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          venue: venueA._id.toString(),
        }),
      });
      assert(orgBPostMatch.status === 404, "Organizer B POST matches on Org A's tournament returns 404");

      const orgBGetMatches = await fetch2(`/tournaments/${tourneyA._id}/matches`, {
        method: 'GET',
        headers: orgBAuth,
      });
      assert(orgBGetMatches.status === 404, "Organizer B GET matches on Org A's tournament returns 404");

      const orgBGetSingleMatch = await fetch2(`/matches/${matchA._id}`, {
        method: 'GET',
        headers: orgBAuth,
      });
      assert(orgBGetSingleMatch.status === 404, "Organizer B GET match/:id on Org A's tournament returns 404");

      const orgBPatchMatch = await fetch2(`/matches/${matchA._id}`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ round: 'Hacked' }),
      });
      assert(orgBPatchMatch.status === 404, "Organizer B PATCH match/:id on Org A's tournament returns 404");

      const orgBPatchMatchResult = await fetch2(`/matches/${matchA._id}/result`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ homeScore: 1, awayScore: 0 }),
      });
      assert(orgBPatchMatchResult.status === 404, "Organizer B PATCH match/:id/result on Org A's tournament returns 404");

      const orgBDeleteMatch = await fetch2(`/matches/${matchA._id}`, {
        method: 'DELETE',
        headers: orgBAuth,
      });
      assert(orgBDeleteMatch.status === 404, "Organizer B DELETE match/:id on Org A's tournament returns 404");

      // Coach A cannot withdraw an Approved registration => 400
      const coachAWithdrawApproved = await fetch2(`/registrations/${regAId}`, {
        method: 'DELETE',
        headers: coachAAuth,
      });
      assert(coachAWithdrawApproved.status === 400, 'Coach A cannot withdraw an Approved registration (400)');

      // Coach A withdraws his own Pending registration => 200
      const teamPen = await Team.create({ name: `Team Pen ${runId}`, slug: `pen-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      createdTeamIds.push(teamPen._id);
      const regPen = await TournamentTeam.create({ tournament: tourneyA._id, team: teamPen._id, status: 'Pending', registeredBy: coachAUser._id });
      createdRegIds.push(regPen._id);

      const coachAWithdrawPending = await fetch2(`/registrations/${regPen._id}`, {
        method: 'DELETE',
        headers: coachAAuth,
      });
      assert(coachAWithdrawPending.status === 200, 'Coach A withdraws his own Pending registration (200)');

      // Athlete reads his own team's registration status (200) and not another team's (empty list)
      const athleteReadOwnReg = await fetch2(`/tournaments/${tourneyA._id}/registrations`, {
        method: 'GET',
        headers: athleteAAuth,
      });
      assert(athleteReadOwnReg.status === 200, "Athlete reads own team's registration status (200)");
      const athleteList = (athleteReadOwnReg.body as { data: { team: { _id?: string; id?: string } }[] })?.data;
      assert(athleteList.length === 1, 'Athlete sees exactly 1 registration (for their team)');

      // Create Tourney with only Team B registered
      const tourneyOnlyB = await Tournament.create({
        name: `Tourney Only B ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(tourneyOnlyB._id);

      const regOnlyB = await TournamentTeam.create({
        tournament: tourneyOnlyB._id,
        team: teamB._id,
        status: 'Pending',
        registeredBy: coachBUser._id,
      });
      createdRegIds.push(regOnlyB._id);

      const athleteReadOtherReg = await fetch2(`/tournaments/${tourneyOnlyB._id}/registrations`, {
        method: 'GET',
        headers: athleteAAuth,
      });
      assert(athleteReadOtherReg.status === 200, "Athlete GET registrations for tournament with another team returns 200");
      const otherList = (athleteReadOtherReg.body as { data: unknown[] })?.data;
      assert(otherList.length === 0, 'Athlete receives empty array and does NOT see another team registration');

      assert(group2.getRequestCount() < 90, `Group 2 request count (${group2.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 2', count: group2.getRequestCount() });
    } finally {
      await group2.close();
    }

    // ==============================================================
    // GROUP 3: REGISTRATION RULES, MAXTEAMS & ATOMIC RACE
    // ==============================================================
    console.log('\n--- GROUP 3: REGISTRATION RULES, MAXTEAMS & ATOMIC RACE ---');
    const { group: group3, fetchGroup: fetch3 } = startServerGroup();

    try {
      const draftTourney = await Tournament.create({
        name: `Draft Tourney ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Draft',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(draftTourney._id);

      // Registering for Draft tournament => 400
      const regDraft = await fetch3(`/tournaments/${draftTourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString() }),
      });
      assert(regDraft.status === 400, 'Registering for Draft tournament returns 400');

      const max2Tourney = await Tournament.create({
        name: `Max 2 Tourney ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        maxTeams: 2,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(max2Tourney._id);

      // Team with wrong sport => 400
      const regWrongSport = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamC._id.toString() }),
      });
      assert(regWrongSport.status === 400, 'Team with wrong sport returns 400');

      // Squad containing athlete not on team => 400
      const regWrongAthlete = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteB1._id.toString()] }),
      });
      assert(regWrongAthlete.status === 400, 'Squad containing athlete not on team returns 400');

      // Squad with duplicate athletes => 400
      const regDupSquad = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString(), athleteA1._id.toString()] }),
      });
      assert(regDupSquad.status === 400, 'Squad with duplicate athletes returns 400');

      // Squad with 31 distinct valid ObjectIds => 400
      const squad31 = Array.from({ length: 31 }, () => new Types.ObjectId().toString());
      const reg31Squad = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: squad31 }),
      });
      assert(reg31Squad.status === 400, 'Squad with 31 distinct valid ObjectIds returns 400');

      // Parallel duplicate registration race via Promise.all
      const [race1, race2] = await Promise.all([
        fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
          method: 'POST',
          headers: coachAAuth,
          body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString(), athleteA2._id.toString()] }),
        }),
        fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
          method: 'POST',
          headers: coachAAuth,
          body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
        }),
      ]);

      const raceStatuses = [race1.status, race2.status].sort();
      assert(
        raceStatuses[0] === 201 && raceStatuses[1] === 409,
        `Duplicate registration race: exactly one 201 and one 409 (got ${raceStatuses.join(', ')})`
      );

      const winningRegId = (race1.status === 201 ? race1.body : race2.body) as { data: { id: string } };
      createdRegIds.push(new Types.ObjectId(winningRegId.data.id));

      const regTeamB = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachBAuth,
        body: JSON.stringify({ team: teamB._id.toString(), squad: [athleteB1._id.toString()] }),
      });
      assert(regTeamB.status === 201, 'Coach B registers Team B (201)');
      const regBId = (regTeamB.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(regBId));

      // Approve Team A (Count: 1)
      const appA = await fetch3(`/registrations/${winningRegId.data.id}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appA.status === 200, 'Admin/Org approves Team A (200)');

      // Second review on already approved Team A returns 409
      const appATwice = await fetch3(`/registrations/${winningRegId.data.id}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appATwice.status === 409, 'Reviewing already reviewed registration returns 409');

      // Approve Team B (Count: 2 => reaches maxTeams)
      const appB = await fetch3(`/registrations/${regBId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appB.status === 200, 'Admin/Org approves Team B (200, reaches maxTeams 2)');

      // Register Team D under Coach A
      const teamD = await Team.create({
        name: `Team D ${runId}`,
        slug: `team-d-${runId}`,
        sport: testSport._id,
        ageGroup: 'U18',
        coach: coachA._id,
        status: 'Active',
      });
      createdTeamIds.push(teamD._id);

      const regD = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamD._id.toString() }),
      });
      assert(regD.status === 201, 'Coach registers Team D (201)');
      const regDId = (regD.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(regDId));

      // Rejecting without reason returns 400
      const rejNoReason = await fetch3(`/registrations/${regDId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Rejected' }),
      });
      assert(rejNoReason.status === 400, 'Rejecting registration without reason returns 400');

      // Approving Team D fails with 400 because maxTeams (2) is reached
      const appDOverLimit = await fetch3(`/registrations/${regDId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appDOverLimit.status === 400, 'Approving team beyond maxTeams returns 400');

      // Rejecting with reason succeeds (200)
      const rejWithReason = await fetch3(`/registrations/${regDId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Rejected', reason: 'Capacity reached' }),
      });
      assert(rejWithReason.status === 200, 'Rejecting registration with reason returns 200');

      assert(group3.getRequestCount() < 90, `Group 3 request count (${group3.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 3', count: group3.getRequestCount() });
    } finally {
      await group3.close();
    }

    // ==============================================================
    // GROUP 4: TOURNAMENT LIFECYCLE & DELETION RULES
    // ==============================================================
    console.log('\n--- GROUP 4: TOURNAMENT LIFECYCLE & DELETION RULES ---');
    const { group: group4, fetchGroup: fetch4 } = startServerGroup();

    try {
      const tRes = await fetch4('/tournaments', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          name: `Status Lifecycle ${runId}`,
          sport: testSport._id.toString(),
          category: 'League',
          ageGroup: 'U18',
          format: 'League',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        }),
      });
      const tId = (tRes.body as { data: { id: string } }).data.id;
      createdTourneyIds.push(new Types.ObjectId(tId));

      // Transition Draft -> In Progress directly returns 400
      const stInvalid = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'In Progress' }),
      });
      assert(stInvalid.status === 400, 'Invalid transition Draft -> In Progress returns 400');

      // Transition Draft -> Registration Open (200)
      const st1 = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Registration Open' }),
      });
      assert(st1.status === 200, 'Transition Draft -> Registration Open (200)');

      // Transition Registration Open -> In Progress (200)
      const st2 = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'In Progress' }),
      });
      assert(st2.status === 200, 'Transition Registration Open -> In Progress (200)');

      // Transition In Progress -> Completed (200)
      const st3 = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Completed' }),
      });
      assert(st3.status === 200, 'Transition In Progress -> Completed (200)');

      // Transition Completed -> Draft returns 400 (cannot change Completed)
      const st4 = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Draft' }),
      });
      assert(st4.status === 400, 'Cannot change status of Completed tournament (400)');

      // DELETE non-Draft tournament returns 409
      const delCompleted = await fetch4(`/tournaments/${tId}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delCompleted.status === 409, 'Cannot delete non-Draft tournament (409)');

      // Draft -> Cancelled (200)
      const tDraftCancel = await Tournament.create({
        name: `Draft To Cancel ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(),
        endDate: new Date(),
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(tDraftCancel._id);

      const stDraftCancel = await fetch4(`/tournaments/${tDraftCancel._id}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      assert(stDraftCancel.status === 200, 'Transition Draft -> Cancelled succeeds (200)');

      // Cancelled -> Registration Open returns 400
      const stCancelReopen = await fetch4(`/tournaments/${tDraftCancel._id}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Registration Open' }),
      });
      assert(stCancelReopen.status === 400, 'Transition Cancelled -> Registration Open returns 400');

      // Create Draft with registrations to test DELETE 409
      const tDraft2 = await Tournament.create({
        name: `Draft With Regs ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(),
        endDate: new Date(),
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(tDraft2._id);

      const regInDraft = await TournamentTeam.create({
        tournament: tDraft2._id,
        team: teamA._id,
        status: 'Pending',
        registeredBy: coachAUser._id,
      });
      createdRegIds.push(regInDraft._id);

      const delDraftWithReg = await fetch4(`/tournaments/${tDraft2._id}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delDraftWithReg.status === 409, 'Cannot delete Draft tournament with registrations (409)');

      // Delete registrations first
      await TournamentTeam.findByIdAndDelete(regInDraft._id);

      // Delete Draft with 0 registrations => 200
      const delDraftEmpty = await fetch4(`/tournaments/${tDraft2._id}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delDraftEmpty.status === 200, 'Deleting empty Draft tournament succeeds (200)');

      assert(group4.getRequestCount() < 90, `Group 4 request count (${group4.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 4', count: group4.getRequestCount() });
    } finally {
      await group4.close();
    }

    // ==============================================================
    // GROUP 5: MATCH SCHEDULING, OVERLAPS & RESULT ENTRY
    // ==============================================================
    console.log('\n--- GROUP 5: MATCH OVERLAP RACE & RESULTS ---');
    const { group: group5, fetchGroup: fetch5 } = startServerGroup();

    try {
      const matchTourney = await Tournament.create({
        name: `Match Tourney ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(matchTourney._id);

      const teamX = await Team.create({ name: `Team X ${runId}`, slug: `x-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      const teamY = await Team.create({ name: `Team Y ${runId}`, slug: `y-${runId}`, sport: testSport._id, ageGroup: 'U18', coach: coachA._id, status: 'Active' });
      createdTeamIds.push(teamX._id, teamY._id);

      const [reg1, reg2, regUnapproved, regX, regY] = await Promise.all([
        TournamentTeam.create({ tournament: matchTourney._id, team: teamA._id, status: 'Approved', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: matchTourney._id, team: teamB._id, status: 'Approved', registeredBy: coachBUser._id }),
        TournamentTeam.create({ tournament: matchTourney._id, team: teamC._id, status: 'Pending', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: matchTourney._id, team: teamX._id, status: 'Approved', registeredBy: coachAUser._id }),
        TournamentTeam.create({ tournament: matchTourney._id, team: teamY._id, status: 'Approved', registeredBy: coachAUser._id }),
      ]);
      createdRegIds.push(reg1._id, reg2._id, regUnapproved._id, regX._id, regY._id);

      const testVenue = await Venue.create({
        name: `Pitch 1 ${runId}`,
        address: 'Sector 4',
        createdBy: orgAUser._id,
      });
      const testVenue2 = await Venue.create({
        name: `Pitch 2 ${runId}`,
        address: 'Sector 5',
        createdBy: orgAUser._id,
      });
      createdVenueIds.push(testVenue._id, testVenue2._id);

      // Same team twice => 400
      const sameTeamMatch = await fetch5(`/tournaments/${matchTourney._id}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: reg1._id.toString(),
          awayTeam: reg1._id.toString(),
          round: 'Round 1',
          scheduledAt: new Date(Date.now() + 100000000).toISOString(),
          venue: testVenue._id.toString(),
        }),
      });
      assert(sameTeamMatch.status === 400, 'Same home and away team returns 400');

      // Unapproved team => 400
      const unapprovedMatch = await fetch5(`/tournaments/${matchTourney._id}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: reg1._id.toString(),
          awayTeam: regUnapproved._id.toString(),
          round: 'Round 1',
          scheduledAt: new Date(Date.now() + 100000000).toISOString(),
          venue: testVenue._id.toString(),
        }),
      });
      assert(unapprovedMatch.status === 400, 'Unapproved team in match returns 400');

      // Venue overlap race via Promise.all: same venue, overlapping time window
      const matchTime = new Date(Date.now() + 200000000);
      const [raceM1, raceM2] = await Promise.all([
        fetch5(`/tournaments/${matchTourney._id}/matches`, {
          method: 'POST',
          headers: orgAAuth,
          body: JSON.stringify({
            homeTeam: reg1._id.toString(),
            awayTeam: reg2._id.toString(),
            round: 'Round 1',
            scheduledAt: matchTime.toISOString(),
            durationMinutes: 90,
            venue: testVenue._id.toString(),
          }),
        }),
        fetch5(`/tournaments/${matchTourney._id}/matches`, {
          method: 'POST',
          headers: orgAAuth,
          body: JSON.stringify({
            homeTeam: reg1._id.toString(),
            awayTeam: reg2._id.toString(),
            round: 'Round 1',
            scheduledAt: new Date(matchTime.getTime() + 30 * 60000).toISOString(), // 30 mins later => inside 90m window
            durationMinutes: 90,
            venue: testVenue._id.toString(),
          }),
        }),
      ]);

      const mRaceStatuses = [raceM1.status, raceM2.status].sort();
      assert(
        mRaceStatuses[0] === 201 && mRaceStatuses[1] === 409,
        `Venue overlap race: exactly one 201 and one 409 (got ${mRaceStatuses.join(', ')})`
      );

      const winningMatchRes = raceM1.status === 201 ? raceM1 : raceM2;
      const winningData = (winningMatchRes.body as { data: { id: string; scheduledAt: string } }).data;
      const winningMatchId = winningData.id;
      const winningScheduledAt = winningData.scheduledAt;
      createdMatchIds.push(new Types.ObjectId(winningMatchId));

      // Team overlap (home team in two matches at the same time) => 409
      const teamOverlapMatch = await fetch5(`/tournaments/${matchTourney._id}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: reg1._id.toString(),
          awayTeam: regX._id.toString(),
          round: 'Round 1',
          scheduledAt: winningScheduledAt,
          durationMinutes: 90,
          venue: testVenue2._id.toString(),
        }),
      });
      assert(teamOverlapMatch.status === 409, 'Team overlap (home team in two matches at the same time) returns 409');

      // Same time at a DIFFERENT venue with different teams => 201
      const diffVenueMatch = await fetch5(`/tournaments/${matchTourney._id}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: regX._id.toString(),
          awayTeam: regY._id.toString(),
          round: 'Round 1 Diff',
          scheduledAt: winningScheduledAt,
          durationMinutes: 90,
          venue: testVenue2._id.toString(),
        }),
      });
      assert(diffVenueMatch.status === 201, 'Same time at a DIFFERENT venue with different teams returns 201');
      const diffMId = (diffVenueMatch.body as { data: { id: string } }).data.id;
      createdMatchIds.push(new Types.ObjectId(diffMId));

      // PATCH into an overlap => 409 and original scheduledAt is unchanged in DB
      const origDiffTime = new Date(matchTime.getTime() + 10 * 86400000);
      const mToPatch = await Match.create({
        tournament: matchTourney._id,
        homeTeam: reg1._id,
        awayTeam: reg2._id,
        round: 'PatchTest',
        scheduledAt: origDiffTime,
        durationMinutes: 90,
        endsAt: new Date(origDiffTime.getTime() + 90 * 60000),
        venue: testVenue._id,
        status: 'Scheduled',
      });
      createdMatchIds.push(mToPatch._id);

      const patchOverlapRes = await fetch5(`/matches/${mToPatch._id}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ scheduledAt: winningScheduledAt }), // overlaps winningMatch at testVenue
      });
      assert(patchOverlapRes.status === 409, 'PATCH into an overlap returns 409');
      const unchDoc = await Match.findById(mToPatch._id);
      assert(unchDoc?.scheduledAt.getTime() === origDiffTime.getTime(), 'Original scheduledAt is unchanged in DB after 409');

      // Attempt deleting venue while referenced by scheduled match => 409
      const delRefVenue = await fetch5(`/venues/${testVenue._id}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delRefVenue.status === 409, 'Deleting venue referenced by match returns 409');

      // Result entry for future match returns 400
      const earlyResult = await fetch5(`/matches/${winningMatchId}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 3, awayScore: 1 }),
      });
      assert(earlyResult.status === 400, 'Entering result before scheduled match time returns 400');

      // Create past match to test score entry and correction
      const pastScheduledAt = new Date(Date.now() - 3 * 3600000); // 3 hours ago
      const pastMatch = await Match.create({
        tournament: matchTourney._id,
        homeTeam: reg1._id,
        awayTeam: reg2._id,
        round: 'Semi',
        scheduledAt: pastScheduledAt,
        durationMinutes: 90,
        endsAt: new Date(pastScheduledAt.getTime() + 90 * 60000),
        venue: testVenue._id,
        status: 'Scheduled',
      });
      createdMatchIds.push(pastMatch._id);

      // Score validation tests: -1, 100, 1.5
      const resNeg = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: -1, awayScore: 0 }),
      });
      assert(resNeg.status === 400, 'Negative score returns 400');

      const resOver100 = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 100, awayScore: 0 }),
      });
      assert(resOver100.status === 400, 'Score > 99 returns 400');

      const resDecimal = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 1.5, awayScore: 0 }),
      });
      assert(resDecimal.status === 400, 'Decimal score returns 400');

      // Valid result entry sets status to Completed
      const validResult = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 2, awayScore: 1 }),
      });
      assert(validResult.status === 200, 'Valid result entry returns 200');
      const updatedMatchDoc = await Match.findById(pastMatch._id);
      assert(updatedMatchDoc?.status === 'Completed', 'Result entry transitions match status to Completed');

      // Organizer correction on Completed match => 200
      const correctedResult = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 3, awayScore: 1 }),
      });
      assert(correctedResult.status === 200, 'Organizer correction on Completed match returns 200');
      const correctedDoc = await Match.findById(pastMatch._id);
      assert(correctedDoc?.result?.homeScore === 3, 'Result corrected to homeScore 3');

      // Completed match cannot be rescheduled => 400
      const rescheduleCompleted = await fetch5(`/matches/${pastMatch._id}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
      });
      assert(rescheduleCompleted.status === 400, 'Rescheduling Completed match returns 400');

      // Cancelled match cannot have results entered => 400
      const cancelledMatch = await Match.create({
        tournament: matchTourney._id,
        homeTeam: reg1._id,
        awayTeam: reg2._id,
        round: 'Final',
        scheduledAt: pastScheduledAt,
        durationMinutes: 90,
        endsAt: new Date(pastScheduledAt.getTime() + 90 * 60000),
        venue: testVenue._id,
        status: 'Cancelled',
      });
      createdMatchIds.push(cancelledMatch._id);

      const cancelledResult = await fetch5(`/matches/${cancelledMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 1, awayScore: 0 }),
      });
      assert(cancelledResult.status === 400, 'Entering result on Cancelled match returns 400');

      assert(group5.getRequestCount() < 90, `Group 5 request count (${group5.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 5', count: group5.getRequestCount() });
    } finally {
      await group5.close();
    }

    // ==============================================================
    // GROUP 6: PUBLIC ENDPOINTS & DEEP DATA LEAK SCAN
    // ==============================================================
    console.log('\n--- GROUP 6: PUBLIC ENDPOINTS & DEEP SCAN ---');
    const { group: group6, fetchGroup: fetch6 } = startServerGroup();

    try {
      const pubTourney = await Tournament.create({
        name: `Public Tourney ${runId}`,
        sport: testSport._id,
        category: 'Open',
        ageGroup: 'All',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 4 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(pubTourney._id);

      const pubDraftTourney = await Tournament.create({
        name: `Public Draft ${runId}`,
        sport: testSport._id,
        category: 'Open',
        ageGroup: 'All',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 4 * 86400000),
        status: 'Draft',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(pubDraftTourney._id);

      const pRegA = await TournamentTeam.create({ tournament: pubTourney._id, team: teamA._id, status: 'Approved', registeredBy: coachAUser._id });
      const pRegB = await TournamentTeam.create({ tournament: pubTourney._id, team: teamB._id, status: 'Approved', registeredBy: coachBUser._id });
      createdRegIds.push(pRegA._id, pRegB._id);

      const pVenue = await Venue.create({ name: `PubVenue ${runId}`, address: 'St', createdBy: orgAUser._id });
      createdVenueIds.push(pVenue._id);

      const pMatch = await Match.create({
        tournament: pubTourney._id,
        homeTeam: pRegA._id,
        awayTeam: pRegB._id,
        round: 'PubSemi',
        scheduledAt: new Date(Date.now() + 86400000),
        durationMinutes: 90,
        endsAt: new Date(Date.now() + 86400000 + 90 * 60000),
        venue: pVenue._id,
        status: 'Scheduled',
      });
      createdMatchIds.push(pMatch._id);

      const pubListRes = await fetch6('/public/tournaments');
      assert(pubListRes.status === 200, 'GET /public/tournaments returns 200');
      const pubList = (pubListRes.body as { data: { items: { name: string }[] } })?.data?.items || [];
      const hasDraft = pubList.some((t) => t.name === pubDraftTourney.name);
      assert(!hasDraft, 'Draft tournament is strictly omitted from public list');

      const pubDraftSingle = await fetch6(`/public/tournaments/${pubDraftTourney._id}`);
      assert(pubDraftSingle.status === 404, 'GET /public/tournaments/:id on Draft returns 404');

      const pubDraftMatches = await fetch6(`/public/tournaments/${pubDraftTourney._id}/matches`);
      assert(pubDraftMatches.status === 404, 'GET /public/tournaments/:id/matches on Draft returns 404');

      const pubActiveSingle = await fetch6(`/public/tournaments/${pubTourney._id}`);
      assert(pubActiveSingle.status === 200, 'GET /public/tournaments/:id on active returns 200');

      const pubMatchesRes = await fetch6(`/public/tournaments/${pubTourney._id}/matches`);
      assert(pubMatchesRes.status === 200, 'GET /public/tournaments/:id/matches on active returns 200');

      // Deep scan for sensitive field leaks across public endpoints
      const sensitiveKeys = [
        'email',
        'phone',
        'password',
        'passwordHash',
        'medicalNotes',
        'guardian',
        'organizer',
        'registeredBy',
        'reviewedBy',
        'reason',
        'squad',
        'athlete',
      ];

      const leakedInList = deepFindKeys(pubListRes.body, sensitiveKeys);
      assert(leakedInList.length === 0, `DEEP SCAN: No sensitive fields leaked in public list (found: ${leakedInList.join(', ')})`);

      const leakedInSingle = deepFindKeys(pubActiveSingle.body, sensitiveKeys);
      assert(leakedInSingle.length === 0, `DEEP SCAN: No sensitive fields leaked in public single (found: ${leakedInSingle.join(', ')})`);

      const leakedInMatches = deepFindKeys(pubMatchesRes.body, sensitiveKeys);
      assert(leakedInMatches.length === 0, `DEEP SCAN: No sensitive fields leaked in public matches (found: ${leakedInMatches.join(', ')})`);

      // Allowed keys check on public matches
      const pubMatchesData = (pubMatchesRes.body as { data: Record<string, unknown>[] })?.data || [];
      const allowedMatchKeys = ['id', 'round', 'group', 'scheduledAt', 'durationMinutes', 'status', 'venue', 'homeTeam', 'awayTeam', 'result'];
      let extraKeysFound = false;
      for (const m of pubMatchesData) {
        for (const k of Object.keys(m)) {
          if (!allowedMatchKeys.includes(k)) {
            extraKeysFound = true;
          }
        }
      }
      assert(!extraKeysFound, 'Public /matches response strictly conforms to allowed keys only');

      assert(group6.getRequestCount() < 90, `Group 6 request count (${group6.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 6', count: group6.getRequestCount() });
    } finally {
      await group6.close();
    }

    // ==============================================================
    // GROUP 7: INJECTION, MALFORMED IDS & STRICT BODY VALIDATION
    // ==============================================================
    console.log('\n--- GROUP 7: INJECTION, MALFORMED IDS & STRICT BODY VALIDATION ---');
    const { group: group7, fetchGroup: fetch7 } = startServerGroup();

    try {
      // Malformed ObjectId param returns 400
      const badIdRes = await fetch7('/public/tournaments/not-a-valid-id');
      assert(badIdRes.status === 400, 'Malformed ObjectId param returns 400');

      // NoSQL operator query injection returns 400
      const nosqlQueryRes = await fetch7('/public/tournaments?name[$ne]=Football');
      assert(nosqlQueryRes.status === 400, 'NoSQL operator key in query returns 400');

      // Body injection on tournament create
      const nosqlTourneyBody = await fetch7('/tournaments', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          name: `Injection ${runId}`,
          sport: testSport._id.toString(),
          category: 'Cup',
          ageGroup: 'U18',
          format: 'Knockout',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          $where: 'sleep(1000)',
        }),
      });
      assert(nosqlTourneyBody.status === 400, 'NoSQL operator in tournament body returns 400');

      const unknownKeyTourney = await fetch7('/tournaments', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          name: `Unknown Key ${runId}`,
          sport: testSport._id.toString(),
          category: 'Cup',
          ageGroup: 'U18',
          format: 'Knockout',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          hackedField: true,
        }),
      });
      assert(unknownKeyTourney.status === 400, 'Unknown key in tournament create returns 400 (strict validation)');

      // Body injection on venue create
      const unknownVenueBody = await fetch7('/venues', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({ name: `V Inj ${runId}`, address: 'Addr', $gt: 1 }),
      });
      assert(unknownVenueBody.status === 400, 'NoSQL operator in venue body returns 400');

      // Body injection on match create
      const unknownMatchBody = await fetch7(`/tournaments/${baselineTourneyId}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: baselineRegId,
          awayTeam: baselineRegBId,
          round: 'InjRound',
          scheduledAt: new Date(Date.now() + 100 * 86400000).toISOString(),
          durationMinutes: 90,
          venue: baselineVenueId,
          $regex: '.*',
        }),
      });
      assert(unknownMatchBody.status === 400, 'NoSQL operator in match body returns 400');

      // Body injection on registration update squad
      const unknownSquadBody = await fetch7(`/registrations/${baselineRegId}/squad`, {
        method: 'PATCH',
        headers: coachAAuth,
        body: JSON.stringify({ squad: [athleteA1._id.toString()], extraData: true }),
      });
      assert(unknownSquadBody.status === 400, 'Unknown field in registration squad body returns 400');

      assert(group7.getRequestCount() < 90, `Group 7 request count (${group7.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 7', count: group7.getRequestCount() });
    } finally {
      await group7.close();
    }

    // ==============================================================
    // GROUP 8: OFFICIAL (REFEREE) FEATURE REMOVAL VERIFICATION
    // ==============================================================
    console.log('\n--- GROUP 8: OFFICIAL FEATURE REMOVAL VERIFICATION ---');
    const { group: group8, fetchGroup: fetch8 } = startServerGroup();

    try {
      // 1. GET / POST / PATCH / DELETE /api/officials = 404 for every role
      const testRoles = [
        { name: 'Admin', headers: adminAuth },
        { name: 'Organizer A', headers: orgAAuth },
        { name: 'Coach A', headers: coachAAuth },
        { name: 'Athlete A1', headers: athleteAAuth },
      ];

      for (const r of testRoles) {
        const getOff = await fetch8('/officials', { method: 'GET', headers: r.headers });
        assert(getOff.status === 404, `GET /api/officials returns 404 for ${r.name}`);

        const postOff = await fetch8('/officials', {
          method: 'POST',
          headers: r.headers,
          body: JSON.stringify({ name: 'Ref Test', type: 'Referee' }),
        });
        assert(postOff.status === 404, `POST /api/officials returns 404 for ${r.name}`);

        const fakeId = new Types.ObjectId().toString();
        const patchOff = await fetch8(`/officials/${fakeId}`, {
          method: 'PATCH',
          headers: r.headers,
          body: JSON.stringify({ name: 'Ref Patch' }),
        });
        assert(patchOff.status === 404, `PATCH /api/officials/:id returns 404 for ${r.name}`);

        const delOff = await fetch8(`/officials/${fakeId}`, {
          method: 'DELETE',
          headers: r.headers,
        });
        assert(delOff.status === 404, `DELETE /api/officials/:id returns 404 for ${r.name}`);
      }

      // 2. Match create / update body containing referee = 400
      const fakeRefId = new Types.ObjectId().toString();
      const matchCreateWithReferee = await fetch8(`/tournaments/${baselineTourneyId}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: baselineRegId,
          awayTeam: baselineRegBId,
          round: 'RefTest',
          scheduledAt: new Date(Date.now() + 150 * 86400000).toISOString(),
          durationMinutes: 90,
          venue: baselineVenueId,
          referee: fakeRefId,
        }),
      });
      assert(matchCreateWithReferee.status === 400, 'Match create body containing "referee" returns 400');

      const matchUpdateWithReferee = await fetch8(`/matches/${baselineMatchId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({
          referee: fakeRefId,
        }),
      });
      assert(matchUpdateWithReferee.status === 400, 'Match update body containing "referee" returns 400');

      // 3. Match responses (private and public) contain no "referee" key (deep scan)
      const privMatchRes = await fetch8(`/matches/${baselineMatchId}`, {
        method: 'GET',
        headers: orgAAuth,
      });
      assert(privMatchRes.status === 200, 'GET /matches/:id returns 200');
      const privKeys = deepFindKeys(privMatchRes.body, ['referee']);
      assert(privKeys.length === 0, 'Private match response contains NO "referee" key');

      const pubMatchRes = await fetch8(`/public/tournaments/${baselineTourneyId}/matches`, {
        method: 'GET',
      });
      assert(pubMatchRes.status === 200, 'GET /public/tournaments/:id/matches returns 200');
      const pubKeys = deepFindKeys(pubMatchRes.body, ['referee']);
      assert(pubKeys.length === 0, 'Public match list response contains NO "referee" key');

      // 4. Match can still be created, rescheduled, started, scored, and completed
      await Tournament.updateOne(
        { _id: new Types.ObjectId(baselineTourneyId) },
        { $set: { status: 'In Progress' } }
      );
      const g8MatchTime = new Date(Date.now() + 200 * 86400000);
      const createG8Match = await fetch8(`/tournaments/${baselineTourneyId}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: baselineRegId,
          awayTeam: baselineRegBId,
          round: 'G8Flow',
          scheduledAt: g8MatchTime.toISOString(),
          durationMinutes: 90,
          venue: baselineVenueId,
        }),
      });
      assert(createG8Match.status === 201, 'Match can still be created without referee (201)');
      const g8MatchId = (createG8Match.body as { data: { id: string } }).data.id;
      createdMatchIds.push(new Types.ObjectId(g8MatchId));

      const readyTime = new Date(Date.now() - 5 * 60 * 1000);
      const reschedG8Match = await fetch8(`/matches/${g8MatchId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({
          scheduledAt: readyTime.toISOString(),
        }),
      });
      assert(reschedG8Match.status === 200, 'Match can still be rescheduled (200)');

      // 5. Venue and Team overlap rules still return 409
      const overlapVenueMatch = await fetch8(`/tournaments/${baselineTourneyId}/matches`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          homeTeam: baselineRegId,
          awayTeam: baselineRegBId,
          round: 'OverlapTest',
          scheduledAt: readyTime.toISOString(),
          durationMinutes: 90,
          venue: baselineVenueId,
        }),
      });
      assert(overlapVenueMatch.status === 409, 'Venue overlap rule still returns 409');

      // 6. Admin and Owning Organizer can still run live workflow; Coach and Athlete get 403 on live writes
      const liveStartMatch = await fetch8(`/matches/${g8MatchId}/status`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Live' }),
      });
      assert(liveStartMatch.status === 200, 'Owning Organizer can transition match to Live (200)');

      const coachLiveWrite = await fetch8(`/matches/${g8MatchId}/events`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ type: 'Goal', side: 'home', minute: 10 }),
      });
      assert(coachLiveWrite.status === 403, 'Coach gets 403 on live write endpoint');

      const athleteLiveWrite = await fetch8(`/matches/${g8MatchId}/events`, {
        method: 'POST',
        headers: athleteAAuth,
        body: JSON.stringify({ type: 'Goal', side: 'home', minute: 10 }),
      });
      assert(athleteLiveWrite.status === 403, 'Athlete gets 403 on live write endpoint');

      const adminLiveScore = await fetch8(`/matches/${g8MatchId}/events`, {
        method: 'POST',
        headers: adminAuth,
        body: JSON.stringify({ type: 'Goal', side: 'home', minute: 15 }),
      });
      assert(adminLiveScore.status === 201, 'Admin can log live match event (201)');
      assert(Boolean((adminLiveScore.body as { data: { id: string } }).data?.id), 'Event ID returned');

      const completeLiveMatch = await fetch8(`/matches/${g8MatchId}/status`, {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Completed' }),
      });
      assert(completeLiveMatch.status === 200, 'Match can still be completed via live workflow (200)');

      // 7. Admin, Coach, Athlete, and Organizer chatbot tool lists are unchanged
      const adminTools = ROLE_TOOLS.Admin;
      const coachTools = ROLE_TOOLS.Coach;
      const athleteTools = ROLE_TOOLS.Athlete;
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

      assert(JSON.stringify(adminTools) === JSON.stringify(expectedAdminTools), 'Admin chatbot tool list is unchanged');
      assert(JSON.stringify(orgTools) === JSON.stringify(expectedOrgTools), 'Organizer chatbot tool list is unchanged');
      assert(coachTools.length === 8, 'Coach chatbot tool list length is unchanged (8 tools)');
      assert(athleteTools.length === 11, 'Athlete chatbot tool list length is unchanged (11 tools)');

      // 8. Migration dry-run shows 0 matches with a referee
      const matchesWithRef = await Match.countDocuments({ referee: { $exists: true, $ne: null } });
      assert(matchesWithRef === 0, 'Database contains 0 matches with a referee field');

      assert(group8.getRequestCount() < 90, `Group 8 request count (${group8.getRequestCount()}) strictly < 90`);
      groupCounts.push({ name: 'Group 8', count: group8.getRequestCount() });
    } finally {
      await group8.close();
    }
  } finally {
    // ==============================================================
    // CLEANUP: ONLY TEST-CREATED IDS
    // ==============================================================
    console.log('\n--- CLEANING UP CREATED TEST RESOURCES ---');

    if (createdMatchIds.length > 0) {
      await MatchEvent.deleteMany({ match: { $in: createdMatchIds } });
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
    }
    if (createdVenueIds.length > 0) {
      await Venue.deleteMany({ _id: { $in: createdVenueIds } });
    }
    if (createdRegIds.length > 0) {
      await TournamentTeam.deleteMany({ _id: { $in: createdRegIds } });
    }
    if (createdTourneyIds.length > 0) {
      await Tournament.deleteMany({ _id: { $in: createdTourneyIds } });
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
      await AuditLog.deleteMany({ actor: { $in: createdUserIds } });
      await Notification.deleteMany({ user: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }

    // Verify after-counts exactly equal initial counts
    const finalCounts = {
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
      matches: await Match.countDocuments(),
      auditLogs: await AuditLog.countDocuments(),
    };

    console.log('Final Database Counts:', JSON.stringify(finalCounts));

    assert(finalCounts.users === initialCounts.users, `Users count restored (${finalCounts.users} === ${initialCounts.users})`);
    assert(finalCounts.sports === initialCounts.sports, `Sports count restored (${finalCounts.sports} === ${initialCounts.sports})`);
    assert(finalCounts.teams === initialCounts.teams, `Teams count restored (${finalCounts.teams} === ${initialCounts.teams})`);
    assert(finalCounts.coaches === initialCounts.coaches, `Coaches count restored (${finalCounts.coaches} === ${initialCounts.coaches})`);
    assert(finalCounts.athletes === initialCounts.athletes, `Athletes count restored (${finalCounts.athletes} === ${initialCounts.athletes})`);
    assert(finalCounts.sessions === initialCounts.sessions, `Sessions count restored (${finalCounts.sessions} === ${initialCounts.sessions})`);
    assert(finalCounts.attendance === initialCounts.attendance, `Attendance count restored (${finalCounts.attendance} === ${initialCounts.attendance})`);
    assert(finalCounts.announcements === initialCounts.announcements, `Announcements count restored (${finalCounts.announcements} === ${initialCounts.announcements})`);
    assert(finalCounts.documents === initialCounts.documents, `Documents count restored (${finalCounts.documents} === ${initialCounts.documents})`);
    assert(finalCounts.assessments === initialCounts.assessments, `Assessments count restored (${finalCounts.assessments} === ${initialCounts.assessments})`);
    assert(finalCounts.feedback === initialCounts.feedback, `Feedback count restored (${finalCounts.feedback} === ${initialCounts.feedback})`);
    assert(finalCounts.goals === initialCounts.goals, `Goals count restored (${finalCounts.goals} === ${initialCounts.goals})`);
    assert(finalCounts.tournaments === initialCounts.tournaments, `Tournaments count restored (${finalCounts.tournaments} === ${initialCounts.tournaments})`);
    assert(finalCounts.tournamentTeams === initialCounts.tournamentTeams, `TournamentTeams count restored (${finalCounts.tournamentTeams} === ${initialCounts.tournamentTeams})`);
    assert(finalCounts.venues === initialCounts.venues, `Venues count restored (${finalCounts.venues} === ${initialCounts.venues})`);
    assert(finalCounts.matches === initialCounts.matches, `Matches count restored (${finalCounts.matches} === ${initialCounts.matches})`);
    assert(finalCounts.auditLogs === initialCounts.auditLogs, `AuditLogs count restored (${finalCounts.auditLogs} === ${initialCounts.auditLogs})`);

    assert(failedAuthHttpRequests <= 8, `Failed /api/auth requests <= 8 (${failedAuthHttpRequests} <= 8)`);

    await mongoose.disconnect();
  }

  const sumGroupCounts = groupCounts.reduce((acc, g) => acc + g.count, 0);

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests}`);
  console.log(`Per-group counts breakdown: ${groupCounts.map((g) => `${g.name}=${g.count}`).join(', ')} (Sum: ${sumGroupCounts})`);
  console.log('========================================\n');

  if (sumGroupCounts !== totalHttpRequests) {
    console.error(`Mismatch between sum of per-group counts (${sumGroupCounts}) and total (${totalHttpRequests})!`);
    process.exit(1);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
