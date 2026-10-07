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
