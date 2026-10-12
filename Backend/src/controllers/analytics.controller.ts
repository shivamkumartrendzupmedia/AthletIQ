import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyticsService } from '../services/analytics.service.js';

export const getOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await analyticsService.getOverview({
      id: req.user!.id || req.user!._id.toString(),
      role: req.user!.role,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }
);
