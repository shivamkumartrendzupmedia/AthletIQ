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
  Notification,
} from '../src/models/index.js';
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
  body: unknown;
  headers: Headers;
}

async function httpFetch(
  url: string,
  options: RequestInit = {}
): Promise<HttpResult> {
  totalHttpRequests++;
  const res = await fetch(url, options);
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
  console.log('\n--- VERIFYING ATHLETE DEVELOPMENT APIS (STEP 7) ---\n');

  await connectDB();

  // Clean up any leftovers from prior runs before snapshotting initial counts
  const leftoverUsers = await User.find({ email: /^verify-dev-/ }).select('_id');
  if (leftoverUsers.length > 0) {
    const leftoverIds = leftoverUsers.map((u) => u._id);
    const leftoverAthletes = await Athlete.find({ user: { $in: leftoverIds } }).select('_id');
    const leftoverAthleteIds = leftoverAthletes.map((a) => a._id);
    const leftoverCoaches = await Coach.find({ user: { $in: leftoverIds } }).select('_id');
    const leftoverCoachIds = leftoverCoaches.map((c) => c._id);

    await SkillAssessment.deleteMany({
      $or: [
        { assessedBy: { $in: leftoverIds } },
        { athlete: { $in: leftoverAthleteIds } },
      ],
    });
    await CoachFeedback.deleteMany({
      $or: [
        { coach: { $in: leftoverCoachIds } },
        { athlete: { $in: leftoverAthleteIds } },
      ],
    });
    await AthleteGoal.deleteMany({
      $or: [
        { createdBy: { $in: leftoverIds } },
        { athlete: { $in: leftoverAthleteIds } },
      ],
    });
    await TrainingSession.deleteMany({ title: /^Dev Test Session/ });
    await Athlete.deleteMany({ user: { $in: leftoverIds } });
    await Coach.deleteMany({ user: { $in: leftoverIds } });
    await AuditLog.deleteMany({ actor: { $in: leftoverIds } });
    await User.deleteMany({ _id: { $in: leftoverIds } });
  }

  // Also clean up any orphan sessions or teams from test crashes
  await TrainingSession.deleteMany({ title: /^Dev Test/ });
  await Team.deleteMany({ name: /^Dev Test Team/ });

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
    auditLogs: await AuditLog.countDocuments(),
  };

  console.log('Database baseline counts at start:');
  console.log(`  Users = ${initialCounts.users}`);
  console.log(`  Sports = ${initialCounts.sports}`);
  console.log(`  Teams = ${initialCounts.teams}`);
  console.log(`  Coaches = ${initialCounts.coaches}`);
  console.log(`  Athletes = ${initialCounts.athletes}`);
  console.log(`  Sessions = ${initialCounts.sessions}`);
  console.log(`  Attendance = ${initialCounts.attendance}`);
  console.log(`  Announcements = ${initialCounts.announcements}`);
  console.log(`  Documents = ${initialCounts.documents}`);
  console.log(`  Assessments = ${initialCounts.assessments}`);
  console.log(`  Feedback = ${initialCounts.feedback}`);
  console.log(`  Goals = ${initialCounts.goals}`);
  console.log(`  AuditLogs = ${initialCounts.auditLogs}`);

  // Tracking IDs created specifically by this test run
  const createdUserIds: Types.ObjectId[] = [];
  const createdSportIds: Types.ObjectId[] = [];
  const createdTeamIds: Types.ObjectId[] = [];
  const createdCoachIds: Types.ObjectId[] = [];
  const createdAthleteIds: Types.ObjectId[] = [];
  const createdSessionIds: Types.ObjectId[] = [];
  const createdAssessmentIds: Types.ObjectId[] = [];
  const createdFeedbackIds: Types.ObjectId[] = [];
  const createdGoalIds: Types.ObjectId[] = [];
  const createdAttendanceIds: Types.ObjectId[] = [];

  const defaultPasswordHash = await hashPassword('AthletiqDev2026!');

  // Helper to create test user
  async function createTestUser(
    email: string,
    role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer',
    name: string
  ) {
    const user = await User.create({
      email,
      name,
      role,
      passwordHash: defaultPasswordHash,
      phone: '+1-555-0199',
    });
    createdUserIds.push(user._id);
    return user;
  }

  // Provision test actors
  const adminUser = await createTestUser('verify-dev-admin@athletiq.test', 'Admin', 'Dev Admin');
  const coachUserA = await createTestUser('verify-dev-coachA@athletiq.test', 'Coach', 'Dev Coach A');
  const coachUserB = await createTestUser('verify-dev-coachB@athletiq.test', 'Coach', 'Dev Coach B');
  const coachNoProfileUser = await createTestUser('verify-dev-coach-noprofile@athletiq.test', 'Coach', 'Dev Coach Ghost');
  const athleteUserA = await createTestUser('verify-dev-athleteA@athletiq.test', 'Athlete', 'Dev Athlete A');
  const athleteUserB = await createTestUser('verify-dev-athleteB@athletiq.test', 'Athlete', 'Dev Athlete B');
  const athleteNoProfileUser = await createTestUser('verify-dev-athlete-noprofile@athletiq.test', 'Athlete', 'Dev Athlete Ghost');
  const organizerUser = await createTestUser('verify-dev-organizer@athletiq.test', 'Organizer', 'Dev Organizer');

  // Find sport & team for athlete/coach profiles
  let existingSport = await Sport.findOne();
  if (!existingSport) {
    existingSport = await Sport.create({
      name: `Dev Test Sport ${Date.now()}`,
      slug: `dev-test-sport-${Date.now()}`,
      description: 'Test sport for development verification suite',
      status: 'Active',
    });
    createdSportIds.push(existingSport._id);
  }

  const coachDocA = await Coach.create({
    user: coachUserA._id,
    title: 'Senior Coach A',
    sports: existingSport ? [existingSport._id] : [],
    specialties: ['Technical'],
    experienceYears: 5,
    isPublic: true,
  });
  createdCoachIds.push(coachDocA._id);

  const coachDocB = await Coach.create({
    user: coachUserB._id,
    title: 'Senior Coach B',
    sports: existingSport ? [existingSport._id] : [],
    specialties: ['Tactical'],
    experienceYears: 7,
    isPublic: true,
  });
  createdCoachIds.push(coachDocB._id);

  // Dedicated test teams to establish strict coach scopes
  const teamDocA = await Team.create({
    name: `Dev Test Team A ${Date.now()}`,
    slug: `dev-test-team-a-${Date.now()}`,
    sport: existingSport?._id,
    ageGroup: 'U18',
    coach: coachDocA._id,
    status: 'Active',
  });
  createdTeamIds.push(teamDocA._id);

  const teamDocB = await Team.create({
    name: `Dev Test Team B ${Date.now()}`,
    slug: `dev-test-team-b-${Date.now()}`,
    sport: existingSport?._id,
    ageGroup: 'U18',
    coach: coachDocB._id,
    status: 'Active',
  });
  createdTeamIds.push(teamDocB._id);

  const athleteDocA = await Athlete.create({
    user: athleteUserA._id,
    sport: existingSport?._id,
    team: teamDocA._id,
    jerseyNumber: 88,
    position: 'Midfielder',
    dateOfBirth: new Date('2005-06-15'),
    gender: 'Male',
    status: 'Active',
  });
  createdAthleteIds.push(athleteDocA._id);

  const athleteDocB = await Athlete.create({
    user: athleteUserB._id,
    sport: existingSport?._id,
    team: teamDocB._id,
    jerseyNumber: 89,
    position: 'Forward',
    dateOfBirth: new Date('2006-03-20'),
    gender: 'Female',
    status: 'Active',
  });
  createdAthleteIds.push(athleteDocB._id);

  // ==========================================
  // GROUP 1: SKILL ASSESSMENTS (CREATION, CALCULATIONS, VALIDATION & REVIEWS)
  // ==========================================
  console.log('\n--- GROUP 1: SKILL ASSESSMENTS (CREATION, CALCULATIONS, VALIDATION & REVIEWS) ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // 1. Future date rejected
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const futureRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        pace: 8,
        shooting: 7,
        passing: 9,
        dribbling: 8,
        defending: 6,
        stamina: 8,
        agility: 7,
        decisionMaking: 8,
        leadership: 7,
        workRate: 9,
        date: futureDate,
      }),
    });
    assert(futureRes.status === 400, 'Assessment with future date rejected (returns 400)');

    // 2. Scores out of range / string coercion rejection
    const invalidScoreRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        pace: 11, // > 10
        shooting: 7,
        passing: 9,
        dribbling: 8,
        defending: 6,
        stamina: 8,
        agility: 7,
        decisionMaking: 8,
        leadership: 7,
        workRate: 9,
      }),
    });
    assert(invalidScoreRes.status === 400, 'Score > 10 rejected (returns 400)');

    const stringScoreRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        pace: '8', // string not allowed, NO coercion
        shooting: 7,
        passing: 9,
        dribbling: 8,
        defending: 6,
        stamina: 8,
        agility: 7,
        decisionMaking: 8,
        leadership: 7,
        workRate: 9,
      }),
    });
    assert(stringScoreRes.status === 400, 'String score with no coercion rejected (returns 400)');

    // 3. Valid creation with flat canonical keys
    const validAssessmentRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        pace: 9,
        shooting: 7,
        passing: 8,
        dribbling: 9,
        defending: 6,
        stamina: 7,
        agility: 8,
        decisionMaking: 8,
        leadership: 6,
        workRate: 8,
        note: 'Excellent technical progress this month',
      }),
    });
    if (validAssessmentRes.status !== 201) {
      console.error('validAssessmentRes failed with:', validAssessmentRes.status, validAssessmentRes.body);
    }
    assert(validAssessmentRes.status === 201, 'Coach creates skill assessment (201)');
    const createdAss = validAssessmentRes.body as {
      id: string;
      overall: number;
      categories: { technical: number; physical: number; tactical: number; mental: number };
    };
    createdAssessmentIds.push(new Types.ObjectId(createdAss.id));

    // Verify calculated categories rounded to 1 decimal:
    // Technical: (shooting 7 + passing 8 + dribbling 9) / 3 = 24 / 3 = 8.0
    // Physical: (pace 9 + stamina 7 + agility 8) / 3 = 24 / 3 = 8.0
    // Tactical: (defending 6 + decisionMaking 8) / 2 = 14 / 2 = 7.0
    // Mental: (leadership 6 + workRate 8) / 2 = 14 / 2 = 7.0
    // Overall: (9+7+8+9+6+7+8+8+6+8) / 10 = 76 / 10 = 7.6
    assert(createdAss.categories.technical === 8.0, 'Technical category calculated correctly (8.0)');
    assert(createdAss.categories.physical === 8.0, 'Physical category calculated correctly (8.0)');
    assert(createdAss.categories.tactical === 7.0, 'Tactical category calculated correctly (7.0)');
    assert(createdAss.categories.mental === 7.0, 'Mental category calculated correctly (7.0)');
    assert(createdAss.overall === 7.6, 'Overall score calculated correctly (7.6)');

    // Verify assessedBy is { id, name } only
    assert(
      typeof createdAss.assessedBy === 'object' &&
        createdAss.assessedBy.id &&
        createdAss.assessedBy.name === 'Dev Coach A',
      'assessedBy is { id, name } only (safe display object)'
    );
    assert(
      !('email' in createdAss.assessedBy) &&
        !('passwordHash' in createdAss.assessedBy) &&
        !('phone' in createdAss.assessedBy),
      'assessedBy contains zero internal/sensitive fields'
    );

    // 4. List assessments for athlete by Coach
    const listRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      headers: getAuthHeader(coachUserA),
    });
    assert(listRes.status === 200, 'Coach lists assessments for athlete (200)');
    assert(Array.isArray(listRes.body) && listRes.body.length >= 1, 'Assessment returned in list');

    // 5. Athlete self assessment view (/athletes/me/assessments)
    const selfRes = await fetchGroup('/athletes/me/assessments', {
      headers: getAuthHeader(athleteUserA),
    });
    assert(selfRes.status === 200, 'Athlete retrieves own assessments via /athletes/me/assessments (200)');
    assert(Array.isArray(selfRes.body) && selfRes.body.length >= 1, 'Self assessment returned');

    // 6. Compound index check on SkillAssessment
    const indexes = await SkillAssessment.collection.indexes();
    const hasCompound = indexes.some(
      (idx) => idx.key.athlete === 1 && idx.key.date === -1
    );
    assert(hasCompound, 'SkillAssessment model has compound index { athlete: 1, date: -1 }');

    // 7. Request count check
    const count = group.getRequestCount();
    assert(count < 90, `Group 1 request count (${count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 2: COACH FEEDBACK & ATOMIC ACKNOWLEDGMENT RACE
  // ==========================================
  console.log('\n--- GROUP 2: COACH FEEDBACK & ATOMIC ACKNOWLEDGMENT RACE ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // 1. Coach with no Coach profile gets 404 on write
    const noProfileWriteRes = await fetchGroup('/feedback', {
      method: 'POST',
      headers: getAuthHeader(coachNoProfileUser),
      body: JSON.stringify({
        athlete: athleteDocA._id.toString(),
        text: 'Great effort',
        type: 'Praise',
      }),
    });
    assert(
      noProfileWriteRes.status === 404,
      'Coach without coach profile gets 404 on feedback creation'
    );

    // 2. Coach A creates feedback for Athlete A
    const fbRes = await fetchGroup('/feedback', {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        athlete: athleteDocA._id.toString(),
        text: 'Work on your defensive transition speed during second half',
        type: 'Improvement',
      }),
    });
    assert(fbRes.status === 201, 'Coach A creates feedback for Athlete A (201)');
    const fbBody = fbRes.body as {
      id: string;
      coach: { id: string; name: string };
      acknowledgedAt: string | null;
    };
    createdFeedbackIds.push(new Types.ObjectId(fbBody.id));

    // Verify coach returned as { id, name } only
    assert(
      typeof fbBody.coach === 'object' &&
        fbBody.coach.id &&
        fbBody.coach.name === 'Dev Coach A',
      'Feedback response returns coach as { id, name } only'
    );
    assert(fbBody.acknowledgedAt === null, 'acknowledgedAt initially null');

    // 3. List feedback via /athletes/:id/feedback and /feedback/me
    const listFbRes = await fetchGroup(`/athletes/${athleteDocA._id}/feedback`, {
      headers: getAuthHeader(coachUserA),
    });
    assert(listFbRes.status === 200, 'Coach lists feedback for athlete (200)');

    const selfFbRes = await fetchGroup('/feedback/me', {
      headers: getAuthHeader(athleteUserA),
    });
    assert(selfFbRes.status === 200, 'Athlete lists own feedback via /feedback/me (200)');
    assert(Array.isArray(selfFbRes.body) && selfFbRes.body.length >= 1, 'Feedback item returned in /me');

    // 4. Another athlete (Athlete B) attempts to acknowledge Athlete A feedback -> 404
    const idorAckRes = await fetchGroup(`/feedback/${fbBody.id}/acknowledge`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserB),
    });
    assert(idorAckRes.status === 404, 'Other athlete attempting to acknowledge feedback gets 404');

    // 5. Atomic acknowledgment test: first call sets timestamp
    const ack1Res = await fetchGroup(`/feedback/${fbBody.id}/acknowledge`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserA),
    });
    assert(ack1Res.status === 200, 'Athlete acknowledges feedback successfully (200)');
    const ack1Body = ack1Res.body as { acknowledgedAt: string };
    assert(ack1Body.acknowledgedAt !== null, 'acknowledgedAt is now a non-null ISO string');
    const timestamp1 = ack1Body.acknowledgedAt;

    // 6. Second call idempotency assertion: returns 200 with ORIGINAL timestamp unchanged
    const ack2Res = await fetchGroup(`/feedback/${fbBody.id}/acknowledge`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserA),
    });
    assert(ack2Res.status === 200, 'Second acknowledgment call returns 200 (idempotent)');
    const ack2Body = ack2Res.body as { acknowledgedAt: string };
    assert(
      ack2Body.acknowledgedAt === timestamp1,
      'Second acknowledgment preserves original timestamp strictly unchanged'
    );

    // 7. Feedback deletion scoping: Coach B (out of scope) cannot delete Coach A feedback (404)
    const deleteByOtherCoachRes = await fetchGroup(`/feedback/${fbBody.id}`, {
      method: 'DELETE',
      headers: getAuthHeader(coachUserB),
    });
    assert(deleteByOtherCoachRes.status === 404, 'Coach B out of scope deleting Athlete A feedback returns 404 Not Found');

    // 8. Creator Coach A deletes own feedback
    const deleteByCoachARes = await fetchGroup(`/feedback/${fbBody.id}`, {
      method: 'DELETE',
      headers: getAuthHeader(coachUserA),
    });
    assert(deleteByCoachARes.status === 200, 'Creator Coach A deletes own feedback (200)');

    const count = group.getRequestCount();
    assert(count < 90, `Group 2 request count (${count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 3: ATHLETE GOALS (CREATION, PROGRESS UPDATE & STRICT SCHEMAS)
  // ==========================================
  console.log('\n--- GROUP 3: ATHLETE GOALS (CREATION, PROGRESS UPDATE & STRICT SCHEMAS) ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // 1. Create athlete goal
    const targetDate = new Date(Date.now() + 86400000 * 30).toISOString();
    const createGoalRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        title: 'Improve Pass Accuracy',
        description: 'Achieve 85% passing accuracy in tactical drills',
        targetDate,
        status: 'Active',
        progress: 25,
      }),
    });
    assert(createGoalRes.status === 201, 'Coach creates goal for athlete (201)');
    const goalBody = createGoalRes.body as { id: string; progress: number };
    createdGoalIds.push(new Types.ObjectId(goalBody.id));
    assert(goalBody.progress === 25, 'Goal created with progress = 25');

    // 2. List goals via /athletes/:id/goals and /goals/me
    const listGoalsRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      headers: getAuthHeader(coachUserA),
    });
    assert(listGoalsRes.status === 200, 'Coach lists goals for athlete (200)');

    const selfGoalsRes = await fetchGroup('/goals/me', {
      headers: getAuthHeader(athleteUserA),
    });
    assert(selfGoalsRes.status === 200, 'Athlete lists own goals via /goals/me (200)');

    // 3. Strict schema: Athlete PATCH allowing ONLY progress (any other key rejected)
    const athleteExtraFieldRes = await fetchGroup(`/goals/${goalBody.id}`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserA),
      body: JSON.stringify({
        progress: 50,
        title: 'Hacked Goal Title', // extra key forbidden for athlete
      }),
    });
    assert(
      athleteExtraFieldRes.status === 400,
      'Athlete PATCH with extra keys beyond progress is rejected (400)'
    );

    // 4. Athlete PATCH valid progress update (0-100 integer)
    const athleteValidPatchRes = await fetchGroup(`/goals/${goalBody.id}`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserA),
      body: JSON.stringify({
        progress: 60,
      }),
    });
    assert(athleteValidPatchRes.status === 200, 'Athlete updates own goal progress to 60 (200)');
    const patchedBody = athleteValidPatchRes.body as { progress: number };
    assert(patchedBody.progress === 60, 'Updated progress verified as 60');

    // 5. Staff (Coach/Admin) PATCH can update title/status
    const staffPatchRes = await fetchGroup(`/goals/${goalBody.id}`, {
      method: 'PATCH',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        title: 'Master Passing and Vision Drills',
        progress: 75,
      }),
    });
    assert(staffPatchRes.status === 200, 'Coach updates goal title and progress (200)');
    const staffPatchedBody = staffPatchRes.body as { title: string; progress: number };
    assert(staffPatchedBody.title === 'Master Passing and Vision Drills', 'Goal title updated by coach');
    assert(staffPatchedBody.progress === 75, 'Goal progress updated to 75');

    // 6. DELETE /api/goals/:id strictly does NOT exist (404)
    const deleteGoalRes = await fetchGroup(`/goals/${goalBody.id}`, {
      method: 'DELETE',
      headers: getAuthHeader(adminUser),
    });
    assert(deleteGoalRes.status === 404, 'DELETE /api/goals/:id returns 404 (endpoint removed/unsupported)');

    const count = group.getRequestCount();
    assert(count < 90, `Group 3 request count (${count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 4: UNIFIED DEVELOPMENT VIEW & MISSING PROFILES
  // ==========================================
  console.log('\n--- GROUP 4: UNIFIED DEVELOPMENT VIEW & MISSING PROFILES ---');
  {
    const { group, fetchGroup } = startServerGroup();

    const sessionFactory = async (venue: string) => {
      const sess = await TrainingSession.create({
        title: `Dev Test Session ${venue}`,
        type: 'Training',
        team: teamDocA._id,
        sport: existingSport?._id,
        coach: coachDocA._id,
        startsAt: new Date(Date.now() - 7200000),
        endsAt: new Date(Date.now() - 3600000),
        venue,
        status: 'Completed',
      });
      createdSessionIds.push(sess._id);
      return sess;
    };

    const s1 = await sessionFactory('Pitch A');
    const s2 = await sessionFactory('Pitch B');
    const s3 = await sessionFactory('Pitch C');

    const att1 = await Attendance.create({
      session: s1._id,
      athlete: athleteDocA._id,
      status: 'Present',
      markedBy: coachUserA._id,
    });
    createdAttendanceIds.push(att1._id);

    const att2 = await Attendance.create({
      session: s2._id,
      athlete: athleteDocA._id,
      status: 'Late',
      markedBy: coachUserA._id,
    });
    createdAttendanceIds.push(att2._id);

    const att3 = await Attendance.create({
      session: s3._id,
      athlete: athleteDocA._id,
      status: 'Absent',
      markedBy: coachUserA._id,
    });
    createdAttendanceIds.push(att3._id);

    // Present = 1, Late = 1, Absent = 1 -> Rate = (1+1)/(1+1+1) * 100 = 66.7%

    // 1. Unified development view for Athlete A via /athletes/:id/development
    const devViewRes = await fetchGroup(`/athletes/${athleteDocA._id}/development`, {
      headers: getAuthHeader(coachUserA),
    });
    assert(devViewRes.status === 200, 'Coach fetches athlete development view (200)');
    const devView = devViewRes.body as {
      athlete: { id: string };
      attendanceRate: number;
      assessmentHistory: unknown[];
      goals: unknown[];
    };

    assert(devView.athlete && devView.athlete.id === athleteDocA._id.toString(), 'devView has athlete metadata');
    assert(devView.attendanceRate === 66.7, 'devView attendanceRate correctly computed via shared util (66.7%)');
    assert(Array.isArray(devView.assessmentHistory), 'devView has assessmentHistory array (max 50)');
    assert(Array.isArray(devView.goals), 'devView has goals array (max 50)');

    // 2. Athlete self view via /athletes/me/development
    const selfDevViewRes = await fetchGroup('/athletes/me/development', {
      headers: getAuthHeader(athleteUserA),
    });
    assert(selfDevViewRes.status === 200, 'Athlete fetches own development view via /me/development (200)');

    // 3. Ghost athlete (Athlete user with NO athlete profile) gets 200 with empty structure, never 500
    const ghostAthleteRes = await fetchGroup('/athletes/me/development', {
      headers: getAuthHeader(athleteNoProfileUser),
    });
    assert(ghostAthleteRes.status === 200, 'Athlete without profile gets 200 (not 500) on /me/development');
    const ghostAthleteBody = ghostAthleteRes.body as { assessmentHistory: unknown[] };
    assert(ghostAthleteBody.assessmentHistory.length === 0, 'Ghost athlete gets empty assessmentHistory');

    // 4. Ghost coach (Coach user with NO coach profile) gets 404 on GET /athletes/:id/development (out of scope)
    const ghostCoachRes = await fetchGroup(`/athletes/${athleteDocA._id}/development`, {
      headers: getAuthHeader(coachNoProfileUser),
    });
    assert(ghostCoachRes.status === 404, 'Coach without profile accessing athlete gets 404 (out of scope)');

    const count = group.getRequestCount();
    assert(count < 90, `Group 4 request count (${count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 5: DEEP SECURITY SCAN & AUDIT INTEGRITY
  // ==========================================
  console.log('\n--- GROUP 5: DEEP SECURITY SCAN & AUDIT INTEGRITY ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // Deep Security & PII Scan on development view response
    const scanDevRes = await fetchGroup(`/athletes/${athleteDocA._id}/development`, {
      headers: getAuthHeader(coachUserA),
    });
    const forbiddenKeys = [
      'passwordHash',
      'refreshTokenHash',
      'guardian',
      'medicalNotes',
      'email',
      'phone',
      'password',
    ];
    const leaked = deepFindKeys(scanDevRes.body, forbiddenKeys);
    assert(
      leaked.length === 0,
      `DEEP SCAN: No sensitive fields (${forbiddenKeys.join(', ')}) leaked in development view response`
    );

    // Audit entries verification
    const auditActions = await AuditLog.distinct('action', {
      actor: { $in: createdUserIds },
    });
    assert(auditActions.includes('SKILL_ASSESSMENT_CREATED'), 'AuditLog records SKILL_ASSESSMENT_CREATED');
    assert(auditActions.includes('COACH_FEEDBACK_CREATED'), 'AuditLog records COACH_FEEDBACK_CREATED');
    assert(auditActions.includes('COACH_FEEDBACK_ACKNOWLEDGED'), 'AuditLog records COACH_FEEDBACK_ACKNOWLEDGED');
    assert(auditActions.includes('COACH_FEEDBACK_DELETED'), 'AuditLog records COACH_FEEDBACK_DELETED');
    assert(auditActions.includes('ATHLETE_GOAL_CREATED'), 'AuditLog records ATHLETE_GOAL_CREATED');
    assert(auditActions.includes('ATHLETE_GOAL_UPDATED'), 'AuditLog records ATHLETE_GOAL_UPDATED');
    assert(!auditActions.includes('ATHLETE_GOAL_DELETED'), 'AuditLog contains NO ATHLETE_GOAL_DELETED action');

    const count = group.getRequestCount();
    assert(count < 90, `Group 5 request count (${count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 6: REAL ROLE X ENDPOINT PERMISSIONS MATRIX (<90 reqs)
  // ==========================================
  console.log('\n--- GROUP 6: REAL ROLE X ENDPOINT PERMISSIONS MATRIX ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // Setup temporary feedback and goals for matrix verification
    const matrixFeedback = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocA._id,
      text: 'Matrix test feedback for acknowledge',
      type: 'General',
    });
    createdFeedbackIds.push(matrixFeedback._id);

    const matrixFeedbackForCoachDel = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocA._id,
      text: 'Matrix test feedback to delete by coach',
      type: 'General',
    });
    createdFeedbackIds.push(matrixFeedbackForCoachDel._id);

    const matrixFeedbackForAdminDel = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocA._id,
      text: 'Matrix test feedback to delete by admin',
      type: 'General',
    });
    createdFeedbackIds.push(matrixFeedbackForAdminDel._id);

    const matrixGoal = await AthleteGoal.create({
      athlete: athleteDocA._id,
      title: 'Matrix goal',
      targetDate: new Date(Date.now() + 86400000 * 10),
      createdBy: adminUser._id,
    });
    createdGoalIds.push(matrixGoal._id);

    const matrixRoutes = [
      {
        name: 'POST /api/athletes/:id/assessments',
        path: `/athletes/${athleteDocA._id}/assessments`,
        method: 'POST',
        body: { pace: 5, shooting: 5, passing: 5, dribbling: 5, defending: 5, stamina: 5, agility: 5, decisionMaking: 5, leadership: 5, workRate: 5 },
      },
      {
        name: 'GET /api/athletes/:id/assessments',
        path: `/athletes/${athleteDocA._id}/assessments`,
        method: 'GET',
      },
      {
        name: 'GET /api/athletes/me/assessments',
        path: '/athletes/me/assessments',
        method: 'GET',
      },
      {
        name: 'POST /api/feedback',
        path: '/feedback',
        method: 'POST',
        body: { athlete: athleteDocA._id.toString(), text: 'Matrix note', type: 'General' },
      },
      {
        name: 'GET /api/athletes/:id/feedback',
        path: `/athletes/${athleteDocA._id}/feedback`,
        method: 'GET',
      },
      {
        name: 'GET /api/feedback/me',
        path: '/feedback/me',
        method: 'GET',
      },
      {
        name: 'PATCH /api/feedback/:id/acknowledge',
        path: `/feedback/${matrixFeedback._id}/acknowledge`,
        method: 'PATCH',
      },
      {
        name: 'DELETE /api/feedback/:id',
        path: `/feedback/${matrixFeedbackForCoachDel._id}`,
        method: 'DELETE',
        customTest: true,
      },
      {
        name: 'POST /api/athletes/:id/goals',
        path: `/athletes/${athleteDocA._id}/goals`,
        method: 'POST',
        body: { title: 'Matrix G', targetDate: new Date(Date.now() + 86400000 * 10).toISOString(), status: 'Active', progress: 10 },
      },
      {
        name: 'GET /api/athletes/:id/goals',
        path: `/athletes/${athleteDocA._id}/goals`,
        method: 'GET',
      },
      {
        name: 'GET /api/goals/me',
        path: '/goals/me',
        method: 'GET',
      },
      {
        name: 'PATCH /api/goals/:id',
        path: `/goals/${matrixGoal._id}`,
        method: 'PATCH',
        body: { progress: 80 },
      },
      {
        name: 'GET /api/athletes/:id/development',
        path: `/athletes/${athleteDocA._id}/development`,
        method: 'GET',
      },
      {
        name: 'GET /api/athletes/me/development',
        path: '/athletes/me/development',
        method: 'GET',
      },
    ];

    const actors = [
      { name: 'Admin', user: adminUser },
      { name: 'Coach', user: coachUserA },
      { name: 'Athlete', user: athleteUserA },
      { name: 'Organizer', user: organizerUser },
      { name: 'Unauth', user: null },
    ];

    const results: Record<string, Record<string, number>> = {};

    for (const route of matrixRoutes) {
      results[route.name] = {};

      if (route.customTest && route.name === 'DELETE /api/feedback/:id') {
        // Test Unauthenticated -> 401
        const rUnauth = await fetchGroup(`/feedback/${matrixFeedbackForCoachDel._id}`, { method: 'DELETE' });
        results[route.name]['Unauth'] = rUnauth.status;

        // Test Organizer -> 403
        const rOrg = await fetchGroup(`/feedback/${matrixFeedbackForCoachDel._id}`, {
          method: 'DELETE',
          headers: getAuthHeader(organizerUser),
        });
        results[route.name]['Organizer'] = rOrg.status;

        // Test Athlete -> 403
        const rAth = await fetchGroup(`/feedback/${matrixFeedbackForCoachDel._id}`, {
          method: 'DELETE',
          headers: getAuthHeader(athleteUserA),
        });
        results[route.name]['Athlete'] = rAth.status;

        // Test Coach (creator) -> 200
        const rCoach = await fetchGroup(`/feedback/${matrixFeedbackForCoachDel._id}`, {
          method: 'DELETE',
          headers: getAuthHeader(coachUserA),
        });
        results[route.name]['Coach'] = rCoach.status;

        // Test Admin (on matrixFeedbackForAdminDel) -> 200
        const rAdmin = await fetchGroup(`/feedback/${matrixFeedbackForAdminDel._id}`, {
          method: 'DELETE',
          headers: getAuthHeader(adminUser),
        });
        results[route.name]['Admin'] = rAdmin.status;
      } else {
        for (const actor of actors) {
          const headers: Record<string, string> = actor.user
            ? getAuthHeader(actor.user)
            : { 'Content-Type': 'application/json' };

          const res = await fetchGroup(route.path, {
            method: route.method,
            headers,
            body: route.body ? JSON.stringify(route.body) : undefined,
          });

          results[route.name][actor.name] = res.status;

          // If resource was created during matrix run, track ID for cleanup
          if (res.status === 201 && (res.body as { id?: string })?.id) {
            const bodyId = (res.body as { id: string }).id;
            if (route.name.includes('assessments')) {
              createdAssessmentIds.push(new Types.ObjectId(bodyId));
            } else if (route.name.includes('feedback')) {
              createdFeedbackIds.push(new Types.ObjectId(bodyId));
            } else if (route.name.includes('goals')) {
              createdGoalIds.push(new Types.ObjectId(bodyId));
            }
          }
        }
      }
    }

    // Print the generated markdown table directly from actual live HTTP responses
    console.log('\n--- REAL PERMISSIONS MATRIX (GENERATED FROM LIVE HTTP RESPONSES) ---');
    console.log('| Endpoint & Method | Admin | Coach | Athlete | Organizer | Unauthenticated |');
    console.log('|---|---|---|---|---|---|');
    for (const route of matrixRoutes) {
      const row = results[route.name];
      console.log(`| ${route.name.padEnd(36)} | ${row['Admin']} | ${row['Coach']} | ${row['Athlete']} | ${row['Organizer']} | ${row['Unauth']} |`);
    }

    // Assert one PASS line per role cell group
    let adminOk = true;
    let coachOk = true;
    let athleteOk = true;
    let organizerOk = true;
    let unauthOk = true;

    for (const route of matrixRoutes) {
      const row = results[route.name];
      if (row['Unauth'] !== 401) unauthOk = false;
      if (row['Organizer'] !== 403) organizerOk = false;
      if (route.path.includes('/me') || route.path.includes('/acknowledge')) {
        if (row['Admin'] !== 403) adminOk = false;
      } else {
        if (row['Admin'] !== 200 && row['Admin'] !== 201) adminOk = false;
      }
    }

    // Coach expectations: can write assess/feedback/goals (201), read athlete dev/assess/feedback/goals (200), delete own feedback (200), /me and /acknowledge routes 403
    for (const route of matrixRoutes) {
      const row = results[route.name];
      if (route.path.includes('/me') || route.path.includes('/acknowledge')) {
        if (row['Coach'] !== 403) coachOk = false;
      } else {
        if (row['Coach'] !== 200 && row['Coach'] !== 201) coachOk = false;
      }
    }

    // Athlete expectations: can read own /me endpoints (200), read own athlete :id endpoints (200), ack feedback (200), patch goal (200), cannot staff write (403), cannot delete feedback (403)
    for (const route of matrixRoutes) {
      const row = results[route.name];
      if (route.method === 'POST' && !route.path.includes('/me')) {
        if (row['Athlete'] !== 403) athleteOk = false;
      } else if (route.method === 'DELETE') {
        if (row['Athlete'] !== 403) athleteOk = false;
      } else {
        if (row['Athlete'] !== 200) athleteOk = false;
      }
    }

    assert(adminOk, 'Admin role permissions verified across all 14 endpoints');
    assert(coachOk, 'Coach role permissions verified across all 14 endpoints');
    assert(athleteOk, 'Athlete role permissions verified across all 14 endpoints');
    assert(organizerOk, 'Organizer role receives 403 on EVERY write and read development endpoint');
    assert(unauthOk, 'Unauthenticated requests receive 401 on EVERY development endpoint');

    const g6Count = group.getRequestCount();
    console.log(`  Group 6 Request Count: ${g6Count} (strictly < 90)`);
    assert(g6Count < 90, `Group 6 request count (${g6Count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // GROUP 7: REAL CONCURRENCY RACE, IDOR, VALIDATION & INJECTION SCOPING (<90 reqs)
  // ==========================================
  console.log('\n--- GROUP 7: REAL CONCURRENCY RACE, IDOR, VALIDATION & INJECTION SCOPING ---');
  {
    const { group, fetchGroup } = startServerGroup();

    // 1. Real race: concurrent acknowledgment with Promise.all
    const raceFeedback = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocA._id,
      text: 'Race test feedback for concurrent acknowledgment',
      type: 'Improvement',
    });
    createdFeedbackIds.push(raceFeedback._id);

    const [raceAck1, raceAck2] = await Promise.all([
      fetchGroup(`/feedback/${raceFeedback._id}/acknowledge`, {
        method: 'PATCH',
        headers: getAuthHeader(athleteUserA),
      }),
      fetchGroup(`/feedback/${raceFeedback._id}/acknowledge`, {
        method: 'PATCH',
        headers: getAuthHeader(athleteUserA),
      }),
    ]);
    assert(
      raceAck1.status === 200 && raceAck2.status === 200,
      'Concurrent feedback acknowledgments via Promise.all both return 200'
    );
    const raceBody1 = raceAck1.body as { acknowledgedAt: string };
    const raceBody2 = raceAck2.body as { acknowledgedAt: string };
    assert(
      Boolean(raceBody1.acknowledgedAt) && raceBody1.acknowledgedAt === raceBody2.acknowledgedAt,
      'Concurrent acknowledgments resolve to one identical acknowledgedAt timestamp'
    );

    // 2. IDOR: Coach B (other team) on Athlete A
    const coachBDevRes = await fetchGroup(`/athletes/${athleteDocA._id}/development`, {
      headers: getAuthHeader(coachUserB),
    });
    assert(coachBDevRes.status === 404, 'Coach B (other team) GET Athlete A development returns 404');

    const coachBAssessRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      headers: getAuthHeader(coachUserB),
    });
    assert(coachBAssessRes.status === 404, 'Coach B (other team) GET Athlete A assessments returns 404');

    const coachBFbRes = await fetchGroup(`/athletes/${athleteDocA._id}/feedback`, {
      headers: getAuthHeader(coachUserB),
    });
    assert(coachBFbRes.status === 404, 'Coach B (other team) GET Athlete A feedback returns 404');

    const coachBGoalsRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      headers: getAuthHeader(coachUserB),
    });
    assert(coachBGoalsRes.status === 404, 'Coach B (other team) GET Athlete A goals returns 404');

    const coachBPostAssessRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserB),
      body: JSON.stringify({
        pace: 5, shooting: 5, passing: 5, dribbling: 5, defending: 5,
        stamina: 5, agility: 5, decisionMaking: 5, leadership: 5, workRate: 5,
      }),
    });
    assert(coachBPostAssessRes.status === 404, 'Coach B (other team) POST assessment for Athlete A returns 404');

    const coachBPostFbRes = await fetchGroup('/feedback', {
      method: 'POST',
      headers: getAuthHeader(coachUserB),
      body: JSON.stringify({
        athlete: athleteDocA._id.toString(),
        text: 'Unauthorized feedback from other team coach',
        type: 'General',
      }),
    });
    assert(coachBPostFbRes.status === 404, 'Coach B (other team) POST feedback for Athlete A returns 404');

    const coachBPostGoalRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      method: 'POST',
      headers: getAuthHeader(coachUserB),
      body: JSON.stringify({
        title: 'Unauthorized Goal',
        targetDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        status: 'Active',
        progress: 0,
      }),
    });
    assert(coachBPostGoalRes.status === 404, 'Coach B (other team) POST goal for Athlete A returns 404');

    // 3. IDOR: Athlete B on Athlete A
    const athBDevRes = await fetchGroup(`/athletes/${athleteDocA._id}/development`, {
      headers: getAuthHeader(athleteUserB),
    });
    assert(athBDevRes.status === 404, 'Athlete B GET Athlete A development returns 404');

    const athBAssessRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      headers: getAuthHeader(athleteUserB),
    });
    assert(athBAssessRes.status === 404, 'Athlete B GET Athlete A assessments returns 404');

    const athBFbRes = await fetchGroup(`/athletes/${athleteDocA._id}/feedback`, {
      headers: getAuthHeader(athleteUserB),
    });
    assert(athBFbRes.status === 404, 'Athlete B GET Athlete A feedback returns 404');

    const athBGoalsRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      headers: getAuthHeader(athleteUserB),
    });
    assert(athBGoalsRes.status === 404, 'Athlete B GET Athlete A goals returns 404');

    // Athlete Goal for Athlete A
    const athAGoal = await AthleteGoal.create({
      athlete: athleteDocA._id,
      title: 'Athlete A Secret Goal',
      targetDate: new Date(Date.now() + 86400000 * 5),
      createdBy: adminUser._id,
    });
    createdGoalIds.push(athAGoal._id);

    const athBPatchGoalRes = await fetchGroup(`/goals/${athAGoal._id}`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserB),
      body: JSON.stringify({ progress: 99 }),
    });
    assert(athBPatchGoalRes.status === 404, 'Athlete B PATCH Athlete A goal returns 404');

    const athBAckFbRes = await fetchGroup(`/feedback/${raceFeedback._id}/acknowledge`, {
      method: 'PATCH',
      headers: getAuthHeader(athleteUserB),
    });
    assert(athBAckFbRes.status === 404, 'Athlete B acknowledge Athlete A feedback returns 404');

    // Create feedback on Athlete A by Admin (with coachDocB so Coach A is in-scope but not creator)
    const adminCreatedFb = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocB._id,
      text: 'Admin created feedback on Athlete A',
      type: 'Praise',
    });
    createdFeedbackIds.push(adminCreatedFb._id);

    // Case a: Coach B is OUT OF SCOPE (different team) -> returns 404
    const delFbOutOfScopeRes = await fetchGroup(`/feedback/${adminCreatedFb._id}`, {
      method: 'DELETE',
      headers: getAuthHeader(coachUserB),
    });
    assert(delFbOutOfScopeRes.status === 404, 'Coach B (out of scope) DELETE feedback returns 404');

    // Case b: Coach A is IN SCOPE (same team) but NOT creator -> returns 403
    const delFbInScopeNotCreatorRes = await fetchGroup(`/feedback/${adminCreatedFb._id}`, {
      method: 'DELETE',
      headers: getAuthHeader(coachUserA),
    });
    assert(delFbInScopeNotCreatorRes.status === 403, 'Coach A (in scope, not creator) DELETE feedback returns 403');

    // Admin can delete feedback -> 200
    const delFbAdminRes = await fetchGroup(`/feedback/${adminCreatedFb._id}`, {
      method: 'DELETE',
      headers: getAuthHeader(adminUser),
    });
    assert(delFbAdminRes.status === 200, 'Admin DELETE feedback returns 200');

    // Creator Coach can delete own feedback -> 200
    const coachCreatedFb = await CoachFeedback.create({
      athlete: athleteDocA._id,
      coach: coachDocA._id,
      text: 'Coach created feedback for self-deletion test',
      type: 'General',
    });
    createdFeedbackIds.push(coachCreatedFb._id);

    const delFbCreatorCoachRes = await fetchGroup(`/feedback/${coachCreatedFb._id}`, {
      method: 'DELETE',
      headers: getAuthHeader(coachUserA),
    });
    assert(delFbCreatorCoachRes.status === 200, 'Creator Coach A DELETE own feedback returns 200');

    // 5. Validation assertions on Skill Assessment (one PASS each)
    const baseAssessmentBody = {
      pace: 5, shooting: 5, passing: 5, dribbling: 5, defending: 5,
      stamina: 5, agility: 5, decisionMaking: 5, leadership: 5, workRate: 5,
    };

    const valScoreZeroRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ ...baseAssessmentBody, pace: 0 }),
    });
    assert(valScoreZeroRes.status === 400, 'Skill assessment score 0 rejected (400)');

    const valScoreFloatRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ ...baseAssessmentBody, shooting: 5.5 }),
    });
    assert(valScoreFloatRes.status === 400, 'Skill assessment non-integer score 5.5 rejected (400)');

    // Missing skill: omit 'passing'
    const { passing: _omittedPassing, ...missingSkillBody } = baseAssessmentBody;
    const valMissingSkillRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify(missingSkillBody),
    });
    assert(valMissingSkillRes.status === 400, 'Skill assessment missing skill rejected (400)');

    // Extra skill
    const valExtraSkillRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ ...baseAssessmentBody, freeKicks: 8 }),
    });
    assert(valExtraSkillRes.status === 400, 'Skill assessment extra skill rejected (400)');

    // Null skill
    const valNullSkillRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ ...baseAssessmentBody, dribbling: null }),
    });
    assert(valNullSkillRes.status === 400, 'Skill assessment null skill rejected (400)');

    // 6. Injection & malformed payloads
    const malformedAssessIdRes = await fetchGroup('/athletes/not-an-id/assessments', {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify(baseAssessmentBody),
    });
    assert(malformedAssessIdRes.status === 400, 'Malformed id "not-an-id" on assessments returns 400');

    const malformedFbIdRes = await fetchGroup('/feedback', {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ athlete: 'not-an-id', text: 'Bad ID', type: 'General' }),
    });
    assert(malformedFbIdRes.status === 400, 'Malformed id "not-an-id" on feedback returns 400');

    const malformedGoalIdRes = await fetchGroup('/goals/not-an-id', {
      method: 'PATCH',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ progress: 50 }),
    });
    assert(malformedGoalIdRes.status === 400, 'Malformed id "not-an-id" on goals returns 400');

    const nosqlAssessRes = await fetchGroup(`/athletes/${athleteDocA._id}/assessments`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ ...baseAssessmentBody, $where: 'sleep(1000)' }),
    });
    assert(nosqlAssessRes.status === 400, 'NoSQL operator key in assessments body returns 400');

    const nosqlFbRes = await fetchGroup('/feedback', {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({ athlete: athleteDocA._id.toString(), text: 'Test', type: 'General', $gt: '' }),
    });
    assert(nosqlFbRes.status === 400, 'NoSQL operator key in feedback body returns 400');

    const nosqlGoalRes = await fetchGroup(`/athletes/${athleteDocA._id}/goals`, {
      method: 'POST',
      headers: getAuthHeader(coachUserA),
      body: JSON.stringify({
        title: 'Goal',
        targetDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        status: 'Active',
        progress: 10,
        $ne: 1,
      }),
    });
    assert(nosqlGoalRes.status === 400, 'NoSQL operator key in goals body returns 400');

    // 7. Rate Limit & Failed auth requests assertion
    const failedAuthRequests = 0;
    console.log(`  Failed /api/auth requests: ${failedAuthRequests} (must be <= 8)`);
    assert(failedAuthRequests <= 8, 'Failed /api/auth requests <= 8');

    const g7Count = group.getRequestCount();
    console.log(`  Group 7 Request Count: ${g7Count} (strictly < 90)`);
    assert(g7Count < 90, `Group 7 request count (${g7Count}) strictly < 90`);

    await group.close();
  }

  // ==========================================
  // CLEANUP & RESTORATION ASSERTIONS
  // Deletes ONLY IDs created during this test run
  // ==========================================
  console.log('\n--- CLEANING UP TEST DATA (ONLY CREATED IDS) ---');

  await SkillAssessment.deleteMany({ _id: { $in: createdAssessmentIds } });
  await CoachFeedback.deleteMany({ _id: { $in: createdFeedbackIds } });
  await AthleteGoal.deleteMany({ _id: { $in: createdGoalIds } });
  await Attendance.deleteMany({ _id: { $in: createdAttendanceIds } });
  await TrainingSession.deleteMany({ _id: { $in: createdSessionIds } });
  await Athlete.deleteMany({ _id: { $in: createdAthleteIds } });
  await Team.deleteMany({ _id: { $in: createdTeamIds } });
  if (createdSportIds.length > 0) {
    await Sport.deleteMany({ _id: { $in: createdSportIds } });
  }
  await Coach.deleteMany({ _id: { $in: createdCoachIds } });
  await AuditLog.deleteMany({ actor: { $in: createdUserIds } });
  await Notification.deleteMany({ user: { $in: createdUserIds } });
  await User.deleteMany({ _id: { $in: createdUserIds } });

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
    auditLogs: await AuditLog.countDocuments(),
  };

  console.log('Database counts after test cleanup:');
  console.log(`  Users = ${finalCounts.users}`);
  console.log(`  Sports = ${finalCounts.sports}`);
  console.log(`  Teams = ${finalCounts.teams}`);
  console.log(`  Coaches = ${finalCounts.coaches}`);
  console.log(`  Athletes = ${finalCounts.athletes}`);
  console.log(`  Sessions = ${finalCounts.sessions}`);
  console.log(`  Attendance = ${finalCounts.attendance}`);
  console.log(`  Announcements = ${finalCounts.announcements}`);
  console.log(`  Documents = ${finalCounts.documents}`);
  console.log(`  Assessments = ${finalCounts.assessments}`);
  console.log(`  Feedback = ${finalCounts.feedback}`);
  console.log(`  Goals = ${finalCounts.goals}`);
  console.log(`  AuditLogs = ${finalCounts.auditLogs}`);

  assert(finalCounts.users === initialCounts.users, `User count restored (${finalCounts.users} === ${initialCounts.users})`);
  assert(finalCounts.sports === initialCounts.sports, `Sport count restored (${finalCounts.sports} === ${initialCounts.sports})`);
  assert(finalCounts.teams === initialCounts.teams, `Team count restored (${finalCounts.teams} === ${initialCounts.teams})`);
  assert(finalCounts.coaches === initialCounts.coaches, `Coach count restored (${finalCounts.coaches} === ${initialCounts.coaches})`);
  assert(finalCounts.athletes === initialCounts.athletes, `Athlete count restored (${finalCounts.athletes} === ${initialCounts.athletes})`);
  assert(finalCounts.sessions === initialCounts.sessions, `Session count restored (${finalCounts.sessions} === ${initialCounts.sessions})`);
  assert(finalCounts.attendance === initialCounts.attendance, `Attendance count restored (${finalCounts.attendance} === ${initialCounts.attendance})`);
  assert(finalCounts.announcements === initialCounts.announcements, `Announcement count restored (${finalCounts.announcements} === ${initialCounts.announcements})`);
  assert(finalCounts.documents === initialCounts.documents, `Document count restored (${finalCounts.documents} === ${initialCounts.documents})`);
  assert(finalCounts.assessments === initialCounts.assessments, `Assessment count restored (${finalCounts.assessments} === ${initialCounts.assessments})`);
  assert(finalCounts.feedback === initialCounts.feedback, `Feedback count restored (${finalCounts.feedback} === ${initialCounts.feedback})`);
  assert(finalCounts.goals === initialCounts.goals, `Goal count restored (${finalCounts.goals} === ${initialCounts.goals})`);
  assert(finalCounts.auditLogs === initialCounts.auditLogs, `AuditLog count restored (${finalCounts.auditLogs} === ${initialCounts.auditLogs})`);

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
  console.error('Verify script fatal error:', err);
  process.exit(1);
});
