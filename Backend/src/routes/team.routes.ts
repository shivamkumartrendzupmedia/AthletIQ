import { Router } from 'express';
import { teamController } from '../controllers/team.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  createTeamSchema,
  updateTeamSchema,
  teamQuerySchema,
} from '../validators/team.validator.js';

const router = Router();

router.use(requireAuth);

// List teams (Admin, Coach, Organizer, Athlete — scoped in service)
router.get(
  '/',
  requireRole('Admin', 'Coach', 'Organizer', 'Athlete'),
  validate(teamQuerySchema, 'query'),
  teamController.listTeams
);

// Get single team roster (Admin, Coach)
router.get(
  '/:id/roster',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  teamController.getTeamRoster
);

// Get single team by ID
router.get(
  '/:id',
  requireRole('Admin', 'Coach', 'Organizer', 'Athlete'),
  validateObjectId('id'),
  teamController.getTeamById
);

// Create team (Admin only)
router.post(
  '/',
  requireRole('Admin'),
  validate(createTeamSchema),
  teamController.createTeam
);

// Update team (Admin only)
router.patch(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(updateTeamSchema),
  teamController.updateTeam
);

// Delete team (Admin only)
router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  teamController.deleteTeam
);

export const teamRoutes = router;
