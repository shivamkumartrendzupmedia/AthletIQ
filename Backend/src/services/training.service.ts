import { Types } from 'mongoose';
import { TrainingSession, type ITrainingSession } from '../models/TrainingSession.js';
import { Attendance, type IAttendance } from '../models/Attendance.js';
import { Team } from '../models/Team.js';
import { Coach } from '../models/Coach.js';
import { Athlete } from '../models/Athlete.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  SessionQueryInput,
  CreateSessionInput,
  UpdateSessionInput,
  CancelSessionInput,
  AttendanceUpsertInput,
  AthleteAttendanceQueryInput,
} from '../validators/training.validator.js';

export interface AttendanceSummary {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  attendanceRate: number | null;
}

export interface TrainingSessionDto {
  id: string;
  title: string;
  type: string;
  team: { id: string; name: string; slug?: string } | null;
  sport: { id: string; name: string; slug?: string } | null;
  coach: { id: string; user: { name: string } } | null;
  startsAt: string;
  endsAt: string;
  venue: string;
  notes?: string;
  status: string;
  attendanceSummary?: AttendanceSummary | null;
  myAttendance?: { status: string; note?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RosterAttendanceItem {
  athlete: { id: string; name: string };
  athleteId: string;
  athleteName: string;
  status: string | null;
  note: string | null;
  onRoster: boolean;
}

export interface SessionAttendanceRosterDto {
  session: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  summary: AttendanceSummary;
  records: RosterAttendanceItem[];
}

export class TrainingService {
  /**
   * Helper to retrieve scoped team IDs and context for a user.
   */
  private async getUserScope(userId: string, role: string) {
    if (role === 'Admin' || role === 'Organizer') {
      return { all: true, teamIds: [] as Types.ObjectId[] };
    }

    if (role === 'Coach') {
      const coach = await Coach.findOne({ user: new Types.ObjectId(userId) });
      if (!coach) {
        return { all: false, teamIds: [] as Types.ObjectId[], coachId: null };
      }
      const teams = await Team.find({ coach: coach._id }).select('_id');
      return {
        all: false,
        teamIds: teams.map((t) => t._id as Types.ObjectId),
        coachId: coach._id,
      };
    }

    if (role === 'Athlete') {
      const athlete = await Athlete.findOne({ user: new Types.ObjectId(userId) });
      if (!athlete || !athlete.team) {
        return { all: false, teamIds: [] as Types.ObjectId[], athleteId: athlete?._id || null, teamId: null };
      }
      return {
        all: false,
        teamIds: [athlete.team as Types.ObjectId],
        athleteId: athlete._id,
        teamId: athlete.team as Types.ObjectId,
      };
    }

    return { all: false, teamIds: [] as Types.ObjectId[] };
  }

  /**
   * Helper to verify whether a coach has access to a session.
   * A Coach may access a session when he is the coach of the session's TEAM (team.coach)
   * OR the session's assigned coach (session.coach).
   * If unauthorized, throws 404 (IDOR shield).
   */
  async verifyCoachSessionAccess(
    session: ITrainingSession,
    user: { id: string; role: string }
  ): Promise<void> {
    if (user.role !== 'Coach') return;

    const coach = await Coach.findOne({ user: new Types.ObjectId(user.id) });
    if (!coach) {
      throw new ApiError(404, 'Training session not found under your coaching scope');
    }

    // 1. Check if coach is the session's assigned coach
    if (session.coach && session.coach.equals(coach._id)) {
      return;
    }

    // 2. Check if coach is the team's assigned coach
    if (session.team) {
      const teamId = (session.team as unknown as { _id?: Types.ObjectId })?._id || session.team;
      const team = await Team.findById(teamId).select('coach');
      if (team && team.coach && team.coach.equals(coach._id)) {
        return;
      }
    }

    throw new ApiError(404, 'Training session not found under your coaching scope');
  }

  /**
   * List training sessions with role-based scoping and filters.
   */
  async listSessions(
    query: SessionQueryInput,
    user: { id: string; role: string }
  ): Promise<PaginatedResult<TrainingSessionDto>> {
    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const scope = await this.getUserScope(user.id, user.role);

    // If Coach or Athlete has no profile/teams, return empty list gracefully
    if (!scope.all && scope.teamIds.length === 0) {
      return formatPaginatedResponse([], 0, page, limit);
    }

    const filter: Record<string, unknown> = {};

    if (!scope.all) {
      filter.team = { $in: scope.teamIds };
    }

    if (query.team) {
      if (Types.ObjectId.isValid(query.team)) {
        const teamObjId = new Types.ObjectId(query.team);
        if (!scope.all && !scope.teamIds.some((id) => id.equals(teamObjId))) {
          // Out of scope team requested
          return formatPaginatedResponse([], 0, page, limit);
        }
        filter.team = teamObjId;
      }
    }

    if (query.sport && Types.ObjectId.isValid(query.sport)) {
      filter.sport = new Types.ObjectId(query.sport);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.coach && Types.ObjectId.isValid(query.coach)) {
      filter.coach = new Types.ObjectId(query.coach);
    }

    // Date filters: "to" is inclusive of the entire day
    if (query.from || query.to) {
      const dateFilter: Record<string, Date> = {};
      if (query.from) {
        dateFilter.$gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = toDate;
      }
      filter.startsAt = dateFilter;
    }

    const [sessions, total] = await Promise.all([
      TrainingSession.find(filter)
        .sort({ startsAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('team', 'name slug')
        .populate('sport', 'name slug')
        .populate({
          path: 'coach',
          select: 'title -_id',
          populate: { path: 'user', select: 'name -_id' },
        }),
      TrainingSession.countDocuments(filter),
    ]);

    // Fetch attendance summaries or athlete personal attendance
    const sessionIds = sessions.map((s) => s._id);
    let summaryMap: Map<string, AttendanceSummary> | null = null;
    let athleteAttendanceMap: Map<string, { status: string; note?: string }> | null = null;

    if (user.role === 'Admin' || user.role === 'Coach') {
      const records = await Attendance.aggregate([
        { $match: { session: { $in: sessionIds } } },
        {
          $group: {
            _id: { session: '$session', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]);

      summaryMap = new Map();
      for (const sid of sessionIds) {
        summaryMap.set(sid.toString(), {
          present: 0,
          late: 0,
          excused: 0,
          absent: 0,
          total: 0,
          attendanceRate: null,
        });
      }

      for (const r of records) {
        const sKey = r._id.session.toString();
        const sum = summaryMap.get(sKey);
        if (sum) {
          const status = r._id.status as string;
          if (status === 'Present') sum.present += r.count;
          else if (status === 'Late') sum.late += r.count;
          else if (status === 'Excused') sum.excused += r.count;
          else if (status === 'Absent') sum.absent += r.count;
          sum.total += r.count;
        }
      }

      for (const sum of summaryMap.values()) {
        const denom = sum.present + sum.late + sum.absent;
        sum.attendanceRate = denom > 0 ? Math.round(((sum.present + sum.late) / denom) * 1000) / 10 : null;
      }
    } else if (user.role === 'Athlete' && (scope as { athleteId?: Types.ObjectId }).athleteId) {
      const athleteRecords = await Attendance.find({
        session: { $in: sessionIds },
        athlete: (scope as { athleteId: Types.ObjectId }).athleteId,
      }).select('session status note');

      athleteAttendanceMap = new Map(
        athleteRecords.map((ar) => [ar.session.toString(), { status: ar.status, note: ar.note }])
      );
    }

    const items: TrainingSessionDto[] = sessions.map((s) => {
      const json = s.toJSON() as Record<string, unknown>;
      const sId = String(json.id || s._id);

      return {
        id: sId,
        title: s.title,
        type: s.type,
        team: s.team ? (s.team as unknown as { id: string; name: string; slug?: string }) : null,
        sport: s.sport ? (s.sport as unknown as { id: string; name: string; slug?: string }) : null,
        coach: s.coach ? (s.coach as unknown as { id: string; user: { name: string } }) : null,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        venue: s.venue,
        notes: s.notes,
        status: s.status,
        attendanceSummary: summaryMap ? summaryMap.get(sId) || null : null,
        myAttendance: athleteAttendanceMap ? athleteAttendanceMap.get(sId) || null : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });

    return formatPaginatedResponse(items, total, page, limit);
  }

  /**
   * Get single training session by ID with scoped authorization.
   */
  async getSessionById(
    id: string,
    user: { id: string; role: string }
  ): Promise<TrainingSessionDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(id)
      .populate('team', 'name slug')
      .populate('sport', 'name slug')
      .populate({
        path: 'coach',
        select: 'title -_id',
        populate: { path: 'user', select: 'name -_id' },
      });

    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    const scope = await this.getUserScope(user.id, user.role);

    if (user.role === 'Coach') {
      await this.verifyCoachSessionAccess(session, user);
    } else if (!scope.all) {
      const teamId = (session.team as unknown as { _id?: Types.ObjectId; id?: string })?._id || session.team;
      if (!scope.teamIds.some((tid) => tid.equals(teamId as Types.ObjectId))) {
        throw new ApiError(404, 'Training session not found');
      }
    }

    let summary: AttendanceSummary | null = null;
    let myAttendance: { status: string; note?: string } | null = null;

    if (user.role === 'Admin' || user.role === 'Coach') {
      const records = await Attendance.aggregate([
        { $match: { session: session._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      summary = { present: 0, late: 0, excused: 0, absent: 0, total: 0, attendanceRate: null };
      for (const r of records) {
        if (r._id === 'Present') summary.present += r.count;
        else if (r._id === 'Late') summary.late += r.count;
        else if (r._id === 'Excused') summary.excused += r.count;
        else if (r._id === 'Absent') summary.absent += r.count;
        summary.total += r.count;
      }
      const denom = summary.present + summary.late + summary.absent;
      summary.attendanceRate = denom > 0 ? Math.round(((summary.present + summary.late) / denom) * 1000) / 10 : null;
    } else if (user.role === 'Athlete' && (scope as { athleteId?: Types.ObjectId }).athleteId) {
      const ar = await Attendance.findOne({
        session: session._id,
        athlete: (scope as { athleteId: Types.ObjectId }).athleteId,
      }).select('status note');
      if (ar) {
        myAttendance = { status: ar.status, note: ar.note };
      }
    }

    return {
      id: session.id,
      title: session.title,
      type: session.type,
      team: session.team ? (session.team as unknown as { id: string; name: string }) : null,
      sport: session.sport ? (session.sport as unknown as { id: string; name: string }) : null,
      coach: session.coach ? (session.coach as unknown as { id: string; user: { name: string } }) : null,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      venue: session.venue,
      notes: session.notes,
      status: session.status,
      attendanceSummary: summary,
      myAttendance,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  /**
   * Create new training session with overlap race protection.
   */
  async createSession(
    input: CreateSessionInput,
    user: { id: string; role: string },
    ip?: string,
    userAgent?: string
  ): Promise<ITrainingSession> {
    const team = await Team.findById(input.team);
    if (!team || team.status !== 'Active') {
      throw new ApiError(404, 'Active team not found');
    }

    let coachId = team.coach;
    if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: new Types.ObjectId(user.id) });
      if (!coach || !team.coach || !coach._id.equals(team.coach as Types.ObjectId)) {
        throw new ApiError(404, 'Team not found under your coaching scope');
      }
      coachId = coach._id;
    } else if (input.coach) {
      const overrideCoach = await Coach.findById(input.coach);
      if (!overrideCoach) {
        throw new ApiError(404, 'Assigned coach profile not found');
      }
      coachId = overrideCoach._id;
    }

    if (!coachId) {
      throw new ApiError(400, 'Team has no assigned coach; coach must be assigned');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    // Initial overlap pre-check
    const existingConflict = await TrainingSession.findOne({
      team: team._id,
      status: { $ne: 'Cancelled' },
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt },
    });

    if (existingConflict) {
      throw new ApiError(409, 'Team already has a scheduled training session overlapping this time window');
    }

    const session = new TrainingSession({
      title: input.title,
      type: input.type,
      team: team._id,
      sport: team.sport,
      coach: coachId,
      startsAt,
      endsAt,
      venue: input.venue,
      notes: input.notes,
      status: 'Scheduled',
    });

    await session.save();

    // Post-insert concurrency race check (Note 4):
    // Re-query overlapping sessions for the same team excluding itself.
    // If another session exists with an earlier _id, revert and return 409.
    const concurrentConflict = await TrainingSession.findOne({
      _id: { $ne: session._id },
      team: team._id,
      status: { $ne: 'Cancelled' },
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt },
    }).sort({ _id: 1 });

    if (concurrentConflict && concurrentConflict._id.toString() < session._id.toString()) {
      await TrainingSession.findByIdAndDelete(session._id);
      throw new ApiError(409, 'Team already has a scheduled training session overlapping this time window');
    }

    await auditService.logAudit({
      actor: user.id,
      action: 'SESSION_CREATED',
      targetType: 'TrainingSession',
      targetId: session._id,
      meta: { title: session.title, teamId: team._id.toString() },
      ip,
      userAgent,
    });

    return session;
  }

  /**
   * Update training session details with overlap race safety.
   */
  async updateSession(
    id: string,
    input: UpdateSessionInput,
    user: { id: string; role: string },
    ip?: string,
    userAgent?: string
  ): Promise<ITrainingSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(id);
    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    await this.verifyCoachSessionAccess(session, user);

    const originalStartsAt = session.startsAt;
    const originalEndsAt = session.endsAt;
    const timesChanged = Boolean(input.startsAt || input.endsAt);

    if (timesChanged) {
      if (session.status === 'Completed' || session.status === 'Cancelled') {
        throw new ApiError(400, 'Cannot modify scheduled times of a completed or cancelled session');
      }

      const newStartsAt = input.startsAt ? new Date(input.startsAt) : session.startsAt;
      const newEndsAt = input.endsAt ? new Date(input.endsAt) : session.endsAt;

      // Pre-check overlap excluding current session
      const conflict = await TrainingSession.findOne({
        _id: { $ne: session._id },
        team: session.team,
        status: { $ne: 'Cancelled' },
        startsAt: { $lt: newEndsAt },
        endsAt: { $gt: newStartsAt },
      });

      if (conflict) {
        throw new ApiError(409, 'Team already has a scheduled training session overlapping this time window');
      }

      session.startsAt = newStartsAt;
      session.endsAt = newEndsAt;
    }

    if (input.title !== undefined) session.title = input.title;
    if (input.type !== undefined) session.type = input.type;
    if (input.venue !== undefined) session.venue = input.venue;
    if (input.notes !== undefined) session.notes = input.notes;

    if (input.coach && user.role === 'Admin') {
      const overrideCoach = await Coach.findById(input.coach);
      if (!overrideCoach) {
        throw new ApiError(404, 'Assigned coach not found');
      }
      session.coach = overrideCoach._id;
    }

    await session.save();

    // Concurrency race check for updated times
    if (timesChanged) {
      const concurrent = await TrainingSession.findOne({
        _id: { $ne: session._id },
        team: session.team,
        status: { $ne: 'Cancelled' },
        startsAt: { $lt: session.endsAt },
        endsAt: { $gt: session.startsAt },
      }).sort({ _id: 1 });

      if (concurrent && concurrent._id.toString() < session._id.toString()) {
        session.startsAt = originalStartsAt;
        session.endsAt = originalEndsAt;
        await session.save();
        throw new ApiError(409, 'Team already has a scheduled training session overlapping this time window');
      }
    }

    await auditService.logAudit({
      actor: user.id,
      action: 'SESSION_UPDATED',
      targetType: 'TrainingSession',
      targetId: session._id,
      meta: { title: session.title },
      ip,
      userAgent,
    });

    return session;
  }

  /**
   * Cancel a scheduled session.
   */
  async cancelSession(
    id: string,
    input: CancelSessionInput,
    user: { id: string; role: string },
    ip?: string,
    userAgent?: string
  ): Promise<ITrainingSession> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(id);
    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    await this.verifyCoachSessionAccess(session, user);

    if (session.status === 'Cancelled' || session.status === 'Completed') {
      throw new ApiError(400, `Session is already ${session.status.toLowerCase()} and cannot be cancelled`);
    }

    session.status = 'Cancelled';
    if (input.reason) {
      session.notes = session.notes ? `${session.notes} (Cancellation reason: ${input.reason})` : `Cancellation reason: ${input.reason}`;
    }

    await session.save();

    await auditService.logAudit({
      actor: user.id,
      action: 'SESSION_CANCELLED',
      targetType: 'TrainingSession',
      targetId: session._id,
      meta: { title: session.title, reason: input.reason },
      ip,
      userAgent,
    });

    return session;
  }

  /**
   * Delete session (Admin only, allowed only when no attendance exists).
   */
  async deleteSession(
    id: string,
    user: { id: string; role: string },
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(id);
    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    const attendanceCount = await Attendance.countDocuments({ session: session._id });
    if (attendanceCount > 0) {
      throw new ApiError(409, 'Cannot delete session with attendance records; cancel it instead');
    }

    await TrainingSession.findByIdAndDelete(session._id);

    await auditService.logAudit({
      actor: user.id,
      action: 'SESSION_DELETED',
      targetType: 'TrainingSession',
      targetId: session._id,
      meta: { title: session.title },
      ip,
      userAgent,
    });
  }

  /**
   * Get attendance roster for a session, merging current team roster and historical attendees.
   */
  async getSessionAttendanceRoster(
    sessionId: string,
    user: { id: string; role: string }
  ): Promise<SessionAttendanceRosterDto> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    await this.verifyCoachSessionAccess(session, user);

    // 1. Current roster athletes on team
    const currentRoster = await Athlete.find({
      team: session.team,
      status: { $in: ['Active', 'Injured', 'Trial'] },
    }).populate('user', 'name');

    // 2. Existing attendance records for this session
    const existingRecords = await Attendance.find({ session: session._id }).populate({
      path: 'athlete',
      populate: { path: 'user', select: 'name' },
    });

    const recordMap = new Map<string, IAttendance>();
    for (const r of existingRecords) {
      recordMap.set(r.athlete._id.toString(), r);
    }

    const seenAthleteIds = new Set<string>();
    const rosterItems: RosterAttendanceItem[] = [];

    // Add current roster athletes
    for (const a of currentRoster) {
      const aId = a._id.toString();
      seenAthleteIds.add(aId);
      const rec = recordMap.get(aId);
      const name = (a.user as unknown as { name?: string })?.name || 'Athlete';
      rosterItems.push({
        athlete: { id: aId, name },
        athleteId: aId,
        athleteName: name,
        status: rec ? rec.status : null,
        note: rec ? rec.note || null : null,
        onRoster: true,
      });
    }

    // Add historical attendees who may have left the team (Note 6: onRoster: false)
    for (const r of existingRecords) {
      const aId = r.athlete._id.toString();
      if (!seenAthleteIds.has(aId)) {
        seenAthleteIds.add(aId);
        const name =
          ((r.athlete as unknown as { user?: { name?: string } })?.user?.name) || 'Former Athlete';
        rosterItems.push({
          athlete: { id: aId, name },
          athleteId: aId,
          athleteName: name,
          status: r.status,
          note: r.note || null,
          onRoster: false,
        });
      }
    }

    // Sort alphabetically by athlete name
    rosterItems.sort((a, b) => a.athleteName.localeCompare(b.athleteName));

    const summary: AttendanceSummary = {
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
      total: rosterItems.length,
      attendanceRate: null,
    };
    for (const item of rosterItems) {
      if (item.status === 'Present') summary.present++;
      else if (item.status === 'Late') summary.late++;
      else if (item.status === 'Excused') summary.excused++;
      else if (item.status === 'Absent') summary.absent++;
    }
    const denom = summary.present + summary.late + summary.absent;
    summary.attendanceRate =
      denom > 0 ? Math.round(((summary.present + summary.late) / denom) * 1000) / 10 : null;

    return {
      session: {
        id: session.id,
        title: session.title,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        status: session.status,
      },
      summary,
      records: rosterItems,
    };
  }

  /**
   * Bulk upsert attendance records with atomic operations and auto-complete logic.
   */
  async markAttendance(
    sessionId: string,
    input: AttendanceUpsertInput,
    user: { id: string; role: string },
    ip?: string,
    userAgent?: string
  ): Promise<{ count: number; status: string }> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new ApiError(404, 'Training session not found');
    }

    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'Training session not found');
    }

    await this.verifyCoachSessionAccess(session, user);

    // Validate duplicate athlete IDs inside one request (item 2a)
    const athleteIdStrings = input.records.map((r) => r.athlete);
    if (new Set(athleteIdStrings).size !== athleteIdStrings.length) {
      throw new ApiError(400, 'Duplicate athlete ID in attendance records');
    }

    if (session.status === 'Cancelled') {
      throw new ApiError(400, 'Cannot mark attendance for a cancelled session');
    }

    // Note 5: attendance can be marked only when session.startsAt <= now (else 400)
    if (new Date(session.startsAt) > new Date()) {
      throw new ApiError(400, 'Attendance can only be marked after or during the session start time');
    }

    // Validate that every submitted athlete belongs to this team's roster or has past record
    const athleteIds = input.records.map((r) => new Types.ObjectId(r.athlete));
    const validAthletes = await Athlete.find({
      _id: { $in: athleteIds },
      team: session.team,
      status: { $in: ['Active', 'Injured', 'Trial'] },
    }).select('_id');

    const validIdSet = new Set(validAthletes.map((a) => a._id.toString()));

    // Also allow athletes who already have an existing attendance record for this session
    const existingAttendees = await Attendance.find({
      session: session._id,
      athlete: { $in: athleteIds },
    }).select('athlete');

    for (const ea of existingAttendees) {
      validIdSet.add(ea.athlete.toString());
    }

    for (const r of input.records) {
      if (!validIdSet.has(r.athlete)) {
        throw new ApiError(400, `Athlete ${r.athlete} does not belong to this team's roster`);
      }
    }

    // Atomic bulk upsert per record via bulkWrite backed by { session: 1, athlete: 1 } unique index
    const operations = input.records.map((r) => ({
      updateOne: {
        filter: { session: session._id, athlete: new Types.ObjectId(r.athlete) },
        update: {
          $set: {
            status: r.status,
            note: r.note?.trim() || undefined,
            markedBy: new Types.ObjectId(user.id),
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    // Auto-Completed rule (Note 5):
    // After a successful mark of a session whose end time has passed, set status Completed
    if (new Date() > new Date(session.endsAt) && session.status === 'Scheduled') {
      session.status = 'Completed';
      await session.save();
    }

    await auditService.logAudit({
      actor: user.id,
      action: 'ATTENDANCE_MARKED',
      targetType: 'TrainingSession',
      targetId: session._id,
      meta: { count: input.records.length, sessionTitle: session.title },
      ip,
      userAgent,
    });

    return { count: input.records.length, status: session.status };
  }

  /**
   * Get attendance history and attendance rate summary for an athlete.
   * attendanceRate formula: (present + late) / (present + late + absent) * 100
   * Excused absences are not counted in denominator or numerator.
   * If denominator is 0, attendanceRate is null.
   */
  async getAthleteAttendance(
    athleteId: string,
    query: AthleteAttendanceQueryInput,
    user: { id: string; role: string }
  ): Promise<{
    items: Array<{
      id: string;
      session: { id: string; title: string; startsAt: string; type: string; venue: string } | null;
      status: string;
      note?: string;
      createdAt: string;
    }>;
    pagination: PaginatedResult<unknown>['pagination'];
    summary: AttendanceSummary;
  }> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(404, 'Athlete not found');
    }

    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    // Scoping check (Note 2)
    if (user.role === 'Athlete') {
      if (!athlete.user || !athlete.user.equals(new Types.ObjectId(user.id))) {
        throw new ApiError(404, 'Athlete not found');
      }
    } else if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: new Types.ObjectId(user.id) });
      if (!coach) {
        throw new ApiError(404, 'Athlete not found');
      }
      const teams = await Team.find({ coach: coach._id }).select('_id');
      const teamIdStrings = new Set(teams.map((t) => t._id.toString()));
      if (!athlete.team || !teamIdStrings.has(athlete.team.toString())) {
        throw new ApiError(404, 'Athlete not found');
      }
    } else if (user.role !== 'Admin') {
      throw new ApiError(403, 'Access denied');
    }

    const { page, limit, skip } = parsePagination(query as Record<string, unknown>);

    const [records, total, allStatuses] = await Promise.all([
      Attendance.find({ athlete: athlete._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('session', 'title type venue startsAt endsAt status'),
      Attendance.countDocuments({ athlete: athlete._id }),
      Attendance.aggregate([
        { $match: { athlete: athlete._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const summary: AttendanceSummary = {
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
      total: 0,
      attendanceRate: null,
    };

    for (const s of allStatuses) {
      if (s._id === 'Present') summary.present += s.count;
      else if (s._id === 'Late') summary.late += s.count;
      else if (s._id === 'Excused') summary.excused += s.count;
      else if (s._id === 'Absent') summary.absent += s.count;
      summary.total += s.count;
    }

    // FORMULA: attendanceRate = (present + late) / (present + late + absent) * 100
    // Excused is not counted in denominator or numerator.
    const denominator = summary.present + summary.late + summary.absent;
    summary.attendanceRate =
      denominator > 0 ? Math.round(((summary.present + summary.late) / denominator) * 1000) / 10 : null;

    const items = records.map((r) => {
      const sess = r.session as unknown as ITrainingSession | null;
      return {
        id: r.id,
        session: sess
          ? {
              id: sess.id,
              title: sess.title,
              startsAt: sess.startsAt ? sess.startsAt.toISOString() : '',
              type: sess.type,
              venue: sess.venue,
            }
          : null,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const paginated = formatPaginatedResponse(items, total, page, limit);

    return {
      items: paginated.data,
      pagination: paginated.pagination,
      summary,
    };
  }
}

export const trainingService = new TrainingService();
