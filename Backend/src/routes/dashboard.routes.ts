import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.get('/overview', dashboardController.getDashboardOverview);

export const dashboardRoutes = router;
