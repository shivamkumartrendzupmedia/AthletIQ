import { Types } from 'mongoose';
import { z } from 'zod';
import type { Role } from '../../models/constants.js';
import {
  User,
  Athlete,
  Team,
  Tournament,
  TournamentTeam,
  Match,
  ContactMessage,
  Attendance,
  SkillAssessment,
  CoachFeedback,
  AthleteGoal,
} from '../../models/index.js';
import { dashboardService } from '../dashboard.service.js';
import { developmentService } from '../development.service.js';
import { tournamentService } from '../tournament.service.js';
import { trainingService } from '../training.service.js';
import { scopeService } from '../scope.service.js';
import { getUnreadCount } from '../notification.service.js';
import { redactOutput } from './redaction.js';
import { ApiError } from '../../utils/ApiError.js';

export interface ChatbotUserSession {
  id: string;
  role: Role;
  name?: string;
}

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;
  execute: (args: TArgs, user: ChatbotUserSession) => Promise<TResult>;
}

// -------------------------------------------------------------
// Whitelisted Tools Per Role Matrix
// -------------------------------------------------------------
export const ROLE_TOOLS = {
  Admin: [
    'getPublicInfo',
    'getStandings',
    'getMyNotificationsSummary',
    'getAcademyOverview',
    'getPendingRegistrationsCount',
    'getUnreadContactMessagesCount',
  ],
  Coach: [
    'getPublicInfo',
    'getStandings',
    'getMyNotificationsSummary',
    'getMyTeams',
    'getMyTeamRoster',
    'getMyUpcomingSessions',
    'getMyTeamAttendance',
    'getAthleteDevelopmentSummary',
  ],
  Athlete: [
    'getPublicInfo',
    'getStandings',
    'getMyNotificationsSummary',
    'getMyProfileSummary',
    'getMyAttendance',
    'getMyUpcomingSessions',
    'getMyGoals',
    'getMyFeedbackSummary',
    'getMyLatestAssessment',
    'getMyTournamentPerformance',
    'getMyNextMatches',
  ],
  Organizer: [
    'getPublicInfo',
    'getStandings',
    'getMyNotificationsSummary',
    'getMyTournaments',
    'getMyRegistrationsSummary',
    'getMyUpcomingMatches',
  ],
} as const satisfies Record<Role, readonly string[]>;

// Reusable empty arguments schema
const emptyArgsSchema = z.object({}).strict();

// -------------------------------------------------------------
// Tool Implementations
// -------------------------------------------------------------

// 1. getPublicInfo (All Roles)
const getPublicInfoTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getPublicInfo',
  description: 'Public overview including sports count, active counts, upcoming public tournaments, and live matches.',
  schema: emptyArgsSchema,
  execute: async (_args) => {
    const overview = await dashboardService.getPublicOverview();
    const liveMatches = await Match.find({ status: 'Live' })
      .select('homeScore awayScore currentPeriod sport status')
      .populate('homeTeam', 'name')
      .populate('awayTeam', 'name')
      .populate('tournament', 'name')
      .lean();

    return {
      activeAthletes: overview.activeAthletes,
      activeCoaches: overview.activeCoaches,
      activeTeams: overview.activeTeams,
      sportsCount: overview.sportsCount,
      nextTournaments: overview.nextTournaments.map((t) => ({
        name: t.name,
        sport: t.sport.name,
        category: t.category,
        format: t.format,
        startDate: t.startDate,
        status: t.status,
      })),
      liveMatches: liveMatches.map((m) => {
        const home = m.homeTeam as unknown as { name?: string } | null;
        const away = m.awayTeam as unknown as { name?: string } | null;
        const tourney = m.tournament as unknown as { name?: string } | null;
        return {
          tournament: tourney?.name || 'Tournament',
          homeTeam: home?.name || 'Home',
          awayTeam: away?.name || 'Away',
          homeScore: m.liveScore?.home ?? 0,
          awayScore: m.liveScore?.away ?? 0,
          period: m.round || 'Live',
        };
      }),
    };
  },
};

// 2. getStandings (All Roles)
const getStandingsArgsSchema = z
  .object({
    tournamentName: z.string().trim().min(1).max(100),
  })
  .strict();

const getStandingsTool: ToolDefinition<z.infer<typeof getStandingsArgsSchema>, unknown> = {
  name: 'getStandings',
  description: 'Standings table for a public tournament by name.',
  schema: getStandingsArgsSchema,
  execute: async (args) => {
    const escaped = args.tournamentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tourney = await Tournament.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      status: { $ne: 'Draft' },
    });

    if (!tourney) {
      // Out of scope or draft tournament answers "not available"
      return { status: 'not_available', message: `Tournament "${args.tournamentName}" standings are not available.` };
    }

    const data = await tournamentService.getTournamentStandings(tourney._id.toString());
    const scorers = await tournamentService.getTournamentTopScorers(tourney._id.toString());
    const topScorer = scorers.topScorers && scorers.topScorers.length > 0 ? scorers.topScorers[0] : null;

    return {
      status: 'ok',
      tournamentName: tourney.name,
      standings: data.standings.map((s) => ({
        teamName: s.teamName,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        points: s.points,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalDifference,
      })),
      topScorer: topScorer
        ? {
            name: topScorer.playerName,
            team: '',
            goals: topScorer.goals,
          }
        : null,
    };
  },
};

// 3. getMyNotificationsSummary (All Roles)
const getMyNotificationsSummaryTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyNotificationsSummary',
  description: 'Unread notifications count for the caller.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const unreadCount = await getUnreadCount(user.id);
    return { unreadNotifications: unreadCount };
  },
};

// 4. getMyProfileSummary (Athlete)
const getMyProfileSummaryTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyProfileSummary',
  description: 'Athlete profile summary: name, team, sport, jersey number, position.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await Athlete.findOne({ user: new Types.ObjectId(user.id) })
      .populate('team', 'name')
      .populate('sport', 'name')
      .lean();

    if (!athlete) {
      return { status: 'not_available', message: 'Athlete profile is not available.' };
    }

    const userDoc = await User.findById(user.id).select('name').lean();
    const teamDoc = athlete.team as unknown as { name?: string } | null;
    const sportDoc = athlete.sport as unknown as { name?: string } | null;

    return {
      status: 'ok',
      name: userDoc?.name || user.name || 'Athlete',
      team: teamDoc?.name || 'Unassigned',
      sport: sportDoc?.name || 'General',
      jerseyNumber: athlete.jerseyNumber ?? null,
      position: athlete.position || null,
      statusFlag: athlete.status,
    };
  },
};

// 5. getMyAttendance (Athlete)
const getMyAttendanceTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyAttendance',
  description: 'Personal training attendance summary and attendance rate.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete) {
      return { status: 'not_available', message: 'Attendance records are not available.' };
    }

    const data = await trainingService.getAthleteAttendance(
      athlete._id.toString(),
      {},
      { id: user.id, role: 'Athlete' }
    );

    return {
      status: 'ok',
      attendanceRate: data.summary.attendanceRate,
      present: data.summary.present,
      late: data.summary.late,
      absent: data.summary.absent,
      excused: data.summary.excused,
      total: data.summary.total,
    };
  },
};

// 6. getMyUpcomingSessions (Athlete & Coach)
const getMyUpcomingSessionsTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyUpcomingSessions',
  description: 'Upcoming scheduled training sessions in scope.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const result = await trainingService.listSessions(
      { status: 'Scheduled', limit: 5 },
      { id: user.id, role: user.role }
    );

    return {
      total: result.pagination.total,
      sessions: result.data.map((s) => ({
        title: s.title,
        startsAt: s.startsAt,
        venue: s.venue,
        type: s.type,
        teamName: s.team?.name || 'Team',
      })),
    };
  },
};

// 7. getMyGoals (Athlete)
const getMyGoalsTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyGoals',
  description: 'Goals list, progress, and status.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete) {
      return { status: 'not_available', message: 'Goals are not available.' };
    }

    const goals = await AthleteGoal.find({ athlete: athlete._id })
      .sort({ targetDate: 1, createdAt: -1 })
      .limit(10)
      .lean();

    const activeCount = goals.filter((g) => g.status === 'Active').length;
    const achievedCount = goals.filter((g) => g.status === 'Achieved').length;

    return {
      status: 'ok',
      total: goals.length,
      active: activeCount,
      achieved: achievedCount,
      goals: goals.map((g) => ({
        title: g.title,
        status: g.status,
        progress: g.progress,
        targetDate: g.targetDate ? g.targetDate.toISOString().split('T')[0] : null,
      })),
    };
  },
};

// 8. getMyFeedbackSummary (Athlete)
const getMyFeedbackSummaryTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyFeedbackSummary',
  description: 'Summary and recent notes of coach feedback.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete) {
      return { status: 'not_available', message: 'Feedback is not available.' };
    }

    const feedbacks = await CoachFeedback.find({ athlete: athlete._id })
      .populate({
        path: 'coach',
        select: 'user',
        populate: { path: 'user', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const totalCount = await CoachFeedback.countDocuments({ athlete: athlete._id });

    return {
      status: 'ok',
      totalCount,
      feedbacks: feedbacks.map((fb) => {
        const coachProfile = fb.coach as unknown as { user?: { name?: string } } | null;
        return {
          coachName: coachProfile?.user?.name || 'Coach',
          type: fb.type,
          text: fb.text,
          date: fb.createdAt.toISOString().split('T')[0],
        };
      }),
    };
  },
};

// 9. getMyLatestAssessment (Athlete)
const getMyLatestAssessmentTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyLatestAssessment',
  description: 'Latest skill assessment overall score and technical attributes.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete) {
      return { status: 'not_available', message: 'Assessment is not available.' };
    }

    const assessment = await SkillAssessment.findOne({ athlete: athlete._id })
      .sort({ date: -1, createdAt: -1 })
      .populate('assessedBy', 'name')
      .lean();

    if (!assessment) {
      return { status: 'none', message: 'No skill assessment has been recorded yet.' };
    }

    const assessor = assessment.assessedBy as unknown as { name?: string } | null;

    return {
      status: 'ok',
      overall: assessment.overall,
      date: assessment.date.toISOString().split('T')[0],
      assessedBy: assessor?.name || 'Staff',
      scores: {
        pace: assessment.pace,
        shooting: assessment.shooting,
        passing: assessment.passing,
        dribbling: assessment.dribbling,
        defending: assessment.defending,
        stamina: assessment.stamina,
        agility: assessment.agility,
        decisionMaking: assessment.decisionMaking,
        leadership: assessment.leadership,
        workRate: assessment.workRate,
      },
    };
  },
};

// 10. getMyTournamentPerformance (Athlete)
const getMyTournamentPerformanceTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyTournamentPerformance',
  description: 'Athlete tournament matches, team standing, and performance stats.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete || !athlete.team) {
      return { status: 'not_available', message: 'Tournament performance data is not available.' };
    }

    const registrations = await TournamentTeam.find({ team: athlete.team })
      .populate('tournament', 'name status')
      .lean();

    const matches = await Match.find({
      $or: [{ homeTeam: athlete.team }, { awayTeam: athlete.team }],
      status: 'Completed',
    }).lean();

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const m of matches) {
      const isHome = m.homeTeam.toString() === athlete.team.toString();
      const myScore = isHome ? (m.result?.homeScore ?? 0) : (m.result?.awayScore ?? 0);
      const oppScore = isHome ? (m.result?.awayScore ?? 0) : (m.result?.homeScore ?? 0);

      goalsFor += myScore;
      goalsAgainst += oppScore;

      if (myScore > oppScore) wins++;
      else if (myScore === oppScore) draws++;
      else losses++;
    }

    return {
      status: 'ok',
      tournamentsCount: registrations.length,
      matchesPlayed: matches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
    };
  },
};

// 11. getMyNextMatches (Athlete)
const getMyNextMatchesTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyNextMatches',
  description: 'Upcoming scheduled matches for the athlete team.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const athlete = await scopeService.getAthleteProfileForUser(user.id);
    if (!athlete || !athlete.team) {
      return { status: 'not_available', message: 'Match schedule is not available.' };
    }

    const matches = await Match.find({
      $or: [{ homeTeam: athlete.team }, { awayTeam: athlete.team }],
      status: 'Scheduled',
    })
      .sort({ scheduledAt: 1 })
      .limit(5)
      .populate('homeTeam', 'name')
      .populate('awayTeam', 'name')
      .populate('tournament', 'name')
      .populate('venue', 'name')
      .lean();

    return {
      total: matches.length,
      matches: matches.map((m) => {
        const home = m.homeTeam as unknown as { name?: string } | null;
        const away = m.awayTeam as unknown as { name?: string } | null;
        const tourney = m.tournament as unknown as { name?: string } | null;
        const ven = m.venue as unknown as { name?: string } | null;
        const isHome = m.homeTeam?._id?.toString() === athlete.team!.toString();
        const opponent = isHome ? away?.name || 'TBD' : home?.name || 'TBD';

        return {
          tournament: tourney?.name || 'Tournament',
          opponent,
          homeOrAway: isHome ? 'Home' : 'Away',
          scheduledAt: m.scheduledAt.toISOString(),
          venue: ven?.name || 'Academy Ground',
        };
      }),
    };
  },
};

// 12. getMyTeams (Coach)
const getMyTeamsTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyTeams',
  description: 'Teams assigned to the coach with athlete counts.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const coach = await scopeService.getCoachProfileForUser(user.id);
    if (!coach) {
      return { status: 'not_available', message: 'Coach profile is not available.' };
    }

    const teams = await Team.find({ coach: coach._id })
      .populate('sport', 'name')
      .lean();

    const teamSummaries = await Promise.all(
      teams.map(async (t) => {
        const count = await Athlete.countDocuments({ team: t._id });
        const sportDoc = t.sport as unknown as { name?: string } | null;
        return {
          name: t.name,
          sport: sportDoc?.name || 'Sport',
          athleteCount: count,
        };
      })
    );

    return {
      totalTeams: teams.length,
      teams: teamSummaries,
    };
  },
};

// 13. getMyTeamRoster (Coach)
const getMyTeamRosterArgsSchema = z
  .object({
    teamName: z.string().trim().max(100).optional(),
  })
  .strict();

const getMyTeamRosterTool: ToolDefinition<z.infer<typeof getMyTeamRosterArgsSchema>, unknown> = {
  name: 'getMyTeamRoster',
  description: 'Athlete roster names for the coach teams.',
  schema: getMyTeamRosterArgsSchema,
  execute: async (args, user) => {
    const coach = await scopeService.getCoachProfileForUser(user.id);
    if (!coach) {
      return { status: 'not_available', message: 'Team roster is not available.' };
    }

    const coachTeams = await Team.find({ coach: coach._id }).lean();
    if (coachTeams.length === 0) {
      return { status: 'not_available', message: 'No teams assigned under your coaching scope.' };
    }

    let targetTeams = coachTeams;
    if (args.teamName) {
      const lowerReq = args.teamName.toLowerCase();
      targetTeams = coachTeams.filter((t) => t.name.toLowerCase().includes(lowerReq));
      if (targetTeams.length === 0) {
        return { status: 'not_available', message: `Team "${args.teamName}" is not under your coaching scope.` };
      }
    }

    const teamIds = targetTeams.map((t) => t._id);
    const athletes = await Athlete.find({ team: { $in: teamIds } })
      .populate('user', 'name')
      .populate('team', 'name')
      .lean();

    return {
      status: 'ok',
      totalAthletes: athletes.length,
      roster: athletes.map((a) => {
        const u = a.user as unknown as { name?: string } | null;
        const t = a.team as unknown as { name?: string } | null;
        return {
          name: u?.name || 'Athlete',
          team: t?.name || 'Team',
          jerseyNumber: a.jerseyNumber ?? null,
          position: a.position || null,
        };
      }),
    };
  },
};

// 14. getMyTeamAttendance (Coach)
const getMyTeamAttendanceTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyTeamAttendance',
  description: 'Overall attendance summary across the coach teams.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const coachTeamIds = await scopeService.getCoachTeamIds(user.id);
    if (coachTeamIds.length === 0) {
      return { status: 'not_available', message: 'No teams assigned under your coaching scope.' };
    }

    const athletes = await Athlete.find({ team: { $in: coachTeamIds } }).select('_id');
    const athleteIds = athletes.map((a) => a._id);

    if (athleteIds.length === 0) {
      return { status: 'ok', attendanceRate: null, totalAthletes: 0, message: 'No athletes in your teams.' };
    }

    const attendanceRecords = await Attendance.find({ athlete: { $in: athleteIds } }).select('status').lean();
    const present = attendanceRecords.filter((a: { status: string }) => a.status === 'Present').length;
    const late = attendanceRecords.filter((a: { status: string }) => a.status === 'Late').length;
    const absent = attendanceRecords.filter((a: { status: string }) => a.status === 'Absent').length;
    const excused = attendanceRecords.filter((a: { status: string }) => a.status === 'Excused').length;
    const denominator = present + late + absent;
    const rate = denominator > 0 ? Math.round(((present + late) / denominator) * 100) : null;

    return {
      status: 'ok',
      attendanceRate: rate,
      present,
      late,
      absent,
      excused,
      totalRecords: attendanceRecords.length,
      athleteCount: athleteIds.length,
    };
  },
};

// 15. getAthleteDevelopmentSummary (Coach)
const getAthleteDevArgsSchema = z
  .object({
    athleteName: z.string().trim().min(1).max(100),
  })
  .strict();

const getAthleteDevelopmentSummaryTool: ToolDefinition<z.infer<typeof getAthleteDevArgsSchema>, unknown> = {
  name: 'getAthleteDevelopmentSummary',
  description: 'Development summary for an athlete strictly scoped to the coach teams.',
  schema: getAthleteDevArgsSchema,
  execute: async (args, user) => {
    const coachTeamIds = await scopeService.getCoachTeamIds(user.id);
    if (coachTeamIds.length === 0) {
      return { status: 'not_available', message: `Athlete "${args.athleteName}" is not available.` };
    }

    // Find users with matching name
    const escaped = args.athleteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchedUsers = await User.find({
      name: { $regex: new RegExp(escaped, 'i') },
      role: 'Athlete',
    }).select('_id name');

    if (matchedUsers.length === 0) {
      return { status: 'not_available', message: `Athlete "${args.athleteName}" is not available.` };
    }

    const matchedUserIds = matchedUsers.map((u) => u._id);
    // Find athlete belonging to coach's teams
    const athlete = await Athlete.findOne({
      user: { $in: matchedUserIds },
      team: { $in: coachTeamIds },
    });

    if (!athlete) {
      // Out of scope or does not exist: answer "not available"
      return { status: 'not_available', message: `Athlete "${args.athleteName}" is not available.` };
    }

    const devView = await developmentService.getDevelopmentView(athlete._id.toString());

    return {
      status: 'ok',
      athleteName: devView.athlete.name,
      teamName: devView.athlete.teamName || 'Team',
      sportName: devView.athlete.sportName || 'Sport',
      attendanceRate: devView.attendanceRate,
      latestOverallScore: devView.latestAssessment?.overall ?? null,
      goalsCount: devView.goals.length,
      feedbackCount: devView.feedback.length,
    };
  },
};

// 16. getMyTournaments (Organizer)
const getMyTournamentsTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyTournaments',
  description: 'Tournaments organized by the caller.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const tournaments = await Tournament.find({ createdBy: new Types.ObjectId(user.id) })
      .populate('sport', 'name')
      .lean();

    const tourneySummaries = await Promise.all(
      tournaments.map(async (t) => {
        const teamCount = await TournamentTeam.countDocuments({ tournament: t._id, status: 'Approved' });
        const sportDoc = t.sport as unknown as { name?: string } | null;
        return {
          name: t.name,
          sport: sportDoc?.name || 'Sport',
          category: t.category,
          format: t.format,
          status: t.status,
          startDate: t.startDate.toISOString().split('T')[0],
          endDate: t.endDate.toISOString().split('T')[0],
          approvedTeams: teamCount,
        };
      })
    );

    return {
      total: tournaments.length,
      tournaments: tourneySummaries,
    };
  },
};

// 17. getMyRegistrationsSummary (Organizer)
const getMyRegistrationsSummaryTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyRegistrationsSummary',
  description: 'Tournament team registration counts for organizer tournaments.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const tourneys = await Tournament.find({ createdBy: new Types.ObjectId(user.id) }).select('_id');
    const tourneyIds = tourneys.map((t) => t._id);

    if (tourneyIds.length === 0) {
      return { totalRegistrations: 0, pending: 0, approved: 0, rejected: 0 };
    }

    const [pending, approved, rejected, total] = await Promise.all([
      TournamentTeam.countDocuments({ tournament: { $in: tourneyIds }, status: 'Pending' }),
      TournamentTeam.countDocuments({ tournament: { $in: tourneyIds }, status: 'Approved' }),
      TournamentTeam.countDocuments({ tournament: { $in: tourneyIds }, status: 'Rejected' }),
      TournamentTeam.countDocuments({ tournament: { $in: tourneyIds } }),
    ]);

    return {
      totalRegistrations: total,
      pending,
      approved,
      rejected,
    };
  },
};

// 18. getMyUpcomingMatches (Organizer)
const getMyUpcomingMatchesTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getMyUpcomingMatches',
  description: 'Upcoming scheduled matches in organizer tournaments.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const tourneys = await Tournament.find({ createdBy: new Types.ObjectId(user.id) }).select('_id');
    const tourneyIds = tourneys.map((t) => t._id);

    if (tourneyIds.length === 0) {
      return { total: 0, matches: [] };
    }

    const matches = await Match.find({
      tournament: { $in: tourneyIds },
      status: 'Scheduled',
    })
      .sort({ scheduledAt: 1 })
      .limit(10)
      .populate('homeTeam', 'name')
      .populate('awayTeam', 'name')
      .populate('tournament', 'name')
      .populate('venue', 'name')
      .lean();

    return {
      total: matches.length,
      matches: matches.map((m) => {
        const home = m.homeTeam as unknown as { name?: string } | null;
        const away = m.awayTeam as unknown as { name?: string } | null;
        const tourney = m.tournament as unknown as { name?: string } | null;
        const ven = m.venue as unknown as { name?: string } | null;
        return {
          tournament: tourney?.name || 'Tournament',
          homeTeam: home?.name || 'Home',
          awayTeam: away?.name || 'Away',
          scheduledAt: m.scheduledAt.toISOString(),
          venue: ven?.name || 'Main Field',
        };
      }),
    };
  },
};



// 20. getAcademyOverview (Admin)
const getAcademyOverviewTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getAcademyOverview',
  description: 'Academy-wide aggregate metrics and status breakdown.',
  schema: emptyArgsSchema,
  execute: async (_args, user) => {
    const overview = await dashboardService.getDashboardOverview({ id: user.id, role: 'Admin' });
    const adminData = overview as import('../dashboard.service.js').AdminOverviewResponse;

    return {
      userCounts: adminData.userCounts,
      activeAthletes: adminData.activeAthletes,
      teams: adminData.teams,
      coaches: adminData.coaches,
      upcomingSessions: adminData.upcomingSessions,
      tournaments: adminData.tournaments,
      pendingRegistrations: adminData.pendingRegistrations,
      unreadContactMessages: adminData.unreadContactMessages,
    };
  },
};

// 21. getPendingRegistrationsCount (Admin)
const getPendingRegistrationsCountTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getPendingRegistrationsCount',
  description: 'Total pending tournament registrations awaiting review.',
  schema: emptyArgsSchema,
  execute: async () => {
    const count = await TournamentTeam.countDocuments({ status: 'Pending' });
    return { pendingRegistrationsCount: count };
  },
};

// 22. getUnreadContactMessagesCount (Admin)
const getUnreadContactMessagesCountTool: ToolDefinition<Record<string, never>, unknown> = {
  name: 'getUnreadContactMessagesCount',
  description: 'Total unread contact messages awaiting review.',
  schema: emptyArgsSchema,
  execute: async () => {
    const count = await ContactMessage.countDocuments({ status: 'New' });
    return { unreadContactMessagesCount: count };
  },
};

// -------------------------------------------------------------
// Tool Master Registry
// -------------------------------------------------------------
export interface AnyExecutableTool {
  name: string;
  description: string;
  parseAndExecute: (rawArgs: unknown, user: ChatbotUserSession) => Promise<unknown>;
}

function createTool<TArgs, TResult>(tool: ToolDefinition<TArgs, TResult>): AnyExecutableTool {
  return {
    name: tool.name,
    description: tool.description,
    parseAndExecute: async (rawArgs: unknown, user: ChatbotUserSession): Promise<unknown> => {
      const parsed = tool.schema.parse(rawArgs ?? {});
      return tool.execute(parsed, user);
    },
  };
}

export const TOOL_REGISTRY: Record<string, AnyExecutableTool> = {
  getPublicInfo: createTool(getPublicInfoTool),
  getStandings: createTool(getStandingsTool),
  getMyNotificationsSummary: createTool(getMyNotificationsSummaryTool),
  getMyProfileSummary: createTool(getMyProfileSummaryTool),
  getMyAttendance: createTool(getMyAttendanceTool),
  getMyUpcomingSessions: createTool(getMyUpcomingSessionsTool),
  getMyGoals: createTool(getMyGoalsTool),
  getMyFeedbackSummary: createTool(getMyFeedbackSummaryTool),
  getMyLatestAssessment: createTool(getMyLatestAssessmentTool),
  getMyTournamentPerformance: createTool(getMyTournamentPerformanceTool),
  getMyNextMatches: createTool(getMyNextMatchesTool),
  getMyTeams: createTool(getMyTeamsTool),
  getMyTeamRoster: createTool(getMyTeamRosterTool),
  getMyTeamAttendance: createTool(getMyTeamAttendanceTool),
  getAthleteDevelopmentSummary: createTool(getAthleteDevelopmentSummaryTool),
  getMyTournaments: createTool(getMyTournamentsTool),
  getMyRegistrationsSummary: createTool(getMyRegistrationsSummaryTool),
  getMyUpcomingMatches: createTool(getMyUpcomingMatchesTool),
  getAcademyOverview: createTool(getAcademyOverviewTool),
  getPendingRegistrationsCount: createTool(getPendingRegistrationsCountTool),
  getUnreadContactMessagesCount: createTool(getUnreadContactMessagesCountTool),
};

/**
 * Executes a tool strictly ensuring role authorization and deep redaction.
 */
export async function executeTool(
  toolName: string,
  args: unknown,
  user: ChatbotUserSession
): Promise<unknown> {
  const allowedTools = ROLE_TOOLS[user.role] as readonly string[] | undefined;
  if (!allowedTools || !allowedTools.includes(toolName)) {
    throw new ApiError(403, `Role "${user.role}" is not authorized to call tool "${toolName}"`);
  }

  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new ApiError(404, `Tool "${toolName}" not found in registry`);
  }

  // Validate args with tool schema and execute read-only logic
  const rawResult = await tool.parseAndExecute(args, user);

  // Redaction pass
  return redactOutput(rawResult, user.id);
}
