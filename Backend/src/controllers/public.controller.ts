import type { Request, Response, NextFunction } from 'express';
import { publicService } from '../services/public.service.js';

export class PublicController {
  private setCacheHeader(res: Response): void {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
  }

  async listSports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const result = await publicService.listPublicSports(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSport(req: Request<{ slug: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const sport = await publicService.getPublicSportBySlug(req.params.slug);
      res.status(200).json({ success: true, data: sport });
    } catch (error) {
      next(error);
    }
  }

  async listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const result = await publicService.listPublicTeams(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTeam(req: Request<{ slug: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const team = await publicService.getPublicTeamBySlug(req.params.slug);
      res.status(200).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  async listCoaches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const result = await publicService.listPublicCoaches(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCoach(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      this.setCacheHeader(res);
      const coach = await publicService.getPublicCoachById(req.params.id);
      res.status(200).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
