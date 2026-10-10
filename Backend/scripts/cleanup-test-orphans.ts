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
  AuditLog,
} from '../src/models/index.js';

interface OrphanItem {
  collection: string;
  id: Types.ObjectId;
  name: string;
  reason: string;
}

export async function findOrphans(): Promise<OrphanItem[]> {
  const orphans: OrphanItem[] = [];

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
    if (!userExists) {
      orphans.push({
        collection: 'Tournament',
        id: t._id,
        name: t.name,
        reason: `Organizer user ${t.organizer.toString()} does not exist`,
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
    auditLogs: await AuditLog.countDocuments(),
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

  console.log('\n--- DELETING ORPHANS IN ORDER: matches -> registrations -> tournaments -> venues -> officials ---');

  const matchIds = orphans.filter((o) => o.collection === 'Match').map((o) => o.id);
  const regIds = orphans.filter((o) => o.collection === 'TournamentTeam').map((o) => o.id);
  const tourneyIds = orphans.filter((o) => o.collection === 'Tournament').map((o) => o.id);
  const venueIds = orphans.filter((o) => o.collection === 'Venue').map((o) => o.id);
  const officialIds = orphans.filter((o) => o.collection === 'Official').map((o) => o.id);

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

  const afterCounts = await getCounts();
  console.log('\nDatabase Counts After:');
  console.log(JSON.stringify(afterCounts, null, 2));

  // Assert protected collections are completely unchanged
  if (
    beforeCounts.users !== afterCounts.users ||
    beforeCounts.sports !== afterCounts.sports ||
    beforeCounts.teams !== afterCounts.teams ||
    beforeCounts.coaches !== afterCounts.coaches ||
    beforeCounts.athletes !== afterCounts.athletes ||
    beforeCounts.sessions !== afterCounts.sessions ||
    beforeCounts.attendance !== afterCounts.attendance ||
    beforeCounts.announcements !== afterCounts.announcements ||
    beforeCounts.documents !== afterCounts.documents ||
    beforeCounts.assessments !== afterCounts.assessments ||
    beforeCounts.feedback !== afterCounts.feedback ||
    beforeCounts.goals !== afterCounts.goals
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
