import { Router } from 'express';
import { achievementController } from '../controllers/achievement.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requirePermission } from '../config/permissions.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  createAchievementSchema,
  updateAchievementSchema,
  achievementQuerySchema,
} from '../validators/achievement.validator.js';

const router = Router();

// All routes under /api/achievements require authentication and Admin permissions
router.use(requireAuth);

router.post(
  '/',
  requirePermission('achievements', 'create'),
  validate(createAchievementSchema),
  (req, res, next) => achievementController.createAchievement(req, res, next)
);

router.get(
  '/',
  requirePermission('achievements', 'read'),
  validate(achievementQuerySchema, 'query'),
  (req, res, next) => achievementController.getAdminAchievements(req, res, next)
);

router.get(
  '/:id',
  requirePermission('achievements', 'read'),
  validateObjectId('id'),
  (req, res, next) => achievementController.getAdminAchievementById(req, res, next)
);

router.patch(
  '/:id',
  requirePermission('achievements', 'update'),
  validateObjectId('id'),
  validate(updateAchievementSchema),
  (req, res, next) => achievementController.updateAchievement(req, res, next)
);

router.delete(
  '/:id',
  requirePermission('achievements', 'delete'),
  validateObjectId('id'),
  (req, res, next) => achievementController.deleteAchievement(req, res, next)
);

export const achievementRoutes = router;
