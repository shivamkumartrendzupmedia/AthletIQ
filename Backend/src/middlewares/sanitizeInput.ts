import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 10;

/**
 * Recursively scans an object for NoSQL operator injections and prototype pollution attempts.
 * Rejects any key starting with '$', containing '.', or matching prototype pollution patterns.
 */
const checkSanitization = (value: unknown, depth = 0): void => {
  if (depth > MAX_DEPTH) {
    throw new ApiError(400, 'Request payload exceeds maximum allowed nesting depth');
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      checkSanitization(item, depth + 1);
    }
    return;
  }

  for (const [key, val] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new ApiError(400, `Prohibited key detected: "${key}"`);
    }

    if (key.startsWith('$') || key.includes('.')) {
      throw new ApiError(
        400,
        `Invalid request parameter key detected: "${key}". Keys cannot start with "$" or contain "."`
      );
    }

    checkSanitization(val, depth + 1);
  }
};

/**
 * Global input sanitization middleware.
 * Must run after body parsers and before route handlers.
 */
export const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body) checkSanitization(req.body);
    if (req.query) checkSanitization(req.query);
    if (req.params) checkSanitization(req.params);
    next();
  } catch (error) {
    next(error);
  }
};
