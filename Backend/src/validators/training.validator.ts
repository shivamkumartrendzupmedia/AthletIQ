import { z } from 'zod';
import {
  SESSION_TYPES,
  SESSION_STATUSES,
  ATTENDANCE_STATUSES,
} from '../models/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

function isValidIsoDate(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime()) && !isNaN(Date.parse(str));
}

export const sessionQuerySchema = z
  .object({
    team: z.string().optional(),
    sport: z.string().optional(),
    type: z.enum(SESSION_TYPES).optional(),
    status: z.enum(SESSION_STATUSES).optional(),
    coach: z.string().optional(),
    from: z
      .string()
      .refine(isValidIsoDate, { message: 'Invalid "from" ISO date format' })
      .optional(),
    to: z
      .string()
      .refine(isValidIsoDate, { message: 'Invalid "to" ISO date format' })
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromTime = new Date(data.from).getTime();
        const toTime = new Date(data.to).getTime();
        if (toTime < fromTime) return false;
        // Range cannot exceed 366 days
        const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
        if (toTime - fromTime > maxRangeMs) return false;
      }
      return true;
    },
    { message: 'Date range cannot exceed 366 days and "to" must be after or equal to "from"' }
  );

export const createSessionSchema = z
  .object({
    team: z
      .string()
      .regex(objectIdRegex, { message: 'Valid team ObjectId is required' }),
    title: z
      .string()
      .trim()
      .min(1, { message: 'Session title is required' })
      .max(150, { message: 'Session title cannot exceed 150 characters' }),
    type: z.enum(SESSION_TYPES).default('Training'),
    startsAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid startsAt ISO date is required' }),
    endsAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid endsAt ISO date is required' }),
    venue: z
      .string()
      .trim()
      .min(1, { message: 'Venue is required' })
      .max(200, { message: 'Venue cannot exceed 200 characters' }),
    notes: z.string().trim().max(1000).optional(),
    coach: z
      .string()
      .regex(objectIdRegex, { message: 'Valid coach ObjectId is required' })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      return end > start;
    },
    { message: 'Session end time must be strictly after start time', path: ['endsAt'] }
  )
  .refine(
    (data) => {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      const maxDuration = 12 * 60 * 60 * 1000;
      return end - start <= maxDuration;
    },
    { message: 'Session duration cannot exceed 12 hours', path: ['endsAt'] }
  );

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    type: z.enum(SESSION_TYPES).optional(),
    startsAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid startsAt ISO date is required' })
      .optional(),
    endsAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid endsAt ISO date is required' })
      .optional(),
    venue: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
    coach: z.string().regex(objectIdRegex).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        const start = new Date(data.startsAt).getTime();
        const end = new Date(data.endsAt).getTime();
        return end > start;
      }
      return true;
    },
    { message: 'Session end time must be strictly after start time', path: ['endsAt'] }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        const start = new Date(data.startsAt).getTime();
        const end = new Date(data.endsAt).getTime();
        const maxDuration = 12 * 60 * 60 * 1000;
        return end - start <= maxDuration;
      }
      return true;
    },
    { message: 'Session duration cannot exceed 12 hours', path: ['endsAt'] }
  );

export const cancelSessionSchema = z
  .object({
    reason: z.string().trim().min(1, { message: 'Cancellation reason is required' }).max(500),
  })
  .strict();

export const attendanceRecordSchema = z
  .object({
    athlete: z
      .string()
      .regex(objectIdRegex, { message: 'Valid athlete ObjectId is required' }),
    status: z.enum(ATTENDANCE_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const attendanceUpsertSchema = z
  .object({
    records: z
      .array(attendanceRecordSchema)
      .min(1, { message: 'At least one attendance record must be provided' })
      .max(100, { message: 'Cannot submit more than 100 attendance records at once' }),
  })
  .strict();

export const athleteAttendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
export type AttendanceUpsertInput = z.infer<typeof attendanceUpsertSchema>;
export type AthleteAttendanceQueryInput = z.infer<typeof athleteAttendanceQuerySchema>;
