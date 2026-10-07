import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Reusable Express middleware to validate req.body against a Zod schema.
 * Replaces req.body with the sanitized/transformed data on success,
 * or forwards the ZodError to errorHandler on failure.
 */
export const validate =
  (schema: ZodSchema) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
