import { Router } from 'express';
import { sportController } from '../controllers/sport.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  createSportSchema,
  updateSportSchema,
  sportQuerySchema,
} from '../validators/sport.validator.js';

const router = Router();

// All sports routes require authenticated access
router.use(requireAuth);

// List sports (Any authenticated role)
router.get(
  '/',
  validate(sportQuerySchema, 'query'),
  sportController.listSports
);

// Get single sport by ID (Any authenticated role)
router.get(
  '/:id',
  validateObjectId('id'),
  sportController.getSportById
);

// Create sport (Admin only)
router.post(
  '/',
  requireRole('Admin'),
  validate(createSportSchema),
  sportController.createSport
);

// Update sport (Admin only)
router.patch(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(updateSportSchema),
  sportController.updateSport
);

// Delete sport (Admin only)
router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  sportController.deleteSport
);

export const sportRoutes = router;
