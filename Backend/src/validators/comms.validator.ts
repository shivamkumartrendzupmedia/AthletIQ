import { z } from 'zod';
import {
  ANNOUNCEMENT_AUDIENCES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
} from '../models/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

function isValidIsoDate(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime()) && !isNaN(Date.parse(str));
}

export const createAnnouncementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required' })
      .max(200, { message: 'Title cannot exceed 200 characters' }),
    body: z
      .string()
      .trim()
      .min(1, { message: 'Body is required' }),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    team: z
      .string()
      .regex(objectIdRegex, { message: 'Valid team ObjectId is required' })
      .optional(),
    pinned: z.boolean().optional().default(false),
    publishedAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid publishedAt ISO date is required' })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.audience === 'Team' && !data.team) {
        return false;
      }
      return true;
    },
    {
      message: 'Team is required when audience is Team',
      path: ['team'],
    }
  );

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).optional(),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
    team: z.string().regex(objectIdRegex).optional(),
    pinned: z.boolean().optional(),
    publishedAt: z
      .string()
      .refine(isValidIsoDate, { message: 'Valid publishedAt ISO date is required' })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.audience === 'Team' && !data.team) {
        return false;
      }
      return true;
    },
    {
      message: 'Team is required when audience is Team',
      path: ['team'],
    }
  );

export const announcementQuerySchema = z
  .object({
    audience: z.enum(ANNOUNCEMENT_AUDIENCES).optional(),
    team: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    pinned: z.coerce.boolean().optional(),
  })
  .strict();

export const createDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required' })
      .max(150, { message: 'Title cannot exceed 150 characters' }),
    category: z.enum(DOCUMENT_CATEGORIES),
    visibility: z.enum(DOCUMENT_VISIBILITIES),
    team: z
      .string()
      .regex(objectIdRegex, { message: 'Valid team ObjectId is required' })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.visibility === 'Team' && !data.team) {
        return false;
      }
      return true;
    },
    {
      message: 'Team is required when visibility is Team',
      path: ['team'],
    }
  );

export const documentQuerySchema = z
  .object({
    category: z.enum(DOCUMENT_CATEGORIES).optional(),
    visibility: z.enum(DOCUMENT_VISIBILITIES).optional(),
    team: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
  })
  .strict();
