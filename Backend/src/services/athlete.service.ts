import { Types } from 'mongoose';
import { Athlete, type IAthlete } from '../models/Athlete.js';
import { User, type IUser } from '../models/User.js';
import { Sport } from '../models/Sport.js';
import { Team } from '../models/Team.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';
import { scopeService } from './scope.service.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateAthleteInput,
  UpdateAthleteAdminInput,
  UpdateAthleteCoachInput,
  UpdateAthleteSelfInput,
  AssignTeamInput,
  UpdateVerificationInput,
  AthleteQueryInput,
} from '../validators/athlete.validator.js';

export class AthleteService {
  /**
   * List athletes with role scoping:
   * - Admin: full directory, filterable (medicalNotes always omitted from list)
   * - Coach: only athletes of teams coached by this coach (medicalNotes omitted)
   * - Organizer: 403 Forbidden
   */
  async listAthletes(
    query: AthleteQueryInput,
    user: IUser
  ): Promise<PaginatedResult<IAthlete>> {
    if (user.role === 'Organizer') {
      throw new ApiError(403, 'Organizers do not have access to the athlete directory');
    }

    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const filter: Record<string, unknown> = {};

    if (query.sport && Types.ObjectId.isValid(query.sport)) {
      filter.sport = new Types.ObjectId(query.sport);
    }

    if (user.role === 'Admin' && (query.unassigned === true || query.unassigned === 'true')) {
      filter.$or = [{ team: null }, { team: { $exists: false } }];
    } else if (query.team && Types.ObjectId.isValid(query.team)) {
      filter.team = new Types.ObjectId(query.team);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.verificationStatus) {
      filter.verificationStatus = query.verificationStatus;
    }

    // Role-based scoping for Coach
    if (user.role === 'Coach') {
      const coachTeamIds = await scopeService.getCoachTeamIds(user._id);
      filter.team = { $in: coachTeamIds };
    }

    const [athletes, total] = await Promise.all([
      Athlete.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone avatar')
        .populate('sport', 'name slug')
        .populate('team', 'name slug ageGroup')
        .select('-medicalNotes'),
      Athlete.countDocuments(filter),
    ]);

    return formatPaginatedResponse(athletes, total, page, limit);
  }

  /**
   * Get single athlete by ID.
   * - Admin: can view, includes medicalNotes.
   * - Coach: 404 if athlete is not in coach's team (do not reveal existence); medicalNotes stripped.
   * - Athlete: 404 if athlete is not own profile; medicalNotes stripped.
   * - Organizer: 403 Forbidden.
   */
  async getAthleteById(id: string, user: IUser): Promise<IAthlete> {
    if (user.role === 'Organizer') {
      throw new ApiError(403, 'Organizers do not have access to athlete profiles');
    }

    const query = Athlete.findById(id)
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug ageGroups')
      .populate('team', 'name slug ageGroup');

    if (user.role === 'Admin') {
      query.select('+medicalNotes');
    }

    const athlete = await query;

    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    if (user.role === 'Coach') {
      const canAccess = await scopeService.canCoachAccessAthlete(user, athlete._id);
      if (!canAccess) {
        throw new ApiError(404, 'Athlete profile not found');
      }
      athlete.medicalNotes = undefined;
    } else if (user.role === 'Athlete') {
      const canAccess = await scopeService.canAthleteAccessAthlete(user, athlete._id);
      if (!canAccess) {
        throw new ApiError(404, 'Athlete profile not found');
      }
      athlete.medicalNotes = undefined;
    }

    return athlete;
  }

  /**
   * Retrieve the authenticated athlete's own profile (medicalNotes stripped).
   */
  async getAthleteSelf(userId: string | Types.ObjectId): Promise<IAthlete> {
    const athlete = await Athlete.findOne({ user: userId })
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug ageGroups')
      .populate('team', 'name slug ageGroup')
      .select('-medicalNotes');

    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found for this user account');
    }

    return athlete;
  }

  /**
   * Admin creates an athlete profile.
   * Enforces sport existence and single athlete profile per user account.
   */
  async createAthlete(
    input: CreateAthleteInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IAthlete> {
    const sport = await Sport.findById(input.sport);
    if (!sport) {
      throw new ApiError(404, 'Referenced sport discipline not found');
    }

    if (input.user) {
      const user = await User.findById(input.user);
      if (!user) {
        throw new ApiError(404, 'Referenced user account not found');
      }
      if (user.role !== 'Athlete') {
        throw new ApiError(
          400,
          `Cannot link athlete profile: user "${user.name}" has role "${user.role}", expected "Athlete"`
        );
      }
      const existingAthlete = await Athlete.exists({ user: user._id });
      if (existingAthlete) {
        throw new ApiError(
          409,
          'User account is already linked to an existing athlete profile'
        );
      }
    }

    if (input.team) {
      const team = await Team.findById(input.team);
      if (!team || team.status !== 'Active') {
        throw new ApiError(400, 'Assigned team does not exist or is inactive');
      }
      if (team.sport.toString() !== input.sport) {
        throw new ApiError(400, 'Assigned team sport does not match athlete sport');
      }
      if (input.jerseyNumber !== undefined) {
        const conflict = await Athlete.exists({
          team: team._id,
          jerseyNumber: input.jerseyNumber,
        });
        if (conflict) {
          throw new ApiError(
            409,
            `Jersey number ${input.jerseyNumber} is already taken in team "${team.name}"`
          );
        }
      }
    }

    const athlete = new Athlete({
      ...input,
      user: input.user ? new Types.ObjectId(input.user) : undefined,
      sport: new Types.ObjectId(input.sport),
      team: input.team ? new Types.ObjectId(input.team) : undefined,
    });

    try {
      await athlete.save();
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ApiError(409, 'Duplicate constraint violation during athlete creation');
      }
      throw err;
    }

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_CREATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { sport: athlete.sport, status: athlete.status },
      ip,
      userAgent,
    });

    return (await Athlete.findById(athlete._id)
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug')
      .populate('team', 'name slug'))!;
  }

  /**
   * Admin updates athlete profile.
   */
  async updateAthleteAdmin(
    id: string,
    input: UpdateAthleteAdminInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IAthlete> {
    const athlete = await Athlete.findById(id);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    if (input.sport) {
      const sport = await Sport.findById(input.sport);
      if (!sport) throw new ApiError(404, 'Referenced sport discipline not found');
      athlete.sport = new Types.ObjectId(input.sport);
    }

    if (input.team !== undefined) {
      if (input.team !== null) {
        const team = await Team.findById(input.team);
        if (!team || team.status !== 'Active') {
          throw new ApiError(400, 'Assigned team does not exist or is inactive');
        }
        if (team.sport.toString() !== athlete.sport.toString()) {
          throw new ApiError(400, 'Team sport does not match athlete sport');
        }
        athlete.team = new Types.ObjectId(input.team);
      } else {
        athlete.team = undefined;
      }
    }

    if (input.jerseyNumber !== undefined) {
      if (input.jerseyNumber !== null && athlete.team) {
        const conflict = await Athlete.exists({
          team: athlete.team,
          jerseyNumber: input.jerseyNumber,
          _id: { $ne: athlete._id },
        });
        if (conflict) {
          throw new ApiError(
            409,
            `Jersey number ${input.jerseyNumber} is already taken in this team`
          );
        }
        athlete.jerseyNumber = input.jerseyNumber;
      } else {
        athlete.jerseyNumber = undefined;
      }
    }

    if (input.dateOfBirth !== undefined)
      athlete.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
    if (input.gender !== undefined) athlete.gender = input.gender;
    if (input.position !== undefined) athlete.position = input.position;
    if (input.heightCm !== undefined) athlete.heightCm = input.heightCm;
    if (input.weightKg !== undefined) athlete.weightKg = input.weightKg;
    if (input.status !== undefined) athlete.status = input.status;
    if (input.verificationStatus !== undefined)
      athlete.verificationStatus = input.verificationStatus;
    if (input.medicalClearance !== undefined)
      athlete.medicalClearance = input.medicalClearance;
    if (input.guardian !== undefined) athlete.guardian = input.guardian;
    if (input.medicalNotes !== undefined) athlete.medicalNotes = input.medicalNotes;
    if (input.profileVisibility !== undefined)
      athlete.profileVisibility = input.profileVisibility;

    try {
      await athlete.save();
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ApiError(409, 'Duplicate constraint violation on athlete update');
      }
      throw err;
    }

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_UPDATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { changes: input },
      ip,
      userAgent,
    });

    return (await Athlete.findById(athlete._id)
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug')
      .populate('team', 'name slug'))!;
  }

  /**
   * Coach updates athlete in their team (limited to position and status).
   */
  async updateAthleteCoach(
    id: string,
    input: UpdateAthleteCoachInput,
    user: IUser
  ): Promise<IAthlete> {
    const athlete = await Athlete.findById(id);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    const canAccess = await scopeService.canCoachAccessAthlete(user, athlete._id);
    if (!canAccess) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    if (input.position !== undefined) athlete.position = input.position;
    if (input.status !== undefined) athlete.status = input.status;

    await athlete.save();

    await auditService.logAudit({
      actor: user._id,
      action: 'ATHLETE_UPDATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { coachUpdate: true, changes: input },
    });

    return (await Athlete.findById(athlete._id)
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug')
      .populate('team', 'name slug')
      .select('-medicalNotes'))!;
  }

  /**
   * Athlete self-updates their profile (whitelisted safe fields only).
   */
  async updateAthleteSelf(
    userId: string | Types.ObjectId,
    input: UpdateAthleteSelfInput
  ): Promise<IAthlete> {
    const athlete = await Athlete.findOne({ user: userId });
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found for this user account');
    }

    if (input.heightCm !== undefined) athlete.heightCm = input.heightCm;
    if (input.weightKg !== undefined) athlete.weightKg = input.weightKg;
    if (input.position !== undefined) athlete.position = input.position;
    if (input.guardian !== undefined) athlete.guardian = input.guardian;
    if (input.profileVisibility !== undefined)
      athlete.profileVisibility = input.profileVisibility;

    await athlete.save();

    await auditService.logAudit({
      actor: userId,
      action: 'ATHLETE_UPDATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { selfUpdate: true, changes: Object.keys(input) },
    });

    return (await Athlete.findById(athlete._id)
      .populate('user', 'name email phone avatar')
      .populate('sport', 'name slug')
      .populate('team', 'name slug')
      .select('-medicalNotes'))!;
  }

  /**
   * Admin soft-deactivates an athlete (sets status to 'Inactive').
   */
  async deactivateAthlete(
    id: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const athlete = await Athlete.findById(id);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    athlete.status = 'Inactive';
    await athlete.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_DEACTIVATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { previousStatus: athlete.status },
      ip,
      userAgent,
    });
  }

  /**
   * Admin assigns athlete to a team and sets optional jersey number.
   * Race-safe against duplicate jersey numbers via unique index catch (11000 -> 409).
   */
  async assignTeam(
    athleteId: string,
    input: AssignTeamInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IAthlete> {
    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    const team = await Team.findById(input.teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (team.status !== 'Active') {
      throw new ApiError(400, 'Cannot assign athlete to an inactive team');
    }

    if (team.sport.toString() !== athlete.sport.toString()) {
      throw new ApiError(
        400,
        'Cannot assign athlete: team sport discipline does not match athlete sport'
      );
    }

    if (input.jerseyNumber !== undefined) {
      const conflict = await Athlete.exists({
        team: team._id,
        jerseyNumber: input.jerseyNumber,
        _id: { $ne: athlete._id },
      });
      if (conflict) {
        throw new ApiError(
          409,
          `Jersey number ${input.jerseyNumber} is already assigned in team "${team.name}"`
        );
      }
    }

    athlete.team = team._id;
    athlete.jerseyNumber = input.jerseyNumber;

    try {
      await athlete.save();
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ApiError(
          409,
          `Jersey number ${input.jerseyNumber} is already assigned in team "${team.name}"`
        );
      }
      throw err;
    }

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_TEAM_ASSIGNED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { team: team._id, jerseyNumber: input.jerseyNumber },
      ip,
      userAgent,
    });

    return (await Athlete.findById(athlete._id)
      .populate('user', 'name avatar')
      .populate('team', 'name slug ageGroup'))!;
  }

  /**
   * Admin unassigns athlete from team.
   */
  async unassignTeam(
    athleteId: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IAthlete> {
    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    const previousTeam = athlete.team;
    athlete.team = undefined;
    athlete.jerseyNumber = undefined;
    await athlete.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_TEAM_UNASSIGNED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { previousTeam },
      ip,
      userAgent,
    });

    return athlete;
  }

  /**
   * Admin updates athlete verification status.
   */
  async updateVerification(
    athleteId: string,
    input: UpdateVerificationInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IAthlete> {
    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    athlete.verificationStatus = input.verificationStatus;
    await athlete.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'ATHLETE_VERIFICATION_UPDATED',
      targetType: 'Athlete',
      targetId: athlete._id,
      meta: { verificationStatus: input.verificationStatus },
      ip,
      userAgent,
    });

    return athlete;
  }
}

export const athleteService = new AthleteService();
