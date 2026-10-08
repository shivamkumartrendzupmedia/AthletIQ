import type { Request, Response, NextFunction } from 'express';
import { athleteService } from '../services/athlete.service.js';
import type {
  CreateAthleteInput,
  UpdateAthleteAdminInput,
  UpdateAthleteCoachInput,
  UpdateAthleteSelfInput,
  AssignTeamInput,
  UpdateVerificationInput,
  AthleteQueryInput,
} from '../validators/athlete.validator.js';

export class AthleteController {
  async listAthletes(
    req: Request<unknown, unknown, unknown, AthleteQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await athleteService.listAthletes(req.query, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAthleteById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.getAthleteById(
        req.params.id,
        req.user!
      );
      res.status(200).json({ success: true, data: athlete });
    } catch (error) {
      next(error);
    }
  }

  async getAthleteSelf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.getAthleteSelf(req.user!._id);
      res.status(200).json({ success: true, data: athlete });
    } catch (error) {
      next(error);
    }
  }

  async createAthlete(
    req: Request<unknown, unknown, CreateAthleteInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.createAthlete(
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        message: 'Athlete profile created successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAthleteAdmin(
    req: Request<{ id: string }, unknown, UpdateAthleteAdminInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.updateAthleteAdmin(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Athlete profile updated successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAthleteCoach(
    req: Request<{ id: string }, unknown, UpdateAthleteCoachInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.updateAthleteCoach(
        req.params.id,
        req.body,
        req.user!
      );
      res.status(200).json({
        success: true,
        message: 'Athlete roster details updated successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAthleteSelf(
    req: Request<unknown, unknown, UpdateAthleteSelfInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.updateAthleteSelf(
        req.user!._id,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateAthlete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await athleteService.deactivateAthlete(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Athlete profile deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTeam(
    req: Request<{ id: string }, unknown, AssignTeamInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.assignTeam(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Athlete roster assigned successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async unassignTeam(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.unassignTeam(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Athlete removed from team roster successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVerification(
    req: Request<{ id: string }, unknown, UpdateVerificationInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await athleteService.updateVerification(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Athlete verification status updated successfully',
        data: athlete,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const athleteController = new AthleteController();
