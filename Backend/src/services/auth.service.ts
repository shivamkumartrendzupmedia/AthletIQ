import crypto from 'crypto';
import { User, type IUser } from '../models/User.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { AuditLog } from '../models/AuditLog.js';
import { mailerService } from './mailer.service.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  hashPassword,
  comparePassword,
  dummyPasswordCompare,
} from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.js';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from '../validators/auth.validator.js';

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user. Role is locked strictly to 'Athlete'.
   */
  async register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ApiError(409, 'Email address is already registered');
    }

    const passwordHash = await hashPassword(input.password);

    // Explicitly lock role to 'Athlete' regardless of any request body inputs
    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'Athlete',
    });

    const accessToken = signAccessToken(user.id, user.role);
    const { token: refreshToken, expiresAt } = signRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);

    user.refreshTokens = [
      {
        tokenHash,
        expiresAt,
        createdAt: new Date(),
        userAgent,
      },
    ];

    await user.save();

    return { user, accessToken, refreshToken };
  }

  /**
   * Authenticate user with email and password.
   * Includes timing-attack mitigation and account lockout after 5 failed attempts.
   */
  async login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select(
      '+passwordHash +refreshTokens'
    );

    // If user is not found, run dummy password compare to prevent timing side-channel attacks
    if (!user) {
      await dummyPasswordCompare(input.password);
      throw new ApiError(401, 'Invalid email or password');
    }

    // Account lockout verification
    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      throw new ApiError(
        423,
        'Account is temporarily locked due to too many failed login attempts. Please try again after 15 minutes.'
      );
    }

    // Reset expired lock if timeout passed
    if (user.lockUntil && user.lockUntil <= now) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { failedLoginAttempts: 0 },
          $unset: { lockUntil: 1 },
        }
      );
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      const lockThreshold = 5;
      const lockDurationMs = 15 * 60 * 1000;
      const lockTime = new Date(Date.now() + lockDurationMs);

      // Atomic increment of failed attempts
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      );

      const attempts = updatedUser?.failedLoginAttempts ?? 1;

      if (attempts >= lockThreshold) {
        // Set lockUntil atomically when attempts reach or exceed 5
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: lockTime } }
        );
        throw new ApiError(
          423,
          'Account is temporarily locked due to too many failed login attempts. Please try again after 15 minutes.'
        );
      }

      throw new ApiError(401, 'Invalid email or password');
    }

    // Login successful: reset failed attempt counters atomically and record login timestamp
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
        },
        $unset: { lockUntil: 1 },
      }
    );
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    const accessToken = signAccessToken(user.id, user.role);
    const { token: refreshToken, expiresAt } = signRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);

    user.refreshTokens.push({
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent,
    });

    // Enforce maximum 5 active concurrent sessions per user (drop oldest)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    return { user, accessToken, refreshToken };
  }

  /**
   * Atomic refresh token rotation with reuse detection.
   * Pulls matching tokenHash in single findOneAndUpdate. If not found, revokes all sessions.
   */
  async refresh(
    rawRefreshToken: string | undefined,
    userAgent?: string
  ): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new ApiError(401, 'Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const presentedHash = hashToken(rawRefreshToken);
    const now = new Date();
    const graceMs = env.REFRESH_GRACE_MS;
    const graceThreshold = new Date(now.getTime() - graceMs);

    const { token: newRefreshToken, expiresAt } = signRefreshToken(payload.sub);
    const newTokenHash = hashToken(newRefreshToken);

    // Branch 1: Normal path (presentedHash equals current tokenHash)
    let user: IUser | null = (await User.findOneAndUpdate(
      {
        _id: payload.sub,
        refreshTokens: { $elemMatch: { tokenHash: presentedHash } },
      },
      {
        $set: {
          'refreshTokens.$.tokenHash': newTokenHash,
          'refreshTokens.$.expiresAt': expiresAt,
          'refreshTokens.$.userAgent': userAgent,
        },
        $push: {
          'refreshTokens.$.recentHashes': {
            $each: [{ hash: presentedHash, at: now }],
            $slice: -5,
          },
        },
      },
      { new: true }
    ).select('+refreshTokens')) as IUser | null;

    let isGrace = false;

    // Branch 2: Grace path (presentedHash was rotated within grace window)
    if (!user) {
      user = (await User.findOneAndUpdate(
        {
          _id: payload.sub,
          refreshTokens: {
            $elemMatch: {
              recentHashes: {
                $elemMatch: {
                  hash: presentedHash,
                  at: { $gte: graceThreshold },
                },
              },
            },
          },
        },
        [
          {
            $set: {
              refreshTokens: {
                $map: {
                  input: '$refreshTokens',
                  as: 'sess',
                  in: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: { $ifNull: ['$$sess.recentHashes', []] },
                                as: 'rh',
                                cond: {
                                  $and: [
                                    { $eq: ['$$rh.hash', presentedHash] },
                                    { $gte: ['$$rh.at', graceThreshold] },
                                  ],
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                      {
                        $mergeObjects: [
                          '$$sess',
                          {
                            tokenHash: newTokenHash,
                            expiresAt: expiresAt,
                            userAgent: userAgent,
                            recentHashes: {
                              $slice: [
                                {
                                  $concatArrays: [
                                    {
                                      $filter: {
                                        input: { $ifNull: ['$$sess.recentHashes', []] },
                                        as: 'rh',
                                        cond: { $gte: ['$$rh.at', graceThreshold] },
                                      },
                                    },
                                    [
                                      {
                                        hash: '$$sess.tokenHash',
                                        at: now,
                                      },
                                    ],
                                  ],
                                },
                                -5,
                              ],
                            },
                          },
                        ],
                      },
                      '$$sess',
                    ],
                  },
                },
              },
            },
          },
        ],
        { new: true }
      ).select('+refreshTokens')) as unknown as IUser | null;

      if (user) {
        const hasRotatedSession = user.refreshTokens?.some(
          (sess) => sess.tokenHash === newTokenHash
        );
        if (hasRotatedSession) {
          isGrace = true;
        } else {
          user = null;
        }
      }
    }

    if (!user) {
      // REUSE DETECTION: Valid signature but token missing from current tokens and grace window expired/missing.
      // Immediately revoke all sessions for this user.
      await User.findByIdAndUpdate(payload.sub, {
        $set: { refreshTokens: [] },
      });
      throw new ApiError(
        401,
        'Invalid or revoked refresh token. All active sessions have been terminated.'
      );
    }

    if (!user.isActive) {
      // Reject inactive user and revoke all refresh tokens
      await User.findByIdAndUpdate(payload.sub, {
        $set: { refreshTokens: [] },
      });
      throw new ApiError(401, 'User account is deactivated');
    }

    if (isGrace) {
      await AuditLog.create({
        action: 'REFRESH_GRACE_REUSE',
        actor: user._id,
        targetId: user._id,
        targetType: 'User',
        meta: {
          userId: user._id.toString(),
        },
      });
    }

    const accessToken = signAccessToken(user.id, user.role);

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout user by removing the specific refresh token session.
   */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      const tokenHash = hashToken(rawRefreshToken);
      await User.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { tokenHash } } }
      );
    } catch {
      // Silently ignore token verification failures during logout
    }
  }

  /**
   * Logout user across all devices by revoking all refresh tokens.
   */
  async logoutAll(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  /**
   * Change user password, set passwordChangedAt, and revoke all sessions.
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const user = await User.findById(userId).select(
      '+passwordHash +refreshTokens'
    );
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    const isMatch = await comparePassword(
      input.currentPassword,
      user.passwordHash
    );
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    user.passwordHash = await hashPassword(input.newPassword);
    user.passwordChangedAt = new Date();
    // Invalidate all refresh tokens across all sessions
    user.refreshTokens = [];

    await user.save();
  }

  /**
   * Request a password reset link.
   * Constant 200 response to prevent user enumeration.
   * Rate limited and protected by a 60-second user cooldown.
   */
  async forgotPassword(email: string): Promise<{ success: true; message: string }> {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    if (user) {
      // 60-second cooldown per user
      const cooldownThreshold = new Date(Date.now() - 60 * 1000);
      const recentReset = await PasswordReset.findOne({
        user: user._id,
        createdAt: { $gt: cooldownThreshold },
      });

      if (!recentReset) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await PasswordReset.create({
          user: user._id,
          tokenHash,
          expiresAt,
        });

        await mailerService.sendPasswordResetEmail(user.email, rawToken, user.name);

        await AuditLog.create({
          actor: user._id,
          action: 'USER_PASSWORD_RESET',
          targetType: 'User',
          targetId: user._id,
          meta: { step: 'requested' },
        });
      }
    }

    return {
      success: true,
      message: 'If that email exists, password reset instructions have been sent.',
    };
  }

  /**
   * Reset user password using token.
   * Atomic token consumption, hash update, session revocation, and lockout clearance.
   */
  async resetPassword(input: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: true; message: string }> {
    if (!input.token || !input.password) {
      throw ApiError.badRequest('Token and password are required');
    }

    if (input.password !== input.confirmPassword) {
      throw ApiError.badRequest('Passwords do not match');
    }

    if (input.password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters long');
    }

    const tokenHash = crypto.createHash('sha256').update(input.token.trim()).digest('hex');

    const resetRecord = await PasswordReset.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { usedAt: new Date() },
      },
      { new: true }
    );

    if (!resetRecord) {
      throw ApiError.badRequest('Invalid or expired password reset token');
    }

    const user = await User.findById(resetRecord.user).select(
      '+passwordHash +refreshTokens'
    );

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    user.passwordHash = await hashPassword(input.password);
    user.passwordChangedAt = new Date();
    user.refreshTokens = [];
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    await user.save();

    await AuditLog.create({
      actor: user._id,
      action: 'USER_PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id,
      meta: { step: 'completed' },
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    };
  }
}

export const authService = new AuthService();
