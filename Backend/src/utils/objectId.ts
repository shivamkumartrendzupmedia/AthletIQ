import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ApiError } from './ApiError.js';

/**
 * Validates whether a given string is a valid 24-hex-character MongoDB ObjectId.
 */
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id) && Types.ObjectId.isValid(id);
};

/**
 * Express middleware to validate an ObjectId route parameter.
 * Prevents Mongoose CastError / 500 crashes and consistently returns 400 Bad Request.
 */
export const validateObjectId = (paramName = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!value || !isValidObjectId(value)) {
      return next(
        new ApiError(
          400,
          `Invalid ${paramName} format: expected a valid 24-character hexadecimal ObjectId`
        )
      );
    }
    next();
  };
};
