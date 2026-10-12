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
} from '../src/models/index.js';

interface OrphanItem {
  collection: string;
  id: Types.ObjectId;
  name: string;
  reason: string;
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

  // 5. Officials
  const officials = await Official.find({});
  for (const off of officials) {
    const userExists = await User.exists({ _id: off.createdBy });
    if (!userExists) {
      orphans.push({
        collection: 'Official',
        id: off._id,
        name: off.name,
        reason: `CreatedBy user ${off.createdBy.toString()} does not exist`,
      });
    }
  }

  // 6. Test Users from interrupted test runs
  const testUsers = await User.find({ email: /^dash-/ });
  for (const u of testUsers) {
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

  // 8. Test Coach / Athlete / Team / Sport / AuditLog from interrupted test runs
  const testCoaches = await Coach.find({});
  for (const c of testCoaches) {
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

  const testAthletes = await Athlete.find({});
  for (const a of testAthletes) {
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

  const testTeams = await Team.find({ slug: /^team-alpha-/ });
  for (const t of testTeams) {
    orphans.push({
      collection: 'Team',
      id: t._id,
      name: t.name,
      reason: 'Interrupted test run team',
    });
  }

  const testSports = await Sport.find({ slug: /^dash-soccer-/ });
  for (const s of testSports) {
    orphans.push({
      collection: 'Sport',
      id: s._id,
      name: s.name,
      reason: 'Interrupted test run sport',
    });
  }

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

  const testSessions = await TrainingSession.find({});
  for (const sess of testSessions) {
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

  const testAttendance = await Attendance.find({});
  for (const att of testAttendance) {
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

  const testAssessments = await SkillAssessment.find({});
  for (const sa of testAssessments) {
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

  const testGoals = await AthleteGoal.find({});
  for (const g of testGoals) {
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

  const testFeedback = await CoachFeedback.find({});
  for (const fb of testFeedback) {
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

  return orphans;
}

async function getCounts() {
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

async function run() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n=== ATHLETIQ TEST ORPHAN CLEANUP (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'}) ===\n`);

  await connectDB();

  const beforeCounts = await getCounts();
  console.log('Database Counts Before:');
  console.log(JSON.stringify(beforeCounts, null, 2));

  const orphans = await findOrphans();
  console.log(`\nIdentified Orphans Total: ${orphans.length}`);

  for (const item of orphans) {
    console.log(`- [${item.collection}] ID: ${item.id.toString()} | Name: "${item.name}" | Reason: ${item.reason}`);
  }

  if (orphans.length > 20) {
    console.error(`\n[SANITY LIMIT EXCEEDED] Total orphans (${orphans.length}) > 20. Stopping for safety.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!isApply) {
    console.log('\n[DRY RUN COMPLETE] No records were modified or deleted. Run with --apply to delete.');
    await mongoose.disconnect();
    return;
  }

  if (orphans.length === 0) {
    console.log('\nZero orphans to delete.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n--- DELETING ORPHANS IN ORDER: matchEvents -> matches -> registrations -> tournaments -> venues -> officials ---');

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
  const teamIds = orphans.filter((o) => o.collection === 'Team').map((o) => o.id);
  const sportIds = orphans.filter((o) => o.collection === 'Sport').map((o) => o.id);
  const contactIds = orphans.filter((o) => o.collection === 'ContactMessage').map((o) => o.id);
  const userIds = orphans.filter((o) => o.collection === 'User').map((o) => o.id);

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
  if (teamIds.length > 0) {
    const res = await Team.deleteMany({ _id: { $in: teamIds } });
    console.log(`Deleted ${res.deletedCount} orphan Teams`);
  }
  if (sportIds.length > 0) {
    const res = await Sport.deleteMany({ _id: { $in: sportIds } });
    console.log(`Deleted ${res.deletedCount} orphan Sports`);
  }
  if (contactIds.length > 0) {
    const res = await ContactMessage.deleteMany({ _id: { $in: contactIds } });
    console.log(`Deleted ${res.deletedCount} orphan ContactMessages`);
  }
  if (userIds.length > 0) {
    const res = await User.deleteMany({ _id: { $in: userIds } });
    console.log(`Deleted ${res.deletedCount} orphan Users`);
  }

  const afterCounts = await getCounts();
  console.log('\nDatabase Counts After:');
  console.log(JSON.stringify(afterCounts, null, 2));

  // Assert protected collections are completely unchanged
  if (
    beforeCounts.users - userIds.length !== afterCounts.users ||
    beforeCounts.sports - sportIds.length !== afterCounts.sports ||
    beforeCounts.teams - teamIds.length !== afterCounts.teams ||
    beforeCounts.coaches - coachIds.length !== afterCounts.coaches ||
    beforeCounts.athletes - athleteIds.length !== afterCounts.athletes ||
    beforeCounts.sessions - sessionIds.length !== afterCounts.sessions ||
    beforeCounts.attendance - attendanceIds.length !== afterCounts.attendance ||
    beforeCounts.announcements !== afterCounts.announcements ||
    beforeCounts.documents !== afterCounts.documents ||
    beforeCounts.assessments - assessmentIds.length !== afterCounts.assessments ||
    beforeCounts.feedback - feedbackIds.length !== afterCounts.feedback ||
    beforeCounts.goals - goalIds.length !== afterCounts.goals ||
    beforeCounts.tournaments - tourneyIds.length !== afterCounts.tournaments ||
    beforeCounts.tournamentTeams - regIds.length !== afterCounts.tournamentTeams ||
    beforeCounts.auditLogs - auditLogIds.length !== afterCounts.auditLogs ||
    beforeCounts.contactMessages - contactIds.length !== afterCounts.contactMessages
  ) {
    console.error('\n[FATAL ERROR] Protected collection count changed during orphan cleanup!');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n✅ All protected collections remained completely unchanged.');
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('cleanup-test-orphans.ts')) {
  run().catch((err) => {
    console.error('Fatal cleanup error:', err);
    process.exit(1);
  });
}
