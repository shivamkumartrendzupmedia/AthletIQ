import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

/**
 * Authentication guard middleware.
 * Verifies Bearer JWT access token, checks active status,
 * ensures token freshness against passwordChangedAt, and attaches req.user.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authorization token missing or invalid');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired access token');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'User account not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    // Token revocation check: if password was changed after token issuance, reject
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedSeconds = Math.floor(
        user.passwordChangedAt.getTime() / 1000
      );
      if (payload.iat < passwordChangedSeconds) {
        throw new ApiError(
          401,
          'Password was recently changed. Please log in again.'
        );
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
