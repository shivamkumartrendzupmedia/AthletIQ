import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { tournamentController } from '../controllers/tournament.controller.js';
import {
  updateMatchSchema,
  enterMatchResultSchema,
} from '../validators/tournament.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.get('/:id', validateObjectId('id'), tournamentController.getMatchById);

router.patch(
  '/:id/result',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(enterMatchResultSchema),
  tournamentController.enterMatchResult
);

router.patch(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(updateMatchSchema),
  tournamentController.updateMatch
);

router.delete(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  tournamentController.deleteMatch
);

export const matchRoutes = router;
