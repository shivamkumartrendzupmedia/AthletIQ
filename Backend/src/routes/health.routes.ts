import { Router, type Request, type Response } from 'express';
import { isDbConnected } from '../config/db.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint returning system status and DB connection state
 * @access  Public
 */
router.get('/', (_req: Request, res: Response) => {
  const dbStatus = isDbConnected() ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: dbStatus,
  });
});

export const healthRoutes = router;
