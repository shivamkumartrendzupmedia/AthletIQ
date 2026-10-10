import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validateObjectId } from '../utils/objectId.js';
import { developmentController } from '../controllers/development.controller.js';

const router = Router();

router.use(requireAuth);

// 1. Athlete self goals (MUST BE DECLARED BEFORE /:id)
router.get(
  '/me',
  requireRole('Athlete'),
  developmentController.getAthleteSelfGoals
);

// 2. Update goal (Admin, Coach, or Athlete)
router.patch(
  '/:id',
  requireRole('Admin', 'Coach', 'Athlete'),
  validateObjectId('id'),
  developmentController.updateGoal
);

export const goalRoutes = router;
