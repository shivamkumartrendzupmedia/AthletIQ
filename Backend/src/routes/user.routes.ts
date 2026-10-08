import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import {
  createUserSchema,
  updateUserAdminSchema,
  updateUserSelfSchema,
  resetPasswordSchema,
  userQuerySchema,
} from '../validators/user.validator.js';

const router = Router();

// ==========================================
// 1. Self profile update (Any authenticated user)
// MUST BE DEFINED BEFORE /:id TO PREVENT CAST ERRORS
// ==========================================
router.patch(
  '/me',
  requireAuth,
  validate(updateUserSelfSchema),
  userController.updateUserSelf
);

// ==========================================
// 2. Admin User Management Endpoints
// All require valid authentication and Admin role
// ==========================================
router.use(requireAuth);
router.use(requireRole('Admin'));

// List users with filtering, pagination, and regex-safe search
router.get(
  '/',
  validate(userQuerySchema, 'query'),
  userController.listUsers
);

// Create a new user with any role
router.post(
  '/',
  validate(createUserSchema),
  userController.createUser
);

// Get single user by ID
router.get(
  '/:id',
  validateObjectId('id'),
  userController.getUserById
);

// Admin updates user details, role, or active status
router.patch(
  '/:id',
  validateObjectId('id'),
  validate(updateUserAdminSchema),
  userController.updateUserAdmin
);

// Admin resets user password
router.post(
  '/:id/reset-password',
  validateObjectId('id'),
  validate(resetPasswordSchema),
  userController.resetPassword
);

// Admin unlocks user account
router.post(
  '/:id/unlock',
  validateObjectId('id'),
  userController.unlockUser
);

// Get paginated audit logs for a specific user
router.get(
  '/:id/audit',
  validateObjectId('id'),
  userController.getUserAudit
);

export const userRoutes = router;
