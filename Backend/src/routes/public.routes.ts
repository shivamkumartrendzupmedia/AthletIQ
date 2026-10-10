import { Router, type Request } from 'express';
import { publicController } from '../controllers/public.controller.js';
import { commsController } from '../controllers/comms.controller.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';

const router = Router();

// Public routes do not require authentication or authorization
router.use(sanitizeInput);

// Sports catalog
router.get('/sports', (req, res, next) => publicController.listSports(req, res, next));
router.get('/sports/:slug', (req, res, next) =>
  publicController.getSport(req as unknown as Request<{ slug: string }>, res, next)
);

// Teams directory
router.get('/teams', (req, res, next) => publicController.listTeams(req, res, next));
router.get('/teams/:slug', (req, res, next) =>
  publicController.getTeam(req as unknown as Request<{ slug: string }>, res, next)
);

// Coaches directory
router.get('/coaches', (req, res, next) => publicController.listCoaches(req, res, next));
router.get('/coaches/:id', (req, res, next) =>
  publicController.getCoach(req as unknown as Request<{ id: string }>, res, next)
);

// Public announcements feed
router.get('/announcements', (req, res, next) =>
  commsController.listPublicAnnouncements(req, res, next)
);

export const publicRoutes = router;
