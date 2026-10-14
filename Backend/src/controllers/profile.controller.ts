import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { profileService } from '../services/profile.service.js';

export class ProfileController {
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.getProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const updated = await profileService.updateProfile(req.user!.id, req.body);
    res.status(200).json({
      success: true,
      data: updated,
    });
  });
}

export const profileController = new ProfileController();
