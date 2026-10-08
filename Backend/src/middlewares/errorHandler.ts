import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}

/**
 * Global error handling middleware enforcing standard error response shape:
 * { success: false, message: string, errors?: unknown }
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier format';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    const validationErrors = (err as unknown as { errors?: Record<string, { path?: string; message?: string }> }).errors;
    if (validationErrors) {
      errors = Object.values(validationErrors).map((e) => ({
        field: e.path || 'unknown',
        message: e.message || 'Invalid value',
      }));
    }
  } else if (err.message) {
    message = err.message;
  }

  const responseBody: ErrorResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
  };

  res.status(statusCode).json(responseBody);
};
