import { z } from 'zod';
import {
  ATHLETE_STATUSES,
  VERIFICATION_STATUSES,
  PROFILE_VISIBILITY,
  GENDER_TYPES,
} from '../models/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const guardianSchema = z
  .object({
    name: z.string().trim().min(1, 'Guardian name is required'),
    phone: z.string().trim().min(5, 'Guardian phone is required'),
    email: z.string().trim().email('Invalid guardian email').optional(),
  })
  .strict();

export const createAthleteSchema = z
  .object({
    user: z.string().regex(objectIdRegex).optional(),
    sport: z.string().regex(objectIdRegex, 'Valid sport ObjectId is required'),
    team: z.string().regex(objectIdRegex).optional(),
    dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }).optional().or(z.date().optional()),
    gender: z.enum(GENDER_TYPES).optional(),
    position: z.string().trim().max(50).optional(),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
    heightCm: z.number().min(50).max(280).optional(),
    weightKg: z.number().min(20).max(250).optional(),
    status: z.enum(ATHLETE_STATUSES).default('Active'),
    verificationStatus: z.enum(VERIFICATION_STATUSES).default('Pending ID'),
    medicalClearance: z.boolean().default(false),
    guardian: guardianSchema.optional(),
    medicalNotes: z.string().trim().optional(),
    profileVisibility: z.enum(PROFILE_VISIBILITY).default('AcademyOnly'),
  })
  .strict();

export const updateAthleteAdminSchema = z
  .object({
    user: z.string().regex(objectIdRegex).nullable().optional(),
    sport: z.string().regex(objectIdRegex).optional(),
    team: z.string().regex(objectIdRegex).nullable().optional(),
    dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }).optional().or(z.date().optional()),
    gender: z.enum(GENDER_TYPES).optional(),
    position: z.string().trim().max(50).optional(),
    jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
    heightCm: z.number().min(50).max(280).optional(),
    weightKg: z.number().min(20).max(250).optional(),
    status: z.enum(ATHLETE_STATUSES).optional(),
    verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
    medicalClearance: z.boolean().optional(),
    guardian: guardianSchema.optional(),
    medicalNotes: z.string().trim().optional(),
    profileVisibility: z.enum(PROFILE_VISIBILITY).optional(),
  })
  .strict();

export const updateAthleteCoachSchema = z
  .object({
    position: z.string().trim().max(50).optional(),
    status: z.enum(['Active', 'Injured', 'Trial']).optional(),
  })
  .strict();

export const updateAthleteSelfSchema = z
  .object({
    heightCm: z.number().min(50).max(280).optional(),
    weightKg: z.number().min(20).max(250).optional(),
    position: z.string().trim().max(50).optional(),
    guardian: guardianSchema.optional(),
    profileVisibility: z.enum(PROFILE_VISIBILITY).optional(),
  })
  .strict();

export const assignTeamSchema = z
  .object({
    teamId: z.string().regex(objectIdRegex, 'Valid team ObjectId is required').optional(),
    team: z.string().regex(objectIdRegex, 'Valid team ObjectId is required').optional(),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
  })
  .refine((data) => !!(data.teamId || data.team), {
    message: 'Either teamId or team must be provided',
  })
  .transform((data) => ({
    teamId: (data.teamId || data.team)!,
    jerseyNumber: data.jerseyNumber,
  }));

export const updateVerificationSchema = z
  .object({
    verificationStatus: z.enum(VERIFICATION_STATUSES),
    documents: z.array(z.string().regex(/^https:\/\/.+/i, 'Documents must be https URLs')).optional(),
  })
  .strict();

export const athleteQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sport: z.string().optional(),
  team: z.string().optional(),
  status: z.enum(ATHLETE_STATUSES).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  search: z.string().trim().optional(),
  unassigned: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => (val === true || val === 'true' ? true : undefined)),
});

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteAdminInput = z.infer<typeof updateAthleteAdminSchema>;
export type UpdateAthleteCoachInput = z.infer<typeof updateAthleteCoachSchema>;
export type UpdateAthleteSelfInput = z.infer<typeof updateAthleteSelfSchema>;
export type AssignTeamInput = z.infer<typeof assignTeamSchema>;
export type UpdateVerificationInput = z.infer<typeof updateVerificationSchema>;
export type AthleteQueryInput = z.infer<typeof athleteQuerySchema>;
