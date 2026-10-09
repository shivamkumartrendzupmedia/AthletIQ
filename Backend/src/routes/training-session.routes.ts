import { Router } from 'express';
import { trainingController } from '../controllers/training.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  sessionQuerySchema,
  createSessionSchema,
  updateSessionSchema,
  cancelSessionSchema,
  attendanceUpsertSchema,
} from '../validators/training.validator.js';

const router = Router();

router.use(requireAuth);

// 1. List sessions (Admin, Coach, Athlete, Organizer)
router.get(
  '/',
  requireRole('Admin', 'Coach', 'Athlete', 'Organizer'),
  validate(sessionQuerySchema, 'query'),
  trainingController.listSessions
);

// 2. Schedule new session (Admin, Coach)
router.post(
  '/',
  requireRole('Admin', 'Coach'),
  validate(createSessionSchema),
  trainingController.createSession
);

// 3. Attendance endpoints for a specific session (Admin, Coach)
router.get(
  '/:id/attendance',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  trainingController.getSessionAttendance
);

router.put(
  '/:id/attendance',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  validate(attendanceUpsertSchema),
  trainingController.markAttendance
);

// 4. Single session detail (Admin, Coach, Athlete, Organizer)
router.get(
  '/:id',
  requireRole('Admin', 'Coach', 'Athlete', 'Organizer'),
  validateObjectId('id'),
  trainingController.getSessionById
);

// 5. Update session (Admin, Coach)
router.patch(
  '/:id',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  validate(updateSessionSchema),
  trainingController.updateSession
);

// 6. Cancel session (Admin, Coach)
router.post(
  '/:id/cancel',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  validate(cancelSessionSchema),
  trainingController.cancelSession
);

// 7. Delete session (Admin only)
router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  trainingController.deleteSession
);

export const trainingSessionRoutes = router;
