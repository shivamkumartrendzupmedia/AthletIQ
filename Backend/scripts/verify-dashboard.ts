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
  AuditLog,
  ContactMessage,
  Notification,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { resetContactLimiter } from '../src/middlewares/rateLimiter.js';

let passed = 0;
let failed = 0;
let totalHttpRequests = 0;
let failedAuthHttpCount = 0;

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

async function httpFetch(
  url: string,
  options: RequestInit = {}
): Promise<HttpResult> {
  totalHttpRequests++;
  const res = await fetch(url, options);
  if (url.includes('/api/auth') && res.status >= 400) {
    failedAuthHttpCount++;
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
  server: Server;
}

function startTestServer(): Promise<TestServerGroup> {
  return new Promise((resolve, reject) => {
    const app = createApp();
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolve({ baseUrl: `http://127.0.0.1:${addr.port}`, server });
    });
    server.on('error', reject);
  });
}

function deepFindKeys(obj: unknown, forbiddenKeys: string[], found: string[] = []): string[] {
  if (obj === null || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) deepFindKeys(item, forbiddenKeys, found);
    return found;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (forbiddenKeys.includes(k)) found.push(k);
    deepFindKeys(v, forbiddenKeys, found);
  }
  return found;
}

// Track IDs created during verification
const createdUserIds: Types.ObjectId[] = [];
const createdSportIds: Types.ObjectId[] = [];
const createdTeamIds: Types.ObjectId[] = [];
const createdCoachIds: Types.ObjectId[] = [];
const createdAthleteIds: Types.ObjectId[] = [];
const createdSessionIds: Types.ObjectId[] = [];
const createdAttendanceIds: Types.ObjectId[] = [];
const createdAnnouncementIds: Types.ObjectId[] = [];
const createdAssessmentIds: Types.ObjectId[] = [];
const createdFeedbackIds: Types.ObjectId[] = [];
const createdGoalIds: Types.ObjectId[] = [];
const createdTournamentIds: Types.ObjectId[] = [];
const createdTournamentTeamIds: Types.ObjectId[] = [];
const createdVenueIds: Types.ObjectId[] = [];
const createdOfficialIds: Types.ObjectId[] = [];
const createdMatchIds: Types.ObjectId[] = [];
const createdContactIds: Types.ObjectId[] = [];
const createdAuditLogIds: Types.ObjectId[] = [];

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
    auditLogs: await AuditLog.countDocuments(),
    contactMessages: await ContactMessage.countDocuments(),
  };
}

async function runVerification() {
  console.log('\n--- VERIFYING ATHLETIQ PHASE B (DASHBOARDS, CONTACT & REAL DATA) ---\n');
  await connectDB();

  const initialCounts = await getCollectionCounts();
  console.log('Database Counts Before:');
  console.log(JSON.stringify(initialCounts, null, 2));

  const pwHash = await hashPassword('ValidPass123!');

  // Seed baseline test users
  const adminUser = await User.create({
    name: 'Dashboard Admin',
    email: `dash-admin-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Admin',
    isActive: true,
  });
  createdUserIds.push(adminUser._id);

  const coachAUser = await User.create({
    name: 'Dashboard Coach A',
    email: `dash-coach-a-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Coach',
    isActive: true,
  });
  createdUserIds.push(coachAUser._id);

  const coachBUser = await User.create({
    name: 'Dashboard Coach B',
    email: `dash-coach-b-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Coach',
    isActive: true,
  });
  createdUserIds.push(coachBUser._id);

  const athleteAUser = await User.create({
    name: 'Dashboard Athlete A',
    email: `dash-athlete-a-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Athlete',
    isActive: true,
  });
  createdUserIds.push(athleteAUser._id);

  const athleteBUser = await User.create({
    name: 'Dashboard Athlete B',
    email: `dash-athlete-b-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Athlete',
    isActive: true,
  });
  createdUserIds.push(athleteBUser._id);

  const organizerUser = await User.create({
    name: 'Dashboard Organizer',
    email: `dash-org-${Date.now()}@athletiq.test`,
    passwordHash: pwHash,
    role: 'Organizer',
    isActive: true,
  });
  createdUserIds.push(organizerUser._id);

  const adminToken = signAccessToken(adminUser._id.toString(), 'Admin');
  const coachAToken = signAccessToken(coachAUser._id.toString(), 'Coach');
  const coachBToken = signAccessToken(coachBUser._id.toString(), 'Coach');
  const athleteAToken = signAccessToken(athleteAUser._id.toString(), 'Athlete');
  const athleteBToken = signAccessToken(athleteBUser._id.toString(), 'Athlete');
  const organizerToken = signAccessToken(organizerUser._id.toString(), 'Organizer');

  // Baseline contact message for Admin unread count & matrix tests
  const baselineContact = await ContactMessage.create({
    name: 'Matrix Inquirer',
    email: 'matrix@athletiq.test',
    message: 'Baseline message for permissions testing',
    status: 'New',
  });
  createdContactIds.push(baselineContact._id);

  // =========================================================================
  // GROUP 1: ROLE x ENDPOINT PERMISSIONS MATRIX (5 ENDPOINTS)
  // =========================================================================
  console.log('\n--- GROUP 1: ROLE x ENDPOINT PERMISSIONS MATRIX ---');
  let g1Requests = 0;
  const srv1 = await startTestServer();

  try {
    const rolesConfig = [
      { name: 'Admin', token: adminToken },
      { name: 'Coach', token: coachAToken },
      { name: 'Athlete', token: athleteAToken },
      { name: 'Organizer', token: organizerToken },
      { name: 'Unauthenticated', token: null },
    ];

    const matrix: Record<string, Record<string, number>> = {
      'POST /public/contact': {},
      'GET /contact-messages': {},
      'PATCH /contact-messages/:id': {},
      'GET /dashboard/overview': {},
      'GET /public/overview': {},
    };

    for (const r of rolesConfig) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (r.token) headers['Authorization'] = `Bearer ${r.token}`;

      // 1. POST /public/contact (No auth required)
      const resContact = await httpFetch(`${srv1.baseUrl}/api/public/contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: `${r.name} Tester`,
          email: `${r.name.toLowerCase()}@athletiq.test`,
          message: 'Matrix test inquiry',
        }),
      });
      g1Requests++;
      matrix['POST /public/contact'][r.name] = resContact.status;

      // 2. GET /contact-messages (Admin only)
      const resListContact = await httpFetch(`${srv1.baseUrl}/api/contact-messages`, {
        method: 'GET',
        headers,
      });
      g1Requests++;
      matrix['GET /contact-messages'][r.name] = resListContact.status;

      // 3. PATCH /contact-messages/:id (Admin only)
      const resPatchContact = await httpFetch(
        `${srv1.baseUrl}/api/contact-messages/${baselineContact._id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'Read' }),
        }
      );
      g1Requests++;
      matrix['PATCH /contact-messages/:id'][r.name] = resPatchContact.status;
      if (r.name === 'Admin') {
        const al = await AuditLog.findOne({ targetId: baselineContact._id });
        if (al) createdAuditLogIds.push(al._id);
      }

      // 4. GET /dashboard/overview (Authenticated roles)
      const resOverview = await httpFetch(`${srv1.baseUrl}/api/dashboard/overview`, {
        method: 'GET',
        headers,
      });
      g1Requests++;
      matrix['GET /dashboard/overview'][r.name] = resOverview.status;

      // 5. GET /public/overview (Public)
      const resPublicOverview = await httpFetch(`${srv1.baseUrl}/api/public/overview`, {
        method: 'GET',
        headers,
      });
      g1Requests++;
      matrix['GET /public/overview'][r.name] = resPublicOverview.status;
    }

    console.log('\n--- REAL PERMISSIONS MATRIX (GENERATED FROM LIVE HTTP RESPONSES) ---');
    console.log('| Endpoint & Method | Admin | Coach | Athlete | Organizer | Unauthenticated |');
    console.log('|---|---|---|---|---|---|');
    for (const [ep, resMap] of Object.entries(matrix)) {
      console.log(
        `| ${ep.padEnd(27)} | ${resMap['Admin']} | ${resMap['Coach']} | ${resMap['Athlete']} | ${resMap['Organizer']} | ${resMap['Unauthenticated']} |`
      );
    }

    // Assert matrix correctness
    assert(
      matrix['POST /public/contact']['Admin'] === 201 &&
        matrix['POST /public/contact']['Coach'] === 201 &&
        matrix['POST /public/contact']['Athlete'] === 201 &&
        matrix['POST /public/contact']['Organizer'] === 201 &&
        matrix['POST /public/contact']['Unauthenticated'] === 201,
      'POST /public/contact allows all roles and unauthenticated with 201'
    );

    assert(
      matrix['GET /contact-messages']['Admin'] === 200 &&
        matrix['GET /contact-messages']['Coach'] === 403 &&
        matrix['GET /contact-messages']['Athlete'] === 403 &&
        matrix['GET /contact-messages']['Organizer'] === 403 &&
        matrix['GET /contact-messages']['Unauthenticated'] === 401,
      'GET /contact-messages is strictly Admin only (200, 403, 401)'
    );

    assert(
      matrix['PATCH /contact-messages/:id']['Admin'] === 200 &&
        matrix['PATCH /contact-messages/:id']['Coach'] === 403 &&
        matrix['PATCH /contact-messages/:id']['Athlete'] === 403 &&
        matrix['PATCH /contact-messages/:id']['Organizer'] === 403 &&
        matrix['PATCH /contact-messages/:id']['Unauthenticated'] === 401,
      'PATCH /contact-messages/:id is strictly Admin only (200, 403, 401)'
    );

    assert(
      matrix['GET /dashboard/overview']['Admin'] === 200 &&
        matrix['GET /dashboard/overview']['Coach'] === 200 &&
        matrix['GET /dashboard/overview']['Athlete'] === 200 &&
        matrix['GET /dashboard/overview']['Organizer'] === 200 &&
        matrix['GET /dashboard/overview']['Unauthenticated'] === 401,
      'GET /dashboard/overview allows all authenticated roles with 200 and rejects unauthenticated with 401'
    );

    assert(
      matrix['GET /public/overview']['Admin'] === 200 &&
        matrix['GET /public/overview']['Coach'] === 200 &&
        matrix['GET /public/overview']['Athlete'] === 200 &&
        matrix['GET /public/overview']['Organizer'] === 200 &&
        matrix['GET /public/overview']['Unauthenticated'] === 200,
      'GET /public/overview is completely public with 200 for all'
    );

    // Track created messages from POST /contact in Group 1
    const g1Contacts = await ContactMessage.find({ name: /Tester$/ });
    for (const c of g1Contacts) createdContactIds.push(c._id);
  } finally {
    srv1.server.close();
  }

  assert(g1Requests < 90, `Group 1 request count (${g1Requests}) strictly < 90`);

  // =========================================================================
  // GROUP 2: ROLE-SPECIFIC SHAPE CHECKS & PROFILES TOLERANCE
  // =========================================================================
  console.log('\n--- GROUP 2: ROLE-SPECIFIC SHAPE CHECKS & PROFILE-LESS USERS ---');
  let g2Requests = 0;
  const srv2 = await startTestServer();

  try {
    // 1. Profile-less Coach
    const resCoachNoProf = await httpFetch(`${srv2.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${coachBToken}` },
    });
    g2Requests++;
    assert(resCoachNoProf.status === 200, 'Profile-less Coach receives 200 OK');
    const coachNoProfBody = (resCoachNoProf.body as { data: Record<string, unknown> }).data;
    assert(coachNoProfBody.role === 'Coach', 'Profile-less Coach returns role Coach');
    assert(Array.isArray(coachNoProfBody.teams) && coachNoProfBody.teams.length === 0, 'Profile-less Coach teams is empty array');
    assert(Array.isArray(coachNoProfBody.nextSessions) && coachNoProfBody.nextSessions.length === 0, 'Profile-less Coach nextSessions is empty array');
    assert(coachNoProfBody.attendanceRate === null, 'Profile-less Coach attendanceRate is null');

    // 2. Profile-less Athlete
    const resAthNoProf = await httpFetch(`${srv2.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${athleteBToken}` },
    });
    g2Requests++;
    assert(resAthNoProf.status === 200, 'Profile-less Athlete receives 200 OK');
    const athNoProfBody = (resAthNoProf.body as { data: Record<string, unknown> }).data;
    assert(athNoProfBody.role === 'Athlete', 'Profile-less Athlete returns role Athlete');
    assert(athNoProfBody.teamName === null, 'Profile-less Athlete teamName is null');
    assert(athNoProfBody.attendanceRate === null, 'Profile-less Athlete attendanceRate is null');
    assert(Array.isArray(athNoProfBody.nextSessions) && athNoProfBody.nextSessions.length === 0, 'Profile-less Athlete nextSessions is empty array');
    assert(athNoProfBody.latestAssessmentOverallScore === null, 'Profile-less Athlete latestAssessment is null');
    assert(athNoProfBody.activeGoalsCount === 0, 'Profile-less Athlete activeGoalsCount is 0');
    assert(athNoProfBody.unacknowledgedFeedbackCount === 0, 'Profile-less Athlete unacknowledgedFeedbackCount is 0');
    assert(Array.isArray(athNoProfBody.nextMatches) && athNoProfBody.nextMatches.length === 0, 'Profile-less Athlete nextMatches is empty array');

    // 3. Admin Shape Verification (contains only Admin keys)
    const resAdmin = await httpFetch(`${srv2.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g2Requests++;
    const adminBody = (resAdmin.body as { data: Record<string, unknown> }).data;
    assert(adminBody.role === 'Admin', 'Admin returns role Admin');
    assert(typeof adminBody.userCounts === 'object' && adminBody.userCounts !== null, 'Admin body contains userCounts');
    assert(typeof adminBody.activeAthletes === 'number', 'Admin body contains activeAthletes');
    assert(typeof adminBody.teams === 'number', 'Admin body contains teams');
    assert(typeof adminBody.coaches === 'number', 'Admin body contains coaches');
    assert(typeof adminBody.upcomingSessions === 'number', 'Admin body contains upcomingSessions');
    assert(typeof adminBody.tournaments === 'object', 'Admin body contains tournaments');
    assert(typeof adminBody.pendingRegistrations === 'number', 'Admin body contains pendingRegistrations');
    assert(typeof adminBody.unreadContactMessages === 'number', 'Admin body contains unreadContactMessages');

    // Verify Admin has NO foreign role keys
    assert(adminBody.nextSessions === undefined, 'Admin shape does not leak nextSessions');
    assert(adminBody.displayName === undefined, 'Admin shape does not leak displayName');

    // 4. Organizer Shape Verification
    const resOrg = await httpFetch(`${srv2.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    g2Requests++;
    const orgBody = (resOrg.body as { data: Record<string, unknown> }).data;
    assert(orgBody.role === 'Organizer', 'Organizer returns role Organizer');
    assert(typeof orgBody.tournaments === 'object', 'Organizer body contains tournaments status count');
    assert(typeof orgBody.pendingRegistrations === 'number', 'Organizer body contains pendingRegistrations count');
    assert(Array.isArray(orgBody.nextMatches), 'Organizer body contains nextMatches array');
    assert(orgBody.userCounts === undefined, 'Organizer does not leak userCounts');
  } finally {
    srv2.server.close();
  }

  assert(g2Requests < 90, `Group 2 request count (${g2Requests}) strictly < 90`);

  // =========================================================================
  // GROUP 3: HAND-COMPUTED ACCURACY & CROSS-TENANT ISOLATION
  // =========================================================================
  console.log('\n--- GROUP 3: HAND-COMPUTED METRICS & CROSS-TENANT ISOLATION ---');
  let g3Requests = 0;
  const srv3 = await startTestServer();

  try {
    // Create dedicated Sport, Team, Coach, Athlete, Sessions, Assessments
    const sport = await Sport.create({
      name: `Dashboard Soccer ${Date.now()}`,
      slug: `dash-soccer-${Date.now()}`,
      description: 'Dashboard Sport description',
      category: 'Team',
      gender: 'Mixed',
      ageGroups: ['U16'],
      status: 'Active',
    });
    createdSportIds.push(sport._id);

    const coachA = await Coach.create({
      user: coachAUser._id,
      bio: 'Coach A Profile',
      specialties: ['Tactics'],
      experienceYears: 5,
      isPublic: true,
    });
    createdCoachIds.push(coachA._id);

    const teamA = await Team.create({
      name: `Team Alpha ${Date.now()}`,
      slug: `team-alpha-${Date.now()}`,
      sport: sport._id,
      ageGroup: 'U16',
      coach: coachA._id,
      status: 'Active',
    });
    createdTeamIds.push(teamA._id);

    const athleteA = await Athlete.create({
      user: athleteAUser._id,
      team: teamA._id,
      sport: sport._id,
      dateOfBirth: new Date('2010-05-15'),
      gender: 'Male',
      status: 'Active',
    });
    createdAthleteIds.push(athleteA._id);

    // 1 Upcoming session for Team A
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session1 = await TrainingSession.create({
      team: teamA._id,
      sport: sport._id,
      coach: coachA._id,
      title: 'Alpha Tactical Drill',
      type: 'Training',
      venue: 'Pitch 1 North',
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 90 * 60 * 1000),
      status: 'Scheduled',
    });
    createdSessionIds.push(session1._id);

    // 1 Past session with Attendance (Present)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sessionPast = await TrainingSession.create({
      team: teamA._id,
      sport: sport._id,
      coach: coachA._id,
      title: 'Alpha Past Drill',
      type: 'Training',
      venue: 'Pitch 1 North',
      startsAt: yesterday,
      endsAt: new Date(yesterday.getTime() + 90 * 60 * 1000),
      status: 'Completed',
    });
    createdSessionIds.push(sessionPast._id);

    const att1 = await Attendance.create({
      session: sessionPast._id,
      athlete: athleteA._id,
      status: 'Present',
      markedBy: coachAUser._id,
    });
    createdAttendanceIds.push(att1._id);

    // 1 Skill assessment for Athlete A
    const assess1 = await SkillAssessment.create({
      athlete: athleteA._id,
      assessedBy: coachAUser._id,
      date: new Date(),
      pace: 8,
      shooting: 8,
      passing: 8,
      dribbling: 8,
      defending: 8,
      stamina: 8,
      agility: 8,
      decisionMaking: 8,
      leadership: 8,
      workRate: 8,
      categories: { technical: 8, physical: 8, tactical: 8, mental: 8 },
      overall: 8,
    });
    createdAssessmentIds.push(assess1._id);

    // 1 Active Goal for Athlete A
    const goal1 = await AthleteGoal.create({
      athlete: athleteA._id,
      title: 'Score 5 Free Kicks',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Active',
      progress: 40,
      createdBy: coachAUser._id,
    });
    createdGoalIds.push(goal1._id);

    // 1 Unacknowledged Feedback for Athlete A
    const fb1 = await CoachFeedback.create({
      athlete: athleteA._id,
      coach: coachA._id,
      type: 'General',
      text: 'Superb passing accuracy',
      acknowledgedAt: null,
    });
    createdFeedbackIds.push(fb1._id);

    // 1 Tournament for Organizer
    const tourney = await Tournament.create({
      name: `Alpha Cup ${Date.now()}`,
      sport: sport._id,
      category: 'Youth',
      ageGroup: 'U16',
      format: 'Knockout',
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      organizer: organizerUser._id,
      status: 'Registration Open',
    });
    createdTournamentIds.push(tourney._id);

    // 1 Pending registration for Team A
    const reg1 = await TournamentTeam.create({
      tournament: tourney._id,
      team: teamA._id,
      registeredBy: coachAUser._id,
      status: 'Pending',
    });
    createdTournamentTeamIds.push(reg1._id);

    // Verify Coach A Overview
    const resCoachA = await httpFetch(`${srv3.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    g3Requests++;
    const coachABody = (resCoachA.body as { data: CoachOverviewResponse }).data;
    assert(coachABody.teams.length === 1, 'Coach A sees exactly 1 team');
    assert(coachABody.teams[0].id === teamA._id.toString(), 'Coach A team ID matches Team Alpha');
    assert(coachABody.teams[0].athleteCount === 1, 'Team Alpha has exactly 1 athlete');
    assert(coachABody.nextSessions.length === 1, 'Coach A sees 1 upcoming session');
    assert(coachABody.nextSessions[0].venue === 'Pitch 1 North', 'Upcoming session venue is correct');
    assert(coachABody.attendanceRate === 100, 'Coach A team attendance rate is 100%');

    // Verify Coach B Tenant Isolation (Coach B should see 0 teams)
    const resCoachB = await httpFetch(`${srv3.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${coachBToken}` },
    });
    g3Requests++;
    const coachBBody = (resCoachB.body as { data: CoachOverviewResponse }).data;
    assert(coachBBody.teams.length === 0, 'Coach B sees 0 teams (Tenant isolation verified)');

    // Verify Athlete A Overview
    const resAthleteA = await httpFetch(`${srv3.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${athleteAToken}` },
    });
    g3Requests++;
    const athleteABody = (resAthleteA.body as { data: AthleteOverviewResponse }).data;
    assert(athleteABody.teamName === teamA.name, 'Athlete A teamName matches Team Alpha');
    assert(athleteABody.attendanceRate === 100, 'Athlete A attendance rate is 100%');
    assert(athleteABody.latestAssessmentOverallScore === 8, 'Athlete A latest assessment score is 8');
    assert(athleteABody.activeGoalsCount === 1, 'Athlete A active goals count is 1');
    assert(athleteABody.unacknowledgedFeedbackCount === 1, 'Athlete A unacknowledged feedback count is 1');

    // Verify Athlete B Tenant Isolation
    const resAthleteB = await httpFetch(`${srv3.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${athleteBToken}` },
    });
    g3Requests++;
    const athleteBBody = (resAthleteB.body as { data: AthleteOverviewResponse }).data;
    assert(athleteBBody.activeGoalsCount === 0, 'Athlete B sees 0 active goals (Tenant isolation verified)');
    assert(athleteBBody.unacknowledgedFeedbackCount === 0, 'Athlete B sees 0 unacknowledged feedback');

    // Verify Organizer Overview
    const resOrg = await httpFetch(`${srv3.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    g3Requests++;
    const orgBody = (resOrg.body as { data: OrganizerOverviewResponse }).data;
    assert(orgBody.tournaments['Registration Open'] >= 1, 'Organizer sees at least 1 Registration Open tournament');
    assert(orgBody.pendingRegistrations >= 1, 'Organizer sees at least 1 pending registration');
  } finally {
    srv3.server.close();
  }

  assert(g3Requests < 90, `Group 3 request count (${g3Requests}) strictly < 90`);

  // =========================================================================
  // GROUP 4: CONTACT INQUIRIES ENGINE & RATE LIMITER (429)
  // =========================================================================
  console.log('\n--- GROUP 4: CONTACT INQUIRIES ENGINE & RATE LIMITING ---');
  resetContactLimiter();
  let g4Requests = 0;
  const srv4 = await startTestServer();

  try {
    // 1. Valid submission returns 201 with clean response and NO stored fields
    const validContactRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        subject: 'Trial Session Query',
        message: 'Hello ATHLETIQ team, when is the next U16 tryout?',
      }),
    });
    g4Requests++;
    assert(validContactRes.status === 201, 'Valid contact inquiry returns 201 Created');
    const validBody = validContactRes.body as Record<string, unknown>;
    assert(validBody.success === true, 'Public response has success: true');
    assert(typeof validBody.message === 'string', 'Public response has message acknowledgment');
    assert(validBody.id === undefined, 'Public response does not leak id');
    assert(validBody._id === undefined, 'Public response does not leak _id');
    assert(validBody.name === undefined, 'Public response does not echo name');
    assert(validBody.email === undefined, 'Public response does not echo email');

    // Find and track created contact message
    const createdMsg = await ContactMessage.findOne({ email: 'jane.doe@example.com' });
    if (createdMsg) createdContactIds.push(createdMsg._id);

    // 2. Invalid email returns 400
    const invEmailRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'not-an-email',
        message: 'Invalid email test',
      }),
    });
    g4Requests++;
    assert(invEmailRes.status === 400, 'Invalid email returns 400 Bad Request');

    // 3. Unknown key in body returns 400 (.strict())
    const unknownKeyRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane2@example.com',
        message: 'Unknown key test',
        role: 'Admin', // forbidden unknown key
      }),
    });
    g4Requests++;
    assert(unknownKeyRes.status === 400, 'Unknown body key rejected with 400 Bad Request');

    // 4. NoSQL operator in body returns 400
    const nosqlRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: { $gt: '' },
        email: 'jane3@example.com',
        message: 'NoSQL injection test',
      }),
    });
    g4Requests++;
    assert(nosqlRes.status === 400, 'NoSQL operator in contact body rejected with 400');

    // 5. Message > 2000 chars returns 400
    const longMsgRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane4@example.com',
        message: 'a'.repeat(2001),
      }),
    });
    g4Requests++;
    assert(longMsgRes.status === 400, 'Message exceeding 2000 chars rejected with 400');

    // 6. Admin can list contact messages with pagination
    const adminListRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    assert(adminListRes.status === 200, 'Admin can list contact messages with 200 OK');
    const adminListBody = adminListRes.body as { data: unknown[]; pagination: { total: number } };
    assert(Array.isArray(adminListBody.data), 'Contact list returns data array');
    assert(typeof adminListBody.pagination.total === 'number', 'Contact list returns pagination total');

    // 7. Admin updates message status (New -> Read -> Archived) with AuditLog
    if (createdMsg) {
      const patchRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${createdMsg._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'Read' }),
      });
      g4Requests++;
      assert(patchRes.status === 200, 'Admin PATCH /contact-messages/:id returns 200 OK');
      const patchedBody = (patchRes.body as { data: { status: string } }).data;
      assert(patchedBody.status === 'Read', 'Contact message status successfully updated to Read');

      const auditLog = await AuditLog.findOne({
        targetId: createdMsg._id,
        action: 'CONTACT_MESSAGE_STATUS_CHANGED',
      });
      assert(auditLog !== null, 'AuditLog entry created for contact status change');
      if (auditLog) {
        createdAuditLogIds.push(auditLog._id);
        assert(auditLog.meta?.status === 'Read', 'AuditLog meta contains enum status Read');
      }
    }

    // --- DELETE /api/contact-messages/:id TESTS ---
    // Create an unread (New) contact message and a read contact message to test deletion and unread count delta
    const unreadMsg = await ContactMessage.create({
      name: 'Unread User',
      email: 'unread-test@example.com',
      message: 'Unread inquiry for delete test',
      status: 'New',
    });
    createdContactIds.push(unreadMsg._id);

    const readMsg = await ContactMessage.create({
      name: 'Read User',
      email: 'read-test@example.com',
      message: 'Read inquiry for delete test',
      status: 'Read',
    });
    createdContactIds.push(readMsg._id);

    // Initial overview unreadInquiries
    const preDelOverviewRes = await httpFetch(`${srv4.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    const preUnread = (preDelOverviewRes.body as { data: { unreadContactMessages: number } }).data.unreadContactMessages;

    // 1. Forbidden roles & unauthenticated delete tests
    const delCoachRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    g4Requests++;
    assert(delCoachRes.status === 403, 'Coach DELETE /contact-messages/:id returns 403');

    const delAthRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${athleteAToken}` },
    });
    g4Requests++;
    assert(delAthRes.status === 403, 'Athlete DELETE /contact-messages/:id returns 403');

    const delOrgRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    g4Requests++;
    assert(delOrgRes.status === 403, 'Organizer DELETE /contact-messages/:id returns 403');

    const delUnauthRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
    });
    g4Requests++;
    assert(delUnauthRes.status === 401, 'Unauthenticated DELETE /contact-messages/:id returns 401');

    // 2. Malformed ID returns 400
    const delMalformedRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/invalid-object-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    assert(delMalformedRes.status === 400, 'Malformed contact message id returns 400');

    // 3. Admin deletes UNREAD message -> 200
    const delAdminUnreadRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    assert(delAdminUnreadRes.status === 200, 'Admin DELETE unread contact message returns 200');

    // Message is gone from list and GET/DB
    const checkDeletedFromDb = await ContactMessage.findById(unreadMsg._id);
    assert(checkDeletedFromDb === null, 'Deleted contact message is completely removed from DB');

    // Second delete returns 404
    const delSecondRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${unreadMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    assert(delSecondRes.status === 404, 'Second delete on same message returns 404');

    // Overview unreadContactMessages drops by exactly 1
    const postUnreadDelOverviewRes = await httpFetch(`${srv4.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    const postUnreadCount = (postUnreadDelOverviewRes.body as { data: { unreadContactMessages: number } }).data.unreadContactMessages;
    assert(
      postUnreadCount === preUnread - 1,
      `Unread inquiries in Admin overview drops by exactly 1 (${postUnreadCount} === ${preUnread - 1})`
    );

    // 4. Admin deletes READ message -> 200, overview unreadContactMessages does NOT change
    const delAdminReadRes = await httpFetch(`${srv4.baseUrl}/api/contact-messages/${readMsg._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    assert(delAdminReadRes.status === 200, 'Admin DELETE read contact message returns 200');

    const postReadDelOverviewRes = await httpFetch(`${srv4.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g4Requests++;
    const postReadCount = (postReadDelOverviewRes.body as { data: { unreadContactMessages: number } }).data.unreadContactMessages;
    assert(
      postReadCount === postUnreadCount,
      `Unread inquiries does not change when deleting a Read message (${postReadCount} === ${postUnreadCount})`
    );

    // AuditLog entry exists without personal data
    const delAudit = await AuditLog.findOne({
      targetId: unreadMsg._id,
      action: 'CONTACT_MESSAGE_DELETED',
    });
    assert(delAudit !== null, 'AuditLog entry created for CONTACT_MESSAGE_DELETED');
    if (delAudit) {
      createdAuditLogIds.push(delAudit._id);
      const auditKeys = Object.keys(delAudit.meta || {});
      assert(!auditKeys.includes('name') && !auditKeys.includes('email') && !auditKeys.includes('message'), 'AuditLog meta contains no personal data (no name, email, message)');
    }

    const delAuditRead = await AuditLog.findOne({
      targetId: readMsg._id,
      action: 'CONTACT_MESSAGE_DELETED',
    });
    if (delAuditRead) {
      createdAuditLogIds.push(delAuditRead._id);
    }

    // 8. Rate Limiter Trigger (5 per hour per IP; 6th request triggers 429)
    // Note: We already made 1 successful submission (jane.doe). We now make 4 more to reach 5, then the 6th must return 429.
    for (let i = 1; i <= 4; i++) {
      const _r = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Burst ${i}`,
          email: `burst${i}@example.com`,
          message: `Burst test inquiry ${i}`,
        }),
      });
      g4Requests++;
      const bMsg = await ContactMessage.findOne({ email: `burst${i}@example.com` });
      if (bMsg) createdContactIds.push(bMsg._id);
    }

    const rateLimitedRes = await httpFetch(`${srv4.baseUrl}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Blocked User',
        email: 'blocked@example.com',
        message: 'This 6th inquiry should be rate limited',
      }),
    });
    g4Requests++;
    assert(rateLimitedRes.status === 429, '6th contact submission from same IP triggers 429 Too Many Requests');
  } finally {
    srv4.server.close();
  }

  assert(g4Requests < 90, `Group 4 request count (${g4Requests}) strictly < 90`);

  // =========================================================================
  // GROUP 5: PUBLIC OVERVIEW & DEEP SENSITIVITY SCAN
  // =========================================================================
  console.log('\n--- GROUP 5: PUBLIC OVERVIEW & DEEP PRIVACY SCAN ---');
  let g5Requests = 0;
  const srv5 = await startTestServer();

  try {
    // 1. GET /api/public/overview
    const resPublic = await httpFetch(`${srv5.baseUrl}/api/public/overview`);
    g5Requests++;
    assert(resPublic.status === 200, 'GET /public/overview returns 200 OK');
    const pubData = (resPublic.body as { data: PublicOverviewResponse }).data;
    assert(typeof pubData.activeAthletes === 'number', 'Public overview contains activeAthletes');
    assert(typeof pubData.activeCoaches === 'number', 'Public overview contains activeCoaches');
    assert(typeof pubData.activeTeams === 'number', 'Public overview contains activeTeams');
    assert(typeof pubData.sportsCount === 'number', 'Public overview contains sportsCount');
    assert(Array.isArray(pubData.nextTournaments), 'Public overview contains nextTournaments array');
    assert(Array.isArray(pubData.latestAnnouncements), 'Public overview contains latestAnnouncements array');

    // 2. Deep Privacy Scan on ALL responses
    const forbiddenKeys = [
      'passwordHash',
      'email',
      'phone',
      'medicalNotes',
      'guardian',
    ];

    // Scan public overview
    const publicFound = deepFindKeys(pubData, forbiddenKeys);
    assert(publicFound.length === 0, `DEEP SCAN: No sensitive fields leaked in public overview (found: ${publicFound.join(', ')})`);

    // Scan dashboard overviews
    const resAdmin = await httpFetch(`${srv5.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g5Requests++;
    const adminFound = deepFindKeys(resAdmin.body, forbiddenKeys);
    assert(adminFound.length === 0, `DEEP SCAN: No sensitive fields leaked in Admin dashboard (found: ${adminFound.join(', ')})`);

    const resCoach = await httpFetch(`${srv5.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${coachAToken}` },
    });
    g5Requests++;
    const coachFound = deepFindKeys(resCoach.body, forbiddenKeys);
    assert(coachFound.length === 0, `DEEP SCAN: No sensitive fields leaked in Coach dashboard (found: ${coachFound.join(', ')})`);

    const resAthlete = await httpFetch(`${srv5.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${athleteAToken}` },
    });
    g5Requests++;
    const athleteFound = deepFindKeys(resAthlete.body, forbiddenKeys);
    assert(athleteFound.length === 0, `DEEP SCAN: No sensitive fields leaked in Athlete dashboard (found: ${athleteFound.join(', ')})`);

    const resOrg = await httpFetch(`${srv5.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    g5Requests++;
    const orgFound = deepFindKeys(resOrg.body, forbiddenKeys);
    assert(orgFound.length === 0, `DEEP SCAN: No sensitive fields leaked in Organizer dashboard (found: ${orgFound.join(', ')})`);
  } finally {
    srv5.server.close();
  }

  assert(g5Requests < 90, `Group 5 request count (${g5Requests}) strictly < 90`);

  // =========================================================================
  // GROUP 6: EXACT COUNT DELTAS & ACTIVE TEAM/COACH LOGIC VERIFICATION
  // =========================================================================
  console.log('\n--- GROUP 6: EXACT COUNT DELTAS & ACTIVE TEAM/COACH VERIFICATION ---');
  let g6Requests = 0;
  const srv6 = await startTestServer();

  try {
    // 1. Fetch baselines via HTTP before creating test delta records
    const resBaseAdmin = await httpFetch(`${srv6.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g6Requests++;
    assert(resBaseAdmin.status === 200, 'Baseline Admin overview returns 200 OK');
    const baseAdminData = resBaseAdmin.body as {
      data: { teams: number; coaches: number; activeAthletes: number };
    };

    const resBasePub = await httpFetch(`${srv6.baseUrl}/api/public/overview`);
    g6Requests++;
    assert(resBasePub.status === 200, 'Baseline Public overview returns 200 OK');
    const basePubData = resBasePub.body as {
      data: { activeTeams: number; activeCoaches: number; activeAthletes: number; sportsCount: number };
    };

    // 2. Create sport for teams and athletes
    const ts = Date.now();
    const testSport = await Sport.create({
      name: `Delta Sport ${ts}`,
      slug: `delta-sport-${ts}`,
      description: 'Sport for count delta testing',
      status: 'Active',
    });
    createdSportIds.push(testSport._id);

    // 3. Create 3 active teams and 1 inactive team
    for (let i = 1; i <= 3; i++) {
      const activeTeam = await Team.create({
        name: `Active Team ${i} ${ts}`,
        slug: `active-team-${i}-${ts}`,
        sport: testSport._id,
        ageGroup: 'U18',
        status: 'Active',
      });
      createdTeamIds.push(activeTeam._id);
    }
    const inactiveTeam = await Team.create({
      name: `Inactive Team ${ts}`,
      slug: `inactive-team-${ts}`,
      sport: testSport._id,
      ageGroup: 'U18',
      status: 'Inactive',
    });
    createdTeamIds.push(inactiveTeam._id);

    // 4. Create 2 coaches with active users and 1 coach with an inactive user
    const coachUserActive1 = await User.create({
      name: `Active Coach 1 ${ts}`,
      email: `active-coach-1-${ts}@athletiq.test`,
      passwordHash: pwHash,
      role: 'Coach',
      isActive: true,
    });
    createdUserIds.push(coachUserActive1._id);
    const coachProfileActive1 = await Coach.create({
      user: coachUserActive1._id,
      experienceYears: 4,
    });
    createdCoachIds.push(coachProfileActive1._id);

    const coachUserActive2 = await User.create({
      name: `Active Coach 2 ${ts}`,
      email: `active-coach-2-${ts}@athletiq.test`,
      passwordHash: pwHash,
      role: 'Coach',
      isActive: true,
    });
    createdUserIds.push(coachUserActive2._id);
    const coachProfileActive2 = await Coach.create({
      user: coachUserActive2._id,
      experienceYears: 6,
    });
    createdCoachIds.push(coachProfileActive2._id);

    const coachUserInactive = await User.create({
      name: `Inactive Coach ${ts}`,
      email: `inactive-coach-${ts}@athletiq.test`,
      passwordHash: pwHash,
      role: 'Coach',
      isActive: false,
    });
    createdUserIds.push(coachUserInactive._id);
    const coachProfileInactive = await Coach.create({
      user: coachUserInactive._id,
      experienceYears: 2,
    });
    createdCoachIds.push(coachProfileInactive._id);

    // 5. Create 2 active athletes and 1 inactive athlete
    for (let i = 1; i <= 2; i++) {
      const activeAth = await Athlete.create({
        sport: testSport._id,
        status: 'Active',
        medicalClearance: true,
      });
      createdAthleteIds.push(activeAth._id);
    }
    const inactiveAth = await Athlete.create({
      sport: testSport._id,
      status: 'Inactive',
      medicalClearance: false,
    });
    createdAthleteIds.push(inactiveAth._id);

    // 6. Test Admin overview exact deltas
    const resDeltaAdmin = await httpFetch(`${srv6.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g6Requests++;
    const deltaAdminData = resDeltaAdmin.body as {
      data: { teams: number; coaches: number; activeAthletes: number };
    };
    assert(
      deltaAdminData.data.teams === baseAdminData.data.teams + 3,
      `Admin active teams count exactly +3 delta (${deltaAdminData.data.teams} === ${baseAdminData.data.teams + 3})`
    );
    assert(
      deltaAdminData.data.coaches === baseAdminData.data.coaches + 2,
      `Admin active coaches count exactly +2 delta (${deltaAdminData.data.coaches} === ${baseAdminData.data.coaches + 2})`
    );
    assert(
      deltaAdminData.data.activeAthletes === baseAdminData.data.activeAthletes + 2,
      `Admin active athletes count exactly +2 delta (${deltaAdminData.data.activeAthletes} === ${baseAdminData.data.activeAthletes + 2})`
    );

    // 7. Test Public overview exact deltas
    const resDeltaPub = await httpFetch(`${srv6.baseUrl}/api/public/overview`);
    g6Requests++;
    const deltaPubData = resDeltaPub.body as {
      data: { activeTeams: number; activeCoaches: number; activeAthletes: number; sportsCount: number };
    };
    assert(
      deltaPubData.data.activeTeams === basePubData.data.activeTeams + 3,
      `Public activeTeams count exactly +3 delta (${deltaPubData.data.activeTeams} === ${basePubData.data.activeTeams + 3})`
    );
    assert(
      deltaPubData.data.activeCoaches === basePubData.data.activeCoaches + 2,
      `Public activeCoaches count exactly +2 delta (${deltaPubData.data.activeCoaches} === ${basePubData.data.activeCoaches + 2})`
    );
    assert(
      deltaPubData.data.activeAthletes === basePubData.data.activeAthletes + 2,
      `Public activeAthletes count exactly +2 delta (${deltaPubData.data.activeAthletes} === ${basePubData.data.activeAthletes + 2})`
    );
    assert(
      deltaPubData.data.sportsCount === basePubData.data.sportsCount + 1,
      `Public sportsCount count exactly +1 delta (${deltaPubData.data.sportsCount} === ${basePubData.data.sportsCount + 1})`
    );

    // 8. Deactivate coachUserActive1 and verify both overviews decrease coach count by 1
    await User.findByIdAndUpdate(coachUserActive1._id, { isActive: false });

    const resDeactAdmin = await httpFetch(`${srv6.baseUrl}/api/dashboard/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    g6Requests++;
    const deactAdminData = resDeactAdmin.body as { data: { coaches: number } };
    assert(
      deactAdminData.data.coaches === baseAdminData.data.coaches + 1,
      `Deactivating coach's user lowers Admin active coaches count by 1 (${deactAdminData.data.coaches} === ${baseAdminData.data.coaches + 1})`
    );

    const resDeactPub = await httpFetch(`${srv6.baseUrl}/api/public/overview`);
    g6Requests++;
    const deactPubData = resDeactPub.body as { data: { activeCoaches: number } };
    assert(
      deactPubData.data.activeCoaches === basePubData.data.activeCoaches + 1,
      `Deactivating coach's user lowers Public activeCoaches count by 1 (${deactPubData.data.activeCoaches} === ${basePubData.data.activeCoaches + 1})`
    );
  } finally {
    srv6.server.close();
  }

  assert(g6Requests < 90, `Group 6 request count (${g6Requests}) strictly < 90`);

  // =========================================================================
  // CLEANUP TEST RESOURCES
  // =========================================================================
  console.log('\n--- CLEANING UP CREATED TEST RESOURCES ---');

  if (createdContactIds.length > 0) {
    await ContactMessage.deleteMany({ _id: { $in: createdContactIds } });
  }
  if (createdMatchIds.length > 0) {
    await Match.deleteMany({ _id: { $in: createdMatchIds } });
  }
  if (createdOfficialIds.length > 0) {
    await Official.deleteMany({ _id: { $in: createdOfficialIds } });
  }
  if (createdVenueIds.length > 0) {
    await Venue.deleteMany({ _id: { $in: createdVenueIds } });
  }
  if (createdTournamentTeamIds.length > 0) {
    await TournamentTeam.deleteMany({ _id: { $in: createdTournamentTeamIds } });
  }
  if (createdTournamentIds.length > 0) {
    await Tournament.deleteMany({ _id: { $in: createdTournamentIds } });
  }
  if (createdGoalIds.length > 0) {
    await AthleteGoal.deleteMany({ _id: { $in: createdGoalIds } });
  }
  if (createdFeedbackIds.length > 0) {
    await CoachFeedback.deleteMany({ _id: { $in: createdFeedbackIds } });
  }
  if (createdAssessmentIds.length > 0) {
    await SkillAssessment.deleteMany({ _id: { $in: createdAssessmentIds } });
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
  if (createdAnnouncementIds.length > 0) {
    await Announcement.deleteMany({ _id: { $in: createdAnnouncementIds } });
  }
  if (createdAuditLogIds.length > 0) {
    await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
  }
  if (createdUserIds.length > 0) {
    await Notification.deleteMany({ user: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }

  const finalCounts = await getCollectionCounts();
  console.log('Final Database Counts:');
  console.log(JSON.stringify(finalCounts, null, 2));

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
  assert(finalCounts.contactMessages === initialCounts.contactMessages, `ContactMessages count restored (${finalCounts.contactMessages} === ${initialCounts.contactMessages})`);
  assert(failedAuthHttpCount <= 8, `Failed /api/auth requests <= 8 (${failedAuthHttpCount} <= 8)`);

  await mongoose.disconnect();

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`Total HTTP Requests Executed: ${totalHttpRequests}`);
  console.log(`Per-group counts breakdown: Group 1=${g1Requests}, Group 2=${g2Requests}, Group 3=${g3Requests}, Group 4=${g4Requests}, Group 5=${g5Requests}, Group 6=${g6Requests} (Sum: ${totalHttpRequests})`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
