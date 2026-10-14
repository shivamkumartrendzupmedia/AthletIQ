import { Types } from 'mongoose';
import {
  Tournament,
  type ITournament,
  TournamentTeam,
  type ITournamentTeam,
  Venue,
  type IVenue,
  Match,
  type IMatch,
  MatchEvent,
  type IMatchEvent,
  Sport,
  Team,
  Coach,
  Athlete,
  AuditLog,
  type TournamentStatus,
  type MatchEventType,
  type MatchEventSide,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { notify } from './notification.service.js';

interface AuthUser {
  id: string;
  role: string;
}

export class TournamentService {
  // ==========================================
  // TOURNAMENTS
  // ==========================================

  async createTournament(
    data: {
      name: string;
      sport: string;
      category: string;
      ageGroup: string;
      format: 'League' | 'Knockout';
      startDate: string;
      endDate: string;
      rules?: string;
      maxTeams?: number;
      status?: TournamentStatus;
    },
    user: AuthUser
  ): Promise<ITournament> {
    const sportExists = await Sport.findById(data.sport);
    if (!sportExists) {
      throw new ApiError(404, 'Sport not found');
    }

    const tournament = await Tournament.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      organizer: new Types.ObjectId(user.id),
      status: data.status ?? 'Draft',
    });

    await AuditLog.create({
      action: 'TOURNAMENT_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: tournament._id,
      targetType: 'Tournament',
      meta: { tournamentId: tournament._id.toString() },
    });

    return tournament;
  }

  async listTournaments(
    query: {
      sport?: string;
      status?: TournamentStatus;
      format?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    user?: AuthUser
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.sport) filter.sport = new Types.ObjectId(query.sport);
    if (query.format) filter.format = query.format;
    if (query.search) {
      const sanitized = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: sanitized, $options: 'i' };
    }

    if (!user || user.role === 'Athlete' || user.role === 'Coach') {
      filter.status = query.status && query.status !== 'Draft' ? query.status : { $ne: 'Draft' };
    } else if (user.role === 'Organizer') {
      if (query.status) {
        if (query.status === 'Draft') {
          filter.status = 'Draft';
          filter.organizer = new Types.ObjectId(user.id);
        } else {
          filter.status = query.status;
        }
      } else {
        filter.$or = [
          { status: { $ne: 'Draft' } },
          { status: 'Draft', organizer: new Types.ObjectId(user.id) },
        ];
      }
    } else if (user.role === 'Admin') {
      if (query.status) filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      Tournament.find(filter)
        .populate('sport', 'name code')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTournamentById(id: string, user?: AuthUser): Promise<ITournament> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(id).populate('sport', 'name code');
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status === 'Draft') {
      if (!user) {
        throw new ApiError(404, 'Tournament not found');
      }
      if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
        throw new ApiError(404, 'Tournament not found');
      }
    }

    return tournament;
  }

  async updateTournament(
    id: string,
    data: {
      name?: string;
      sport?: string;
      category?: string;
      ageGroup?: string;
      format?: 'League' | 'Knockout';
      startDate?: string;
      endDate?: string;
      rules?: string;
      maxTeams?: number;
      status?: TournamentStatus;
    },
    user: AuthUser
  ): Promise<ITournament> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    // Scope check: Admin or owning Organizer
    if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Tournament not found');
    }

    // Status transition rules:
    // Draft -> Registration Open -> In Progress -> Completed
    // Cancelled from Draft, Registration Open, In Progress
    // Nothing leaves Completed or Cancelled
    if (data.status && data.status !== tournament.status) {
      if (tournament.status === 'Completed' || tournament.status === 'Cancelled') {
        throw new ApiError(400, `Cannot change status of a ${tournament.status} tournament`);
      }

      const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
        Draft: ['Registration Open', 'Cancelled'],
        'Registration Open': ['In Progress', 'Cancelled'],
        'In Progress': ['Completed', 'Cancelled'],
        Completed: [],
        Cancelled: [],
      };

      if (!validTransitions[tournament.status].includes(data.status)) {
        throw new ApiError(
          400,
          `Invalid status transition from ${tournament.status} to ${data.status}`
        );
      }
    }

    if (data.maxTeams !== undefined) {
      if (data.maxTeams < tournament.approvedTeamsCount) {
        throw new ApiError(
          400,
          `maxTeams cannot be lower than current approved teams (${tournament.approvedTeamsCount})`
        );
      }
    }

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate) updatePayload.endDate = new Date(data.endDate);

    const updated = await Tournament.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).populate('sport', 'name code');

    if (!updated) {
      throw new ApiError(404, 'Tournament not found');
    }

    await AuditLog.create({
      action: 'TOURNAMENT_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: updated._id,
      targetType: 'Tournament',
      meta: { tournamentId: updated._id.toString() },
    });

    return updated;
  }

  async deleteTournament(id: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status !== 'Draft') {
      throw new ApiError(409, 'Only Draft tournaments can be deleted');
    }

    const regCount = await TournamentTeam.countDocuments({ tournament: id });
    if (regCount > 0) {
      throw new ApiError(409, 'Cannot delete tournament with existing team registrations');
    }

    await Tournament.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'TOURNAMENT_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: new Types.ObjectId(id),
      targetType: 'Tournament',
      meta: { tournamentId: id },
    });
  }

  // ==========================================
  // TOURNAMENT REGISTRATIONS (TournamentTeam)
  // ==========================================

  async registerTeam(
    tournamentId: string,
    data: { team: string; squad?: string[] },
    user: AuthUser
  ): Promise<ITournamentTeam> {
    if (!Types.ObjectId.isValid(tournamentId) || !Types.ObjectId.isValid(data.team)) {
      throw new ApiError(400, 'Invalid ID format');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status !== 'Registration Open') {
      throw new ApiError(400, 'Tournament registration is not open');
    }

    // Coach can register ONLY a team he coaches
    if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: user.id });
      if (!coach) {
        throw new ApiError(404, 'Coach profile not found');
      }
      const isCoaching = await Team.exists({ _id: data.team, coach: coach._id });
      if (!isCoaching) {
        throw new ApiError(404, 'Team not coached by this user');
      }
    }

    const team = await Team.findById(data.team);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (team.sport.toString() !== tournament.sport.toString()) {
      throw new ApiError(400, "Team sport does not match tournament's sport");
    }

    // Validate squad athletes: active and belong to this team, no duplicates
    const rawSquad = data.squad ?? [];
    const uniqueSquad = Array.from(new Set(rawSquad));
    if (uniqueSquad.length !== rawSquad.length) {
      throw new ApiError(400, 'Duplicate athletes in squad');
    }
    if (uniqueSquad.length > 30) {
      throw new ApiError(400, 'Squad cannot exceed 30 athletes');
    }

    if (uniqueSquad.length > 0) {
      const athletes = await Athlete.find({
        _id: { $in: uniqueSquad.map((id) => new Types.ObjectId(id)) },
        team: team._id,
        status: 'Active',
      });
      if (athletes.length !== uniqueSquad.length) {
        throw new ApiError(400, 'All squad athletes must be active members of the team');
      }
    }

    try {
      const reg = await TournamentTeam.create({
        tournament: new Types.ObjectId(tournamentId),
        team: new Types.ObjectId(data.team),
        squad: uniqueSquad.map((id) => new Types.ObjectId(id)),
        status: 'Pending',
        registeredBy: new Types.ObjectId(user.id),
      });

      await AuditLog.create({
        action: 'TOURNAMENT_TEAM_REGISTERED',
        actor: new Types.ObjectId(user.id),
        targetId: reg._id,
        targetType: 'TournamentTeam',
        meta: {
          tournamentId,
          teamId: data.team,
        },
      });

      return reg;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
        throw new ApiError(409, 'Team is already registered for this tournament');
      }
      throw err;
    }
  }

  async listRegistrations(tournamentId: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status === 'Draft' && user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Tournament not found');
    }

    const filter: Record<string, unknown> = { tournament: new Types.ObjectId(tournamentId) };

    if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: user.id });
      const coachedTeams = coach ? await Team.find({ coach: coach._id }).select('_id') : [];
      filter.team = { $in: coachedTeams.map((t) => t._id) };
    } else if (user.role === 'Athlete') {
      const athlete = await Athlete.findOne({ user: user.id });
      filter.team = athlete?.team ? athlete.team : new Types.ObjectId();
    }

    return TournamentTeam.find(filter)
      .populate('team', 'name code logo')
      .populate('squad', 'name jerseyNumber position')
      .sort({ createdAt: 1 });
  }

  async updateSquad(registrationId: string, squad: string[], user: AuthUser): Promise<ITournamentTeam> {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new ApiError(400, 'Invalid registration ID');
    }

    const reg = await TournamentTeam.findById(registrationId);
    if (!reg) {
      throw new ApiError(404, 'Registration not found');
    }

    // Scope check: registeredBy or coach of team
    if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: user.id });
      const isCoachOfTeam = coach ? await Team.exists({ _id: reg.team, coach: coach._id }) : false;
      const isRegistrar = reg.registeredBy.toString() === user.id;
      if (!isCoachOfTeam && !isRegistrar) {
        throw new ApiError(404, 'Registration not found');
      }
    } else if (user.role !== 'Admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const tournament = await Tournament.findById(reg.tournament);
    if (!tournament || tournament.status !== 'Registration Open') {
      throw new ApiError(400, 'Cannot edit squad when tournament registration is not open');
    }

    if (reg.status === 'Rejected') {
      throw new ApiError(400, 'Cannot update squad of a rejected registration');
    }

    const uniqueSquad = Array.from(new Set(squad));
    if (uniqueSquad.length !== squad.length) {
      throw new ApiError(400, 'Duplicate athletes in squad');
    }
    if (uniqueSquad.length > 30) {
      throw new ApiError(400, 'Squad cannot exceed 30 athletes');
    }

    if (uniqueSquad.length > 0) {
      const athletes = await Athlete.find({
        _id: { $in: uniqueSquad.map((id) => new Types.ObjectId(id)) },
        team: reg.team,
        status: 'Active',
      });
      if (athletes.length !== uniqueSquad.length) {
        throw new ApiError(400, 'All squad athletes must be active members of the team');
      }
    }

    reg.squad = uniqueSquad.map((id) => new Types.ObjectId(id));
    await reg.save();

    await AuditLog.create({
      action: 'TOURNAMENT_TEAM_SQUAD_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: reg._id,
      targetType: 'TournamentTeam',
      meta: { registrationId: reg._id.toString() },
    });

    return reg;
  }

  async reviewRegistration(
    registrationId: string,
    data: { status: 'Approved' | 'Rejected'; reason?: string },
    user: AuthUser
  ): Promise<ITournamentTeam> {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new ApiError(400, 'Invalid registration ID');
    }

    const reg = await TournamentTeam.findById(registrationId);
    if (!reg) {
      throw new ApiError(404, 'Registration not found');
    }

    const tournament = await Tournament.findById(reg.tournament);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    // Scope check: Admin or owning Organizer
    if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Registration not found');
    }

    // Review only Pending -> Approved | Rejected (second review 409)
    if (reg.status !== 'Pending') {
      throw new ApiError(409, 'Registration has already been reviewed');
    }

    if (data.status === 'Rejected' && (!data.reason || data.reason.trim().length === 0)) {
      throw new ApiError(400, 'Reason is required when rejecting a registration');
    }

    if (data.status === 'Approved') {
      // Atomic maxTeams reservation
      const updatedTourney = await Tournament.findOneAndUpdate(
        {
          _id: tournament._id,
          $or: [
            { maxTeams: { $exists: false } },
            { maxTeams: null },
            { $expr: { $lt: ['$approvedTeamsCount', '$maxTeams'] } },
          ],
        },
        { $inc: { approvedTeamsCount: 1 } },
        { new: true }
      );

      if (!updatedTourney) {
        throw new ApiError(400, 'Tournament has reached maximum approved teams capacity');
      }

      // Update registration atomically
      const updatedReg = await TournamentTeam.findOneAndUpdate(
        { _id: reg._id, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            reason: data.reason,
            reviewedBy: new Types.ObjectId(user.id),
            reviewedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedReg) {
        // Rollback tournament counter if race occurred on registration
        await Tournament.findByIdAndUpdate(tournament._id, { $inc: { approvedTeamsCount: -1 } });
        throw new ApiError(409, 'Registration was already reviewed');
      }

      await AuditLog.create({
        action: 'TOURNAMENT_TEAM_REVIEWED',
        actor: new Types.ObjectId(user.id),
        targetId: updatedReg._id,
        targetType: 'TournamentTeam',
        meta: {
          registrationId: updatedReg._id.toString(),
          status: 'Approved',
        },
      });

      return updatedReg;
    } else {
      // Status is Rejected
      reg.status = 'Rejected';
      reg.reason = data.reason;
      reg.reviewedBy = new Types.ObjectId(user.id);
      reg.reviewedAt = new Date();
      await reg.save();

      await AuditLog.create({
        action: 'TOURNAMENT_TEAM_REVIEWED',
        actor: new Types.ObjectId(user.id),
        targetId: reg._id,
        targetType: 'TournamentTeam',
        meta: {
          registrationId: reg._id.toString(),
          status: 'Rejected',
        },
      });

      return reg;
    }
  }

  async withdrawRegistration(registrationId: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new ApiError(400, 'Invalid registration ID');
    }

    const reg = await TournamentTeam.findById(registrationId);
    if (!reg) {
      throw new ApiError(404, 'Registration not found');
    }

    if (user.role === 'Coach') {
      const isRegistrar = reg.registeredBy.toString() === user.id;
      if (!isRegistrar) {
        throw new ApiError(404, 'Registration not found');
      }
    } else if (user.role !== 'Admin') {
      throw new ApiError(403, 'Forbidden');
    }

    if (reg.status !== 'Pending') {
      throw new ApiError(400, 'Only Pending registrations can be withdrawn');
    }

    await TournamentTeam.findByIdAndDelete(registrationId);

    await AuditLog.create({
      action: 'TOURNAMENT_TEAM_WITHDRAWN',
      actor: new Types.ObjectId(user.id),
      targetId: new Types.ObjectId(registrationId),
      targetType: 'TournamentTeam',
      meta: { registrationId },
    });
  }

  // ==========================================
  // VENUES
  // ==========================================

  async createVenue(
    data: { name: string; address: string; capacity?: number; active?: boolean },
    user: AuthUser
  ): Promise<IVenue> {
    const venue = await Venue.create({
      ...data,
      createdBy: new Types.ObjectId(user.id),
      active: data.active ?? true,
    });

    await AuditLog.create({
      action: 'VENUE_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: venue._id,
      targetType: 'Venue',
      meta: { venueId: venue._id.toString() },
    });

    return venue;
  }

  async listVenues(user?: AuthUser): Promise<IVenue[]> {
    const filter: Record<string, unknown> = {};
    if (!user || user.role !== 'Admin') {
      filter.active = true;
    }
    return Venue.find(filter).sort({ name: 1 });
  }

  async updateVenue(
    id: string,
    data: { name?: string; address?: string; capacity?: number; active?: boolean },
    user: AuthUser
  ): Promise<IVenue> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid venue ID');
    }

    const venue = await Venue.findById(id);
    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    if (user.role !== 'Admin' && venue.createdBy.toString() !== user.id) {
      throw new ApiError(404, 'Venue not found');
    }

    const updated = await Venue.findByIdAndUpdate(id, data, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Venue not found');
    }

    await AuditLog.create({
      action: 'VENUE_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: updated._id,
      targetType: 'Venue',
      meta: { venueId: updated._id.toString() },
    });

    return updated;
  }

  async deleteVenue(id: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid venue ID');
    }

    const venue = await Venue.findById(id);
    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    if (user.role !== 'Admin' && venue.createdBy.toString() !== user.id) {
      throw new ApiError(404, 'Venue not found');
    }

    const matchCount = await Match.countDocuments({ venue: id });
    if (matchCount > 0) {
      throw new ApiError(409, 'Cannot delete venue referenced by existing matches');
    }

    await Venue.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'VENUE_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: new Types.ObjectId(id),
      targetType: 'Venue',
      meta: { venueId: id },
    });
  }

  // ==========================================
  // MATCHES
  // ==========================================

  async createMatch(
    tournamentId: string,
    data: {
      homeTeam: string;
      awayTeam: string;
      round: string;
      group?: string;
      scheduledAt: string;
      durationMinutes?: number;
      venue: string;
    },
    user: AuthUser
  ): Promise<IMatch> {
    if (
      !Types.ObjectId.isValid(tournamentId) ||
      !Types.ObjectId.isValid(data.homeTeam) ||
      !Types.ObjectId.isValid(data.awayTeam) ||
      !Types.ObjectId.isValid(data.venue)
    ) {
      throw new ApiError(400, 'Invalid ID format');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status !== 'Registration Open' && tournament.status !== 'In Progress') {
      throw new ApiError(
        400,
        'Matches can only be scheduled when tournament is Registration Open or In Progress'
      );
    }

    if (data.homeTeam === data.awayTeam) {
      throw new ApiError(400, 'homeTeam and awayTeam must be different');
    }

    const [homeReg, awayReg] = await Promise.all([
      TournamentTeam.findOne({
        _id: data.homeTeam,
        tournament: tournamentId,
        status: 'Approved',
      }),
      TournamentTeam.findOne({
        _id: data.awayTeam,
        tournament: tournamentId,
        status: 'Approved',
      }),
    ]);

    if (!homeReg || !awayReg) {
      throw new ApiError(400, 'Both home and away teams must be approved in this tournament');
    }

    const scheduledAt = new Date(data.scheduledAt);
    const durationMinutes = data.durationMinutes ?? 90;
    const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

    // Overlap checks using Interval Query Window Pattern
    await this.checkMatchOverlaps({
      venueId: data.venue,
      homeTeamId: data.homeTeam,
      awayTeamId: data.awayTeam,
      scheduledAt,
      endsAt,
    });

    const match = await Match.create({
      tournament: new Types.ObjectId(tournamentId),
      homeTeam: new Types.ObjectId(data.homeTeam),
      awayTeam: new Types.ObjectId(data.awayTeam),
      round: data.round,
      group: data.group,
      scheduledAt,
      durationMinutes,
      endsAt,
      venue: new Types.ObjectId(data.venue),
      status: 'Scheduled',
    });

    // Post-insert concurrency race check (Interval Query Window Rollback pattern from training.service.ts):
    // Re-query overlapping matches for venue or teams excluding itself.
    // If another match exists with an earlier _id, revert and return 409.
    const venueRaceConflict = await Match.findOne({
      _id: { $ne: match._id },
      venue: match.venue,
      status: { $ne: 'Cancelled' },
      scheduledAt: { $lt: endsAt },
      endsAt: { $gt: scheduledAt },
    }).sort({ _id: 1 });

    if (venueRaceConflict && venueRaceConflict._id.toString() < match._id.toString()) {
      await Match.findByIdAndDelete(match._id);
      throw new ApiError(409, 'Venue is already booked for another match during this time window');
    }

    const teamRaceConflict = await Match.findOne({
      _id: { $ne: match._id },
      status: { $ne: 'Cancelled' },
      scheduledAt: { $lt: endsAt },
      endsAt: { $gt: scheduledAt },
      $or: [
        { homeTeam: { $in: [match.homeTeam, match.awayTeam] } },
        { awayTeam: { $in: [match.homeTeam, match.awayTeam] } },
      ],
    }).sort({ _id: 1 });

    if (teamRaceConflict && teamRaceConflict._id.toString() < match._id.toString()) {
      await Match.findByIdAndDelete(match._id);
      throw new ApiError(409, 'One of the teams is already scheduled for another match during this time window');
    }

    await AuditLog.create({
      action: 'MATCH_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: match._id,
      targetType: 'Match',
      meta: {
        tournamentId,
        matchId: match._id.toString(),
      },
    });

    return match;
  }

  async listMatches(tournamentId: string, user?: AuthUser) {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (user?.role === 'Organizer' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tournament.status === 'Draft' && (!user || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id))) {
      throw new ApiError(404, 'Tournament not found');
    }

    return Match.find({ tournament: tournamentId })
      .populate({
        path: 'homeTeam',
        select: 'team status',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team status',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate('venue', 'name address')
      .sort({ scheduledAt: 1 });
  }

  async getMatchById(id: string, user?: AuthUser): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(id)
      .populate({
        path: 'homeTeam',
        select: 'team status',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team status',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate('venue', 'name address');

    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      throw new ApiError(404, 'Match not found');
    }

    if (user?.role === 'Organizer' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Match not found');
    }

    if (
      tournament.status === 'Draft' &&
      (!user || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id))
    ) {
      throw new ApiError(404, 'Match not found');
    }

    const matchObj: Record<string, unknown> = match.toJSON();

    const isPrivileged =
      user &&
      (user.role === 'Admin' ||
        (user.role === 'Organizer' && tournament.organizer.toString() === user.id));

    if (isPrivileged) {
      const homeTeamDoc = match.homeTeam as unknown as { _id?: Types.ObjectId } | null;
      const awayTeamDoc = match.awayTeam as unknown as { _id?: Types.ObjectId } | null;
      const homeTeamId = homeTeamDoc?._id ?? match.homeTeam;
      const awayTeamId = awayTeamDoc?._id ?? match.awayTeam;

      const [homeTt, awayTt] = await Promise.all([
        TournamentTeam.findById(homeTeamId).populate({
          path: 'squad',
          select: '_id user',
          populate: { path: 'user', select: '_id name' },
        }),
        TournamentTeam.findById(awayTeamId).populate({
          path: 'squad',
          select: '_id user',
          populate: { path: 'user', select: '_id name' },
        }),
      ]);

      const formatSquad = (tt: unknown): Array<{ id: string; name: string }> => {
        if (!tt || typeof tt !== 'object' || !('squad' in tt)) return [];
        const squadArr = (tt as { squad: unknown }).squad;
        if (!Array.isArray(squadArr)) return [];
        return squadArr.map((ath) => {
          const athleteObj = ath as { _id?: Types.ObjectId; user?: { name?: string } };
          const athId = athleteObj._id ? athleteObj._id.toString() : String(ath);
          const name =
            athleteObj.user && typeof athleteObj.user === 'object' && typeof athleteObj.user.name === 'string'
              ? athleteObj.user.name
              : 'Athlete';
          return { id: athId, name };
        });
      };

      matchObj.homeSquad = formatSquad(homeTt);
      matchObj.awaySquad = formatSquad(awayTt);
    }

    return matchObj;
  }

  async updateMatch(
    id: string,
    data: {
      round?: string;
      group?: string;
      scheduledAt?: string;
      durationMinutes?: number;
      venue?: string;
      status?: 'Scheduled' | 'Completed' | 'Cancelled';
    },
    user: AuthUser
  ): Promise<IMatch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(id);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id)) {
      throw new ApiError(404, 'Match not found');
    }

    if (match.status === 'Completed' || match.status === 'Cancelled') {
      throw new ApiError(400, `Cannot update a ${match.status} match`);
    }

    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : match.scheduledAt;
    const durationMinutes = data.durationMinutes ?? match.durationMinutes;
    const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const venueId = data.venue ?? match.venue.toString();

    if (data.scheduledAt || data.durationMinutes || data.venue) {
      await this.checkMatchOverlaps({
        venueId,
        homeTeamId: match.homeTeam.toString(),
        awayTeamId: match.awayTeam.toString(),
        scheduledAt,
        endsAt,
        excludeMatchId: id,
      });
    }

    const updatePayload: Record<string, unknown> = {
      ...data,
      scheduledAt,
      durationMinutes,
      endsAt,
    };

    const updated = await Match.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Match not found');
    }

    if (data.scheduledAt || data.durationMinutes || data.venue) {
      const venueConflict = await Match.findOne({
        _id: { $ne: updated._id },
        venue: updated.venue,
        status: { $ne: 'Cancelled' },
        scheduledAt: { $lt: updated.endsAt },
        endsAt: { $gt: updated.scheduledAt },
      }).sort({ _id: 1 });

      if (venueConflict && venueConflict._id.toString() < updated._id.toString()) {
        await Match.findByIdAndUpdate(id, {
          scheduledAt: match.scheduledAt,
          durationMinutes: match.durationMinutes,
          endsAt: match.endsAt,
          venue: match.venue,
        });
        throw new ApiError(409, 'Venue is already booked for another match during this time window');
      }

      const teamConflict = await Match.findOne({
        _id: { $ne: updated._id },
        status: { $ne: 'Cancelled' },
        scheduledAt: { $lt: updated.endsAt },
        endsAt: { $gt: updated.scheduledAt },
        $or: [
          { homeTeam: { $in: [updated.homeTeam, updated.awayTeam] } },
          { awayTeam: { $in: [updated.homeTeam, updated.awayTeam] } },
        ],
      }).sort({ _id: 1 });

      if (teamConflict && teamConflict._id.toString() < updated._id.toString()) {
        await Match.findByIdAndUpdate(id, {
          scheduledAt: match.scheduledAt,
          durationMinutes: match.durationMinutes,
          endsAt: match.endsAt,
          venue: match.venue,
        });
        throw new ApiError(409, 'One of the teams is already scheduled for another match during this time window');
      }
    }

    await AuditLog.create({
      action: 'MATCH_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: updated._id,
      targetType: 'Match',
      meta: { matchId: id },
    });

    return updated;
  }

  async enterMatchResult(
    id: string,
    resultData: { homeScore: number; awayScore: number },
    user: AuthUser
  ): Promise<IMatch> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(id);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id)) {
      throw new ApiError(404, 'Match not found');
    }

    if (match.status !== 'Scheduled' && match.status !== 'Completed') {
      throw new ApiError(400, `Cannot enter result for a ${match.status} match`);
    }

    const eventCount = await MatchEvent.countDocuments({ match: match._id });
    if (eventCount > 0) {
      throw new ApiError(409, 'Cannot manually enter result for a match that has match events');
    }

    if (match.status === 'Scheduled') {
      const now = new Date();
      if (match.scheduledAt.getTime() > now.getTime()) {
        throw new ApiError(400, 'Cannot enter result before the scheduled match time');
      }
    }

    match.result = {
      homeScore: resultData.homeScore,
      awayScore: resultData.awayScore,
      enteredBy: new Types.ObjectId(user.id),
      enteredAt: new Date(),
    };
    match.liveScore = {
      home: resultData.homeScore,
      away: resultData.awayScore,
    };
    match.status = 'Completed';
    match.completedAt = match.completedAt || new Date();
    await match.save();

    await AuditLog.create({
      action: 'MATCH_RESULT_ENTERED',
      actor: new Types.ObjectId(user.id),
      targetId: match._id,
      targetType: 'Match',
      meta: {
        matchId: id,
        homeScore: resultData.homeScore,
        awayScore: resultData.awayScore,
      },
    });

    return match;
  }

  async deleteMatch(id: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(id);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id)) {
      throw new ApiError(404, 'Match not found');
    }

    if (match.status !== 'Scheduled') {
      throw new ApiError(400, 'Only Scheduled matches can be deleted');
    }

    await Match.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'MATCH_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: new Types.ObjectId(id),
      targetType: 'Match',
      meta: { matchId: id },
    });
  }

  // ==========================================
  // HELPER: OVERLAP CHECKING
  // ==========================================

  private async checkMatchOverlaps(params: {
    venueId: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
    endsAt: Date;
    excludeMatchId?: string;
  }): Promise<void> {
    const baseFilter: Record<string, unknown> = {
      status: { $ne: 'Cancelled' },
      scheduledAt: { $lt: params.endsAt },
      endsAt: { $gt: params.scheduledAt },
    };

    if (params.excludeMatchId) {
      baseFilter._id = { $ne: new Types.ObjectId(params.excludeMatchId) };
    }

    // 1. Venue overlap
    const venueConflict = await Match.findOne({
      ...baseFilter,
      venue: new Types.ObjectId(params.venueId),
    });
    if (venueConflict) {
      throw new ApiError(409, 'Venue is already booked for another match during this time window');
    }

    // 2. Team overlap (either homeTeam or awayTeam in either role)
    const teamConflict = await Match.findOne({
      ...baseFilter,
      $or: [
        { homeTeam: { $in: [new Types.ObjectId(params.homeTeamId), new Types.ObjectId(params.awayTeamId)] } },
        { awayTeam: { $in: [new Types.ObjectId(params.homeTeamId), new Types.ObjectId(params.awayTeamId)] } },
      ],
    });
    if (teamConflict) {
      throw new ApiError(409, 'One of the teams is already scheduled for another match during this time window');
    }
  }

  // ==========================================
  // PUBLIC SANITIZED ENDPOINTS
  // ==========================================

  async getPublicTournaments(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = { status: { $ne: 'Draft' } };

    const [items, total] = await Promise.all([
      Tournament.find(filter)
        .populate('sport', 'name code')
        .select('name sport category ageGroup format startDate endDate rules maxTeams status approvedTeamsCount')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicTournamentById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findOne({ _id: id, status: { $ne: 'Draft' } })
      .populate('sport', 'name code')
      .select('name sport category ageGroup format startDate endDate rules maxTeams status approvedTeamsCount');

    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    return tournament;
  }

  async getPublicTournamentMatches(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findOne({ _id: id, status: { $ne: 'Draft' } });
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    const matches = await Match.find({ tournament: id })
      .populate({
        path: 'homeTeam',
        select: 'team',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team',
        populate: { path: 'team', select: 'name code logo' },
      })
      .populate('venue', 'name')
      .select('round group scheduledAt durationMinutes status result homeTeam awayTeam venue')
      .sort({ scheduledAt: 1 });

    // Sanitize results: only homeScore, awayScore
    return matches.map((m) => ({
      id: m._id.toString(),
      round: m.round,
      group: m.group,
      scheduledAt: m.scheduledAt,
      durationMinutes: m.durationMinutes,
      status: m.status,
      venue: m.venue ? { name: (m.venue as unknown as { name: string }).name } : null,
      homeTeam: (m.homeTeam as unknown as { team?: { name: string; code: string; logo?: string } })?.team ?? null,
      awayTeam: (m.awayTeam as unknown as { team?: { name: string; code: string; logo?: string } })?.team ?? null,
      result: m.result ? { homeScore: m.result.homeScore, awayScore: m.result.awayScore } : null,
    }));
  }

  // ==========================================
  // LIVE MATCH CENTER (STEP 9A)
  // ==========================================

  /**
   * Helper: Format player name to privacy-safe "FirstName L." format.
   */
  private formatPlayerName(athleteDoc: unknown): string | null {
    if (!athleteDoc) return null;
    const ath = athleteDoc as {
      user?: { name?: string };
      name?: string;
      firstName?: string;
      lastName?: string;
    };
    const rawName =
      ath.user?.name ||
      ath.name ||
      (ath.firstName ? `${ath.firstName} ${ath.lastName || ''}`.trim() : null);
    if (!rawName) return null;
    const parts = rawName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
  }

  /**
   * Helper: Compute minute estimate for match in live workflow.
   */
  private computeMinuteEstimate(match: { status: string; startedAt?: Date | null; secondHalfAt?: Date | null }): number {
    if (match.status === 'HalfTime') return 45;
    if (match.status !== 'Live') return 0;
    const now = Date.now();
    if (match.secondHalfAt) {
      const elapsed = Math.floor((now - new Date(match.secondHalfAt).getTime()) / 60000);
      return Math.min(130, Math.max(45, 45 + elapsed));
    }
    if (match.startedAt) {
      const elapsed = Math.floor((now - new Date(match.startedAt).getTime()) / 60000);
      return Math.min(45, Math.max(1, elapsed));
    }
    return 1;
  }

  /**
   * Scoping assertion helper for live match operations:
   * Admin: any match
   * Organizer: matches belonging to tournaments owned by him
   * Other roles: 403
   * Non-existing match or unassigned: 404
   */
  async assertMatchLiveWorkflowAccess(
    matchId: string,
    user: AuthUser
  ): Promise<{ match: IMatch; tournament: ITournament }> {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(matchId);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      throw new ApiError(404, 'Match not found');
    }

    if (user.role === 'Admin') {
      return { match, tournament };
    }

    if (user.role === 'Organizer') {
      if (tournament.organizer.toString() !== user.id) {
        throw new ApiError(404, 'Match not found');
      }
      return { match, tournament };
    }

    throw new ApiError(403, 'Forbidden: Role not authorized for match live workflow');
  }

  /**
   * Atomic state machine transition for Match status:
   * Transitions:
   * Scheduled -> Live (allowed <= 60 min before scheduledAt, tournament In Progress)
   * Live -> HalfTime
   * HalfTime -> Live
   * Live -> Completed (derives score from events, sets result)
   * Scheduled -> Cancelled
   * Terminal statuses (Completed, Cancelled) cannot be transitioned (400).
   * Concurrent conflicts or wrong current status return 409.
   */
  async updateMatchStatus(
    matchId: string,
    targetStatus: string,
    user: AuthUser
  ): Promise<IMatch> {
    const { match, tournament } = await this.assertMatchLiveWorkflowAccess(matchId, user);

    if (match.status === 'Completed' || match.status === 'Cancelled') {
      throw new ApiError(400, `Cannot transition from ${match.status} match`);
    }

    const now = new Date();
    let expectedCurrentStatus: string;
    const updateDoc: Record<string, unknown> = {
      status: targetStatus,
    };

    if (targetStatus === 'Live') {
      if (match.status === 'Scheduled') {
        expectedCurrentStatus = 'Scheduled';
        if (tournament.status !== 'In Progress') {
          throw new ApiError(400, 'Tournament must be In Progress to start a match');
        }
        const earliestAllowed = new Date(match.scheduledAt.getTime() - 60 * 60 * 1000);
        if (now < earliestAllowed) {
          throw new ApiError(400, 'Match cannot be started more than 60 minutes before scheduled time');
        }
        updateDoc.startedAt = now;
      } else if (match.status === 'HalfTime') {
        expectedCurrentStatus = 'HalfTime';
        updateDoc.secondHalfAt = now;
      } else {
        throw new ApiError(409, `Invalid status transition from ${match.status} to Live`);
      }
    } else if (targetStatus === 'HalfTime') {
      if (match.status !== 'Live') {
        throw new ApiError(409, `Invalid status transition from ${match.status} to HalfTime`);
      }
      expectedCurrentStatus = 'Live';
      updateDoc.halfTimeAt = now;
    } else if (targetStatus === 'Completed') {
      if (match.status !== 'Live') {
        throw new ApiError(409, `Invalid status transition from ${match.status} to Completed`);
      }
      expectedCurrentStatus = 'Live';
      updateDoc.completedAt = now;

      // Score derivation from events
      const events = await MatchEvent.find({ match: match._id });
      let homeScore = 0;
      let awayScore = 0;
      for (const e of events) {
        if (e.type === 'Goal') {
          if (e.side === 'home') homeScore++;
          else awayScore++;
        } else if (e.type === 'OwnGoal') {
          if (e.side === 'home') awayScore++;
          else homeScore++;
        }
      }

      updateDoc.result = {
        homeScore,
        awayScore,
        enteredBy: new Types.ObjectId(user.id),
        enteredAt: now,
      };
      updateDoc['liveScore.home'] = homeScore;
      updateDoc['liveScore.away'] = awayScore;
    } else if (targetStatus === 'Cancelled') {
      if (match.status !== 'Scheduled') {
        throw new ApiError(409, `Invalid status transition from ${match.status} to Cancelled`);
      }
      expectedCurrentStatus = 'Scheduled';
    } else {
      throw new ApiError(400, `Unsupported target status: ${targetStatus}`);
    }

    const updated = await Match.findOneAndUpdate(
      { _id: match._id, status: expectedCurrentStatus },
      { $set: updateDoc },
      { new: true }
    );

    if (!updated) {
      throw new ApiError(409, 'Conflict: match status was updated concurrently or current state does not match');
    }

    await AuditLog.create({
      action: 'MATCH_STATUS_CHANGED',
      actor: new Types.ObjectId(user.id),
      targetId: updated._id,
      targetType: 'Match',
      meta: {
        matchId: updated._id.toString(),
        previousStatus: expectedCurrentStatus,
        newStatus: targetStatus,
      },
    });

    // Safe notification dispatch for match participants
    (async () => {
      try {
        const [homeReg, awayReg] = await Promise.all([
          TournamentTeam.findById(updated.homeTeam).select('registeredBy'),
          TournamentTeam.findById(updated.awayTeam).select('registeredBy'),
        ]);
        const recipientIds: Types.ObjectId[] = [];
        if (homeReg?.registeredBy) recipientIds.push(homeReg.registeredBy);
        if (awayReg?.registeredBy) recipientIds.push(awayReg.registeredBy);

        if (recipientIds.length > 0) {
          await notify(recipientIds, {
            type: 'Match',
            title: `Match ${targetStatus}`,
            body: `Match status updated to ${targetStatus}.`,
            link: `/matches/${updated._id}`,
          });
        }
      } catch {
        // Safe ignore
      }
    })();

    return updated;
  }

  /**
   * Create match event:
   * Allowed only when match is Live or HalfTime (else 400).
   * Verifies player/relatedPlayer belong to that side's squad (else 400).
   * Atomically increments cached liveScore with $inc.
   */
  async createMatchEvent(
    matchId: string,
    data: {
      type: MatchEventType;
      side: MatchEventSide;
      minute: number;
      player?: string | null;
      relatedPlayer?: string | null;
      note?: string;
    },
    user: AuthUser
  ): Promise<IMatchEvent> {
    const { match } = await this.assertMatchLiveWorkflowAccess(matchId, user);

    if (match.status !== 'Live' && match.status !== 'HalfTime') {
      throw new ApiError(400, `Events can only be added while match is Live or HalfTime (current status: ${match.status})`);
    }

    const targetRegistrationId = data.side === 'home' ? match.homeTeam : match.awayTeam;
    const registration = await TournamentTeam.findById(targetRegistrationId);
    if (!registration) {
      throw new ApiError(400, 'Team registration not found for event side');
    }

    if (data.player) {
      if (!Types.ObjectId.isValid(data.player)) {
        throw new ApiError(400, 'Invalid player ID');
      }
      const inSquad = registration.squad?.some(
        (id) => id.toString() === data.player
      );
      if (!inSquad) {
        throw new ApiError(400, 'Specified player is not in the squad for this team');
      }
    }

    if (data.relatedPlayer) {
      if (!Types.ObjectId.isValid(data.relatedPlayer)) {
        throw new ApiError(400, 'Invalid relatedPlayer ID');
      }
      const inSquad = registration.squad?.some(
        (id) => id.toString() === data.relatedPlayer
      );
      if (!inSquad) {
        throw new ApiError(400, 'Specified relatedPlayer is not in the squad for this team');
      }
    }

    const event = await MatchEvent.create({
      match: match._id,
      type: data.type,
      side: data.side,
      minute: data.minute,
      player: data.player ? new Types.ObjectId(data.player) : null,
      relatedPlayer: data.relatedPlayer ? new Types.ObjectId(data.relatedPlayer) : null,
      note: data.note,
      createdBy: new Types.ObjectId(user.id),
    });

    // Atomic update of liveScore with $inc
    let incField: string | null = null;
    if (data.type === 'Goal') {
      incField = data.side === 'home' ? 'liveScore.home' : 'liveScore.away';
    } else if (data.type === 'OwnGoal') {
      incField = data.side === 'home' ? 'liveScore.away' : 'liveScore.home';
    }

    if (incField) {
      await Match.updateOne({ _id: match._id }, { $inc: { [incField]: 1 } });
    }

    await AuditLog.create({
      action: 'MATCH_EVENT_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: event._id,
      targetType: 'MatchEvent',
      meta: {
        matchId: match._id.toString(),
        type: event.type,
        minute: event.minute,
      },
    });

    return event;
  }

  /**
   * List match events for authorized users who can view the match.
   */
  async getMatchEvents(matchId: string, user: AuthUser): Promise<IMatchEvent[]> {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new ApiError(400, 'Invalid match ID');
    }
    const match = await Match.findById(matchId);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }
    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (user.role === 'Organizer' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Match not found');
    }
    if (tournament.status === 'Draft' && user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
      throw new ApiError(404, 'Match not found');
    }

    return MatchEvent.find({ match: match._id })
      .populate({ path: 'player', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'relatedPlayer', populate: { path: 'user', select: 'name' } })
      .sort({ minute: 1, createdAt: 1 });
  }

  /**
   * Delete a match event:
   * Allowed while Live/HalfTime by live workflow actors.
   * Allowed after Completed by Admin / owning Organizer only.
   * Recomputes derived score and updates liveScore/result atomically.
   */
  async deleteMatchEvent(matchId: string, eventId: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(matchId) || !Types.ObjectId.isValid(eventId)) {
      throw new ApiError(400, 'Invalid ID format');
    }

    const match = await Match.findById(matchId);
    if (!match) {
      throw new ApiError(404, 'Match not found');
    }
    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (match.status === 'Completed') {
      if (user.role !== 'Admin' && tournament.organizer.toString() !== user.id) {
        throw new ApiError(403, 'Only Admin or owning Organizer can correct events of a Completed match');
      }
    } else if (match.status === 'Live' || match.status === 'HalfTime') {
      await this.assertMatchLiveWorkflowAccess(matchId, user);
    } else {
      throw new ApiError(400, `Cannot delete events on a ${match.status} match`);
    }

    const event = await MatchEvent.findOne({ _id: eventId, match: match._id });
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    await MatchEvent.deleteOne({ _id: event._id });

    // Recount and sync score
    const remainingEvents = await MatchEvent.find({ match: match._id });
    let homeScore = 0;
    let awayScore = 0;
    for (const e of remainingEvents) {
      if (e.type === 'Goal') {
        if (e.side === 'home') homeScore++;
        else awayScore++;
      } else if (e.type === 'OwnGoal') {
        if (e.side === 'home') awayScore++;
        else homeScore++;
      }
    }

    const updateDoc: Record<string, unknown> = {
      'liveScore.home': homeScore,
      'liveScore.away': awayScore,
    };
    if (match.status === 'Completed' && match.result) {
      updateDoc['result.homeScore'] = homeScore;
      updateDoc['result.awayScore'] = awayScore;
    }
    await Match.updateOne({ _id: match._id }, { $set: updateDoc });

    await AuditLog.create({
      action: 'MATCH_EVENT_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: event._id,
      targetType: 'MatchEvent',
      meta: {
        matchId: match._id.toString(),
        eventId: event._id.toString(),
        type: event.type,
      },
    });
  }

  /**
   * Public live matches: Live + HalfTime matches, excluding Draft tournaments.
   */
  async getPublicLiveMatches() {
    const draftTournaments = await Tournament.find({ status: 'Draft' }).select('_id');
    const draftIds = draftTournaments.map((t) => t._id);

    const matches = await Match.find({
      status: { $in: ['Live', 'HalfTime'] },
      tournament: { $nin: draftIds },
    })
      .populate('tournament', 'name')
      .populate('venue', 'name')
      .populate({
        path: 'homeTeam',
        select: 'team',
        populate: { path: 'team', select: 'name' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team',
        populate: { path: 'team', select: 'name' },
      })
      .sort({ scheduledAt: 1 });

    return {
      serverTime: new Date().toISOString(),
      matches: matches.map((m) => {
        const homeTeamObj = m.homeTeam as unknown as { team?: { name: string } };
        const awayTeamObj = m.awayTeam as unknown as { team?: { name: string } };
        const tourneyObj = m.tournament as unknown as { name: string };
        const venueObj = m.venue as unknown as { name: string };
        return {
          id: m._id.toString(),
          tournamentName: tourneyObj?.name || 'Tournament',
          round: m.round,
          group: m.group,
          homeTeamName: homeTeamObj?.team?.name || 'Home Team',
          awayTeamName: awayTeamObj?.team?.name || 'Away Team',
          venueName: venueObj?.name || 'Pitch Venue',
          status: m.status,
          minuteEstimate: this.computeMinuteEstimate(m),
          score: {
            home: m.liveScore?.home ?? 0,
            away: m.liveScore?.away ?? 0,
          },
        };
      }),
    };
  }

  /**
   * Public single match details + timeline (Draft tournament => 404).
   * Privacy: player names in public responses are "FirstName L." only.
   */
  async getPublicMatchById(matchId: string) {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(matchId)
      .populate('tournament', 'name status')
      .populate('venue', 'name')
      .populate({
        path: 'homeTeam',
        select: 'team',
        populate: { path: 'team', select: 'name' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team',
        populate: { path: 'team', select: 'name' },
      });

    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tourney = match.tournament as unknown as ITournament;
    if (!tourney || tourney.status === 'Draft') {
      throw new ApiError(404, 'Match not found');
    }

    const events = await MatchEvent.find({ match: match._id })
      .populate({ path: 'player', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'relatedPlayer', populate: { path: 'user', select: 'name' } })
      .sort({ minute: 1, createdAt: 1 });

    const timeline = events.map((e) => {
      return {
        id: e._id.toString(),
        type: e.type,
        side: e.side,
        minute: e.minute,
        playerName: this.formatPlayerName(e.player),
        relatedPlayerName: this.formatPlayerName(e.relatedPlayer),
      };
    });

    const homeTeamObj = match.homeTeam as unknown as { team?: { name: string } };
    const awayTeamObj = match.awayTeam as unknown as { team?: { name: string } };
    const venueObj = match.venue as unknown as { name: string };

    return {
      serverTime: new Date().toISOString(),
      match: {
        id: match._id.toString(),
        tournamentName: tourney.name,
        round: match.round,
        group: match.group,
        homeTeamName: homeTeamObj?.team?.name || 'Home Team',
        awayTeamName: awayTeamObj?.team?.name || 'Away Team',
        venueName: venueObj?.name || 'Pitch Venue',
        status: match.status,
        minuteEstimate: this.computeMinuteEstimate(match),
        score: {
          home: match.result ? match.result.homeScore : (match.liveScore?.home ?? 0),
          away: match.result ? match.result.awayScore : (match.liveScore?.away ?? 0),
        },
        events: timeline,
      },
    };
  }

  /**
   * Standings computed dynamically from Completed matches for Approved teams.
   * Points: Win = 3, Draw = 1, Loss = 0.
   * Ordering: points DESC, goalDifference DESC, goalsFor DESC, teamName ASC.
   * Grouped by group when matches/teams have groups.
   */
  async getTournamentStandings(tournamentId: string) {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status === 'Draft') {
      throw new ApiError(404, 'Tournament not found');
    }

    const approvedRegistrations = await TournamentTeam.find({
      tournament: tournament._id,
      status: 'Approved',
    }).populate('team', 'name code logo');

    interface TeamStanding {
      registrationId: string;
      teamName: string;
      group?: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }

    const standingsMap = new Map<string, TeamStanding>();
    for (const reg of approvedRegistrations) {
      const teamObj = reg.team as unknown as { name?: string };
      standingsMap.set(reg._id.toString(), {
        registrationId: reg._id.toString(),
        teamName: teamObj?.name || 'Team',
        group: undefined,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    const completedMatches = await Match.find({
      tournament: tournament._id,
      status: 'Completed',
    });

    for (const m of completedMatches) {
      const homeId = m.homeTeam.toString();
      const awayId = m.awayTeam.toString();
      const hs = m.result ? m.result.homeScore : (m.liveScore?.home ?? 0);
      const as = m.result ? m.result.awayScore : (m.liveScore?.away ?? 0);

      const homeStanding = standingsMap.get(homeId);
      const awayStanding = standingsMap.get(awayId);

      if (homeStanding) {
        if (!homeStanding.group && m.group) homeStanding.group = m.group;
        homeStanding.played += 1;
        homeStanding.goalsFor += hs;
        homeStanding.goalsAgainst += as;
        if (hs > as) {
          homeStanding.won += 1;
          homeStanding.points += 3;
        } else if (hs === as) {
          homeStanding.drawn += 1;
          homeStanding.points += 1;
        } else {
          homeStanding.lost += 1;
        }
      }

      if (awayStanding) {
        if (!awayStanding.group && m.group) awayStanding.group = m.group;
        awayStanding.played += 1;
        awayStanding.goalsFor += as;
        awayStanding.goalsAgainst += hs;
        if (as > hs) {
          awayStanding.won += 1;
          awayStanding.points += 3;
        } else if (as === hs) {
          awayStanding.drawn += 1;
          awayStanding.points += 1;
        } else {
          awayStanding.lost += 1;
        }
      }
    }

    const allStandings = Array.from(standingsMap.values()).map((s) => ({
      ...s,
      goalDifference: s.goalsFor - s.goalsAgainst,
    }));

    const sortFn = (a: TeamStanding, b: TeamStanding) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    };

    allStandings.sort(sortFn);

    // Grouping by group if any group is present
    const groupsMap: Record<string, TeamStanding[]> = {};
    for (const s of allStandings) {
      const groupKey = s.group || 'All';
      if (!groupsMap[groupKey]) groupsMap[groupKey] = [];
      groupsMap[groupKey].push(s);
    }

    return {
      serverTime: new Date().toISOString(),
      tournamentId: tournament._id.toString(),
      tournamentName: tournament.name,
      standings: allStandings,
      groups: Object.keys(groupsMap).length > 1 ? groupsMap : undefined,
    };
  }

  /**
   * Top scorers for tournament (top 10 goals & assists).
   * Privacy safe: playerName "FirstName L.", zero athlete IDs.
   */
  async getTournamentTopScorers(tournamentId: string) {
    if (!Types.ObjectId.isValid(tournamentId)) {
      throw new ApiError(400, 'Invalid tournament ID');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status === 'Draft') {
      throw new ApiError(404, 'Tournament not found');
    }

    const matches = await Match.find({ tournament: tournament._id }).select('_id');
    const matchIds = matches.map((m) => m._id);

    const goalEvents = await MatchEvent.find({
      match: { $in: matchIds },
      type: 'Goal',
    })
      .populate({ path: 'player', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'relatedPlayer', populate: { path: 'user', select: 'name' } });

    interface ScorerStat {
      playerName: string;
      goals: number;
      assists: number;
    }

    const scorerMap = new Map<string, ScorerStat>();

    for (const ev of goalEvents) {
      if (ev.player) {
        const pObj = ev.player as unknown as { _id: Types.ObjectId };
        const idKey = pObj._id.toString();
        const existing = scorerMap.get(idKey) || {
          playerName: this.formatPlayerName(ev.player) || 'Athlete',
          goals: 0,
          assists: 0,
        };
        existing.goals += 1;
        scorerMap.set(idKey, existing);
      }

      if (ev.relatedPlayer) {
        const rpObj = ev.relatedPlayer as unknown as { _id: Types.ObjectId };
        const idKey = rpObj._id.toString();
        const existing = scorerMap.get(idKey) || {
          playerName: this.formatPlayerName(ev.relatedPlayer) || 'Athlete',
          goals: 0,
          assists: 0,
        };
        existing.assists += 1;
        scorerMap.set(idKey, existing);
      }
    }

    const scorersList = Array.from(scorerMap.values());
    scorersList.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.playerName.localeCompare(b.playerName);
    });

    const top10 = scorersList.slice(0, 10).map((s, idx) => ({
      rank: idx + 1,
      playerName: s.playerName,
      goals: s.goals,
      assists: s.assists,
    }));

    return {
      serverTime: new Date().toISOString(),
      tournamentId: tournament._id.toString(),
      tournamentName: tournament.name,
      topScorers: top10,
    };
  }

  /**
   * Match Report: public (Completed matches only) or private (scoped).
   */
  async getMatchReport(matchId: string, isPublic: boolean, user?: AuthUser) {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new ApiError(400, 'Invalid match ID');
    }

    const match = await Match.findById(matchId)
      .populate('tournament', 'name status organizer')
      .populate('venue', 'name address')
      .populate({
        path: 'homeTeam',
        select: 'team',
        populate: { path: 'team', select: 'name code' },
      })
      .populate({
        path: 'awayTeam',
        select: 'team',
        populate: { path: 'team', select: 'name code' },
      });

    if (!match) {
      throw new ApiError(404, 'Match not found');
    }

    const tourney = match.tournament as unknown as ITournament;
    if (!tourney) {
      throw new ApiError(404, 'Tournament not found');
    }

    if (tourney.status === 'Draft') {
      if (isPublic || (!user || (user.role !== 'Admin' && tourney.organizer?.toString() !== user.id))) {
        throw new ApiError(404, 'Match not found');
      }
    }

    if (isPublic && match.status !== 'Completed') {
      throw new ApiError(404, 'Match report is only available for Completed matches');
    }

    if (!isPublic && user) {
      if (user.role === 'Organizer' && tourney.organizer?.toString() !== user.id) {
        throw new ApiError(404, 'Match not found');
      }
    }

    const events = await MatchEvent.find({ match: match._id })
      .populate({ path: 'player', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'relatedPlayer', populate: { path: 'user', select: 'name' } })
      .sort({ minute: 1, createdAt: 1 });

    const timeline = events.map((e) => {
      return {
        id: e._id.toString(),
        type: e.type,
        side: e.side,
        minute: e.minute,
        playerName: this.formatPlayerName(e.player),
        relatedPlayerName: this.formatPlayerName(e.relatedPlayer),
        note: isPublic ? undefined : e.note,
      };
    });

    let homeGoals = 0, awayGoals = 0;
    let homeYellow = 0, awayYellow = 0;
    let homeRed = 0, awayRed = 0;
    let homeSub = 0, awaySub = 0;

    for (const e of events) {
      if (e.type === 'Goal') {
        if (e.side === 'home') homeGoals++;
        else awayGoals++;
      } else if (e.type === 'OwnGoal') {
        if (e.side === 'home') awayGoals++;
        else homeGoals++;
      } else if (e.type === 'YellowCard') {
        if (e.side === 'home') homeYellow++;
        else awayYellow++;
      } else if (e.type === 'RedCard') {
        if (e.side === 'home') homeRed++;
        else awayRed++;
      } else if (e.type === 'Substitution') {
        if (e.side === 'home') homeSub++;
        else awaySub++;
      }
    }

    const homeTeamObj = match.homeTeam as unknown as { team?: { name: string } };
    const awayTeamObj = match.awayTeam as unknown as { team?: { name: string } };
    const venueObj = match.venue as unknown as { name: string };

    return {
      serverTime: new Date().toISOString(),
      matchId: match._id.toString(),
      tournament: tourney.name,
      round: match.round,
      venue: venueObj?.name || 'Pitch Venue',
      homeTeamName: homeTeamObj?.team?.name || 'Home Team',
      awayTeamName: awayTeamObj?.team?.name || 'Away Team',
      scheduledAt: match.scheduledAt,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      status: match.status,
      score: {
        home: match.result ? match.result.homeScore : (match.liveScore?.home ?? homeGoals),
        away: match.result ? match.result.awayScore : (match.liveScore?.away ?? awayGoals),
      },
      summary: {
        home: {
          goals: homeGoals,
          yellowCards: homeYellow,
          redCards: homeRed,
          substitutions: homeSub,
        },
        away: {
          goals: awayGoals,
          yellowCards: awayYellow,
          redCards: awayRed,
          substitutions: awaySub,
        },
      },
      timeline,
    };
  }

  /**
   * Athlete tournament performance:
   * Per tournament matches played, goals, assists, yellow, red cards.
   * Scoping:
   * Admin: any athlete
   * Athlete: own athlete ID only
   * Coach: scoped to his team's athletes
   * Others: 403
   */
  async getAthleteTournamentPerformance(athleteId: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    if (user.role === 'Athlete') {
      if (!athlete.user || athlete.user.toString() !== user.id) {
        throw new ApiError(404, 'Athlete not found');
      }
    } else if (user.role === 'Coach') {
      const coach = await Coach.findOne({ user: new Types.ObjectId(user.id) });
      if (!coach || !athlete.team) {
        throw new ApiError(404, 'Athlete not found');
      }
      const team = await Team.findOne({ _id: athlete.team, coach: coach._id });
      if (!team) {
        throw new ApiError(404, 'Athlete not found');
      }
    } else if (user.role !== 'Admin') {
      throw new ApiError(403, 'Forbidden: Role not authorized to view athlete performance');
    }

    // Find registrations where athlete is in approved squad
    const registrations = await TournamentTeam.find({
      status: 'Approved',
      squad: athlete._id,
    }).populate('tournament', 'name');

    interface PerfRow {
      tournamentId: string;
      tournamentName: string;
      matchesPlayed: number;
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
    }

    const perfMap = new Map<string, PerfRow>();

    for (const reg of registrations) {
      const tObj = reg.tournament as unknown as { _id: Types.ObjectId; name: string };
      if (!tObj) continue;
      const tId = tObj._id.toString();

      // Find played matches in this tournament (Live, HalfTime, Completed) where team played
      const playedMatches = await Match.find({
        tournament: tObj._id,
        status: { $in: ['Live', 'HalfTime', 'Completed'] },
        $or: [{ homeTeam: reg._id }, { awayTeam: reg._id }],
      });

      // Events for this athlete in this tournament
      const matchIds = playedMatches.map((m) => m._id);
      const events = await MatchEvent.find({
        match: { $in: matchIds },
        $or: [{ player: athlete._id }, { relatedPlayer: athlete._id }],
      });

      let goals = 0;
      let assists = 0;
      let yellowCards = 0;
      let redCards = 0;

      for (const ev of events) {
        if (ev.type === 'Goal') {
          if (ev.player && ev.player.toString() === athlete._id.toString()) goals++;
          if (ev.relatedPlayer && ev.relatedPlayer.toString() === athlete._id.toString()) assists++;
        } else if (ev.type === 'YellowCard' && ev.player && ev.player.toString() === athlete._id.toString()) {
          yellowCards++;
        } else if (ev.type === 'RedCard' && ev.player && ev.player.toString() === athlete._id.toString()) {
          redCards++;
        }
      }

      perfMap.set(tId, {
        tournamentId: tId,
        tournamentName: tObj.name,
        matchesPlayed: playedMatches.length,
        goals,
        assists,
        yellowCards,
        redCards,
      });
    }

    return {
      athleteId: athlete._id.toString(),
      performance: Array.from(perfMap.values()),
    };
  }
}

export const tournamentService = new TournamentService();
