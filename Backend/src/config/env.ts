import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z
      .string()
      .min(1, { message: 'MONGODB_URI is required' }),
    CLIENT_URL: z
      .string()
      .min(1, { message: 'CLIENT_URL is required' })
      .default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters long' }),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters long' }),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('7d'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
    DOCUMENT_UPLOAD_DIR: z.string().default('./uploads/documents'),
    MAX_DOCUMENT_SIZE_BYTES: z.coerce.number().int().positive().default(5242880),
  })
  .refine(
    (data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET,
    {
      message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different from each other',
      path: ['JWT_REFRESH_SECRET'],
    }
  )
  .transform((data) => ({
    ...data,
    RATE_LIMIT_MAX:
      data.RATE_LIMIT_MAX !== undefined
        ? data.RATE_LIMIT_MAX
        : data.NODE_ENV === 'development'
          ? 5000
          : 600,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid or missing environment variables:');
  for (const issue of parsed.error.issues) {
    const varName = issue.path.join('.');
    console.error(`   - ${varName}: ${issue.message}`);
  }
  console.error('\nPlease check your .env file against .env.example.\n');
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
