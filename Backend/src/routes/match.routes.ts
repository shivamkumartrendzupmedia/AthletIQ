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
  matchStatusTransitionSchema,
  createMatchEventSchema,
} from '../validators/tournament.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

// 1. Status transitions (State Machine)
router.post(
  '/:id/status',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(matchStatusTransitionSchema),
  tournamentController.updateMatchStatus
);

// 2. Match events
router.post(
  '/:id/events',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(createMatchEventSchema),
  tournamentController.createMatchEvent
);

router.get(
  '/:id/events',
  validateObjectId('id'),
  tournamentController.getMatchEvents
);

router.delete(
  '/:id/events/:eventId',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validateObjectId('eventId'),
  tournamentController.deleteMatchEvent
);

// 4. Private match report
router.get(
  '/:id/report',
  validateObjectId('id'),
  tournamentController.getMatchReport
);

// 5. Existing match endpoints
router.get('/:id([0-9a-fA-F]{24})', validateObjectId('id'), tournamentController.getMatchById);

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

