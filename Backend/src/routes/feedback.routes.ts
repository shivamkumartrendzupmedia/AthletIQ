import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validateObjectId } from '../utils/objectId.js';
import { developmentController } from '../controllers/development.controller.js';

const router = Router();

router.use(requireAuth);

// 1. Athlete self feedback (MUST BE DECLARED BEFORE /:id)
router.get(
  '/me',
  requireRole('Athlete'),
  developmentController.getAthleteSelfFeedback
);

// 2. Create coach feedback (Admin, Coach)
router.post(
  '/',
  requireRole('Admin', 'Coach'),
  developmentController.createFeedback
);

// 3. Acknowledge feedback (Athlete only)
router.patch(
  '/:id/acknowledge',
  requireRole('Athlete'),
  validateObjectId('id'),
  developmentController.acknowledgeFeedback
);

// 4. Delete feedback (Creator Coach or Admin)
router.delete(
  '/:id',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  developmentController.deleteFeedback
);

export const feedbackRoutes = router;
