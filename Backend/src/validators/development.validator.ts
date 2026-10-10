import { z } from 'zod';
import {
  COACH_FEEDBACK_TYPES,
  ATHLETE_GOAL_STATUSES,
} from '../models/constants.js';

// Reusable single skill rating validator (integer 1-10, strictly NO coercion)
const skillRatingSchema = z
  .number({
    required_error: 'Skill rating is required',
    invalid_type_error: 'Skill rating must be a number',
  })
  .int('Skill rating must be an integer')
  .min(1, 'Skill rating must be at least 1')
  .max(10, 'Skill rating cannot exceed 10');

/**
 * Skill Assessment creation schema
 * Canonical flat keys representing the 10 core skills
 */
export const createAssessmentSchema = z
  .object({
    pace: skillRatingSchema,
    shooting: skillRatingSchema,
    passing: skillRatingSchema,
    dribbling: skillRatingSchema,
    defending: skillRatingSchema,
    stamina: skillRatingSchema,
    agility: skillRatingSchema,
    decisionMaking: skillRatingSchema,
    leadership: skillRatingSchema,
    workRate: skillRatingSchema,
    note: z
      .string()
      .trim()
      .max(1000, 'Note cannot exceed 1000 characters')
      .optional(),
    date: z
      .string()
      .refine(
        (val) => {
          const parsed = Date.parse(val);
          if (isNaN(parsed)) return false;
          // Disallow future assessment dates (allow 60s clock skew buffer)
          return parsed <= Date.now() + 60000;
        },
        { message: 'Assessment date cannot be in the future' }
      )
      .optional(),
  })
  .strict();

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

/**
 * Coach Feedback creation schema
 */
export const createFeedbackSchema = z
  .object({
    athlete: z
      .string({ required_error: 'Athlete id is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid athlete id'),
    text: z
      .string({ required_error: 'Feedback text is required' })
      .trim()
      .min(1, 'Feedback text cannot be empty')
      .max(2000, 'Feedback cannot exceed 2000 characters'),
    type: z.enum(COACH_FEEDBACK_TYPES, {
      errorMap: () => ({
        message: `Type must be one of: ${COACH_FEEDBACK_TYPES.join(', ')}`,
      }),
    }).default('General'),
  })
  .strict();

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

/**
 * Athlete Goal creation schema
 */
export const createGoalSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    targetDate: z
      .string({ required_error: 'Target date is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Target date must be a valid date',
      }),
    status: z.enum(ATHLETE_GOAL_STATUSES, {
      errorMap: () => ({
        message: `Status must be one of: ${ATHLETE_GOAL_STATUSES.join(', ')}`,
      }),
    }).default('Active'),
    progress: z
      .number()
      .int('Progress must be an integer')
      .min(0, 'Progress cannot be negative')
      .max(100, 'Progress cannot exceed 100')
      .default(0),
  })
  .strict();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

/**
 * Goal update schema for Staff (Coach / Admin)
 * Can update title, description, targetDate, status, and progress
 */
export const updateGoalStaffSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    targetDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Target date must be a valid date',
      })
      .optional(),
    status: z
      .enum(ATHLETE_GOAL_STATUSES, {
        errorMap: () => ({
          message: `Status must be one of: ${ATHLETE_GOAL_STATUSES.join(', ')}`,
        }),
      })
      .optional(),
    progress: z
      .number()
      .int('Progress must be an integer')
      .min(0, 'Progress cannot be negative')
      .max(100, 'Progress cannot exceed 100')
      .optional(),
  })
  .strict();

export type UpdateGoalStaffInput = z.infer<typeof updateGoalStaffSchema>;

/**
 * Goal update schema for Athletes self-update
 * Athletes are ONLY allowed to update progress (0-100 integer)
 */
export const updateGoalSelfSchema = z
  .object({
    progress: z
      .number({ required_error: 'Progress is required' })
      .int('Progress must be an integer')
      .min(0, 'Progress cannot be negative')
      .max(100, 'Progress cannot exceed 100'),
  })
  .strict();

export type UpdateGoalSelfInput = z.infer<typeof updateGoalSelfSchema>;
