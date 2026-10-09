import { Router, type Request } from 'express';
import { athleteController } from '../controllers/athlete.controller.js';
import { trainingController } from '../controllers/training.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createAthleteSchema,
  updateAthleteAdminSchema,
  updateAthleteCoachSchema,
  updateAthleteSelfSchema,
  assignTeamSchema,
  updateVerificationSchema,
  athleteQuerySchema,
  type UpdateAthleteAdminInput,
  type UpdateAthleteCoachInput,
} from '../validators/athlete.validator.js';
import { athleteAttendanceQuerySchema } from '../validators/training.validator.js';

const router = Router();

router.use(requireAuth);

// 1. Athlete self profile routes (MUST BE DECLARED BEFORE /:id)
router.get(
  '/me/attendance',
  requireRole('Athlete'),
  validate(athleteAttendanceQuerySchema, 'query'),
  trainingController.getAthleteSelfAttendance
);

router.get(
  '/me',
  requireRole('Athlete'),
  athleteController.getAthleteSelf
);

router.patch(
  '/me',
  requireRole('Athlete'),
  validate(updateAthleteSelfSchema),
  athleteController.updateAthleteSelf
);

// 2. List athletes (Admin, Coach) — Organizer explicitly gets 403
router.get(
  '/',
  requireRole('Admin', 'Coach'),
  validate(athleteQuerySchema, 'query'),
  athleteController.listAthletes
);

// 3. Create athlete profile (Admin only)
router.post(
  '/',
  requireRole('Admin'),
  validate(createAthleteSchema),
  athleteController.createAthlete
);

// 4. Team Roster Management (Admin only)
router.put(
  '/:id/team',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(assignTeamSchema),
  athleteController.assignTeam
);

router.delete(
  '/:id/team',
  requireRole('Admin'),
  validateObjectId('id'),
  athleteController.unassignTeam
);

// 5. Verification status update (Admin only)
router.patch(
  '/:id/verification',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(updateVerificationSchema),
  athleteController.updateVerification
);

// 6. Get single athlete (Admin, Coach, Athlete)
router.get(
  '/:id/attendance',
  requireRole('Admin', 'Coach', 'Athlete'),
  validateObjectId('id'),
  validate(athleteAttendanceQuerySchema, 'query'),
  trainingController.getAthleteAttendance
);

router.get(
  '/:id',
  requireRole('Admin', 'Coach', 'Athlete'),
  validateObjectId('id'),
  athleteController.getAthleteById
);

// 7. Update athlete profile (Admin or Coach dispatch)
router.patch(
  '/:id',
  requireRole('Admin', 'Coach'),
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      if (req.user!.role === 'Admin') {
        req.body = await updateAthleteAdminSchema.parseAsync(req.body);
        return athleteController.updateAthleteAdmin(
          req as unknown as Request<{ id: string }, unknown, UpdateAthleteAdminInput>,
          res,
          next
        );
      } else if (req.user!.role === 'Coach') {
        req.body = await updateAthleteCoachSchema.parseAsync(req.body);
        return athleteController.updateAthleteCoach(
          req as unknown as Request<{ id: string }, unknown, UpdateAthleteCoachInput>,
          res,
          next
        );
      } else {
        throw new ApiError(403, 'Forbidden');
      }
    } catch (error) {
      next(error);
    }
  }
);

// 8. Soft-deactivate athlete profile (Admin only)
router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  athleteController.deactivateAthlete
);

export const athleteRoutes = router;
