import { Types } from 'mongoose';
import { Coach, type ICoach } from '../models/Coach.js';
import { User, type IUser } from '../models/User.js';
import { Team } from '../models/Team.js';
import { Sport } from '../models/Sport.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateCoachInput,
  UpdateCoachAdminInput,
  UpdateCoachSelfInput,
  CoachQueryInput,
} from '../validators/coach.validator.js';

export class CoachService {
  /**
   * List coach profiles (Admin & Organizer).
   */
  async listCoaches(
    query: CoachQueryInput
  ): Promise<PaginatedResult<ICoach>> {
    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const filter: Record<string, unknown> = {};

    if (query.isPublic !== undefined) {
      filter.isPublic = query.isPublic;
    }

    if (query.sport && Types.ObjectId.isValid(query.sport)) {
      filter.sports = new Types.ObjectId(query.sport);
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { specialization: { $regex: escaped, $options: 'i' } },
        { specialties: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [coaches, total] = await Promise.all([
      Coach.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone avatar isActive')
        .populate('sports', 'name slug'),
      Coach.countDocuments(filter),
    ]);

    return formatPaginatedResponse(coaches, total, page, limit);
  }

  /**
   * Get single coach profile by ID.
   */
  async getCoachById(id: string, user: IUser): Promise<ICoach> {
    const coach = await Coach.findById(id)
      .populate('user', 'name email phone avatar isActive')
      .populate('sports', 'name slug');

    if (!coach) {
      throw new ApiError(404, 'Coach profile not found');
    }

    // Role-scope authorization
    if (user.role === 'Coach' && coach.user._id.toString() !== user._id.toString()) {
      throw new ApiError(404, 'Coach profile not found');
    }

    return coach;
  }

  /**
   * Retrieve the currently authenticated coach's own profile.
   */
  async getCoachSelf(userId: string | Types.ObjectId): Promise<ICoach> {
    const coach = await Coach.findOne({ user: userId })
      .populate('user', 'name email phone avatar isActive')
      .populate('sports', 'name slug');

    if (!coach) {
      throw new ApiError(404, 'Coach profile not found for this user account');
    }

    return coach;
  }

  /**
   * Admin provisions a coach profile linked to an existing User with role 'Coach'.
   */
  async createCoach(
    input: CreateCoachInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ICoach> {
    const user = await User.findById(input.user);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    if (user.role !== 'Coach') {
      throw new ApiError(
        400,
        `Cannot create coach profile: user "${user.name}" has role "${user.role}", but role "Coach" is required`
      );
    }

    const existingCoach = await Coach.findOne({ user: user._id });
    if (existingCoach) {
      throw new ApiError(
        409,
        'A coach profile already exists for this user account'
      );
    }

    if (input.sports.length > 0) {
      const validSportsCount = await Sport.countDocuments({
        _id: { $in: input.sports },
      });
      if (validSportsCount !== input.sports.length) {
        throw new ApiError(400, 'One or more referenced sport disciplines do not exist');
      }
    }

    const coach = new Coach({
      ...input,
      user: user._id,
      sports: input.sports.map((s) => new Types.ObjectId(s)),
    });

    await coach.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'COACH_CREATED',
      targetType: 'Coach',
      targetId: coach._id,
      meta: { user: user._id, title: coach.title },
      ip,
      userAgent,
    });

    return (await Coach.findById(coach._id)
      .populate('user', 'name email phone avatar')
      .populate('sports', 'name slug'))!;
  }

  /**
   * Admin updates coach profile.
   */
  async updateCoachAdmin(
    id: string,
    input: UpdateCoachAdminInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<ICoach> {
    const coach = await Coach.findById(id);
    if (!coach) {
      throw new ApiError(404, 'Coach profile not found');
    }

    if (input.sports) {
      const validSportsCount = await Sport.countDocuments({
        _id: { $in: input.sports },
      });
      if (validSportsCount !== input.sports.length) {
        throw new ApiError(400, 'One or more referenced sport disciplines do not exist');
      }
      coach.sports = input.sports.map((s) => new Types.ObjectId(s));
    }

    if (input.title !== undefined) coach.title = input.title;
    if (input.bio !== undefined) coach.bio = input.bio;
    if (input.specialization !== undefined) coach.specialization = input.specialization;
    if (input.specialties !== undefined) coach.specialties = input.specialties;
    if (input.certifications !== undefined) coach.certifications = input.certifications;
    if (input.experienceYears !== undefined) coach.experienceYears = input.experienceYears;
    if (input.achievements !== undefined) coach.achievements = input.achievements;
    if (input.photo !== undefined) coach.photo = input.photo;
    if (input.isPublic !== undefined) coach.isPublic = input.isPublic;

    await coach.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'COACH_UPDATED',
      targetType: 'Coach',
      targetId: coach._id,
      meta: { changes: input },
      ip,
      userAgent,
    });

    return (await Coach.findById(coach._id)
      .populate('user', 'name email phone avatar')
      .populate('sports', 'name slug'))!;
  }

  /**
   * Coach self-updates their own profile (safe fields only).
   */
  async updateCoachSelf(
    userId: string | Types.ObjectId,
    input: UpdateCoachSelfInput
  ): Promise<ICoach> {
    const coach = await Coach.findOne({ user: userId });
    if (!coach) {
      throw new ApiError(404, 'Coach profile not found for this user account');
    }

    if (input.bio !== undefined) coach.bio = input.bio;
    if (input.photo !== undefined) coach.photo = input.photo;
    if (input.specialties !== undefined) coach.specialties = input.specialties;
    if (input.certifications !== undefined) coach.certifications = input.certifications;
    if (input.achievements !== undefined) coach.achievements = input.achievements;

    await coach.save();

    await auditService.logAudit({
      actor: userId,
      action: 'COACH_UPDATED',
      targetType: 'Coach',
      targetId: coach._id,
      meta: { selfUpdate: true, updatedFields: Object.keys(input) },
    });

    return (await Coach.findById(coach._id)
      .populate('user', 'name email phone avatar')
      .populate('sports', 'name slug'))!;
  }

  /**
   * Admin deletes a coach profile. Blocked with 409 if assigned to any team.
   */
  async deleteCoach(
    id: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const coach = await Coach.findById(id);
    if (!coach) {
      throw new ApiError(404, 'Coach profile not found');
    }

    const assignedTeamsCount = await Team.countDocuments({ coach: coach._id });
    if (assignedTeamsCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete coach profile: this coach is currently assigned to ${assignedTeamsCount} team(s). Reassign or unassign teams first.`
      );
    }

    await Coach.findByIdAndDelete(coach._id);

    await auditService.logAudit({
      actor: actorId,
      action: 'COACH_DELETED',
      targetType: 'Coach',
      targetId: coach._id,
      meta: { user: coach.user },
      ip,
      userAgent,
    });
  }
}

export const coachService = new CoachService();
