import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { tournamentController } from '../controllers/tournament.controller.js';
import {
  createTournamentSchema,
  updateTournamentSchema,
  createRegistrationSchema,
  createMatchSchema,
} from '../validators/tournament.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

// Tournaments CRUD
router.post(
  '/',
  requireRole('Admin', 'Organizer'),
  validate(createTournamentSchema),
  tournamentController.createTournament
);

router.get('/', tournamentController.listTournaments);

router.get('/:id', validateObjectId('id'), tournamentController.getTournamentById);

router.patch(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(updateTournamentSchema),
  tournamentController.updateTournament
);

router.delete(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  tournamentController.deleteTournament
);

// Registrations sub-resource
router.post(
  '/:id/registrations',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  validate(createRegistrationSchema),
  tournamentController.registerTeam
);

router.get(
  '/:id/registrations',
  validateObjectId('id'),
  tournamentController.listRegistrations
);

// Matches sub-resource
router.post(
  '/:id/matches',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(createMatchSchema),
  tournamentController.createMatch
);

router.get('/:id/matches', validateObjectId('id'), tournamentController.listMatches);

export const tournamentRoutes = router;
