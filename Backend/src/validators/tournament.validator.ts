import { z } from 'zod';
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  OFFICIAL_TYPES,
  MATCH_STATUSES,
} from '../models/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

function isValidIsoDate(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime()) && !isNaN(Date.parse(str));
}

// 1. Tournaments
export const createTournamentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Tournament name is required' })
      .max(150, { message: 'Tournament name cannot exceed 150 characters' }),
    sport: z
      .string()
      .regex(objectIdRegex, { message: 'Valid sport ObjectId is required' }),
    category: z
      .string()
      .trim()
      .min(1, { message: 'Category is required' })
      .max(50, { message: 'Category cannot exceed 50 characters' }),
    ageGroup: z
      .string()
      .trim()
      .min(1, { message: 'Age group is required' })
      .max(20, { message: 'Age group cannot exceed 20 characters' }),
    format: z.enum(TOURNAMENT_FORMATS),
    startDate: z
      .string()
      .refine(isValidIsoDate, { message: 'Invalid startDate ISO format' }),
    endDate: z
      .string()
      .refine(isValidIsoDate, { message: 'Invalid endDate ISO format' }),
    rules: z
      .string()
      .trim()
      .max(2000, { message: 'Rules cannot exceed 2000 characters' })
      .optional(),
    maxTeams: z
      .number()
      .int()
      .min(2, { message: 'maxTeams must be at least 2' })
      .max(64, { message: 'maxTeams cannot exceed 64' })
      .optional(),
    status: z.enum(TOURNAMENT_STATUSES).optional(),
  })
  .strict()
  .refine(
    (data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    { message: 'endDate must be greater than or equal to startDate', path: ['endDate'] }
  );

export const updateTournamentSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    sport: z.string().regex(objectIdRegex).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    ageGroup: z.string().trim().min(1).max(20).optional(),
    format: z.enum(TOURNAMENT_FORMATS).optional(),
    startDate: z.string().refine(isValidIsoDate).optional(),
    endDate: z.string().refine(isValidIsoDate).optional(),
    rules: z.string().trim().max(2000).optional(),
    maxTeams: z.number().int().min(2).max(64).optional(),
    status: z.enum(TOURNAMENT_STATUSES).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
      }
      return true;
    },
    { message: 'endDate must be greater than or equal to startDate', path: ['endDate'] }
  );

export const tournamentQuerySchema = z
  .object({
    sport: z.string().optional(),
    status: z.enum(TOURNAMENT_STATUSES).optional(),
    format: z.enum(TOURNAMENT_FORMATS).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

// 2. Registrations (TournamentTeam)
export const createRegistrationSchema = z
  .object({
    team: z
      .string()
      .regex(objectIdRegex, { message: 'Valid team ObjectId is required' }),
    squad: z
      .array(z.string().regex(objectIdRegex, { message: 'Valid athlete ObjectId is required' }))
      .max(30, { message: 'Squad cannot exceed 30 athletes' })
      .default([]),
  })
  .strict();

export const updateSquadSchema = z
  .object({
    squad: z
      .array(z.string().regex(objectIdRegex, { message: 'Valid athlete ObjectId is required' }))
      .max(30, { message: 'Squad cannot exceed 30 athletes' }),
  })
  .strict();

export const reviewRegistrationSchema = z
  .object({
    status: z.enum(['Approved', 'Rejected']),
    reason: z
      .string()
      .trim()
      .max(500, { message: 'Reason cannot exceed 500 characters' })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.status === 'Rejected') {
        return typeof data.reason === 'string' && data.reason.trim().length > 0;
      }
      return true;
    },
    { message: 'Reason is required when status is Rejected', path: ['reason'] }
  );

// 3. Venues
export const createVenueSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(250),
    capacity: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const updateVenueSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(250).optional(),
    capacity: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .strict();

// 4. Officials
export const createOfficialSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(OFFICIAL_TYPES),
    active: z.boolean().optional(),
  })
  .strict();

export const updateOfficialSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.enum(OFFICIAL_TYPES).optional(),
    active: z.boolean().optional(),
  })
  .strict();

// 5. Matches
export const createMatchSchema = z
  .object({
    homeTeam: z.string().regex(objectIdRegex, { message: 'Valid homeTeam ObjectId is required' }),
    awayTeam: z.string().regex(objectIdRegex, { message: 'Valid awayTeam ObjectId is required' }),
    round: z.string().trim().min(1).max(40),
    group: z.string().trim().max(20).optional(),
    scheduledAt: z.string().refine(isValidIsoDate, { message: 'Invalid scheduledAt ISO format' }),
    durationMinutes: z.number().int().min(30).max(240).default(90),
    venue: z.string().regex(objectIdRegex, { message: 'Valid venue ObjectId is required' }),
    referee: z.string().regex(objectIdRegex, { message: 'Valid referee ObjectId is required' }).optional(),
  })
  .strict()
  .refine((data) => data.homeTeam !== data.awayTeam, {
    message: 'homeTeam and awayTeam must be different',
    path: ['awayTeam'],
  });

export const updateMatchSchema = z
  .object({
    round: z.string().trim().min(1).max(40).optional(),
    group: z.string().trim().max(20).optional(),
    scheduledAt: z.string().refine(isValidIsoDate).optional(),
    durationMinutes: z.number().int().min(30).max(240).optional(),
    venue: z.string().regex(objectIdRegex).optional(),
    referee: z.string().regex(objectIdRegex).nullable().optional(),
    status: z.enum(MATCH_STATUSES).optional(),
  })
  .strict();

export const enterMatchResultSchema = z
  .object({
    homeScore: z.number().int().min(0).max(99),
    awayScore: z.number().int().min(0).max(99),
  })
  .strict();
