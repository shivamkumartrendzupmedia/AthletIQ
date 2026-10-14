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
    REFRESH_GRACE_MS: z.coerce.number().int().nonnegative().default(30000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
    CHATBOT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    CHATBOT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    DOCUMENT_UPLOAD_DIR: z.string().default('./uploads/documents'),
    MAX_DOCUMENT_SIZE_BYTES: z.coerce.number().int().positive().default(5242880),
    COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),
    COOKIE_SECURE: z
      .preprocess((v) => (v === 'true' || v === true ? true : v === 'false' || v === false ? false : v), z.boolean())
      .optional(),
    COOKIE_DOMAIN: z.string().min(1).optional(),
    TRUST_PROXY: z.coerce.number().int().nonnegative().optional(),
    CORS_ORIGINS: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    EMAIL_PROVIDER: z.enum(['emailjs', 'smtp', 'none']).default('none'),
    EMAILJS_SERVICE_ID: z.string().min(1).optional(),
    EMAILJS_PUBLIC_KEY: z.string().min(1).optional(),
    EMAILJS_PRIVATE_KEY: z.string().min(1).optional(),
    EMAILJS_TEMPLATE_RESET: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET,
    {
      message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different from each other',
      path: ['JWT_REFRESH_SECRET'],
    }
  )
  .refine(
    (data) => {
      const secure =
        data.COOKIE_SECURE !== undefined
          ? data.COOKIE_SECURE
          : data.NODE_ENV === 'production';
      return !(data.COOKIE_SAMESITE === 'none' && !secure);
    },
    {
      message: 'COOKIE_SAMESITE=none requires COOKIE_SECURE to be true (browsers reject insecure SameSite=None cookies)',
      path: ['COOKIE_SECURE'],
    }
  )
  .refine(
    (data) => {
      if (data.CORS_ORIGINS) {
        const origins = data.CORS_ORIGINS.split(',').map((s) => s.trim());
        if (origins.includes('*')) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'CORS_ORIGINS must contain exact origins and cannot be "*"',
      path: ['CORS_ORIGINS'],
    }
  )
  .superRefine((data, ctx) => {
    if (data.EMAIL_PROVIDER === 'emailjs') {
      if (!data.EMAILJS_SERVICE_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EMAILJS_SERVICE_ID is required when EMAIL_PROVIDER=emailjs',
          path: ['EMAILJS_SERVICE_ID'],
        });
      }
      if (!data.EMAILJS_PUBLIC_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EMAILJS_PUBLIC_KEY is required when EMAIL_PROVIDER=emailjs',
          path: ['EMAILJS_PUBLIC_KEY'],
        });
      }
      if (!data.EMAILJS_PRIVATE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EMAILJS_PRIVATE_KEY is required when EMAIL_PROVIDER=emailjs',
          path: ['EMAILJS_PRIVATE_KEY'],
        });
      }
      if (!data.EMAILJS_TEMPLATE_RESET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EMAILJS_TEMPLATE_RESET is required when EMAIL_PROVIDER=emailjs',
          path: ['EMAILJS_TEMPLATE_RESET'],
        });
      }
    }
  })
  .transform((data) => {
    const isProd = data.NODE_ENV === 'production';
    const cookieSecure =
      data.COOKIE_SECURE !== undefined ? data.COOKIE_SECURE : isProd;
    const trustProxy =
      data.TRUST_PROXY !== undefined ? data.TRUST_PROXY : (isProd ? 1 : 0);

    const defaultOrigins: string[] = ['http://localhost:5173'];
    if (data.CLIENT_URL) defaultOrigins.push(data.CLIENT_URL);
    if (data.FRONTEND_URL) defaultOrigins.push(data.FRONTEND_URL);

    const corsOriginsList: string[] = data.CORS_ORIGINS
      ? data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.from(new Set(defaultOrigins));

    return {
      ...data,
      COOKIE_SECURE: cookieSecure,
      TRUST_PROXY: trustProxy,
      CORS_ORIGINS_LIST: corsOriginsList,
      RATE_LIMIT_MAX:
        data.RATE_LIMIT_MAX !== undefined
          ? data.RATE_LIMIT_MAX
          : data.NODE_ENV === 'development'
            ? 5000
            : 600,
    };
  });

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
