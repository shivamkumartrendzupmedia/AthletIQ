import { Types } from 'mongoose';
import { Sport, type ISport } from '../models/Sport.js';
import { Team } from '../models/Team.js';
import { Athlete } from '../models/Athlete.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';
import { executeWithSlugRetry } from '../utils/slug.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateSportInput,
  UpdateSportInput,
  SportQueryInput,
} from '../validators/sport.validator.js';

export interface SportWithCounts extends ISport {
  teamCount: number;
  athleteCount: number;
}

export class SportService {
  /**
   * List sports with pagination and aggregation-based computed counts (teamCount, athleteCount).
   * Executes in a single aggregation pipeline without N+1 query overhead.
   */
  async listSports(
    query: SportQueryInput
  ): Promise<PaginatedResult<SportWithCounts>> {
    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const matchStage: Record<string, unknown> = {};

    if (query.status) {
      matchStage.status = query.status;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchStage.name = { $regex: escaped, $options: 'i' };
    }

    const [aggregateResult] = await Sport.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: 'sport',
          as: 'teamsList',
        },
      },
      {
        $lookup: {
          from: 'athletes',
          localField: '_id',
          foreignField: 'sport',
          as: 'athletesList',
        },
      },
      {
        $addFields: {
          teamCount: { $size: '$teamsList' },
          athleteCount: { $size: '$athletesList' },
          id: { $toString: '$_id' },
        },
      },
      {
        $project: {
          teamsList: 0,
          athletesList: 0,
          __v: 0,
        },
      },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const data: SportWithCounts[] = aggregateResult?.data ?? [];
    const total: number = aggregateResult?.total?.[0]?.count ?? 0;

    return formatPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get single sport with computed team and athlete counts.
   */
  async getSportById(id: string | Types.ObjectId): Promise<SportWithCounts> {
    const sport = await Sport.findById(id);
    if (!sport) {
      throw new ApiError(404, 'Sport discipline not found');
    }

    const [teamCount, athleteCount] = await Promise.all([
      Team.countDocuments({ sport: sport._id }),
      Athlete.countDocuments({ sport: sport._id }),
    ]);

    const sportObj = sport.toJSON() as unknown as SportWithCounts;
    sportObj.teamCount = teamCount;
    sportObj.athleteCount = athleteCount;

    return sportObj;
  }

  /**
   * Create a sport with race-safe slug collision resolution.
   */
  async createSport(
    input: CreateSportInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ISport> {
    const sport = await executeWithSlugRetry(input.name, async (slug) => {
      const newSport = new Sport({
        ...input,
        slug,
      });
      return await newSport.save();
    });

    await auditService.logAudit({
      actor: actorId,
      action: 'SPORT_CREATED',
      targetType: 'Sport',
      targetId: sport._id,
      meta: { name: sport.name, slug: sport.slug },
      ip,
      userAgent,
    });

    return sport;
  }

  /**
   * Update sport details. Regenerates slug if name is updated.
   */
  async updateSport(
    id: string,
    input: UpdateSportInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ISport> {
    const sport = await Sport.findById(id);
    if (!sport) {
      throw new ApiError(404, 'Sport discipline not found');
    }

    if (input.name && input.name !== sport.name) {
      sport.name = input.name;
      await executeWithSlugRetry(input.name, async (slug) => {
        sport.slug = slug;
        return await sport.save();
      });
    }

    if (input.description !== undefined) sport.description = input.description;
    if (input.shortDescription !== undefined)
      sport.shortDescription = input.shortDescription;
    if (input.icon !== undefined) sport.icon = input.icon;
    if (input.image !== undefined) sport.image = input.image;
    if (input.ageGroups !== undefined) sport.ageGroups = input.ageGroups;
    if (input.features !== undefined) sport.features = input.features;
    if (input.status !== undefined) sport.status = input.status;

    await sport.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'SPORT_UPDATED',
      targetType: 'Sport',
      targetId: sport._id,
      meta: { changes: input },
      ip,
      userAgent,
    });

    return sport;
  }

  /**
   * Delete sport. Blocked with 409 if any team or athlete references it.
   */
  async deleteSport(
    id: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const sport = await Sport.findById(id);
    if (!sport) {
      throw new ApiError(404, 'Sport discipline not found');
    }

    const [teamCount, athleteCount] = await Promise.all([
      Team.countDocuments({ sport: sport._id }),
      Athlete.countDocuments({ sport: sport._id }),
    ]);

    if (teamCount > 0 || athleteCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete sport "${sport.name}": it is referenced by ${teamCount} team(s) and ${athleteCount} athlete(s). Set status to Inactive instead.`
      );
    }

    await Sport.findByIdAndDelete(sport._id);

    await auditService.logAudit({
      actor: actorId,
      action: 'SPORT_DELETED',
      targetType: 'Sport',
      targetId: sport._id,
      meta: { name: sport.name, slug: sport.slug },
      ip,
      userAgent,
    });
  }
}

export const sportService = new SportService();
