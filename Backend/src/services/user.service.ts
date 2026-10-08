import { Types } from 'mongoose';
import { User, type IUser } from '../models/User.js';
import { Coach } from '../models/Coach.js';
import { Athlete } from '../models/Athlete.js';
import { AuditLog, type IAuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { auditService } from './audit.service.js';
import {
  parsePagination,
  formatPaginatedResponse,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateUserInput,
  UpdateUserAdminInput,
  UpdateUserSelfInput,
  ResetPasswordInput,
  UserQueryInput,
} from '../validators/user.validator.js';
import type { AuditAction } from '../models/constants.js';

export type ActiveAdminCounter = (excludeId?: Types.ObjectId) => Promise<number>;

export const defaultActiveAdminCounter: ActiveAdminCounter = async () => {
  return User.countDocuments({ role: 'Admin', isActive: true });
};

export class UserService {
  /**
   * List users with pagination, filtering, and regex-safe search.
   */
  async listUsers(
    query: UserQueryInput
  ): Promise<PaginatedResult<IUser>> {
    const { page, limit, skip } = parsePagination(
      query as Record<string, unknown>
    );

    const filter: Record<string, unknown> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash -refreshTokens'),
      User.countDocuments(filter),
    ]);

    return formatPaginatedResponse(users, total, page, limit);
  }

  /**
   * Get single user by ID.
   */
  async getUserById(id: string | Types.ObjectId): Promise<IUser> {
    const user = await User.findById(id).select(
      '-passwordHash -refreshTokens'
    );
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Admin creates a user of any role.
   */
  async createUser(
    input: CreateUserInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IUser> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ApiError(409, 'Email address is already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = new User({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      phone: input.phone,
      avatar: input.avatar,
    });

    await user.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user._id,
      meta: {
        role: user.role,
        email: user.email,
      },
      ip,
      userAgent,
    });

    return (await this.getUserById(user._id)) as IUser;
  }

  /**
   * Admin updates a user.
   * Race-safe last-admin protection: applies change, checks remaining active admins, reverts if 0.
   * Self-modification protection: admins cannot change their own role or deactivate themselves.
   */
  async updateUserAdmin(
    targetId: string,
    input: UpdateUserAdminInput,
    actorUser: IUser,
    countActiveAdminsFn: ActiveAdminCounter = defaultActiveAdminCounter,
    ip?: string,
    userAgent?: string
  ): Promise<IUser> {
    const targetObjectId = new Types.ObjectId(targetId);

    // Rule 1: Admin cannot change their own role or deactivate themselves
    if (actorUser._id.toString() === targetId) {
      if (input.role !== undefined && input.role !== actorUser.role) {
        throw new ApiError(
          400,
          'Administrators cannot change their own role'
        );
      }
      if (input.isActive !== undefined && input.isActive !== actorUser.isActive) {
        throw new ApiError(
          400,
          'Administrators cannot deactivate their own account'
        );
      }
    }

    const targetUser = await User.findById(targetObjectId).select(
      '+passwordHash +refreshTokens'
    );
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    const previousRole = targetUser.role;
    const previousIsActive = targetUser.isActive;

    const isDemotingOrDeactivatingAdmin =
      previousRole === 'Admin' &&
      previousIsActive &&
      ((input.role !== undefined && input.role !== 'Admin') ||
        input.isActive === false);

    // Orphan profile protection: cannot change role away from Coach or Athlete if linked profile exists
    if (input.role !== undefined && input.role !== previousRole) {
      if (previousRole === 'Coach') {
        const coachExists = await Coach.exists({ user: targetUser._id });
        if (coachExists) {
          throw new ApiError(
            409,
            'Cannot change user role: a linked Coach profile exists. Remove or reassign the coach profile first.'
          );
        }
      } else if (previousRole === 'Athlete') {
        const athleteExists = await Athlete.exists({ user: targetUser._id });
        if (athleteExists) {
          throw new ApiError(
            409,
            'Cannot change user role: a linked Athlete profile exists. Remove or reassign the athlete profile first.'
          );
        }
      }
    }

    // Apply updates
    if (input.name !== undefined) targetUser.name = input.name;
    if (input.phone !== undefined) targetUser.phone = input.phone;
    if (input.avatar !== undefined) targetUser.avatar = input.avatar;
    if (input.role !== undefined) targetUser.role = input.role;
    if (input.isActive !== undefined) targetUser.isActive = input.isActive;

    // Revoke refresh tokens on role change or deactivation
    const roleOrStatusChanged =
      (input.role !== undefined && input.role !== previousRole) ||
      (input.isActive !== undefined && input.isActive !== previousIsActive);

    if (roleOrStatusChanged) {
      targetUser.refreshTokens = [];
    }

    await targetUser.save();

    // Race-safe last admin protection: verify remaining active admin count after update
    if (isDemotingOrDeactivatingAdmin) {
      const remainingAdmins = await countActiveAdminsFn(targetUser._id);
      if (remainingAdmins === 0) {
        // Revert immediately to restore invariant
        targetUser.role = previousRole;
        targetUser.isActive = previousIsActive;
        await targetUser.save();
        throw new ApiError(
          409,
          'Cannot remove the last active Administrator'
        );
      }
    }

    // Determine audit action
    let auditAction: AuditAction = 'USER_UPDATED';
    if (input.role !== undefined && input.role !== previousRole) {
      auditAction = 'USER_ROLE_CHANGED';
    } else if (input.isActive === false && previousIsActive) {
      auditAction = 'USER_DEACTIVATED';
    } else if (input.isActive === true && !previousIsActive) {
      auditAction = 'USER_REACTIVATED';
    }

    await auditService.logAudit({
      actor: actorUser._id,
      action: auditAction,
      targetType: 'User',
      targetId: targetUser._id,
      meta: {
        changes: input,
        previousRole,
        previousIsActive,
      },
      ip,
      userAgent,
    });

    return this.getUserById(targetUser._id);
  }

  /**
   * Admin sets a temporary password for a user.
   * Invalidates existing sessions, updates passwordChangedAt, resets failed attempts.
   */
  async resetPassword(
    targetId: string,
    input: ResetPasswordInput,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<{ message: string }> {
    const targetObjectId = new Types.ObjectId(targetId);
    const targetUser = await User.findById(targetObjectId);
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    const passwordHash = await hashPassword(input.newPassword);

    await User.updateOne(
      { _id: targetObjectId },
      {
        $set: {
          passwordHash,
          passwordChangedAt: new Date(),
          refreshTokens: [],
          failedLoginAttempts: 0,
        },
        $unset: { lockUntil: 1 },
      }
    );

    // Audit USER_PASSWORD_RESET (never logs the raw password or hash)
    await auditService.logAudit({
      actor: actorId,
      action: 'USER_PASSWORD_RESET',
      targetType: 'User',
      targetId: targetObjectId,
      meta: {
        note: 'Administrative temporary password reset',
      },
      ip,
      userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * User updates their own profile details (name, phone, avatar only).
   */
  async updateUserSelf(
    userId: string | Types.ObjectId,
    input: UpdateUserSelfInput,
    ip?: string,
    userAgent?: string
  ): Promise<IUser> {
    const userObjectId =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    const user = await User.findById(userObjectId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.avatar !== undefined) user.avatar = input.avatar;

    await user.save();

    await auditService.logAudit({
      actor: user._id,
      action: 'USER_UPDATED',
      targetType: 'User',
      targetId: user._id,
      meta: {
        selfUpdate: true,
        updatedFields: Object.keys(input),
      },
      ip,
      userAgent,
    });

    return this.getUserById(user._id);
  }

  /**
   * Retrieve audit logs for a specific user.
   */
  async getUserAudit(
    targetId: string,
    query: Record<string, unknown>
  ): Promise<PaginatedResult<IAuditLog>> {
    const targetObjectId = new Types.ObjectId(targetId);
    const user = await User.findById(targetObjectId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const { page, limit, skip } = parsePagination(query);

    const [logs, total] = await Promise.all([
      AuditLog.find({ targetId: targetObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email role'),
      AuditLog.countDocuments({ targetId: targetObjectId }),
    ]);

    return formatPaginatedResponse(logs, total, page, limit);
  }

  /**
   * Admin unlocks a locked user account without changing password or sessions.
   * Clears failedLoginAttempts and lockUntil.
   * Returns 404 if user does not exist.
   */
  async unlockUser(
    targetId: string,
    actorId: Types.ObjectId | string,
    ip?: string,
    userAgent?: string
  ): Promise<IUser> {
    const targetObjectId = new Types.ObjectId(targetId);
    const user = await User.findById(targetObjectId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await User.updateOne(
      { _id: targetObjectId },
      {
        $set: { failedLoginAttempts: 0 },
        $unset: { lockUntil: 1 },
      }
    );

    await auditService.logAudit({
      actor: actorId,
      action: 'USER_UNLOCKED',
      targetType: 'User',
      targetId: targetObjectId,
      ip,
      userAgent,
    });

    return this.getUserById(targetObjectId);
  }
}

export const userService = new UserService();
