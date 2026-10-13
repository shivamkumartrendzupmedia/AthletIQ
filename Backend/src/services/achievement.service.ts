import { Types } from 'mongoose';
import { Achievement, type IAchievement } from '../models/Achievement.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import type {
  CreateAchievementInput,
  UpdateAchievementInput,
  AchievementQueryInput,
} from '../validators/achievement.validator.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PublicAchievementDto {
  id: string;
  title: string;
  description: string;
  category: string;
  achievedOn: string;
  imageUrl?: string;
  featured: boolean;
}

export class AchievementService {
  async createAchievement(
    input: CreateAchievementInput,
    userId: Types.ObjectId,
    ip?: string,
    userAgent?: string
  ): Promise<IAchievement> {
    const achievement = await Achievement.create({
      title: input.title,
      description: input.description,
      category: input.category,
      achievedOn: new Date(input.achievedOn),
      imageUrl: input.imageUrl,
      featured: input.featured ?? false,
      createdBy: userId,
    });

    await AuditLog.create({
      actor: userId,
      action: 'ACHIEVEMENT_CREATED',
      targetType: 'Achievement',
      targetId: achievement._id,
      meta: {
        title: achievement.title,
        category: achievement.category,
        featured: achievement.featured,
      },
      ip,
      userAgent,
    });

    return achievement;
  }

  async getAdminAchievements(
    query: AchievementQueryInput
  ): Promise<PaginatedResult<IAchievement>> {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.category) {
      filter.category = query.category;
    }
    if (query.featured !== undefined) {
      filter.featured = query.featured === 'true';
    }
    if (query.search) {
      const sanitized = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: sanitized, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ achievedOn: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Achievement.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAdminAchievementById(id: string): Promise<IAchievement> {
    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new ApiError(404, 'Achievement not found');
    }
    return achievement;
  }

  async updateAchievement(
    id: string,
    input: UpdateAchievementInput,
    userId: Types.ObjectId,
    ip?: string,
    userAgent?: string
  ): Promise<IAchievement> {
    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new ApiError(404, 'Achievement not found');
    }

    if (input.title !== undefined) achievement.title = input.title;
    if (input.description !== undefined) achievement.description = input.description;
    if (input.category !== undefined) achievement.category = input.category;
    if (input.achievedOn !== undefined) achievement.achievedOn = new Date(input.achievedOn);
    if (input.imageUrl !== undefined) achievement.imageUrl = input.imageUrl;
    if (input.featured !== undefined) achievement.featured = input.featured;

    await achievement.save();

    await AuditLog.create({
      actor: userId,
      action: 'ACHIEVEMENT_UPDATED',
      targetType: 'Achievement',
      targetId: achievement._id,
      meta: {
        title: achievement.title,
        category: achievement.category,
        featured: achievement.featured,
      },
      ip,
      userAgent,
    });

    return achievement;
  }

  async deleteAchievement(
    id: string,
    userId: Types.ObjectId,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const achievement = await Achievement.findById(id);
    if (!achievement) {
      throw new ApiError(404, 'Achievement not found');
    }

    await Achievement.deleteOne({ _id: achievement._id });

    await AuditLog.create({
      actor: userId,
      action: 'ACHIEVEMENT_DELETED',
      targetType: 'Achievement',
      targetId: achievement._id,
      meta: {
        title: achievement.title,
        category: achievement.category,
      },
      ip,
      userAgent,
    });
  }

  async getPublicAchievements(
    query: AchievementQueryInput
  ): Promise<PaginatedResult<PublicAchievementDto>> {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.category) {
      filter.category = query.category;
    }

    const sortOrder: Record<string, 1 | -1> = query.featured === 'true'
      ? { featured: -1, achievedOn: -1, createdAt: -1 }
      : { achievedOn: -1, createdAt: -1 };

    const [records, total] = await Promise.all([
      Achievement.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      Achievement.countDocuments(filter),
    ]);

    const data: PublicAchievementDto[] = records.map((r) => ({
      id: String(r._id),
      title: r.title,
      description: r.description,
      category: r.category,
      achievedOn: new Date(r.achievedOn).toISOString(),
      imageUrl: r.imageUrl,
      featured: r.featured,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicAchievementById(id: string): Promise<PublicAchievementDto> {
    const r = await Achievement.findById(id).lean();
    if (!r) {
      throw new ApiError(404, 'Achievement not found');
    }

    return {
      id: String(r._id),
      title: r.title,
      description: r.description,
      category: r.category,
      achievedOn: new Date(r.achievedOn).toISOString(),
      imageUrl: r.imageUrl,
      featured: r.featured,
    };
  }
}

export const achievementService = new AchievementService();
