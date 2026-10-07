import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';

const router = Router();

// Mount system health check
router.use('/health', healthRoutes);

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

export const apiRouter = router;
