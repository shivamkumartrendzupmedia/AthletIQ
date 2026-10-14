import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import mongoose, { type Types } from 'mongoose';
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
  Conversation,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { findOrphans } from './cleanup-test-orphans.js';
import type { Role } from '../src/models/constants.js';

async function getDbCounts(): Promise<Record<string, number>> {
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
    conversations: await Conversation.countDocuments(),
  };
}

async function httpFetch(url: string, headers: Record<string, string>): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch (e) {
            reject(new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- EXPORTING DASHBOARD FIXTURES ---');
  await connectDB();
  console.log(`Mongoose Database Name: ${mongoose.connection.name}`);

  // Pre-check orphans
  const orphans = await findOrphans();
  if (orphans.length > 0) {
    console.error(`[ABORT] Refusing to run: ${orphans.length} orphans already exist in DB.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const beforeCounts = await getDbCounts();

  // Test ID trackers
  const testUserIds: Types.ObjectId[] = [];
  const testSportIds: Types.ObjectId[] = [];
  const testTeamIds: Types.ObjectId[] = [];
  const testCoachIds: Types.ObjectId[] = [];
  const testAthleteIds: Types.ObjectId[] = [];
  const testSessionIds: Types.ObjectId[] = [];
  const testAttendanceIds: Types.ObjectId[] = [];
  const testAssessmentIds: Types.ObjectId[] = [];
  const testGoalIds: Types.ObjectId[] = [];
  const testFeedbackIds: Types.ObjectId[] = [];
  const testTournamentIds: Types.ObjectId[] = [];
  const testRegistrationIds: Types.ObjectId[] = [];
  const testVenueIds: Types.ObjectId[] = [];
  const testOfficialIds: Types.ObjectId[] = [];
  const testMatchIds: Types.ObjectId[] = [];
  const testContactIds: Types.ObjectId[] = [];

  const defaultPasswordHash = await hashPassword('ValidPass123!');

  async function createTestUser(role: Role, prefix: string) {
    const user = await User.create({
      name: `Fixture ${role} ${prefix}`,
      email: `fix_${prefix.toLowerCase()}_${role.toLowerCase()}_${Date.now()}@test.athletiq.internal`,
      passwordHash: defaultPasswordHash,
      role,
      isActive: true,
    });
    testUserIds.push(user._id);
    return user;
  }

  // Start in-process server
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr !== null ? addr.port : 5000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrow.getTime() + 90 * 60 * 1000);

    // 1. Users for all 4 roles
    const adminUser = await createTestUser('Admin', 'adm');
    const coachUser = await createTestUser('Coach', 'cch');
    const athleteUser = await createTestUser('Athlete', 'ath');
    const organizerUser = await createTestUser('Organizer', 'org');

    // 2. Sport
    const sport = await Sport.create({
      name: `Fixture Soccer ${Date.now()}`,
      slug: `fix-soccer-${Date.now()}`,
      description: 'Standard soccer program for fixture generation',
      status: 'Active',
      ageGroups: ['U16'],
    });
    testSportIds.push(sport._id);

    // 3. Coach Profile
    const coachProfile = await Coach.create({
      user: coachUser._id,
      title: 'Head Tactical Coach',
      specialties: ['Finishing', 'Set Pieces'],
      sports: [sport._id],
      experienceYears: 8,
      achievements: ['Regional Cup Winner'],
      isPublic: true,
    });
    testCoachIds.push(coachProfile._id);

    // 4. Team
    const team = await Team.create({
      name: `Panthers FC ${Date.now()}`,
      slug: `panthers-${Date.now()}`,
      sport: sport._id,
      coach: coachProfile._id,
      ageGroup: 'U16',
      status: 'Active',
    });
    testTeamIds.push(team._id);

    const opponentTeam = await Team.create({
      name: `Vipers FC ${Date.now()}`,
      slug: `vipers-${Date.now()}`,
      sport: sport._id,
      ageGroup: 'U16',
      status: 'Active',
    });
    testTeamIds.push(opponentTeam._id);

    // 5. Athlete Profile
    const athleteProfile = await Athlete.create({
      user: athleteUser._id,
      team: team._id,
      sport: sport._id,
      jerseyNumber: 10,
      position: 'Forward',
      status: 'Active',
    });
    testAthleteIds.push(athleteProfile._id);

    // 6. Training Sessions & Attendance
    const session = await TrainingSession.create({
      team: team._id,
      sport: sport._id,
      coach: coachProfile._id,
      title: 'Match Preparation Drill',
      type: 'Training',
      venue: 'Main Field North',
      startsAt: tomorrow,
      endsAt: tomorrowEnd,
      status: 'Scheduled',
    });
    testSessionIds.push(session._id);

    const pastSession = await TrainingSession.create({
      team: team._id,
      sport: sport._id,
      coach: coachProfile._id,
      title: 'Past Agility Drill',
      type: 'Training',
      venue: 'Main Field North',
      startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3600000),
      status: 'Completed',
    });
    testSessionIds.push(pastSession._id);

    const att = await Attendance.create({
      session: pastSession._id,
      athlete: athleteProfile._id,
      status: 'Present',
      markedBy: coachUser._id,
    });
    testAttendanceIds.push(att._id);

    // 7. Skill Assessment
    const assessment = await SkillAssessment.create({
      athlete: athleteProfile._id,
      assessedBy: coachUser._id,
      date: new Date(),
      pace: 8,
      shooting: 9,
      passing: 8,
      dribbling: 8,
      defending: 7,
      stamina: 8,
      agility: 8,
      decisionMaking: 8,
      leadership: 7,
      workRate: 9,
      categories: { technical: 8.5, physical: 8, tactical: 8, mental: 8 },
      overall: 8.2,
    });
    testAssessmentIds.push(assessment._id);

    // 8. Athlete Goals
    const goal1 = await AthleteGoal.create({
      athlete: athleteProfile._id,
      title: 'Score 15 goals in youth cup',
      status: 'Active',
      progress: 60,
      targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdBy: athleteUser._id,
    });
    const goal2 = await AthleteGoal.create({
      athlete: athleteProfile._id,
      title: 'Improve weak-foot shooting',
      status: 'Active',
      progress: 40,
      targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      createdBy: athleteUser._id,
    });
    testGoalIds.push(goal1._id, goal2._id);

    // 9. Coach Feedback
    const fb = await CoachFeedback.create({
      athlete: athleteProfile._id,
      coach: coachProfile._id,
      type: 'General',
      text: 'Exceptional movement off the ball in training',
      acknowledgedAt: null,
    });
    testFeedbackIds.push(fb._id);

    // 10. Tournament & Registrations
    const tournament = await Tournament.create({
      name: `Premier Cup ${Date.now()}`,
      sport: sport._id,
      category: 'Youth',
      ageGroup: 'U16',
      format: 'League',
      status: 'Registration Open',
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      organizer: organizerUser._id,
    });
    testTournamentIds.push(tournament._id);

    const reg1 = await TournamentTeam.create({
      tournament: tournament._id,
      team: team._id,
      status: 'Approved',
      registeredBy: coachUser._id,
    });
    const reg2 = await TournamentTeam.create({
      tournament: tournament._id,
      team: opponentTeam._id,
      status: 'Approved',
      registeredBy: organizerUser._id,
    });
    const pendingTeam = await Team.create({
      name: `Pending Tigers FC ${Date.now()}`,
      slug: `pending-tigers-${Date.now()}`,
      sport: sport._id,
      ageGroup: 'U16',
      status: 'Active',
    });
    testTeamIds.push(pendingTeam._id);
    const pendingReg = await TournamentTeam.create({
      tournament: tournament._id,
      team: pendingTeam._id,
      status: 'Pending',
      registeredBy: coachUser._id,
    });
    testRegistrationIds.push(reg1._id, reg2._id, pendingReg._id);

    // 11. Venue
    const venue = await Venue.create({
      name: 'Olympic Stadium Court 1',
      address: '456 Champion Avenue',
      createdBy: organizerUser._id,
    });
    testVenueIds.push(venue._id);

    // 12. Official Profile
    const officialProfile = await Official.create({
      name: 'Certified Referee',
      type: 'Referee',
      createdBy: adminUser._id,
      active: true,
    });
    testOfficialIds.push(officialProfile._id);

    // 13. Match
    const match = await Match.create({
      tournament: tournament._id,
      homeTeam: reg1._id,
      awayTeam: reg2._id,
      round: 'Semi Final',
      scheduledAt: tomorrow,
      durationMinutes: 90,
      endsAt: tomorrowEnd,
      venue: venue._id,
      referee: officialProfile._id,
      status: 'Scheduled',
    });
    testMatchIds.push(match._id);

    // 14. Contact Message
    const contactMsg = await ContactMessage.create({
      name: 'Parent Inquiry',
      email: 'parent@test.athletiq.internal',
      message: 'Inquiry regarding season 2026 academy registration',
      status: 'New',
    });
    testContactIds.push(contactMsg._id);

    // Ensure fixtures output directory exists
    const fixturesDir = path.resolve(process.cwd(), '../Frontend/scripts/fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });

    // Fetch and write fixtures for each role
    const roles: Array<{ role: Role; user: typeof adminUser; file: string }> = [
      { role: 'Admin', user: adminUser, file: 'dashboard-admin.json' },
      { role: 'Coach', user: coachUser, file: 'dashboard-coach.json' },
      { role: 'Athlete', user: athleteUser, file: 'dashboard-athlete.json' },
      { role: 'Organizer', user: organizerUser, file: 'dashboard-organizer.json' },
    ];

    for (const r of roles) {
      const token = signAccessToken(r.user._id.toString(), r.role);
      const res = await httpFetch(`${baseUrl}/api/dashboard/overview`, {
        Authorization: `Bearer ${token}`,
      });

      if (res.status !== 200 || !res.body || !res.body.data) {
        throw new Error(`Failed to fetch overview for role ${r.role} (status ${res.status}): ${JSON.stringify(res.body)}`);
      }

      const filePath = path.join(fixturesDir, r.file);
      await fs.writeFile(filePath, JSON.stringify(res.body.data, null, 2), 'utf-8');
      console.log(`✓ Exported ${r.role} fixture -> ${filePath}`);
    }

    // Export Athlete development-view fixture (GET /api/athletes/me/development)
    const athleteToken = signAccessToken(athleteUser._id.toString(), 'Athlete');
    const devRes = await httpFetch(`${baseUrl}/api/athletes/me/development`, {
      Authorization: `Bearer ${athleteToken}`,
    });

    if (devRes.status !== 200 || !devRes.body) {
      throw new Error(`Failed to fetch development view for athlete (status ${devRes.status}): ${JSON.stringify(devRes.body)}`);
    }

    const rawDev = devRes.body as Record<string, unknown>;
    const devBody = rawDev.data !== undefined ? rawDev.data : rawDev;
    const devFilePath = path.join(fixturesDir, 'development-athlete.json');
    await fs.writeFile(devFilePath, JSON.stringify(devBody, null, 2), 'utf-8');
    console.log(`✓ Exported Athlete development fixture -> ${devFilePath}`);

    console.log('All dashboard and development fixtures exported successfully.');
  } finally {
    server.close();

    // Cleanup all created records
    console.log('Cleaning up exported fixture test records...');
    if (testContactIds.length > 0) await ContactMessage.deleteMany({ _id: { $in: testContactIds } });
    if (testMatchIds.length > 0) await Match.deleteMany({ _id: { $in: testMatchIds } });
    if (testOfficialIds.length > 0) await Official.deleteMany({ _id: { $in: testOfficialIds } });
    if (testVenueIds.length > 0) await Venue.deleteMany({ _id: { $in: testVenueIds } });
    if (testRegistrationIds.length > 0) await TournamentTeam.deleteMany({ _id: { $in: testRegistrationIds } });
    if (testTournamentIds.length > 0) await Tournament.deleteMany({ _id: { $in: testTournamentIds } });
    if (testFeedbackIds.length > 0) await CoachFeedback.deleteMany({ _id: { $in: testFeedbackIds } });
    if (testGoalIds.length > 0) await AthleteGoal.deleteMany({ _id: { $in: testGoalIds } });
    if (testAssessmentIds.length > 0) await SkillAssessment.deleteMany({ _id: { $in: testAssessmentIds } });
    if (testAttendanceIds.length > 0) await Attendance.deleteMany({ _id: { $in: testAttendanceIds } });
    if (testSessionIds.length > 0) await TrainingSession.deleteMany({ _id: { $in: testSessionIds } });
    if (testAthleteIds.length > 0) await Athlete.deleteMany({ _id: { $in: testAthleteIds } });
    if (testCoachIds.length > 0) await Coach.deleteMany({ _id: { $in: testCoachIds } });
    if (testTeamIds.length > 0) await Team.deleteMany({ _id: { $in: testTeamIds } });
    if (testSportIds.length > 0) await Sport.deleteMany({ _id: { $in: testSportIds } });
    if (testUserIds.length > 0) {
      await AuditLog.deleteMany({ actor: { $in: testUserIds } });
      await Conversation.deleteMany({ user: { $in: testUserIds } });
      await User.deleteMany({ _id: { $in: testUserIds } });
    }

    const afterCounts = await getDbCounts();
    let countsEqual = true;
    for (const [key, val] of Object.entries(beforeCounts)) {
      if (val !== afterCounts[key]) {
        console.error(`Mismatch on ${key}: before ${val}, after ${afterCounts[key]}`);
        countsEqual = false;
      }
    }

    if (!countsEqual) {
      console.error('[FAIL] Final counts do not match initial counts!');
      await mongoose.disconnect();
      process.exit(1);
    }

    const finalOrphans = await findOrphans();
    if (finalOrphans.length > 0) {
      console.error(`[FAIL] ${finalOrphans.length} orphans remain after cleanup!`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('Database perfectly cleaned: all 23 collection counts equal, 0 orphans.');
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Fatal export fixtures error:', err);
  process.exit(1);
});
