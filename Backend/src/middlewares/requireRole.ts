import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { Role } from '../models/constants.js';

/**
 * Role-based authorization middleware.
 * Must run after `requireAuth`.
 * - 401 if unauthenticated (no user on request)
 * - 403 if authenticated user's role is not within the permitted roles
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: requires one of the following roles: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
};
