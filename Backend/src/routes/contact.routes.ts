import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { contactController } from '../controllers/contact.controller.js';
import {
  updateContactMessageStatusSchema,
  contactMessageQuerySchema,
} from '../validators/contact.validator.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.get(
  '/',
  requireRole('Admin'),
  validate(contactMessageQuerySchema, 'query'),
  contactController.listMessages
);

router.patch(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  validate(updateContactMessageStatusSchema),
  contactController.updateStatus
);

router.delete(
  '/:id',
  requireRole('Admin'),
  validateObjectId('id'),
  contactController.deleteMessage
);

export const contactRoutes = router;
