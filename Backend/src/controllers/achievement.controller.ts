import type { Request, Response, NextFunction } from 'express';
import { achievementService } from '../services/achievement.service.js';
import type {
  CreateAchievementInput,
  UpdateAchievementInput,
  AchievementQueryInput,
} from '../validators/achievement.validator.js';

export class AchievementController {
  async createAchievement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateAchievementInput;
      const achievement = await achievementService.createAchievement(
        input,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        data: achievement,
        message: 'Achievement created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as AchievementQueryInput;
      const result = await achievementService.getAdminAchievements(query);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminAchievementById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const achievement = await achievementService.getAdminAchievementById(id);
      res.status(200).json({
        success: true,
        data: achievement,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAchievement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = req.body as UpdateAchievementInput;
      const achievement = await achievementService.updateAchievement(
        id,
        input,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        data: achievement,
        message: 'Achievement updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAchievement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await achievementService.deleteAchievement(
        id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Achievement deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as AchievementQueryInput;
      const result = await achievementService.getPublicAchievements(query);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicAchievementById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const achievement = await achievementService.getPublicAchievementById(id);
      res.status(200).json({
        success: true,
        data: achievement,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const achievementController = new AchievementController();
