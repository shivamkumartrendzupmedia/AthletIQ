import { Types } from 'mongoose';
import {
  Tournament,
  type ITournament,
  TournamentTeam,
  type ITournamentTeam,
  Venue,
  type IVenue,
  Official,
  type IOfficial,
  Match,
  type IMatch,
  Sport,
  Team,
  Coach,
  Athlete,
  AuditLog,
  type TournamentStatus,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

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
  // OFFICIALS
  // ==========================================

  async createOfficial(
    data: { name: string; type: 'Referee' | 'Assistant Referee' | 'Scorer'; active?: boolean },
    user: AuthUser
  ): Promise<IOfficial> {
    const official = await Official.create({
      ...data,
      createdBy: new Types.ObjectId(user.id),
      active: data.active ?? true,
    });

    await AuditLog.create({
      action: 'OFFICIAL_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: official._id,
      targetType: 'Official',
      meta: { officialId: official._id.toString() },
    });

    return official;
  }

  async listOfficials(user?: AuthUser): Promise<IOfficial[]> {
    const filter: Record<string, unknown> = {};
    if (!user || user.role !== 'Admin') {
      filter.active = true;
    }
    return Official.find(filter).sort({ name: 1 });
  }

  async updateOfficial(
    id: string,
    data: { name?: string; type?: 'Referee' | 'Assistant Referee' | 'Scorer'; active?: boolean },
    user: AuthUser
  ): Promise<IOfficial> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid official ID');
    }

    const official = await Official.findById(id);
    if (!official) {
      throw new ApiError(404, 'Official not found');
    }

    if (user.role !== 'Admin' && official.createdBy.toString() !== user.id) {
      throw new ApiError(404, 'Official not found');
    }

    const updated = await Official.findByIdAndUpdate(id, data, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Official not found');
    }

    await AuditLog.create({
      action: 'OFFICIAL_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: updated._id,
      targetType: 'Official',
      meta: { officialId: updated._id.toString() },
    });

    return updated;
  }

  async deleteOfficial(id: string, user: AuthUser): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid official ID');
    }

    const official = await Official.findById(id);
    if (!official) {
      throw new ApiError(404, 'Official not found');
    }

    if (user.role !== 'Admin' && official.createdBy.toString() !== user.id) {
      throw new ApiError(404, 'Official not found');
    }

    const matchCount = await Match.countDocuments({ referee: id });
    if (matchCount > 0) {
      throw new ApiError(409, 'Cannot delete official referenced by existing matches');
    }

    await Official.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'OFFICIAL_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: new Types.ObjectId(id),
      targetType: 'Official',
      meta: { officialId: id },
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
      referee?: string;
    },
    user: AuthUser
  ): Promise<IMatch> {
    if (
      !Types.ObjectId.isValid(tournamentId) ||
      !Types.ObjectId.isValid(data.homeTeam) ||
      !Types.ObjectId.isValid(data.awayTeam) ||
      !Types.ObjectId.isValid(data.venue) ||
      (data.referee && !Types.ObjectId.isValid(data.referee))
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
      refereeId: data.referee,
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
      referee: data.referee ? new Types.ObjectId(data.referee) : undefined,
      status: 'Scheduled',
    });

    // Post-insert concurrency race check (Interval Query Window Rollback pattern from training.service.ts):
    // Re-query overlapping matches for venue, teams, or referee excluding itself.
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

    if (match.referee) {
      const refRaceConflict = await Match.findOne({
        _id: { $ne: match._id },
        referee: match.referee,
        status: { $ne: 'Cancelled' },
        scheduledAt: { $lt: endsAt },
        endsAt: { $gt: scheduledAt },
      }).sort({ _id: 1 });

      if (refRaceConflict && refRaceConflict._id.toString() < match._id.toString()) {
        await Match.findByIdAndDelete(match._id);
        throw new ApiError(409, 'Referee is already assigned to another match during this time window');
      }
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
      .populate('referee', 'name type')
      .sort({ scheduledAt: 1 });
  }

  async getMatchById(id: string, user?: AuthUser): Promise<IMatch> {
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
      .populate('venue', 'name address')
      .populate('referee', 'name type');

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

    if (tournament.status === 'Draft' && (!user || (user.role !== 'Admin' && tournament.organizer.toString() !== user.id))) {
      throw new ApiError(404, 'Match not found');
    }

    return match;
  }

  async updateMatch(
    id: string,
    data: {
      round?: string;
      group?: string;
      scheduledAt?: string;
      durationMinutes?: number;
      venue?: string;
      referee?: string | null;
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
    const refereeId = data.referee !== undefined ? data.referee : (match.referee ? match.referee.toString() : undefined);

    if (data.scheduledAt || data.durationMinutes || data.venue || data.referee !== undefined) {
      await this.checkMatchOverlaps({
        venueId,
        homeTeamId: match.homeTeam.toString(),
        awayTeamId: match.awayTeam.toString(),
        refereeId: refereeId ?? undefined,
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
    if (data.referee === null) {
      updatePayload.referee = undefined;
    }

    const updated = await Match.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Match not found');
    }

    if (data.scheduledAt || data.durationMinutes || data.venue || data.referee !== undefined) {
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
          referee: match.referee,
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
          referee: match.referee,
        });
        throw new ApiError(409, 'One of the teams is already scheduled for another match during this time window');
      }

      if (updated.referee) {
        const refConflict = await Match.findOne({
          _id: { $ne: updated._id },
          referee: updated.referee,
          status: { $ne: 'Cancelled' },
          scheduledAt: { $lt: updated.endsAt },
          endsAt: { $gt: updated.scheduledAt },
        }).sort({ _id: 1 });

        if (refConflict && refConflict._id.toString() < updated._id.toString()) {
          await Match.findByIdAndUpdate(id, {
            scheduledAt: match.scheduledAt,
            durationMinutes: match.durationMinutes,
            endsAt: match.endsAt,
            venue: match.venue,
            referee: match.referee,
          });
          throw new ApiError(409, 'Referee is already assigned to another match during this time window');
        }
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

    if (match.status === 'Cancelled') {
      throw new ApiError(400, 'Cannot enter result for a Cancelled match');
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
    match.status = 'Completed';
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
    refereeId?: string;
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

    // 3. Referee overlap
    if (params.refereeId) {
      const refConflict = await Match.findOne({
        ...baseFilter,
        referee: new Types.ObjectId(params.refereeId),
      });
      if (refConflict) {
        throw new ApiError(409, 'Referee is already assigned to another match during this time window');
      }
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
}

export const tournamentService = new TournamentService();
