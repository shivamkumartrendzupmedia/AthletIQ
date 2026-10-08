import { Router } from 'express';
import { coachController } from '../controllers/coach.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  createCoachSchema,
  updateCoachAdminSchema,
  updateCoachSelfSchema,
  coachQuerySchema,
} from '../validators/coach.validator.js';

const router = Router();

router.use(requireAuth);

// Coach self routes (Defined before /:id)
router.get(
  '/me',
  requireRole('Coach'),
  coachController.getCoachSelf
);

router.patch(
  '/me',
  requireRole('Coach'),
  validate(updateCoachSelfSchema),
  coachController.updateCoachSelf
);

// List coaches (Admin, Organizer)
router.get(
  '/',
  requireRole('Admin', 'Organizer'),
  validate(coachQuerySchema, 'query'),
  coachController.listCoaches
);

// Get single coach profile (Admin, Organizer, Coach)
router.get(
  '/:id',
  requireRole('Admin', 'Organizer', 'Coach'),
  validateObjectId('id'),
  coachController.getCoachById
);

// Create coach profile (Admin only)
router.post(
  '/',
  requireRole('Admin'),
  validate(createCoachSchema),
  coachController.createCoach
);

// Update coach profile (Admin only)
router.patch(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(updateCoachAdminSchema),
  coachController.updateCoachAdmin
);

// Delete coach profile (Admin only)
router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  coachController.deleteCoach
);

export const coachRoutes = router;
