import { z } from 'zod';
import { SPORT_STATUSES } from '../models/constants.js';

const httpsUrlRegex = /^https:\/\/.+/i;

export const createSportSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Sport name must be at least 2 characters long' })
      .max(100, { message: 'Sport name cannot exceed 100 characters' }),
    description: z
      .string()
      .trim()
      .min(5, { message: 'Description must be at least 5 characters long' }),
    shortDescription: z
      .string()
      .trim()
      .max(250, { message: 'Short description cannot exceed 250 characters' })
      .optional(),
    icon: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Icon URL must use secure https protocol' })
      .optional(),
    image: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Image URL must use secure https protocol' })
      .optional(),
    ageGroups: z
      .array(z.string().trim().min(1))
      .default([]),
    features: z
      .array(z.string().trim().min(1))
      .default([]),
    status: z
      .enum(SPORT_STATUSES)
      .default('Active'),
  })
  .strict();

export const updateSportSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    description: z
      .string()
      .trim()
      .min(5)
      .optional(),
    shortDescription: z
      .string()
      .trim()
      .max(250)
      .optional(),
    icon: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Icon URL must use secure https protocol' })
      .optional(),
    image: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Image URL must use secure https protocol' })
      .optional(),
    ageGroups: z
      .array(z.string().trim().min(1))
      .optional(),
    features: z
      .array(z.string().trim().min(1))
      .optional(),
    status: z
      .enum(SPORT_STATUSES)
      .optional(),
  })
  .strict();

export const sportQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(SPORT_STATUSES).optional(),
  search: z.string().trim().optional(),
});

export type CreateSportInput = z.infer<typeof createSportSchema>;
export type UpdateSportInput = z.infer<typeof updateSportSchema>;
export type SportQueryInput = z.infer<typeof sportQuerySchema>;
