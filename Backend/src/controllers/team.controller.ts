import type { Request, Response, NextFunction } from 'express';
import { teamService } from '../services/team.service.js';
import type {
  CreateTeamInput,
  UpdateTeamInput,
  TeamQueryInput,
} from '../validators/team.validator.js';

export class TeamController {
  async listTeams(
    req: Request<unknown, unknown, unknown, TeamQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await teamService.listTeams(req.query, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTeamById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const team = await teamService.getTeamById(req.params.id, req.user!);
      res.status(200).json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  }

  async createTeam(
    req: Request<unknown, unknown, CreateTeamInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const team = await teamService.createTeam(
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(
    req: Request<{ id: string }, unknown, UpdateTeamInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const team = await teamService.updateTeam(
        req.params.id,
        req.body,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Team updated successfully',
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTeam(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await teamService.deleteTeam(
        req.params.id,
        req.user!._id,
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Team deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getTeamRoster(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const roster = await teamService.getTeamRoster(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: roster,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const teamController = new TeamController();
