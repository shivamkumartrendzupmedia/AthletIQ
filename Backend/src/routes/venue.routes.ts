import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { tournamentController } from '../controllers/tournament.controller.js';
import {
  createVenueSchema,
  updateVenueSchema,
} from '../validators/tournament.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.post(
  '/',
  requireRole('Admin', 'Organizer'),
  validate(createVenueSchema),
  tournamentController.createVenue
);

router.get('/', tournamentController.listVenues);

router.patch(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  validate(updateVenueSchema),
  tournamentController.updateVenue
);

router.delete(
  '/:id',
  requireRole('Admin', 'Organizer'),
  validateObjectId('id'),
  tournamentController.deleteVenue
);

export const venueRoutes = router;
