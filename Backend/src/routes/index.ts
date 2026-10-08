import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';

const router = Router();

// Mount system health check
router.use('/health', healthRoutes);

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

// Mount user management routes under /api/users
router.use('/users', userRoutes);

export const apiRouter = router;
