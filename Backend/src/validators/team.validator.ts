import { z } from 'zod';
import { TEAM_STATUSES } from '../models/constants.js';

const httpsUrlRegex = /^https:\/\/.+/i;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTeamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Team name must be at least 2 characters long' })
      .max(100, { message: 'Team name cannot exceed 100 characters' }),
    sport: z
      .string()
      .regex(objectIdRegex, { message: 'Valid sport ObjectId is required' }),
    ageGroup: z
      .string()
      .trim()
      .min(1, { message: 'Age group is required' }),
    coach: z
      .string()
      .regex(objectIdRegex, { message: 'Coach must be a valid Coach ObjectId' })
      .optional(),
    season: z
      .string()
      .trim()
      .max(50)
      .optional(),
    logo: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Logo URL must use secure https protocol' })
      .optional(),
    status: z
      .enum(TEAM_STATUSES)
      .default('Active'),
  })
  .strict();

export const updateTeamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    sport: z
      .string()
      .regex(objectIdRegex)
      .optional(),
    ageGroup: z
      .string()
      .trim()
      .min(1)
      .optional(),
    coach: z
      .string()
      .regex(objectIdRegex)
      .nullable()
      .optional(),
    season: z
      .string()
      .trim()
      .max(50)
      .optional(),
    logo: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Logo URL must use secure https protocol' })
      .optional(),
    status: z
      .enum(TEAM_STATUSES)
      .optional(),
  })
  .strict();

export const teamQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sport: z.string().optional(),
  ageGroup: z.string().optional(),
  status: z.enum(TEAM_STATUSES).optional(),
  search: z.string().trim().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type TeamQueryInput = z.infer<typeof teamQuerySchema>;
