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

/**
 * Forgot password rate limiter.
 * Limits to 5 attempts per hour per IP.
 */
const forgotPasswordWindowMs = process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS, 10)
  : 60 * 60 * 1000;

const forgotPasswordMax = process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX
  ? parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX, 10)
  : 5;

export const forgotPasswordLimiter = rateLimit({
  windowMs: forgotPasswordWindowMs,
  max: forgotPasswordMax,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many password reset requests from this IP, please try again later',
  },
});

export const resetForgotPasswordLimiter = (): void => {
  const limiter = forgotPasswordLimiter as unknown as { resetKey?: (key: string) => void };
  if (typeof limiter.resetKey === 'function') {
    limiter.resetKey('127.0.0.1');
    limiter.resetKey('::1');
    limiter.resetKey('::ffff:127.0.0.1');
  }
};

/**
 * Chatbot rate limiter.
 * Limits to CHATBOT_RATE_LIMIT_MAX (default 20) per CHATBOT_RATE_LIMIT_WINDOW_MS (default 10m)
 * Keyed per authenticated user id, falling back to IP.
 */
export const chatbotLimiter = rateLimit({
  windowMs: process.env.CHATBOT_RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS, 10)
    : 10 * 60 * 1000,
  max: (_req, _res) => {
    return process.env.CHATBOT_RATE_LIMIT_MAX
      ? parseInt(process.env.CHATBOT_RATE_LIMIT_MAX, 10)
      : 20;
  },
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : (req.ip || 'unknown');
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many messages sent to chatbot. Please slow down and try again later.',
  },
});

export const resetChatbotLimiter = (key?: string): void => {
  const limiter = chatbotLimiter as unknown as { resetKey?: (k: string) => void };
  if (typeof limiter.resetKey === 'function') {
    if (key) {
      limiter.resetKey(key);
    }
    limiter.resetKey('127.0.0.1');
    limiter.resetKey('::1');
    limiter.resetKey('::ffff:127.0.0.1');
  }
};

