import type { Request, Response, NextFunction } from 'express';
import { sportService } from '../services/sport.service.js';
import type {
  CreateSportInput,
  UpdateSportInput,
  SportQueryInput,
} from '../validators/sport.validator.js';

export class SportController {
  async listSports(
    req: Request<unknown, unknown, unknown, SportQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await sportService.listSports(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSportById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sport = await sportService.getSportById(req.params.id);
      res.status(200).json({ success: true, data: sport });
    } catch (error) {
      next(error);
    }
  }

  async createSport(
    req: Request<unknown, unknown, CreateSportInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sport = await sportService.createSport(
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        message: 'Sport created successfully',
        data: sport,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSport(
    req: Request<{ id: string }, unknown, UpdateSportInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sport = await sportService.updateSport(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Sport updated successfully',
        data: sport,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSport(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await sportService.deleteSport(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Sport deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const sportController = new SportController();
