import { Router } from 'express';
import { getOverview } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', getOverview);

export const analyticsRoutes = router;
