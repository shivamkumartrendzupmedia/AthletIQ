import mongoose, { Types } from 'mongoose';
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
  Conversation,
  Achievement,
} from '../src/models/index.js';

export interface OrphanItem {
  collection: string;
  id: Types.ObjectId;
  name: string;
  reason: string;
}

export interface PossibleLeftoverItem {
  collection: string;
  id: Types.ObjectId;
  name: string;
  reason: string;
}

export interface TestUserItem {
  id: Types.ObjectId;
  name: string;
  role: string;
  email: string;
}

// Anchored, escaped, case-insensitive suffix match for test users
export const TEST_USER_EMAIL_REGEX = /@test\.athletiq\.internal$/i;

export async function findTestUsers(): Promise<TestUserItem[]> {
  const users = await User.find({ email: { $regex: TEST_USER_EMAIL_REGEX } }).select(
    '_id name role email'
  );
  return users.map((u) => ({
    id: u._id,
    name: u.name,
    role: u.role,
    email: u.email,
  }));
}

export async function findPossibleLeftovers(): Promise<PossibleLeftoverItem[]> {
  const leftovers: PossibleLeftoverItem[] = [];

  const teams = await Team.find({ slug: /^team-alpha-/ });
  for (const t of teams) {
    leftovers.push({
      collection: 'Team',
      id: t._id,
      name: t.name,
      reason: 'Team with test slug prefix (not linked to test user; preserved)',
    });
  }

  const sports = await Sport.find({ slug: /^dash-soccer-/ });
  for (const s of sports) {
    leftovers.push({
      collection: 'Sport',
      id: s._id,
      name: s.name,
      reason: 'Sport with test slug prefix (not linked to test user; preserved)',
    });
  }

  return leftovers;
}

export async function findOrphans(): Promise<OrphanItem[]> {
  const orphans: OrphanItem[] = [];

  // 0. MatchEvents (event whose match or created-by user is gone)
  const matchEvents = await MatchEvent.find({});
  for (const me of matchEvents) {
    let reason = '';
    const matchExists = await Match.exists({ _id: me.match });
    if (!matchExists) {
      reason = `Referenced match ${me.match.toString()} does not exist`;
    } else {
      const userExists = await User.exists({ _id: me.createdBy });
      if (!userExists) {
        reason = `Referenced createdBy user ${me.createdBy.toString()} does not exist`;
      }
    }

    if (reason) {
      orphans.push({
        collection: 'MatchEvent',
        id: me._id,
        name: `MatchEvent ${me.type} (${me._id.toString()})`,
        reason,
      });
    }
  }

  // 1. Matches
  const matches = await Match.find({});
  for (const m of matches) {
    let reason = '';
    const tourneyExists = await Tournament.exists({ _id: m.tournament });
    if (!tourneyExists) {
      reason = `Referenced tournament ${m.tournament.toString()} does not exist`;
    } else {
      const venueExists = await Venue.exists({ _id: m.venue });
      if (!venueExists) {
        reason = `Referenced venue ${m.venue.toString()} does not exist`;
      } else {
        const homeExists = await TournamentTeam.exists({ _id: m.homeTeam });
        if (!homeExists) {
          reason = `Referenced homeTeam registration ${m.homeTeam.toString()} does not exist`;
        } else {
          const awayExists = await TournamentTeam.exists({ _id: m.awayTeam });
          if (!awayExists) {
            reason = `Referenced awayTeam registration ${m.awayTeam.toString()} does not exist`;
          }
        }
      }
    }

    if (reason) {
      orphans.push({
        collection: 'Match',
        id: m._id,
        name: `Match round ${m.round} (${m._id.toString()})`,
        reason,
      });
    }
  }

  // 2. TournamentTeams (Registrations)
  const registrations = await TournamentTeam.find({});
  for (const reg of registrations) {
    let reason = '';
    const tourneyExists = await Tournament.exists({ _id: reg.tournament });
    if (!tourneyExists) {
      reason = `Referenced tournament ${reg.tournament.toString()} does not exist`;
    } else {
      const teamExists = await Team.exists({ _id: reg.team });
      if (!teamExists) {
        reason = `Referenced team ${reg.team.toString()} does not exist`;
      } else {
        const userExists = await User.exists({ _id: reg.registeredBy });
        if (!userExists) {
          reason = `Referenced registeredBy user ${reg.registeredBy.toString()} does not exist`;
        }
      }
    }

    if (reason) {
      orphans.push({
        collection: 'TournamentTeam',
        id: reg._id,
        name: `Registration ${reg._id.toString()}`,
        reason,
      });
    }
  }

  // 3. Tournaments
  const tournaments = await Tournament.find({});
  for (const t of tournaments) {
    const userExists = await User.exists({ _id: t.organizer });
    if (!userExists || t.name.startsWith('Alpha Cup')) {
      orphans.push({
        collection: 'Tournament',
        id: t._id,
        name: t.name,
        reason: 'Organizer user does not exist or test tournament',
      });
    }
  }

  // 4. Venues
  const venues = await Venue.find({});
  for (const v of venues) {
    const userExists = await User.exists({ _id: v.createdBy });
    if (!userExists) {
      orphans.push({
        collection: 'Venue',
        id: v._id,
        name: v.name,
        reason: `CreatedBy user ${v.createdBy.toString()} does not exist`,
      });
    }
  }

  // 5. Officials (whose creator is gone)
  const officials = await Official.find({});
  for (const off of officials) {
    const creatorExists = await User.exists({ _id: off.createdBy });
    if (!creatorExists) {
      orphans.push({
        collection: 'Official',
        id: off._id,
        name: off.name,
        reason: `CreatedBy user ${off.createdBy.toString()} does not exist`,
      });
    }
  }

  // 6. Test Users from interrupted dash-* runs
  const dashTestUsers = await User.find({ email: /^dash-/ });
  for (const u of dashTestUsers) {
    orphans.push({
      collection: 'User',
      id: u._id,
      name: `Test User (${u.email})`,
      reason: 'Interrupted test run user',
    });
  }

  // 7. Test Contact Messages from interrupted test runs
  const testContacts = await ContactMessage.find({
    $or: [{ email: /@(athletiq\.test|example\.com)$/ }, { name: /Tester$/ }],
  });
  for (const c of testContacts) {
    orphans.push({
      collection: 'ContactMessage',
      id: c._id,
      name: `Test Contact (${c.email})`,
      reason: 'Interrupted test run contact message',
    });
  }

  // 8. Test Coach / Athlete from deleted users
  const coaches = await Coach.find({});
  for (const c of coaches) {
    const userExists = await User.exists({ _id: c.user });
    if (!userExists) {
      orphans.push({
        collection: 'Coach',
        id: c._id,
        name: `Coach ${c._id.toString()}`,
        reason: 'Referenced user does not exist',
      });
    }
  }

  const athletes = await Athlete.find({});
  for (const a of athletes) {
    const userExists = await User.exists({ _id: a.user });
    if (!userExists) {
      orphans.push({
        collection: 'Athlete',
        id: a._id,
        name: `Athlete ${a._id.toString()}`,
        reason: 'Referenced user does not exist',
      });
    }
  }

  // 9. AuditLogs pointing to nonexistent targets
  const testAuditLogs = await AuditLog.find({ action: 'CONTACT_MESSAGE_STATUS_CHANGED' });
  for (const al of testAuditLogs) {
    const msgExists = await ContactMessage.exists({ _id: al.targetId });
    if (!msgExists) {
      orphans.push({
        collection: 'AuditLog',
        id: al._id,
        name: `AuditLog ${al._id.toString()}`,
        reason: 'Referenced contact message does not exist',
      });
    }
  }

  // 10. TrainingSessions pointing to nonexistent teams
  const sessions = await TrainingSession.find({});
  for (const sess of sessions) {
    const teamExists = await Team.exists({ _id: sess.team });
    if (!teamExists || sess.title.startsWith('Alpha ')) {
      orphans.push({
        collection: 'TrainingSession',
        id: sess._id,
        name: sess.title,
        reason: 'Interrupted test run session or nonexistent team',
      });
    }
  }

  // 11. Attendance
  const attendanceList = await Attendance.find({});
  for (const att of attendanceList) {
    const sessExists = await TrainingSession.exists({ _id: att.session });
    const athExists = await Athlete.exists({ _id: att.athlete });
    if (!sessExists || !athExists) {
      orphans.push({
        collection: 'Attendance',
        id: att._id,
        name: `Attendance ${att._id.toString()}`,
        reason: 'Session or Athlete does not exist',
      });
    }
  }

  // 12. SkillAssessment
  const assessments = await SkillAssessment.find({});
  for (const sa of assessments) {
    const athExists = await Athlete.exists({ _id: sa.athlete });
    if (!athExists) {
      orphans.push({
        collection: 'SkillAssessment',
        id: sa._id,
        name: `SkillAssessment ${sa._id.toString()}`,
        reason: 'Athlete does not exist',
      });
    }
  }

  // 13. AthleteGoal
  const goals = await AthleteGoal.find({});
  for (const g of goals) {
    const athExists = await Athlete.exists({ _id: g.athlete });
    if (!athExists || g.title.startsWith('Score 5 Free Kicks')) {
      orphans.push({
        collection: 'AthleteGoal',
        id: g._id,
        name: g.title,
        reason: 'Athlete does not exist or test goal',
      });
    }
  }

  // 14. CoachFeedback
  const feedbacks = await CoachFeedback.find({});
  for (const fb of feedbacks) {
    const athExists = await Athlete.exists({ _id: fb.athlete });
    if (!athExists || fb.text.startsWith('Superb passing')) {
      orphans.push({
        collection: 'CoachFeedback',
        id: fb._id,
        name: `Feedback ${fb._id.toString()}`,
        reason: 'Athlete does not exist or test feedback',
      });
    }
  }

  // 15. Notifications
  const notifs = await Notification.find({});
  for (const n of notifs) {
    const userExists = await User.exists({ _id: n.user });
    if (!userExists) {
      orphans.push({
        collection: 'Notification',
        id: n._id,
        name: `Notification ${n.title} (${n._id.toString()})`,
        reason: `Referenced user ${n.user.toString()} does not exist`,
      });
    }
  }

  // 16. PasswordResets
  const pwResets = await PasswordReset.find({});
  for (const pr of pwResets) {
    const userExists = await User.exists({ _id: pr.user });
    if (!userExists) {
      orphans.push({
        collection: 'PasswordReset',
        id: pr._id,
        name: `PasswordReset (${pr._id.toString()})`,
        reason: `Referenced user ${pr.user.toString()} does not exist`,
      });
    }
  }

  // 17. Conversations
  const convs = await Conversation.find({});
  for (const c of convs) {
    const userExists = await User.exists({ _id: c.user });
    if (!userExists) {
      orphans.push({
        collection: 'Conversation',
        id: c._id,
        name: `Conversation (${c._id.toString()})`,
        reason: `Referenced user ${c.user.toString()} does not exist`,
      });
    }
  }

  // 18. Achievements
  const achievements = await Achievement.find({});
  for (const a of achievements) {
    const userExists = await User.exists({ _id: a.createdBy });
    if (!userExists) {
      orphans.push({
        collection: 'Achievement',
        id: a._id,
        name: a.title,
        reason: `CreatedBy user ${a.createdBy.toString()} does not exist`,
      });
    }
  }

  return orphans;
}

export async function getCounts() {
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
    conversations: await Conversation.countDocuments(),
    achievements: await Achievement.countDocuments(),
  };
}

async function deleteOrphanItems(orphans: OrphanItem[]) {
  const matchEventIds = orphans.filter((o) => o.collection === 'MatchEvent').map((o) => o.id);
  const matchIds = orphans.filter((o) => o.collection === 'Match').map((o) => o.id);
  const regIds = orphans.filter((o) => o.collection === 'TournamentTeam').map((o) => o.id);
  const tourneyIds = orphans.filter((o) => o.collection === 'Tournament').map((o) => o.id);
  const venueIds = orphans.filter((o) => o.collection === 'Venue').map((o) => o.id);
  const officialIds = orphans.filter((o) => o.collection === 'Official').map((o) => o.id);
  const auditLogIds = orphans.filter((o) => o.collection === 'AuditLog').map((o) => o.id);
  const sessionIds = orphans.filter((o) => o.collection === 'TrainingSession').map((o) => o.id);
  const attendanceIds = orphans.filter((o) => o.collection === 'Attendance').map((o) => o.id);
  const assessmentIds = orphans.filter((o) => o.collection === 'SkillAssessment').map((o) => o.id);
  const goalIds = orphans.filter((o) => o.collection === 'AthleteGoal').map((o) => o.id);
  const feedbackIds = orphans.filter((o) => o.collection === 'CoachFeedback').map((o) => o.id);
  const athleteIds = orphans.filter((o) => o.collection === 'Athlete').map((o) => o.id);
  const coachIds = orphans.filter((o) => o.collection === 'Coach').map((o) => o.id);
  const contactIds = orphans.filter((o) => o.collection === 'ContactMessage').map((o) => o.id);
  const notificationIds = orphans.filter((o) => o.collection === 'Notification').map((o) => o.id);
  const passwordResetIds = orphans.filter((o) => o.collection === 'PasswordReset').map((o) => o.id);
  const convIds = orphans.filter((o) => o.collection === 'Conversation').map((o) => o.id);
  const achievementIds = orphans.filter((o) => o.collection === 'Achievement').map((o) => o.id);
  const userIds = orphans.filter((o) => o.collection === 'User').map((o) => o.id);

  if (achievementIds.length > 0) {
    const res = await Achievement.deleteMany({ _id: { $in: achievementIds } });
    console.log(`Deleted ${res.deletedCount} orphan Achievements`);
  }
  if (convIds.length > 0) {
    const res = await Conversation.deleteMany({ _id: { $in: convIds } });
    console.log(`Deleted ${res.deletedCount} orphan Conversations`);
  }
  if (notificationIds.length > 0) {
    const res = await Notification.deleteMany({ _id: { $in: notificationIds } });
    console.log(`Deleted ${res.deletedCount} orphan Notifications`);
  }
  if (passwordResetIds.length > 0) {
    const res = await PasswordReset.deleteMany({ _id: { $in: passwordResetIds } });
    console.log(`Deleted ${res.deletedCount} orphan PasswordResets`);
  }
  if (matchEventIds.length > 0) {
    const res = await MatchEvent.deleteMany({ _id: { $in: matchEventIds } });
    console.log(`Deleted ${res.deletedCount} orphan MatchEvents`);
  }
  if (matchIds.length > 0) {
    const res = await Match.deleteMany({ _id: { $in: matchIds } });
    console.log(`Deleted ${res.deletedCount} orphan Matches`);
  }
  if (regIds.length > 0) {
    const res = await TournamentTeam.deleteMany({ _id: { $in: regIds } });
    console.log(`Deleted ${res.deletedCount} orphan TournamentTeams`);
  }
  if (tourneyIds.length > 0) {
    const res = await Tournament.deleteMany({ _id: { $in: tourneyIds } });
    console.log(`Deleted ${res.deletedCount} orphan Tournaments`);
  }
  if (venueIds.length > 0) {
    const res = await Venue.deleteMany({ _id: { $in: venueIds } });
    console.log(`Deleted ${res.deletedCount} orphan Venues`);
  }
  if (officialIds.length > 0) {
    const res = await Official.deleteMany({ _id: { $in: officialIds } });
    console.log(`Deleted ${res.deletedCount} orphan Officials`);
  }
  if (auditLogIds.length > 0) {
    const res = await AuditLog.deleteMany({ _id: { $in: auditLogIds } });
    console.log(`Deleted ${res.deletedCount} orphan AuditLogs`);
  }
  if (attendanceIds.length > 0) {
    const res = await Attendance.deleteMany({ _id: { $in: attendanceIds } });
    console.log(`Deleted ${res.deletedCount} orphan Attendance`);
  }
  if (assessmentIds.length > 0) {
    const res = await SkillAssessment.deleteMany({ _id: { $in: assessmentIds } });
    console.log(`Deleted ${res.deletedCount} orphan SkillAssessments`);
  }
  if (goalIds.length > 0) {
    const res = await AthleteGoal.deleteMany({ _id: { $in: goalIds } });
    console.log(`Deleted ${res.deletedCount} orphan AthleteGoals`);
  }
  if (feedbackIds.length > 0) {
    const res = await CoachFeedback.deleteMany({ _id: { $in: feedbackIds } });
    console.log(`Deleted ${res.deletedCount} orphan CoachFeedback`);
  }
  if (sessionIds.length > 0) {
    const res = await TrainingSession.deleteMany({ _id: { $in: sessionIds } });
    console.log(`Deleted ${res.deletedCount} orphan TrainingSessions`);
  }
  if (athleteIds.length > 0) {
    const res = await Athlete.deleteMany({ _id: { $in: athleteIds } });
    console.log(`Deleted ${res.deletedCount} orphan Athletes`);
  }
  if (coachIds.length > 0) {
    const res = await Coach.deleteMany({ _id: { $in: coachIds } });
    console.log(`Deleted ${res.deletedCount} orphan Coaches`);
  }
  if (contactIds.length > 0) {
    const res = await ContactMessage.deleteMany({ _id: { $in: contactIds } });
    console.log(`Deleted ${res.deletedCount} orphan ContactMessages`);
  }
  if (userIds.length > 0) {
    const res = await User.deleteMany({ _id: { $in: userIds } });
    console.log(`Deleted ${res.deletedCount} orphan Users`);
  }
}

async function run() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n=== ATHLETIQ TEST ORPHAN CLEANUP (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'}) ===\n`);

  await connectDB();

  const beforeCounts = await getCounts();
  console.log('Database Counts Before:');
  console.log(JSON.stringify(beforeCounts, null, 2));

  // 1. Identify Test Users (@test.athletiq.internal)
  const testUsers = await findTestUsers();
  const nonTestUsersBefore = beforeCounts.users - testUsers.length;
  console.log(`\n=== TEST USERS CATEGORY (@test.athletiq.internal) ===`);
  console.log(`Matched Test Users Count: ${testUsers.length}`);

  const roleBreakdown: Record<string, number> = {};
  for (const u of testUsers) {
    roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
  }
  console.log('Role Breakdown:');
  console.log(JSON.stringify(roleBreakdown, null, 2));

  console.log('Matched Test Users List:');
  for (const u of testUsers) {
    console.log(`- Name: "${u.name}" | Role: ${u.role} | Email: ${u.email}`);
  }

  // Safety Stop if > 80 match
  if (testUsers.length > 80) {
    console.error(
      `\n[SAFETY STOP] More than 80 test users matched (${testUsers.length} > 80). Stopping execution without applying.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // 2. Identify Possible Leftovers (never deleted by this category)
  const possibleLeftovers = await findPossibleLeftovers();
  console.log(`\n=== POSSIBLE LEFTOVERS (NOT DELETED) ===`);
  console.log(`Total Possible Leftovers: ${possibleLeftovers.length}`);
  for (const l of possibleLeftovers) {
    console.log(`- [${l.collection}] ID: ${l.id.toString()} | Name: "${l.name}" | Reason: ${l.reason}`);
  }

  // 3. Identify Orphans
  const orphans = await findOrphans();
  console.log(`\n=== ORPHAN RECORDS PASS ===`);
  console.log(`Identified Orphans Total: ${orphans.length}`);
  for (const item of orphans) {
    console.log(`- [${item.collection}] ID: ${item.id.toString()} | Name: "${item.name}" | Reason: ${item.reason}`);
  }

  console.log(`\nNon-test Users Count Before: ${nonTestUsersBefore}`);

  if (orphans.length > 100) {
    console.error(`\n[SANITY LIMIT EXCEEDED] Total orphans (${orphans.length}) > 100. Stopping for safety.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!isApply) {
    console.log('\n[DRY RUN COMPLETE] No records were modified or deleted. Run with --apply to delete.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n--- APPLYING DELETIONS IN DEPENDENCY ORDER ---');

  // Deletion in dependency order:
  // Step A: Dependent data for test users
  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length > 0) {
    const testAthletes = await Athlete.find({ user: { $in: testUserIds } });
    const testAthleteIds = testAthletes.map((a) => a._id);
    const testCoaches = await Coach.find({ user: { $in: testUserIds } });
    const testCoachIds = testCoaches.map((c) => c._id);
    const testOfficials = await Official.find({ user: { $in: testUserIds } });
    const testOfficialIds = testOfficials.map((o) => o._id);

    // Dependent athletic records
    if (testAthleteIds.length > 0) {
      const delAssess = await SkillAssessment.deleteMany({ athlete: { $in: testAthleteIds } });
      const delGoals = await AthleteGoal.deleteMany({ athlete: { $in: testAthleteIds } });
      const delAtt = await Attendance.deleteMany({ athlete: { $in: testAthleteIds } });
      console.log(`Deleted ${delAssess.deletedCount} assessments, ${delGoals.deletedCount} goals, ${delAtt.deletedCount} attendance records`);
    }

    if (testAthleteIds.length > 0 || testCoachIds.length > 0) {
      const delFb = await CoachFeedback.deleteMany({
        $or: [
          { athlete: { $in: testAthleteIds } },
          { coach: { $in: testCoachIds } },
        ],
      });
      console.log(`Deleted ${delFb.deletedCount} coach feedback records`);
    }

    // Profiles and official link documents belonging to test users
    if (testAthleteIds.length > 0) {
      const res = await Athlete.deleteMany({ _id: { $in: testAthleteIds } });
      console.log(`Deleted ${res.deletedCount} Athlete profiles belonging to test users`);
    }
    if (testCoachIds.length > 0) {
      const res = await Coach.deleteMany({ _id: { $in: testCoachIds } });
      console.log(`Deleted ${res.deletedCount} Coach profiles belonging to test users`);
    }
    if (testOfficialIds.length > 0) {
      const res = await Official.deleteMany({ _id: { $in: testOfficialIds } });
      console.log(`Deleted ${res.deletedCount} Official-link documents belonging to test users`);
    }

    // Notifications, password resets, conversations & achievements
    const delNotifs = await Notification.deleteMany({ user: { $in: testUserIds } });
    const delPw = await PasswordReset.deleteMany({ user: { $in: testUserIds } });
    const delConvs = await Conversation.deleteMany({ user: { $in: testUserIds } });
    const delAch = await Achievement.deleteMany({ createdBy: { $in: testUserIds } });
    console.log(`Deleted ${delNotifs.deletedCount} notifications, ${delPw.deletedCount} password resets, ${delConvs.deletedCount} conversations, and ${delAch.deletedCount} achievements belonging to test users`);

    // Test Users themselves
    const delUsers = await User.deleteMany({ _id: { $in: testUserIds } });
    console.log(`Deleted ${delUsers.deletedCount} test users (@test.athletiq.internal)`);
  }

  // Step B: Cascading orphan pass cleanup
  let loopCount = 0;
  while (loopCount < 10) {
    const postUserOrphans = await findOrphans();
    if (postUserOrphans.length === 0) {
      break;
    }
    console.log(`\n[Orphan Pass Iteration ${loopCount + 1}] Deleting ${postUserOrphans.length} orphan records...`);
    await deleteOrphanItems(postUserOrphans);
    loopCount++;
  }

  // Step C: Verify 0 orphans and 0 test users
  const remainingOrphans = await findOrphans();
  console.log(`\nRemaining Orphans Count: ${remainingOrphans.length}`);
  if (remainingOrphans.length !== 0) {
    console.error(`[FATAL ERROR] Orphan pass still has ${remainingOrphans.length} orphans!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const remainingTestUsers = await findTestUsers();
  console.log(`Remaining Test Users Count: ${remainingTestUsers.length}`);
  if (remainingTestUsers.length !== 0) {
    console.error(`[FATAL ERROR] Still have ${remainingTestUsers.length} test users!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Step D: Report and verify counts
  const afterCounts = await getCounts();
  const nonTestUsersAfter = afterCounts.users - remainingTestUsers.length;

  console.log('\nDatabase Counts After:');
  console.log(JSON.stringify(afterCounts, null, 2));
  console.log(`\nNon-test Users Count Before: ${nonTestUsersBefore}`);
  console.log(`Non-test Users Count After:  ${nonTestUsersAfter}`);

  if (nonTestUsersBefore !== nonTestUsersAfter) {
    console.error(`[FATAL ERROR] Non-test users count altered! Before: ${nonTestUsersBefore}, After: ${nonTestUsersAfter}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n✅ All non-test users perfectly preserved and zero test users/orphans remain.');
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('cleanup-test-orphans.ts')) {
  run().catch((err) => {
    console.error('Fatal cleanup error:', err);
    process.exit(1);
  });
}
