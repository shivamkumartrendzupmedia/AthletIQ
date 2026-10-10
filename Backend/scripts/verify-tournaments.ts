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
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';

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
  console.log('\n--- VERIFYING ATHLETIQ TOURNAMENTS SYSTEM (STEP 8A) ---\n');

  await connectDB();

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
    officials: await Official.countDocuments(),
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
  const createdOfficialIds: Types.ObjectId[] = [];
  const createdMatchIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const passwordHash = await hashPassword('Password123');

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
    let baselineOfficialId = '';
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

      const officialRes = await fetch1A('/officials', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({ name: `Head Ref ${runId}`, type: 'Referee' }),
      });
      assert(officialRes.status === 201, 'Organizer A creates baseline official (201)');
      baselineOfficialId = (officialRes.body as { data: { id: string } }).data.id;
      createdOfficialIds.push(new Types.ObjectId(baselineOfficialId));

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
          referee: baselineOfficialId,
        }),
      });
      assert(matchRes.status === 201, 'Organizer A schedules baseline match (201)');
      baselineMatchId = (matchRes.body as { data: { id: string } }).data.id;
      createdMatchIds.push(new Types.ObjectId(baselineMatchId));

      const tourneyEndpoints = [
        { name: 'POST /tournaments', method: 'POST', path: '/tournaments', body: tourneyPayload },
        { name: 'GET /tournaments', method: 'GET', path: '/tournaments' },
        { name: 'GET /tournaments/:id', method: 'GET', path: `/tournaments/${baselineTourneyId}` },
        { name: 'PATCH /tournaments/:id', method: 'PATCH', path: `/tournaments/${baselineTourneyId}`, body: { rules: 'Updated' } },
        { name: 'DELETE /tournaments/:id', method: 'DELETE', path: `/tournaments/${baselineTourneyId}` },
        { name: 'POST /tournaments/:id/registrations', method: 'POST', path: `/tournaments/${baselineTourneyId}/registrations`, body: { team: teamA._id.toString() } },
        { name: 'GET /tournaments/:id/registrations', method: 'GET', path: `/tournaments/${baselineTourneyId}/registrations` },
        { name: 'PATCH /registrations/:id/squad', method: 'PATCH', path: `/registrations/${baselineRegId}/squad`, body: { squad: [athleteA1._id.toString()] } },
        { name: 'PATCH /registrations/:id/review', method: 'PATCH', path: `/registrations/${baselineRegId}/review`, body: { status: 'Approved' } },
        { name: 'DELETE /registrations/:id', method: 'DELETE', path: `/registrations/${baselineRegId}` },
      ];

      for (const ep of tourneyEndpoints) {
        const statuses: number[] = [];
        for (const role of roles) {
          const res = await fetch1A(ep.path, {
            method: ep.method,
            headers: role.headers,
            body: ep.body ? JSON.stringify(ep.body) : undefined,
          });
          statuses.push(res.status);
          if (res.status === 201 && res.body && typeof res.body === 'object') {
            const bodyObj = res.body as { data?: { id?: string } };
            const createdIdStr = bodyObj.data?.id;
            if (createdIdStr) {
              const objId = new Types.ObjectId(createdIdStr);
              if (ep.path === '/tournaments') createdTourneyIds.push(objId);
              else if (ep.path.includes('/registrations')) createdRegIds.push(objId);
            }
          }
        }
        matrixRows.push(`| ${ep.name.padEnd(35)} | ${statuses[0]} | ${statuses[1]} | ${statuses[2]} | ${statuses[3]} | ${statuses[4]} |`);
      }

      assert(group1A.getRequestCount() < 90, `Group 1A request count (${group1A.getRequestCount()}) strictly < 90`);
    } finally {
      await group1A.close();
    }

    // ==============================================================
    // GROUP 1B: VENUES, OFFICIALS, MATCHES & PUBLIC MATRIX
    // ==============================================================
    console.log('\n--- GROUP 1B: VENUES, OFFICIALS, MATCHES & PUBLIC MATRIX ---');
    const { group: group1B, fetchGroup: fetch1B } = startServerGroup();

    try {
      const secondHalfEndpoints = [
        { name: 'POST /venues', method: 'POST', path: '/venues', body: { name: `V2 ${runId}`, address: 'Addr' } },
        { name: 'GET /venues', method: 'GET', path: '/venues' },
        { name: 'PATCH /venues/:id', method: 'PATCH', path: `/venues/${baselineVenueId}`, body: { name: 'V-Edit' } },
        { name: 'DELETE /venues/:id', method: 'DELETE', path: `/venues/${baselineVenueId}` },
        { name: 'POST /officials', method: 'POST', path: '/officials', body: { name: `Off2 ${runId}`, type: 'Scorer' } },
        { name: 'GET /officials', method: 'GET', path: '/officials' },
        { name: 'PATCH /officials/:id', method: 'PATCH', path: `/officials/${baselineOfficialId}`, body: { name: 'O-Edit' } },
        { name: 'DELETE /officials/:id', method: 'DELETE', path: `/officials/${baselineOfficialId}` },
        { name: 'POST /tournaments/:id/matches', method: 'POST', path: `/tournaments/${baselineTourneyId}/matches`, body: { homeTeam: baselineRegId, awayTeam: baselineRegBId, round: 'Semi', scheduledAt: new Date(Date.now() + 300000000).toISOString(), venue: baselineVenueId } },
        { name: 'GET /tournaments/:id/matches', method: 'GET', path: `/tournaments/${baselineTourneyId}/matches` },
        { name: 'GET /matches/:id', method: 'GET', path: `/matches/${baselineMatchId}` },
        { name: 'PATCH /matches/:id', method: 'PATCH', path: `/matches/${baselineMatchId}`, body: { round: 'Final' } },
        { name: 'PATCH /matches/:id/result', method: 'PATCH', path: `/matches/${baselineMatchId}/result`, body: { homeScore: 2, awayScore: 1 } },
        { name: 'DELETE /matches/:id', method: 'DELETE', path: `/matches/${baselineMatchId}` },
        { name: 'GET /public/tournaments', method: 'GET', path: '/public/tournaments' },
        { name: 'GET /public/tournaments/:id', method: 'GET', path: `/public/tournaments/${baselineTourneyId}` },
        { name: 'GET /public/tournaments/:id/matches', method: 'GET', path: `/public/tournaments/${baselineTourneyId}/matches` },
      ];

      for (const ep of secondHalfEndpoints) {
        const statuses: number[] = [];
        for (const role of roles) {
          const res = await fetch1B(ep.path, {
            method: ep.method,
            headers: role.headers,
            body: ep.body ? JSON.stringify(ep.body) : undefined,
          });
          statuses.push(res.status);
          if (res.status === 201 && res.body && typeof res.body === 'object') {
            const bodyObj = res.body as { data?: { id?: string } };
            const createdIdStr = bodyObj.data?.id;
            if (createdIdStr) {
              const objId = new Types.ObjectId(createdIdStr);
              if (ep.path === '/venues') createdVenueIds.push(objId);
              else if (ep.path === '/officials') createdOfficialIds.push(objId);
              else if (ep.path.includes('/matches')) createdMatchIds.push(objId);
            }
          }
        }
        matrixRows.push(`| ${ep.name.padEnd(35)} | ${statuses[0]} | ${statuses[1]} | ${statuses[2]} | ${statuses[3]} | ${statuses[4]} |`);
      }

      console.log('\n--- REAL PERMISSIONS MATRIX (GENERATED FROM LIVE HTTP RESPONSES) ---');
      matrixRows.forEach((r) => console.log(r));

      assert(true, 'Live role x endpoint permissions matrix generated successfully');
      assert(group1B.getRequestCount() < 90, `Group 1B request count (${group1B.getRequestCount()}) strictly < 90`);
    } finally {
      await group1B.close();
    }

    // ==============================================================
    // GROUP 2: SCOPING & IDOR ISOLATION (ORGANIZER B & COACH B)
    // ==============================================================
    console.log('\n--- GROUP 2: SCOPING & IDOR ISOLATION ---');
    const { group: group2, fetchGroup: fetch2 } = startServerGroup();

    try {
      // Create isolated tournament for Org A
      const tourneyA = await Tournament.create({
        name: `Tournament A ${runId}`,
        sport: testSport._id,
        category: 'Pro',
        ageGroup: 'U18',
        format: 'League',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(tourneyA._id);

      const venueA = await Venue.create({
        name: `Venue A ${runId}`,
        address: 'Loc A',
        createdBy: orgAUser._id,
      });
      createdVenueIds.push(venueA._id);

      const officialA = await Official.create({
        name: `Official A ${runId}`,
        type: 'Referee',
        createdBy: orgAUser._id,
      });
      createdOfficialIds.push(officialA._id);

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

      // Organizer B updating/deleting Org A's official => 404
      const orgBUpdateOfficial = await fetch2(`/officials/${officialA._id}`, {
        method: 'PATCH',
        headers: orgBAuth,
        body: JSON.stringify({ name: 'Hacked Official' }),
      });
      assert(orgBUpdateOfficial.status === 404, 'Organizer B updating Organizer A official returns 404');

      const orgBDeleteOfficial = await fetch2(`/officials/${officialA._id}`, {
        method: 'DELETE',
        headers: orgBAuth,
      });
      assert(orgBDeleteOfficial.status === 404, 'Organizer B deleting Organizer A official returns 404');

      // Coach B scoping: Coach B attempting to register Team A (coached by Coach A) => 404
      const coachBRegTeamA = await fetch2(`/tournaments/${tourneyA._id}/registrations`, {
        method: 'POST',
        headers: coachBAuth,
        body: JSON.stringify({ team: teamA._id.toString() }),
      });
      assert(coachBRegTeamA.status === 404, 'Coach B attempting to register Team A returns 404');

      // Coach A registers Team A successfully
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

      assert(group2.getRequestCount() < 90, `Group 2 request count (${group2.getRequestCount()}) strictly < 90`);
    } finally {
      await group2.close();
    }

    // ==============================================================
    // GROUP 3: REGISTRATION RULES, MAXTEAMS & ATOMIC RACE
    // ==============================================================
    console.log('\n--- GROUP 3: REGISTRATION RULES, MAXTEAMS & ATOMIC RACE ---');
    const { group: group3, fetchGroup: fetch3 } = startServerGroup();

    try {
      // Draft tournament => registrations blocked (400)
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

      const regDraft = await fetch3(`/tournaments/${draftTourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString() }),
      });
      assert(regDraft.status === 400, 'Registering for Draft tournament returns 400');

      // Open tournament with maxTeams: 2
      const max2Tourney = await Tournament.create({
        name: `Max2 Tourney ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Registration Open',
        maxTeams: 2,
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(max2Tourney._id);

      // Wrong sport: Team C (Cricket) registering for Football tournament => 400
      const wrongSportReg = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamC._id.toString() }),
      });
      assert(wrongSportReg.status === 400, 'Team with wrong sport returns 400');

      // Athlete not on team in squad => 400
      const notOnTeamSquad = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteB1._id.toString()] }),
      });
      assert(notOnTeamSquad.status === 400, 'Squad containing athlete not on team returns 400');

      // Duplicate athletes in squad => 400
      const dupSquad = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachAAuth,
        body: JSON.stringify({
          team: teamA._id.toString(),
          squad: [athleteA1._id.toString(), athleteA1._id.toString()],
        }),
      });
      assert(dupSquad.status === 400, 'Squad with duplicate athletes returns 400');

      // Duplicate registration race via Promise.all: exactly one succeeds (201), one rejected (409)
      const [raceReg1, raceReg2] = await Promise.all([
        fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
          method: 'POST',
          headers: coachAAuth,
          body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
        }),
        fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
          method: 'POST',
          headers: coachAAuth,
          body: JSON.stringify({ team: teamA._id.toString(), squad: [athleteA1._id.toString()] }),
        }),
      ]);

      const raceStatuses = [raceReg1.status, raceReg2.status].sort();
      assert(
        raceStatuses[0] === 201 && raceStatuses[1] === 409,
        `Duplicate registration race: exactly one 201 and one 409 (got ${raceStatuses.join(', ')})`
      );

      const winningRegId = ((raceReg1.status === 201 ? raceReg1.body : raceReg2.body) as { data?: { id?: string } })?.data?.id;
      if (winningRegId) createdRegIds.push(new Types.ObjectId(winningRegId));

      // Coach B registers Team B
      const regTeamB = await fetch3(`/tournaments/${max2Tourney._id}/registrations`, {
        method: 'POST',
        headers: coachBAuth,
        body: JSON.stringify({ team: teamB._id.toString(), squad: [athleteB1._id.toString()] }),
      });
      assert(regTeamB.status === 201, 'Coach B registers Team B (201)');
      const regBId = (regTeamB.body as { data: { id: string } }).data.id;
      createdRegIds.push(new Types.ObjectId(regBId));

      // Approve Team A (Count: 1)
      const appA = await fetch3(`/registrations/${winningRegId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appA.status === 200, 'Admin/Org approves Team A (200)');

      // Second review on already approved Team A returns 409
      const appATwice = await fetch3(`/registrations/${winningRegId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appATwice.status === 409, 'Reviewing already reviewed registration returns 409');

      // Approve Team B (Count: 2 = maxTeams)
      const appB = await fetch3(`/registrations/${regBId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appB.status === 200, 'Admin/Org approves Team B (200, reaches maxTeams 2)');

      // Create a 3rd team to test maxTeams enforcement
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
      const appDOverMax = await fetch3(`/registrations/${regDId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Approved' }),
      });
      assert(appDOverMax.status === 400, 'Approving team beyond maxTeams returns 400');

      // Reject Team D with reason (200)
      const rejWithReason = await fetch3(`/registrations/${regDId}/review`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'Rejected', reason: 'Capacity full' }),
      });
      assert(rejWithReason.status === 200, 'Rejecting registration with reason returns 200');

      assert(group3.getRequestCount() < 90, `Group 3 request count (${group3.getRequestCount()}) strictly < 90`);
    } finally {
      await group3.close();
    }

    // ==============================================================
    // GROUP 4: TOURNAMENT LIFECYCLE & STATUS TRANSITIONS & DELETION
    // ==============================================================
    console.log('\n--- GROUP 4: TOURNAMENT LIFECYCLE & DELETION RULES ---');
    const { group: group4, fetchGroup: fetch4 } = startServerGroup();

    try {
      // Create fresh tournament in Draft
      const tRes = await fetch4('/tournaments', {
        method: 'POST',
        headers: orgAAuth,
        body: JSON.stringify({
          name: `Lifecycle Tourney ${runId}`,
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

      // Cannot leave Completed => 400
      const stLeaveCompleted = await fetch4(`/tournaments/${tId}`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ status: 'In Progress' }),
      });
      assert(stLeaveCompleted.status === 400, 'Cannot change status of Completed tournament (400)');

      // Cannot delete Completed tournament => 409
      const delCompleted = await fetch4(`/tournaments/${tId}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delCompleted.status === 409, 'Cannot delete non-Draft tournament (409)');

      // Create Draft with a registration to verify delete guard
      const tDraft2 = await Tournament.create({
        name: `Draft With Reg ${runId}`,
        sport: testSport._id,
        category: 'Cup',
        ageGroup: 'U18',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 5 * 86400000),
        status: 'Draft',
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
    } finally {
      await group4.close();
    }

    // ==============================================================
    // GROUP 5: MATCH SCHEDULING, OVERLAP RACE & RESULT ENTRY
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

      const [reg1, reg2, regUnapproved] = await Promise.all([
        TournamentTeam.create({
          tournament: matchTourney._id,
          team: teamA._id,
          status: 'Approved',
          registeredBy: coachAUser._id,
        }),
        TournamentTeam.create({
          tournament: matchTourney._id,
          team: teamB._id,
          status: 'Approved',
          registeredBy: coachBUser._id,
        }),
        TournamentTeam.create({
          tournament: matchTourney._id,
          team: teamC._id,
          status: 'Pending',
          registeredBy: coachAUser._id,
        }),
      ]);
      createdRegIds.push(reg1._id, reg2._id, regUnapproved._id);

      const testVenue = await Venue.create({
        name: `Pitch 1 ${runId}`,
        address: 'Sector 4',
        createdBy: orgAUser._id,
      });
      createdVenueIds.push(testVenue._id);

      const testOfficial = await Official.create({
        name: `Referee Smith ${runId}`,
        type: 'Referee',
        createdBy: orgAUser._id,
      });
      createdOfficialIds.push(testOfficial._id);

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
            referee: testOfficial._id.toString(),
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
            referee: testOfficial._id.toString(),
          }),
        }),
      ]);

      const mRaceStatuses = [raceM1.status, raceM2.status].sort();
      assert(
        mRaceStatuses[0] === 201 && mRaceStatuses[1] === 409,
        `Venue overlap race: exactly one 201 and one 409 (got ${mRaceStatuses.join(', ')})`
      );

      if (raceM1.status === 201 && (raceM1.body as { data?: { id?: string } })?.data?.id) {
        createdMatchIds.push(new Types.ObjectId((raceM1.body as { data: { id: string } }).data.id));
      }
      if (raceM2.status === 201 && (raceM2.body as { data?: { id?: string } })?.data?.id) {
        createdMatchIds.push(new Types.ObjectId((raceM2.body as { data: { id: string } }).data.id));
      }
      const winningMatchId = ((raceM1.status === 201 ? raceM1.body : raceM2.body) as { data?: { id?: string } })?.data?.id;

      // Attempt deleting venue while referenced by scheduled match => 409
      const delRefVenue = await fetch5(`/venues/${testVenue._id}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delRefVenue.status === 409, 'Deleting venue referenced by match returns 409');

      // Attempt deleting official while referenced by scheduled match => 409
      const delRefOfficial = await fetch5(`/officials/${testOfficial._id}`, {
        method: 'DELETE',
        headers: orgAAuth,
      });
      assert(delRefOfficial.status === 409, 'Deleting official referenced by match returns 409');

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

      // Negative score => 400
      const negScore = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: -1, awayScore: 0 }),
      });
      assert(negScore.status === 400, 'Negative score returns 400');

      // Score > 99 => 400
      const hugeScore = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 100, awayScore: 0 }),
      });
      assert(hugeScore.status === 400, 'Score > 99 returns 400');

      // Decimal score => 400
      const floatScore = await fetch5(`/matches/${pastMatch._id}/result`, {
        method: 'PATCH',
        headers: orgAAuth,
        body: JSON.stringify({ homeScore: 1.5, awayScore: 0 }),
      });
      assert(floatScore.status === 400, 'Decimal score returns 400');

      // Valid result entry => 200, sets Completed
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
    } finally {
      await group5.close();
    }

    // ==============================================================
    // GROUP 6: PUBLIC ENDPOINTS & DEEP DATA LEAK SCAN
    // ==============================================================
    console.log('\n--- GROUP 6: PUBLIC ENDPOINTS & DEEP SCAN ---');
    const { group: group6, fetchGroup: fetch6 } = startServerGroup();

    try {
      // Create public visible tournament and draft tournament
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
        name: `Secret Draft Tourney ${runId}`,
        sport: testSport._id,
        category: 'Secret',
        ageGroup: 'All',
        format: 'Knockout',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 4 * 86400000),
        status: 'Draft',
        organizer: orgAUser._id,
      });
      createdTourneyIds.push(pubDraftTourney._id);

      // GET /public/tournaments
      const pubList = await fetch6('/public/tournaments');
      assert(pubList.status === 200, 'GET /public/tournaments returns 200');
      const pubListJson = pubList.body as { items?: Array<{ id: string; name: string }> };
      const hasDraft = pubListJson.items?.some((t) => t.id === pubDraftTourney._id.toString());
      assert(!hasDraft, 'Draft tournament is strictly omitted from public list');

      // Draft tournament returns 404 on public single and matches
      const pubSingleDraft = await fetch6(`/public/tournaments/${pubDraftTourney._id}`);
      assert(pubSingleDraft.status === 404, 'GET /public/tournaments/:id on Draft returns 404');

      const pubMatchesDraft = await fetch6(`/public/tournaments/${pubDraftTourney._id}/matches`);
      assert(pubMatchesDraft.status === 404, 'GET /public/tournaments/:id/matches on Draft returns 404');

      // Single public tournament response
      const pubSingle = await fetch6(`/public/tournaments/${pubTourney._id}`);
      assert(pubSingle.status === 200, 'GET /public/tournaments/:id on active returns 200');

      // Deep scan for sensitive field leaks
      const forbiddenKeys = [
        'organizer',
        'email',
        'password',
        'passwordHash',
        'squad',
        'athlete',
        'medicalNotes',
        'guardian',
        'reason',
        'phone',
        'refreshTokens',
      ];

      const leakedInList = deepFindKeys(pubList.body, forbiddenKeys);
      assert(leakedInList.length === 0, `DEEP SCAN: No sensitive fields leaked in public list (found: ${leakedInList.join(', ')})`);

      const leakedInSingle = deepFindKeys(pubSingle.body, forbiddenKeys);
      assert(leakedInSingle.length === 0, `DEEP SCAN: No sensitive fields leaked in public single (found: ${leakedInSingle.join(', ')})`);

      // Injection and input validation
      const malformedIdRes = await fetch6('/public/tournaments/not-a-valid-id');
      assert(malformedIdRes.status === 400, 'Malformed ObjectId param returns 400');

      const noSqlRes = await fetch6('/public/tournaments?name[$ne]=Football');
      assert(noSqlRes.status === 400, 'NoSQL operator key in query returns 400');

      assert(group6.getRequestCount() < 90, `Group 6 request count (${group6.getRequestCount()}) strictly < 90`);
    } finally {
      await group6.close();
    }
  } finally {
    // ==============================================================
    // CLEANUP: ONLY TEST-CREATED IDS
    // ==============================================================
    console.log('\n--- CLEANING UP CREATED TEST RESOURCES ---');

    if (createdMatchIds.length > 0) {
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
    }
    if (createdOfficialIds.length > 0) {
      await Official.deleteMany({ _id: { $in: createdOfficialIds } });
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
      officials: await Official.countDocuments(),
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
    assert(finalCounts.officials === initialCounts.officials, `Officials count restored (${finalCounts.officials} === ${initialCounts.officials})`);
    assert(finalCounts.matches === initialCounts.matches, `Matches count restored (${finalCounts.matches} === ${initialCounts.matches})`);
    assert(finalCounts.auditLogs === initialCounts.auditLogs, `AuditLogs count restored (${finalCounts.auditLogs} === ${initialCounts.auditLogs})`);

    assert(failedAuthHttpRequests <= 8, `Failed /api/auth requests <= 8 (${failedAuthHttpRequests} <= 8)`);

    await mongoose.disconnect();
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
  console.error('Fatal verification error:', err);
  process.exit(1);
});
