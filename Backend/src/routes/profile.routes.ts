import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requirePermission } from '../config/permissions.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '../validators/profile.validator.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission('profile', 'read'),
  profileController.getProfile
);

router.patch(
  '/',
  requirePermission('profile', 'update'),
  validate(updateProfileSchema),
  profileController.updateProfile
);

export const profileRoutes = router;
