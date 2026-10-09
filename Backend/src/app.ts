import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { sanitizeInput } from './middlewares/sanitizeInput.js';

export interface CreateAppOptions {
  rateLimitMax?: number;
}

export const createApp = (options: CreateAppOptions = {}): Application => {
  const app: Application = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS configuration allowing only CLIENT_URL with credentials
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Global Rate Limiting (configurable, preflight OPTIONS exempted)
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: options.rateLimitMax ?? env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  });
  app.use('/api', limiter);

  // 4. Request Logging (dev format in development)
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // 5. Body Parsers with 1mb limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 6. Cookie Parser & Response Compression
  app.use(cookieParser());
  app.use(compression());

  // 7. Global Input Sanitization (rejects NoSQL injection and prototype pollution)
  app.use(sanitizeInput);

  // 8. Mount API Routes under /api
  app.use('/api', apiRouter);

  // 8. 404 Handler
  app.use(notFound);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
