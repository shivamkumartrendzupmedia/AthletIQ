import type { Request, Response, NextFunction } from 'express';
import { coachService } from '../services/coach.service.js';
import type {
  CreateCoachInput,
  UpdateCoachAdminInput,
  UpdateCoachSelfInput,
  CoachQueryInput,
} from '../validators/coach.validator.js';

export class CoachController {
  async listCoaches(
    req: Request<unknown, unknown, unknown, CoachQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await coachService.listCoaches(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCoachById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const coach = await coachService.getCoachById(req.params.id, req.user!);
      res.status(200).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  }

  async getCoachSelf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const coach = await coachService.getCoachSelf(req.user!._id);
      res.status(200).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  }

  async createCoach(
    req: Request<unknown, unknown, CreateCoachInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const coach = await coachService.createCoach(
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        message: 'Coach profile created successfully',
        data: coach,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCoachAdmin(
    req: Request<{ id: string }, unknown, UpdateCoachAdminInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const coach = await coachService.updateCoachAdmin(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Coach profile updated successfully',
        data: coach,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCoachSelf(
    req: Request<unknown, unknown, UpdateCoachSelfInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const coach = await coachService.updateCoachSelf(
        req.user!._id,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Coach profile updated successfully',
        data: coach,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCoach(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await coachService.deleteCoach(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Coach profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const coachController = new CoachController();
