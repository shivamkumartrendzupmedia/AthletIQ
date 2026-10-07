import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

const router = Router();

// Mount system health check
router.use('/health', healthRoutes);

export const apiRouter = router;
