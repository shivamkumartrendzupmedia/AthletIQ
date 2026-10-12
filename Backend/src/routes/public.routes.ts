import { Router, type Request } from 'express';
import { publicController } from '../controllers/public.controller.js';
import { commsController } from '../controllers/comms.controller.js';
import { tournamentController } from '../controllers/tournament.controller.js';
import { contactController } from '../controllers/contact.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { validateObjectId } from '../utils/objectId.js';
import { sanitizeInput } from '../middlewares/sanitizeInput.js';
import { validate } from '../middlewares/validate.js';
import { contactLimiter } from '../middlewares/rateLimiter.js';
import { createContactMessageSchema } from '../validators/contact.validator.js';

const router = Router();

// Public routes do not require authentication or authorization
router.use(sanitizeInput);

// Public overview metrics & spotlight
router.get('/overview', (req, res, next) =>
  dashboardController.getPublicOverview(req, res, next)
);

// Public contact message inquiry
router.post(
  '/contact',
  contactLimiter,
  validate(createContactMessageSchema),
  (req, res, next) => contactController.submitContact(req, res, next)
);

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

// Public Live Match Center (Step 9A)
// 1. Matches live list (MUST be registered before /matches/:id)
router.get('/matches/live', (req, res, next) =>
  tournamentController.getPublicLiveMatches(req, res, next)
);

router.get(
  '/matches/:id/report',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicMatchReport(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

router.get(
  '/matches/:id',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicMatchById(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

// Public tournament endpoints (/public/tournaments)
router.get(
  '/tournaments/:id/standings',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicTournamentStandings(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

router.get(
  '/tournaments/:id/top-scorers',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicTournamentTopScorers(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

router.get('/tournaments', (req, res, next) =>
  tournamentController.getPublicTournaments(req, res, next)
);

router.get(
  '/tournaments/:id/matches',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicTournamentMatches(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

router.get(
  '/tournaments/:id',
  validateObjectId('id'),
  (req, res, next) =>
    tournamentController.getPublicTournamentById(
      req as unknown as Request<{ id: string }>,
      res,
      next
    )
);

export const publicRoutes = router;

