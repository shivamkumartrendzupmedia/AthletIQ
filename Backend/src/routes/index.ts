import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { publicRoutes } from './public.routes.js';
import { sportRoutes } from './sport.routes.js';
import { teamRoutes } from './team.routes.js';
import { coachRoutes } from './coach.routes.js';
import { athleteRoutes } from './athlete.routes.js';
import { trainingSessionRoutes } from './training-session.routes.js';
import { announcementRoutes } from './announcement.routes.js';
import { documentRoutes } from './document.routes.js';

const router = Router();

// Mount system health check
router.use('/health', healthRoutes);

// Mount public catalog and directory endpoints under /api/public
router.use('/public', publicRoutes);

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

// Mount user management routes under /api/users
router.use('/users', userRoutes);

// Mount academy core routes
router.use('/sports', sportRoutes);
router.use('/teams', teamRoutes);
router.use('/coaches', coachRoutes);
router.use('/athletes', athleteRoutes);
router.use('/training-sessions', trainingSessionRoutes);
router.use('/announcements', announcementRoutes);
router.use('/documents', documentRoutes);

export const apiRouter = router;
