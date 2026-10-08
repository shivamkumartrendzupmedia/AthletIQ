import { z } from 'zod';
import { ROLES } from '../models/constants.js';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const passwordMessage =
  'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';

export const createUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(80, { message: 'Name cannot exceed 80 characters' }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Please provide a valid email address' }),
    role: z.enum(ROLES, {
      errorMap: () => ({ message: 'Invalid user role specified' }),
    }),
    password: z
      .string()
      .regex(passwordPattern, { message: passwordMessage }),
    phone: z.string().trim().optional(),
    avatar: z.string().trim().optional(),
  })
  .strict();

export const updateUserAdminSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(80, { message: 'Name cannot exceed 80 characters' })
      .optional(),
    phone: z.string().trim().optional(),
    avatar: z.string().trim().optional(),
    role: z.enum(ROLES, {
      errorMap: () => ({ message: 'Invalid user role specified' }),
    }).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateUserSelfSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(80, { message: 'Name cannot exceed 80 characters' })
      .optional(),
    phone: z.string().trim().optional(),
    avatar: z.string().trim().optional(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .regex(passwordPattern, { message: passwordMessage }),
  })
  .strict();

export const userQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.enum(ROLES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().trim().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>;
export type UpdateUserSelfInput = z.infer<typeof updateUserSelfSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
