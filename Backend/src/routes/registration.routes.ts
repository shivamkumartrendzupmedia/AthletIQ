import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { tournamentController } from '../controllers/tournament.controller.js';
import {
  updateSquadSchema,
  reviewRegistrationSchema,
} from '../validators/tournament.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.patch(
  '/:id/squad',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  validate(updateSquadSchema),
  tournamentController.updateSquad
);

router.patch(
  '/:id/review',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(reviewRegistrationSchema),
  tournamentController.reviewRegistration
);

router.delete(
  '/:id',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  tournamentController.withdrawRegistration
);

export const registrationRoutes = router;
