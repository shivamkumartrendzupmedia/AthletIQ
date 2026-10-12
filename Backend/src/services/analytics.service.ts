import { Types } from 'mongoose';
import {
  User,
  Athlete,
  Coach,
  Team,
  TrainingSession,
  Attendance,
  SkillAssessment,
  AthleteGoal,
  Tournament,
  Match,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export interface WeeklyBucket {
  weekStart: string;
  label: string;
}

export function getMondayUtc(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function generateWeeklyBuckets(weeksCount = 8): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = [];
  const now = new Date();
  const currentMonday = getMondayUtc(now);

  for (let i = weeksCount - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setUTCDate(currentMonday.getUTCDate() - i * 7);
    const month = monday.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = monday.getUTCDate();
    buckets.push({
      weekStart: monday.toISOString(),
      label: `${month} ${day}`,
    });
  }

  return buckets;
}

export interface AdminAnalyticsDto {
  role: 'Admin';
  weeklyRegistrations: { weekStart: string; label: string; count: number }[];
  weeklySessions: { weekStart: string; label: string; count: number }[];
  attendanceRate: number;
  tournamentSummary: {
    totalTournaments: number;
    totalMatches: number;
    completedMatches: number;
  };
}

export interface CoachAnalyticsDto {
  role: 'Coach';
  teamCount: number;
  athleteCount: number;
  weeklyAttendance: { weekStart: string; label: string; rate: number }[];
  skillAssessmentsTrend: { weekStart: string; label: string; averageScore: number }[];
}

export interface AthleteAnalyticsDto {
  role: 'Athlete';
  weeklyAttendance: { weekStart: string; label: string; attended: number; total: number }[];
  skillProgression: {
    date: string;
    overall: number;
    technical: number;
    physical: number;
    tactical: number;
    mental: number;
  }[];
  goalsSummary: {
    active: number;
    achieved: number;
    total: number;
  };
}

export type AnalyticsOverviewDto =
  | AdminAnalyticsDto
  | CoachAnalyticsDto
  | AthleteAnalyticsDto;

export class AnalyticsService {
  async getOverview(user: { id: string; role: string }): Promise<AnalyticsOverviewDto> {
    if (user.role === 'Organizer' || user.role === 'Official') {
      throw ApiError.forbidden('Analytics overview is not available for this role');
    }

    const weeks = generateWeeklyBuckets(8);
    const windowStart = new Date(weeks[0].weekStart);

    if (user.role === 'Admin') {
      return this.getAdminOverview(weeks, windowStart);
    } else if (user.role === 'Coach') {
      return this.getCoachOverview(user.id, weeks, windowStart);
    } else if (user.role === 'Athlete') {
      return this.getAthleteOverview(user.id, weeks, windowStart);
    }

    throw ApiError.forbidden('Access denied');
  }

  private async getAdminOverview(
    weeks: WeeklyBucket[],
    windowStart: Date
  ): Promise<AdminAnalyticsDto> {
    const [usersList, sessionsList, allAttendance, totalTourneys, totalMatches, completedMatches] =
      await Promise.all([
        User.find({ createdAt: { $gte: windowStart } }).select('createdAt'),
        TrainingSession.find({ startsAt: { $gte: windowStart } }).select('startsAt'),
        Attendance.find({}).select('status'),
        Tournament.countDocuments(),
        Match.countDocuments(),
        Match.countDocuments({ status: 'Completed' }),
      ]);

    const weeklyRegistrations = weeks.map((w) => {
      const wStart = new Date(w.weekStart).getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;
      const count = usersList.filter((u) => {
        const t = u.createdAt.getTime();
        return t >= wStart && t < wEnd;
      }).length;
      return { ...w, count };
    });

    const weeklySessions = weeks.map((w) => {
      const wStart = new Date(w.weekStart).getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;
      const count = sessionsList.filter((s) => {
        const t = s.startsAt.getTime();
        return t >= wStart && t < wEnd;
      }).length;
      return { ...w, count };
    });

    const totalAtt = allAttendance.length;
    const attendedCount = allAttendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    const attendanceRate = totalAtt > 0 ? Math.round((attendedCount / totalAtt) * 100) : 0;

    return {
      role: 'Admin',
      weeklyRegistrations,
      weeklySessions,
      attendanceRate,
      tournamentSummary: {
        totalTournaments: totalTourneys,
        totalMatches,
        completedMatches,
      },
    };
  }

  private async getCoachOverview(
    userId: string,
    weeks: WeeklyBucket[],
    windowStart: Date
  ): Promise<CoachAnalyticsDto> {
    const coach = await Coach.findOne({ user: new Types.ObjectId(userId) });
    if (!coach) {
      return {
        role: 'Coach',
        teamCount: 0,
        athleteCount: 0,
        weeklyAttendance: weeks.map((w) => ({ ...w, rate: 0 })),
        skillAssessmentsTrend: weeks.map((w) => ({ ...w, averageScore: 0 })),
      };
    }

    const teams = await Team.find({ coach: coach._id }).select('_id');
    const teamIds = teams.map((t) => t._id);

    const athletes = await Athlete.find({ team: { $in: teamIds } }).select('_id');
    const athleteIds = athletes.map((a) => a._id);

    const sessions = await TrainingSession.find({
      team: { $in: teamIds },
      startsAt: { $gte: windowStart },
    }).select('_id startsAt');

    const sessionIds = sessions.map((s) => s._id);

    const [attendanceList, assessmentsList] = await Promise.all([
      Attendance.find({ session: { $in: sessionIds } }).select('session status'),
      SkillAssessment.find({
        athlete: { $in: athleteIds },
        date: { $gte: windowStart },
      }).select('date overall'),
    ]);

    const sessionMap = new Map<string, Date>();
    sessions.forEach((s) => sessionMap.set(s._id.toString(), s.startsAt));

    const weeklyAttendance = weeks.map((w) => {
      const wStart = new Date(w.weekStart).getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;

      const weekAttRecords = attendanceList.filter((a) => {
        const sTime = sessionMap.get(a.session.toString());
        if (!sTime) return false;
        const t = sTime.getTime();
        return t >= wStart && t < wEnd;
      });

      const total = weekAttRecords.length;
      const present = weekAttRecords.filter(
        (a) => a.status === 'Present' || a.status === 'Late'
      ).length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ...w, rate };
    });

    const skillAssessmentsTrend = weeks.map((w) => {
      const wStart = new Date(w.weekStart).getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;

      const weekAssessments = assessmentsList.filter((a) => {
        const t = a.date.getTime();
        return t >= wStart && t < wEnd;
      });

      const avg =
        weekAssessments.length > 0
          ? Math.round(
              (weekAssessments.reduce((sum, item) => sum + item.overall, 0) /
                weekAssessments.length) *
                10
            ) / 10
          : 0;

      return { ...w, averageScore: avg };
    });

    return {
      role: 'Coach',
      teamCount: teams.length,
      athleteCount: athletes.length,
      weeklyAttendance,
      skillAssessmentsTrend,
    };
  }

  private async getAthleteOverview(
    userId: string,
    weeks: WeeklyBucket[],
    _windowStart: Date
  ): Promise<AthleteAnalyticsDto> {
    const athlete = await Athlete.findOne({ user: new Types.ObjectId(userId) });
    if (!athlete) {
      return {
        role: 'Athlete',
        weeklyAttendance: weeks.map((w) => ({ ...w, attended: 0, total: 0 })),
        skillProgression: [],
        goalsSummary: { active: 0, achieved: 0, total: 0 },
      };
    }

    const [attendanceList, assessmentsList, goalsList] = await Promise.all([
      Attendance.find({ athlete: athlete._id }).populate<{ session: { startsAt: Date } }>(
        'session',
        'startsAt'
      ),
      SkillAssessment.find({ athlete: athlete._id }).sort({ date: 1 }),
      AthleteGoal.find({ athlete: athlete._id }).select('status'),
    ]);

    const weeklyAttendance = weeks.map((w) => {
      const wStart = new Date(w.weekStart).getTime();
      const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;

      const weekAttRecords = attendanceList.filter((a) => {
        const sTime = a.session?.startsAt ? new Date(a.session.startsAt).getTime() : 0;
        return sTime >= wStart && sTime < wEnd;
      });

      const total = weekAttRecords.length;
      const attended = weekAttRecords.filter(
        (a) => a.status === 'Present' || a.status === 'Late'
      ).length;

      return { ...w, attended, total };
    });

    const skillProgression = assessmentsList.map((a) => ({
      date: a.date.toISOString(),
      overall: a.overall,
      technical: a.categories.technical,
      physical: a.categories.physical,
      tactical: a.categories.tactical,
      mental: a.categories.mental,
    }));

    const activeGoals = goalsList.filter((g) => g.status === 'Active').length;
    const achievedGoals = goalsList.filter((g) => g.status === 'Achieved').length;

    return {
      role: 'Athlete',
      weeklyAttendance,
      skillProgression,
      goalsSummary: {
        active: activeGoals,
        achieved: achievedGoals,
        total: goalsList.length,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
