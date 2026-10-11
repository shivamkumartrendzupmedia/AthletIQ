import rateLimit from 'express-rate-limit';

/**
 * Auth-specific rate limiter for sensitive endpoints (/register, /login, /refresh).
 * Limits to 10 failed requests per 15 minutes per IP.
 * Successful requests do not increment the counter.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many failed authentication attempts from this IP, please try again after 15 minutes',
  },
});

/**
 * Public contact form rate limiter.
 * Limits to 5 submissions per hour per IP by default.
 * Configured via RATE_LIMIT_CONTACT_WINDOW_MS and RATE_LIMIT_CONTACT_MAX.
 */
const contactWindowMs = process.env.RATE_LIMIT_CONTACT_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_CONTACT_WINDOW_MS, 10)
  : 60 * 60 * 1000;

const contactMax = process.env.RATE_LIMIT_CONTACT_MAX
  ? parseInt(process.env.RATE_LIMIT_CONTACT_MAX, 10)
  : 5;

export const contactLimiter = rateLimit({
  windowMs: contactWindowMs,
  max: contactMax,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many contact messages sent from this IP, please try again later',
  },
});

export const resetContactLimiter = (): void => {
  const limiter = contactLimiter as unknown as { resetKey?: (key: string) => void };
  if (typeof limiter.resetKey === 'function') {
    limiter.resetKey('127.0.0.1');
    limiter.resetKey('::1');
    limiter.resetKey('::ffff:127.0.0.1');
  }
};
