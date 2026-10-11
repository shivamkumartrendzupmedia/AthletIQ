import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  /**
   * Authenticated user dashboard overview (role determines shape).
   */
  async getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const overview = await dashboardService.getDashboardOverview({
        id: user.id || String(user._id),
        role: user.role,
        name: user.name,
      });
      res.status(200).json({ data: overview });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unauthenticated public overview.
   */
  async getPublicOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await dashboardService.getPublicOverview();
      res.status(200).json({ data: overview });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
