import { z } from 'zod';

const httpsUrlRegex = /^https:\/\/.+/i;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const certificationSchema = z
  .object({
    name: z.string().trim().min(1, 'Certification name is required'),
    issuer: z.string().trim().optional(),
    year: z.number().int().min(1900).max(2100).optional(),
  })
  .strict();

export const createCoachSchema = z
  .object({
    user: z
      .string()
      .regex(objectIdRegex, { message: 'Valid User ObjectId is required' }),
    title: z.string().trim().max(100).optional(),
    bio: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    specialties: z.array(z.string().trim().min(1)).default([]),
    sports: z.array(z.string().regex(objectIdRegex)).default([]),
    certifications: z.array(certificationSchema).default([]),
    experienceYears: z.number().min(0).default(0),
    achievements: z.array(z.string().trim().min(1)).default([]),
    photo: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Photo URL must use secure https protocol' })
      .optional(),
    isPublic: z.boolean().default(true),
  })
  .strict();

export const updateCoachAdminSchema = z
  .object({
    title: z.string().trim().max(100).optional(),
    bio: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    specialties: z.array(z.string().trim().min(1)).optional(),
    sports: z.array(z.string().regex(objectIdRegex)).optional(),
    certifications: z.array(certificationSchema).optional(),
    experienceYears: z.number().min(0).optional(),
    achievements: z.array(z.string().trim().min(1)).optional(),
    photo: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Photo URL must use secure https protocol' })
      .optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

export const updateCoachSelfSchema = z
  .object({
    bio: z.string().trim().optional(),
    photo: z
      .string()
      .trim()
      .regex(httpsUrlRegex, { message: 'Photo URL must use secure https protocol' })
      .optional(),
    specialties: z.array(z.string().trim().min(1)).optional(),
    certifications: z.array(certificationSchema).optional(),
    achievements: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const coachQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sport: z.string().optional(),
  isPublic: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().trim().optional(),
});

export type CreateCoachInput = z.infer<typeof createCoachSchema>;
export type UpdateCoachAdminInput = z.infer<typeof updateCoachAdminSchema>;
export type UpdateCoachSelfInput = z.infer<typeof updateCoachSelfSchema>;
export type CoachQueryInput = z.infer<typeof coachQuerySchema>;
