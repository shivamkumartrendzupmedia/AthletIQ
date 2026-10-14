import { z } from 'zod';

export function computeAge(dateOfBirth: Date | string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!isoDateRegex.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(80, { message: 'Name cannot exceed 80 characters' })
      .optional(),
    dateOfBirth: z
      .string()
      .trim()
      .refine(isValidCalendarDate, {
        message: 'dateOfBirth must be a valid calendar date in YYYY-MM-DD format',
      })
      .refine(
        (val) => {
          const [y, m, d] = val.split('-').map(Number);
          const birth = new Date(Date.UTC(y, m - 1, d));
          const now = new Date();
          return birth.getTime() <= now.getTime();
        },
        { message: 'dateOfBirth cannot be in the future' }
      )
      .refine(
        (val) => {
          const age = computeAge(val);
          return age >= 5 && age <= 100;
        },
        { message: 'Age must be between 5 and 100 years' }
      )
      .optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.dateOfBirth !== undefined, {
    message: 'At least one field (name or dateOfBirth) must be provided for profile update',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
