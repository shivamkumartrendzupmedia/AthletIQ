import { z } from 'zod';
import { ACHIEVEMENT_CATEGORIES } from '../models/constants.js';

const httpsUrlRegex = /^https:\/\/.+/i;

export const createAchievementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title must be at least 1 character long' })
      .max(120, { message: 'Title cannot exceed 120 characters' }),
    description: z
      .string()
      .trim()
      .min(1, { message: 'Description must be at least 1 character long' })
      .max(500, { message: 'Description cannot exceed 500 characters' }),
    category: z.enum(ACHIEVEMENT_CATEGORIES, {
      errorMap: () => ({ message: 'Invalid achievement category' }),
    }),
    achievedOn: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid achieved on date format',
      })
      .refine(
        (val) => {
          const d = new Date(val);
          return d.getTime() <= Date.now() + 60000;
        },
        { message: 'Achieved on date cannot be in the future' }
      ),
    imageUrl: z
      .string()
      .trim()
      .max(500, { message: 'Image URL cannot exceed 500 characters' })
      .regex(httpsUrlRegex, { message: 'Image URL must use secure https protocol' })
      .optional(),
    featured: z.boolean().optional().default(false),
  })
  .strict();

export const updateAchievementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title must be at least 1 character long' })
      .max(120, { message: 'Title cannot exceed 120 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, { message: 'Description must be at least 1 character long' })
      .max(500, { message: 'Description cannot exceed 500 characters' })
      .optional(),
    category: z
      .enum(ACHIEVEMENT_CATEGORIES, {
        errorMap: () => ({ message: 'Invalid achievement category' }),
      })
      .optional(),
    achievedOn: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid achieved on date format',
      })
      .refine(
        (val) => {
          const d = new Date(val);
          return d.getTime() <= Date.now() + 60000;
        },
        { message: 'Achieved on date cannot be in the future' }
      )
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .max(500, { message: 'Image URL cannot exceed 500 characters' })
      .regex(httpsUrlRegex, { message: 'Image URL must use secure https protocol' })
      .optional(),
    featured: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

export const achievementQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.enum(ACHIEVEMENT_CATEGORIES).optional(),
  featured: z.string().optional(),
  search: z.string().trim().optional(),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
export type AchievementQueryInput = z.infer<typeof achievementQuerySchema>;
