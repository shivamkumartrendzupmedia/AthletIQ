import { z } from 'zod';
import { CONTACT_MESSAGE_STATUSES } from '../models/ContactMessage.js';

export const createContactMessageSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Name is required' })
      .max(100, { message: 'Name cannot exceed 100 characters' }),
    email: z
      .string()
      .trim()
      .email({ message: 'Valid email address is required' })
      .max(150, { message: 'Email cannot exceed 150 characters' }),
    subject: z
      .string()
      .trim()
      .max(150, { message: 'Subject cannot exceed 150 characters' })
      .optional(),
    message: z
      .string()
      .trim()
      .min(1, { message: 'Message is required' })
      .max(2000, { message: 'Message cannot exceed 2000 characters' }),
  })
  .strict();

export const updateContactMessageStatusSchema = z
  .object({
    status: z.enum(CONTACT_MESSAGE_STATUSES as [string, ...string[]]),
  })
  .strict();

export const contactMessageQuerySchema = z
  .object({
    status: z.enum(CONTACT_MESSAGE_STATUSES as [string, ...string[]]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
