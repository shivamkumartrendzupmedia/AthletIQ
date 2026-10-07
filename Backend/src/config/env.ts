import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
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
    .min(1, { message: 'JWT_ACCESS_SECRET is required' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, { message: 'JWT_REFRESH_SECRET is required' }),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
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
