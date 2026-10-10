import { Router } from 'express';
import {
  commsController,
  documentUploadMiddleware,
} from '../controllers/comms.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requirePermission } from '../config/permissions.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requirePermission('documents', 'create'),
  documentUploadMiddleware,
  sanitizeInput,
  (req, res, next) => commsController.uploadDocument(req, res, next)
);

router.get(
  '/',
  requirePermission('documents', 'read'),
  sanitizeInput,
  (req, res, next) => commsController.listDocuments(req, res, next)
);

router.get(
  '/:id',
  requirePermission('documents', 'read'),
  sanitizeInput,
  (req, res, next) => commsController.getDocument(req, res, next)
);

router.get(
  '/:id/download',
  requirePermission('documents', 'read'),
  (req, res, next) => commsController.downloadDocument(req, res, next)
);

router.delete(
  '/:id',
  requirePermission('documents', 'delete'),
  sanitizeInput,
  (req, res, next) => commsController.deleteDocument(req, res, next)
);

export const documentRoutes = router;
