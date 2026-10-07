import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public routes with dedicated failure rate limiter
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);

// Session termination
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);

// Protected user routes
router.get('/me', requireAuth, getMe);
router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  changePassword
);

export const authRoutes = router;
