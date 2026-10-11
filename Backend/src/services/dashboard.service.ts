import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Athlete } from '../models/Athlete.js';
import { Coach } from '../models/Coach.js';
import { Team } from '../models/Team.js';
import { Sport } from '../models/Sport.js';
import { TrainingSession } from '../models/TrainingSession.js';
import { Attendance } from '../models/Attendance.js';
import { Tournament } from '../models/Tournament.js';
import { TournamentTeam } from '../models/TournamentTeam.js';
import { Match } from '../models/Match.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { SkillAssessment } from '../models/SkillAssessment.js';
import { CoachFeedback } from '../models/CoachFeedback.js';
import { AthleteGoal } from '../models/AthleteGoal.js';
import { Announcement } from '../models/Announcement.js';
import { calculateAttendanceRate } from '../utils/attendance.util.js';

export interface AdminOverviewResponse {
  role: 'Admin';
  userCounts: {
    Admin: number;
    Coach: number;
    Athlete: number;
    Organizer: number;
  };
  activeAthletes: number;
  teams: number;
  coaches: number;
  upcomingSessions: number;
  tournaments: {
    Draft: number;
    'Registration Open': number;
    'In Progress': number;
    Completed: number;
    Cancelled: number;
  };
  pendingRegistrations: number;
  unreadContactMessages: number;
}

export interface CoachTeamOverview {
  id: string;
  name: string;
  athleteCount: number;
}

export interface CoachSessionOverview {
  id: string;
  teamName: string;
  venue: string;
  scheduledAt: Date;
  endsAt: Date;
  type: string;
}

export interface CoachOverviewResponse {
  role: 'Coach';
  teams: CoachTeamOverview[];
  nextSessions: CoachSessionOverview[];
  attendanceRate: number | null;
}

export interface AthleteSessionOverview {
  id: string;
  venue: string;
  scheduledAt: Date;
  endsAt: Date;
  type: string;
}

export interface MatchOverviewItem {
  id: string;
  tournamentName: string;
  round: string;
  scheduledAt: Date;
  venueName: string;
  homeTeamName: string;
  awayTeamName: string;
}

export interface AthleteOverviewResponse {
  role: 'Athlete';
  displayName: string;
  teamName: string | null;
  attendanceRate: number | null;
  nextSessions: AthleteSessionOverview[];
  latestAssessmentOverallScore: number | null;
  activeGoalsCount: number;
  unacknowledgedFeedbackCount: number;
  nextMatches: MatchOverviewItem[];
}

export interface OrganizerOverviewResponse {
  role: 'Organizer';
  tournaments: {
    Draft: number;
    'Registration Open': number;
    'In Progress': number;
    Completed: number;
    Cancelled: number;
  };
  pendingRegistrations: number;
  nextMatches: MatchOverviewItem[];
}

export interface PublicTournamentOverview {
  id: string;
  name: string;
  sport: {
    name: string;
    slug: string;
  };
  category: string;
  ageGroup: string;
  format: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface PublicAnnouncementOverview {
  id: string;
  title: string;
  publishedAt: Date;
}

export interface PublicOverviewResponse {
  activeAthletes: number;
  activeCoaches: number;
  activeTeams: number;
  sportsCount: number;
  nextTournaments: PublicTournamentOverview[];
  latestAnnouncements: PublicAnnouncementOverview[];
}

export class DashboardService {
  /**
   * Role-driven dashboard overview.
   * Role is derived solely from authenticated user token.
   */
  async getDashboardOverview(user: { id: string; role: string; name?: string }): Promise<
    AdminOverviewResponse | CoachOverviewResponse | AthleteOverviewResponse | OrganizerOverviewResponse
  > {
    const now = new Date();

    if (user.role === 'Admin') {
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        adminUsers,
        coachUsers,
        athleteUsers,
        organizerUsers,
        activeAthletes,
        activeTeams,
        activeCoaches,
        upcomingSessions,
        tournamentList,
        pendingRegistrations,
        unreadInquiries,
      ] = await Promise.all([
        User.countDocuments({ role: 'Admin' }),
        User.countDocuments({ role: 'Coach' }),
        User.countDocuments({ role: 'Athlete' }),
        User.countDocuments({ role: 'Organizer' }),
        Athlete.countDocuments({ status: 'Active' }),
        Team.countDocuments({ active: true }),
        Coach.countDocuments({ active: true }),
        TrainingSession.countDocuments({
          startsAt: { $gte: now, $lte: in7Days },
          status: 'Scheduled',
        }),
        Tournament.find({}).select('status'),
        TournamentTeam.countDocuments({ status: 'Pending' }),
        ContactMessage.countDocuments({ status: 'New' }),
      ]);

      const tournamentsStatusCount = {
        Draft: 0,
        'Registration Open': 0,
        'In Progress': 0,
        Completed: 0,
        Cancelled: 0,
      };
      for (const t of tournamentList) {
        if (t.status in tournamentsStatusCount) {
          tournamentsStatusCount[t.status as keyof typeof tournamentsStatusCount]++;
        }
      }

      return {
        role: 'Admin',
        userCounts: {
          Admin: adminUsers,
          Coach: coachUsers,
          Athlete: athleteUsers,
          Organizer: organizerUsers,
        },
        activeAthletes,
        teams: activeTeams,
        coaches: activeCoaches,
        upcomingSessions,
        tournaments: tournamentsStatusCount,
        pendingRegistrations,
        unreadContactMessages: unreadInquiries,
      };
    }

    if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: user.id });
      if (!coach) {
        return {
          role: 'Coach',
          teams: [],
          nextSessions: [],
          attendanceRate: null,
        };
      }

      const coachedTeams = await Team.find({
        coach: coach._id,
        status: 'Active',
      });

      const teamIds = coachedTeams.map((t) => t._id);

      const [athletesCounts, upcomingSessions, recentSessions] = await Promise.all([
        Athlete.aggregate([
          { $match: { team: { $in: teamIds } } },
          { $group: { _id: '$team', count: { $sum: 1 } } },
        ]),
        TrainingSession.find({
          team: { $in: teamIds },
          startsAt: { $gte: now },
          status: 'Scheduled',
        })
          .sort({ startsAt: 1 })
          .limit(5)
          .populate<{ team: { name: string } }>('team', 'name'),
        TrainingSession.find({
          team: { $in: teamIds },
          startsAt: {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            $lte: now,
          },
        }).select('_id'),
      ]);

      const athleteCountMap = new Map<string, number>();
      for (const c of athletesCounts) {
        athleteCountMap.set(c._id.toString(), c.count);
      }

      const teamsData: CoachTeamOverview[] = coachedTeams.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        athleteCount: athleteCountMap.get(t._id.toString()) || 0,
      }));

      const sessionsData: CoachSessionOverview[] = upcomingSessions.map((s) => ({
        id: s._id.toString(),
        teamName: s.team?.name || 'Assigned Team',
        venue: s.venue,
        scheduledAt: s.startsAt,
        endsAt: s.endsAt,
        type: s.type,
      }));

      let attendanceRate: number | null = null;
      if (recentSessions.length > 0) {
        const sessionIds = recentSessions.map((s) => s._id);
        const attendanceAgg = await Attendance.aggregate([
          { $match: { session: { $in: sessionIds } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        let present = 0;
        let late = 0;
        let absent = 0;
        for (const a of attendanceAgg) {
          if (a._id === 'Present') present += a.count;
          else if (a._id === 'Late') late += a.count;
          else if (a._id === 'Absent') absent += a.count;
        }
        attendanceRate = calculateAttendanceRate(present, late, absent);
      }

      return {
        role: 'Coach',
        teams: teamsData,
        nextSessions: sessionsData,
        attendanceRate,
      };
    }

    if (user.role === 'Athlete') {
      const athlete = await Athlete.findOne({ user: user.id }).populate<{
        team: { _id: Types.ObjectId; name: string };
      }>('team', 'name');

      if (!athlete) {
        return {
          role: 'Athlete',
          displayName: user.name || 'Athlete',
          teamName: null,
          attendanceRate: null,
          nextSessions: [],
          latestAssessmentOverallScore: null,
          activeGoalsCount: 0,
          unacknowledgedFeedbackCount: 0,
          nextMatches: [],
        };
      }

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        recentSessions,
        upcomingSessions,
        latestAssessment,
        activeGoalsCount,
        unacknowledgedFeedbackCount,
        registeredTournamentTeams,
      ] = await Promise.all([
        TrainingSession.find({
          startsAt: { $gte: thirtyDaysAgo, $lte: now },
        }).select('_id'),
        athlete.team
          ? TrainingSession.find({
              team: athlete.team._id,
              startsAt: { $gte: now },
              status: 'Scheduled',
            })
              .sort({ startsAt: 1 })
              .limit(3)
          : Promise.resolve([]),
        SkillAssessment.findOne({ athlete: athlete._id }).sort({ date: -1, createdAt: -1 }),
        AthleteGoal.countDocuments({ athlete: athlete._id, status: 'Active' }),
        CoachFeedback.countDocuments({ athlete: athlete._id, acknowledgedAt: null }),
        athlete.team
          ? TournamentTeam.find({ team: athlete.team._id, status: 'Approved' }).select('_id')
          : Promise.resolve([]),
      ]);

      let attendanceRate: number | null = null;
      if (recentSessions.length > 0) {
        const recentSessionIds = recentSessions.map((s) => s._id);
        const attendanceAgg = await Attendance.aggregate([
          { $match: { athlete: athlete._id, session: { $in: recentSessionIds } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        let present = 0;
        let late = 0;
        let absent = 0;
        for (const a of attendanceAgg) {
          if (a._id === 'Present') present += a.count;
          else if (a._id === 'Late') late += a.count;
          else if (a._id === 'Absent') absent += a.count;
        }
        attendanceRate = calculateAttendanceRate(present, late, absent);
      }

      const sessionsData: AthleteSessionOverview[] = upcomingSessions.map((s) => ({
        id: s._id.toString(),
        venue: s.venue,
        scheduledAt: s.startsAt,
        endsAt: s.endsAt,
        type: s.type,
      }));

      let nextMatches: MatchOverviewItem[] = [];
      if (registeredTournamentTeams.length > 0) {
        const regIds = registeredTournamentTeams.map((r) => r._id);
        const matchesList = await Match.find({
          $or: [{ homeTeam: { $in: regIds } }, { awayTeam: { $in: regIds } }],
          scheduledAt: { $gte: now },
          status: 'Scheduled',
        })
          .sort({ scheduledAt: 1 })
          .limit(5)
          .populate<{ tournament: { name: string } }>('tournament', 'name')
          .populate<{ venue: { name: string } }>('venue', 'name')
          .populate<{ homeTeam: { team: { name: string } } }>({
            path: 'homeTeam',
            populate: { path: 'team', select: 'name' },
          })
          .populate<{ awayTeam: { team: { name: string } } }>({
            path: 'awayTeam',
            populate: { path: 'team', select: 'name' },
          });

        nextMatches = matchesList.map((m) => ({
          id: m._id.toString(),
          tournamentName: m.tournament?.name || 'Tournament',
          round: m.round,
          scheduledAt: m.scheduledAt,
          venueName: m.venue?.name || 'Pitch Venue',
          homeTeamName: m.homeTeam?.team?.name || 'Home Team',
          awayTeamName: m.awayTeam?.team?.name || 'Away Team',
        }));
      }

      return {
        role: 'Athlete',
        displayName: user.name || 'Athlete',
        teamName: athlete.team ? athlete.team.name : null,
        attendanceRate,
        nextSessions: sessionsData,
        latestAssessmentOverallScore: latestAssessment ? latestAssessment.overall : null,
        activeGoalsCount,
        unacknowledgedFeedbackCount,
        nextMatches,
      };
    }

    // Role === 'Organizer'
    const ownedTournaments = await Tournament.find({ organizer: user.id }).select('status _id');
    const tournamentIds = ownedTournaments.map((t) => t._id);

    const tournamentsStatusCount = {
      Draft: 0,
      'Registration Open': 0,
      'In Progress': 0,
      Completed: 0,
      Cancelled: 0,
    };
    for (const t of ownedTournaments) {
      if (t.status in tournamentsStatusCount) {
        tournamentsStatusCount[t.status as keyof typeof tournamentsStatusCount]++;
      }
    }

    const [pendingRegistrations, upcomingMatches] = await Promise.all([
      TournamentTeam.countDocuments({
        tournament: { $in: tournamentIds },
        status: 'Pending',
      }),
      Match.find({
        tournament: { $in: tournamentIds },
        scheduledAt: { $gte: now },
        status: 'Scheduled',
      })
        .sort({ scheduledAt: 1 })
        .limit(5)
        .populate<{ tournament: { name: string } }>('tournament', 'name')
        .populate<{ venue: { name: string } }>('venue', 'name')
        .populate<{ homeTeam: { team: { name: string } } }>({
          path: 'homeTeam',
          populate: { path: 'team', select: 'name' },
        })
        .populate<{ awayTeam: { team: { name: string } } }>({
          path: 'awayTeam',
          populate: { path: 'team', select: 'name' },
        }),
    ]);

    const matchesData: MatchOverviewItem[] = upcomingMatches.map((m) => ({
      id: m._id.toString(),
      tournamentName: m.tournament?.name || 'Tournament',
      round: m.round,
      scheduledAt: m.scheduledAt,
      venueName: m.venue?.name || 'Pitch Venue',
      homeTeamName: m.homeTeam?.team?.name || 'Home Team',
      awayTeamName: m.awayTeam?.team?.name || 'Away Team',
    }));

    return {
      role: 'Organizer',
      tournaments: tournamentsStatusCount,
      pendingRegistrations,
      nextMatches: matchesData,
    };
  }

  /**
   * Public platform overview.
   * Completely unauthenticated, containing zero sensitive user data.
   */
  async getPublicOverview(): Promise<PublicOverviewResponse> {
    const now = new Date();

    const [
      activeAthletes,
      activeCoaches,
      activeTeams,
      sportsCount,
      nextTournaments,
      latestAnnouncements,
    ] = await Promise.all([
      Athlete.countDocuments({ status: 'Active' }),
      Coach.countDocuments({ active: true }),
      Team.countDocuments({ active: true }),
      Sport.countDocuments({ status: 'Active' }),
      Tournament.find({ status: { $ne: 'Draft' } })
        .sort({ startDate: 1 })
        .limit(3)
        .populate<{ sport: { name: string; slug: string } }>('sport', 'name slug'),
      Announcement.find({
        audience: 'Public',
        publishedAt: { $lte: now },
      })
        .sort({ publishedAt: -1 })
        .limit(3)
        .select('title publishedAt'),
    ]);

    const tournamentsData: PublicTournamentOverview[] = nextTournaments.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      sport: {
        name: t.sport?.name || 'Sport',
        slug: t.sport?.slug || 'sport',
      },
      category: t.category,
      ageGroup: t.ageGroup,
      format: t.format,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
    }));

    const announcementsData: PublicAnnouncementOverview[] = latestAnnouncements.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      publishedAt: a.publishedAt,
    }));

    return {
      activeAthletes,
      activeCoaches,
      activeTeams,
      sportsCount,
      nextTournaments: tournamentsData,
      latestAnnouncements: announcementsData,
    };
  }
}

export const dashboardService = new DashboardService();
