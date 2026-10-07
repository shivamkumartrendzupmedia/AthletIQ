import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

/**
 * 404 handler for routes that do not match any defined endpoint
 */
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`));
};
