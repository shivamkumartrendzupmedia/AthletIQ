import { Types } from 'mongoose';
import { Team, type ITeam } from '../models/Team.js';
import { Sport } from '../models/Sport.js';
import { Coach } from '../models/Coach.js';
import { Athlete, type IAthlete } from '../models/Athlete.js';
import { TrainingSession } from '../models/TrainingSession.js';
import type { IUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';
import { scopeService } from './scope.service.js';
import { executeWithSlugRetry } from '../utils/slug.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateTeamInput,
  UpdateTeamInput,
  TeamQueryInput,
} from '../validators/team.validator.js';

export interface TeamWithAthleteCount extends ITeam {
  athleteCount: number;
}

export class TeamService {
  /**
   * List teams scoped to the user's role:
   * - Admin / Organizer: all matching teams
   * - Coach: only teams coached by this coach
   * - Athlete: only the athlete's assigned team
   */
  async listTeams(
    query: TeamQueryInput,
    user: IUser
  ): Promise<PaginatedResult<ITeam>> {
    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const filter: Record<string, unknown> = {};

    if (query.sport && Types.ObjectId.isValid(query.sport)) {
      filter.sport = new Types.ObjectId(query.sport);
    }

    if (query.ageGroup) {
      filter.ageGroup = query.ageGroup;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    // Role-based scope enforcement
    if (user.role === 'Coach') {
      const coachTeamIds = await scopeService.getCoachTeamIds(user._id);
      filter._id = { $in: coachTeamIds };
    } else if (user.role === 'Athlete') {
      const athlete = await scopeService.getAthleteProfileForUser(user._id);
      if (!athlete || !athlete.team) {
        return formatPaginatedResponse([], 0, page, limit);
      }
      filter._id = athlete.team;
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sport', 'name slug ageGroups')
        .populate({
          path: 'coach',
          select: 'title specialties photo',
          populate: { path: 'user', select: 'name' },
        }),
      Team.countDocuments(filter),
    ]);

    return formatPaginatedResponse(teams, total, page, limit);
  }

  /**
   * Get single team by ID with role-based scope checks (404 on out-of-scope).
   */
  async getTeamById(id: string, user: IUser): Promise<ITeam> {
    const team = await Team.findById(id)
      .populate('sport', 'name slug ageGroups')
      .populate({
        path: 'coach',
        select: 'title specialties photo',
        populate: { path: 'user', select: 'name' },
      });

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (user.role === 'Coach') {
      const coachTeamIds = await scopeService.getCoachTeamIds(user._id);
      const isCoached = coachTeamIds.some(
        (tid) => tid.toString() === team._id.toString()
      );
      if (!isCoached) {
        throw new ApiError(404, 'Team not found');
      }
    } else if (user.role === 'Athlete') {
      const athlete = await scopeService.getAthleteProfileForUser(user._id);
      if (!athlete || !athlete.team || athlete.team.toString() !== team._id.toString()) {
        throw new ApiError(404, 'Team not found');
      }
    }

    return team;
  }

  /**
   * Admin creates a team.
   * Validates active sport, sport age group membership, and coach existence.
   */
  async createTeam(
    input: CreateTeamInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ITeam> {
    const sport = await Sport.findById(input.sport);
    if (!sport) {
      throw new ApiError(404, 'Referenced sport discipline not found');
    }

    if (sport.status !== 'Active') {
      throw new ApiError(
        400,
        `Cannot create team for inactive sport "${sport.name}". Sport must be Active.`
      );
    }

    if (sport.ageGroups.length > 0 && !sport.ageGroups.includes(input.ageGroup)) {
      throw new ApiError(
        400,
        `Age group "${input.ageGroup}" is not supported for sport "${sport.name}". Supported age groups: [${sport.ageGroups.join(', ')}]`
      );
    }

    if (input.coach) {
      const coach = await Coach.findById(input.coach);
      if (!coach) {
        throw new ApiError(404, 'Referenced coach profile not found');
      }
    }

    const team = await executeWithSlugRetry(input.name, async (slug) => {
      const newTeam = new Team({
        ...input,
        slug,
      });
      return await newTeam.save();
    });

    await auditService.logAudit({
      actor: actorId,
      action: 'TEAM_CREATED',
      targetType: 'Team',
      targetId: team._id,
      meta: { name: team.name, sport: team.sport, ageGroup: team.ageGroup },
      ip,
      userAgent,
    });

    return team;
  }

  /**
   * Admin updates team details.
   */
  async updateTeam(
    id: string,
    input: UpdateTeamInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ITeam> {
    const team = await Team.findById(id);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const sportId = input.sport || team.sport.toString();
    const sport = await Sport.findById(sportId);
    if (!sport) {
      throw new ApiError(404, 'Referenced sport discipline not found');
    }

    if (input.sport && sport.status !== 'Active') {
      throw new ApiError(
        400,
        `Cannot assign inactive sport "${sport.name}". Sport must be Active.`
      );
    }

    const targetAgeGroup = input.ageGroup || team.ageGroup;
    if (sport.ageGroups.length > 0 && !sport.ageGroups.includes(targetAgeGroup)) {
      throw new ApiError(
        400,
        `Age group "${targetAgeGroup}" is not supported for sport "${sport.name}". Supported: [${sport.ageGroups.join(', ')}]`
      );
    }

    if (input.coach !== undefined) {
      if (input.coach !== null) {
        const coach = await Coach.findById(input.coach);
        if (!coach) {
          throw new ApiError(404, 'Referenced coach profile not found');
        }
        team.coach = new Types.ObjectId(input.coach);
      } else {
        team.coach = undefined;
      }
    }

    if (input.name && input.name !== team.name) {
      team.name = input.name;
      await executeWithSlugRetry(input.name, async (slug) => {
        team.slug = slug;
        return await team.save();
      });
    }

    if (input.sport !== undefined) team.sport = new Types.ObjectId(input.sport);
    if (input.ageGroup !== undefined) team.ageGroup = input.ageGroup;
    if (input.season !== undefined) team.season = input.season;
    if (input.logo !== undefined) team.logo = input.logo;
    if (input.status !== undefined) team.status = input.status;

    await team.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'TEAM_UPDATED',
      targetType: 'Team',
      targetId: team._id,
      meta: { changes: input },
      ip,
      userAgent,
    });

    return team;
  }

  /**
   * Admin deletes a team. Blocked with 409 if active athletes or sessions reference it.
   */
  async deleteTeam(
    id: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const team = await Team.findById(id);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const [athleteCount, sessionCount] = await Promise.all([
      Athlete.countDocuments({ team: team._id }),
      TrainingSession.countDocuments({ team: team._id }),
    ]);

    if (athleteCount > 0 || sessionCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete team "${team.name}": it currently contains ${athleteCount} rostered athlete(s) and ${sessionCount} training session(s). Remove athletes and sessions first.`
      );
    }

    await Team.findByIdAndDelete(team._id);

    await auditService.logAudit({
      actor: actorId,
      action: 'TEAM_DELETED',
      targetType: 'Team',
      targetId: team._id,
      meta: { name: team.name, slug: team.slug },
      ip,
      userAgent,
    });
  }

  /**
   * Retrieve roster for a team (safe fields only, no medicalNotes, no guardian contacts).
   * Accessible by Admin or the coach of this team.
   */
  async getTeamRoster(teamId: string, user: IUser): Promise<IAthlete[]> {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (user.role === 'Coach') {
      const coachTeamIds = await scopeService.getCoachTeamIds(user._id);
      const isCoach = coachTeamIds.some(
        (tid) => tid.toString() === team._id.toString()
      );
      if (!isCoach) {
        throw new ApiError(404, 'Team not found');
      }
    }

    return Athlete.find({ team: team._id })
      .sort({ jerseyNumber: 1, createdAt: 1 })
      .populate('user', 'name avatar')
      .select('-medicalNotes -guardian');
  }
}

export const teamService = new TeamService();
