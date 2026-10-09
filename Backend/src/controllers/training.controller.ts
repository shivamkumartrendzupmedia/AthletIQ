import type { Request, Response, NextFunction } from 'express';
import { trainingService } from '../services/training.service.js';
import { Athlete } from '../models/Athlete.js';
import type {
  SessionQueryInput,
  CreateSessionInput,
  UpdateSessionInput,
  CancelSessionInput,
  AttendanceUpsertInput,
  AthleteAttendanceQueryInput,
} from '../validators/training.validator.js';

export class TrainingController {
  async listSessions(
    req: Request<unknown, unknown, unknown, SessionQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await trainingService.listSessions(req.query, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSessionById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await trainingService.getSessionById(req.params.id, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  async createSession(
    req: Request<unknown, unknown, CreateSessionInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await trainingService.createSession(
        req.body,
        { id: req.user!.id, role: req.user!.role },
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({
        data: session,
        message: 'Training session scheduled successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSession(
    req: Request<{ id: string }, unknown, UpdateSessionInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await trainingService.updateSession(
        req.params.id,
        req.body,
        { id: req.user!.id, role: req.user!.role },
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        data: session,
        message: 'Training session updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelSession(
    req: Request<{ id: string }, unknown, CancelSessionInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await trainingService.cancelSession(
        req.params.id,
        req.body,
        { id: req.user!.id, role: req.user!.role },
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        data: session,
        message: 'Training session cancelled successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSession(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await trainingService.deleteSession(
        req.params.id,
        { id: req.user!.id, role: req.user!.role },
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        success: true,
        message: 'Training session deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getSessionAttendance(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const roster = await trainingService.getSessionAttendanceRoster(
        req.params.id,
        { id: req.user!.id, role: req.user!.role }
      );
      res.status(200).json({ data: roster });
    } catch (err) {
      next(err);
    }
  }

  async markAttendance(
    req: Request<{ id: string }, unknown, AttendanceUpsertInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await trainingService.markAttendance(
        req.params.id,
        req.body,
        { id: req.user!.id, role: req.user!.role },
        req.ip,
        req.get('user-agent')
      );
      res.status(200).json({
        data: result,
        message: 'Attendance recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getAthleteAttendance(
    req: Request<{ id: string }, unknown, unknown, AthleteAttendanceQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await trainingService.getAthleteAttendance(
        req.params.id,
        req.query,
        { id: req.user!.id, role: req.user!.role }
      );
      res.status(200).json({
        data: {
          items: result.items,
          records: result.items,
          pagination: result.pagination,
          summary: result.summary,
        },
        items: result.items,
        records: result.items,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAthleteSelfAttendance(
    req: Request<unknown, unknown, unknown, AthleteAttendanceQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const athlete = await Athlete.findOne({ user: req.user!.id });
      if (!athlete) {
        const emptyResult = {
          items: [],
          records: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          summary: { present: 0, late: 0, excused: 0, absent: 0, total: 0, attendanceRate: null },
        };
        res.status(200).json({
          data: emptyResult,
          ...emptyResult,
        });
        return;
      }
      const result = await trainingService.getAthleteAttendance(
        athlete._id.toString(),
        req.query,
        { id: req.user!.id, role: req.user!.role }
      );
      res.status(200).json({
        data: {
          items: result.items,
          records: result.items,
          pagination: result.pagination,
          summary: result.summary,
        },
        items: result.items,
        records: result.items,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const trainingController = new TrainingController();
