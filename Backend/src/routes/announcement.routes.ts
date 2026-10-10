import { Router } from 'express';
import { commsController } from '../controllers/comms.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requirePermission } from '../config/permissions.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';

const router = Router();

router.use(requireAuth);
router.use(sanitizeInput);

router.post(
  '/',
  requirePermission('announcements', 'create'),
  (req, res, next) => commsController.createAnnouncement(req, res, next)
);

router.get(
  '/',
  requirePermission('announcements', 'read'),
  (req, res, next) => commsController.listAnnouncements(req, res, next)
);

router.get(
  '/:id',
  requirePermission('announcements', 'read'),
  (req, res, next) => commsController.getAnnouncement(req, res, next)
);

router.patch(
  '/:id',
  requirePermission('announcements', 'update'),
  (req, res, next) => commsController.updateAnnouncement(req, res, next)
);

router.delete(
  '/:id',
  requirePermission('announcements', 'delete'),
  (req, res, next) => commsController.deleteAnnouncement(req, res, next)
);

export const announcementRoutes = router;
