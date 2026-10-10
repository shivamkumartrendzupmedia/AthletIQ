import type { Request, Response, NextFunction } from 'express';
import { developmentService } from '../services/development.service.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createAssessmentSchema,
  createFeedbackSchema,
  createGoalSchema,
  updateGoalStaffSchema,
  updateGoalSelfSchema,
} from '../validators/development.validator.js';

export class DevelopmentController {
  // ==========================================
  // SKILL ASSESSMENTS
  // ==========================================

  createAssessment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createAssessmentSchema.parse(req.body);
      const result = await developmentService.createAssessment(
        req.params.id,
        validated,
        { id: req.user!.id, role: req.user!.role }
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteAssessments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (req.user!.role === 'Athlete') {
        const ownAthleteId = await developmentService.getAthleteProfileForUser(
          req.user!.id
        );
        if (!ownAthleteId || ownAthleteId.toString() !== req.params.id) {
          throw new ApiError(404, 'Athlete not found');
        }
      } else if (req.user!.role === 'Coach') {
        const inScope = await developmentService.isCoachAssignedToAthlete(
          req.user!.id,
          req.params.id
        );
        if (!inScope) {
          throw new ApiError(404, 'Athlete not found');
        }
      }

      const result = await developmentService.listAssessments(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteSelfAssessments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const athleteId = await developmentService.getAthleteProfileForUser(
        req.user!.id
      );
      if (!athleteId) {
        res.json([]);
        return;
      }
      const result = await developmentService.listAssessments(athleteId.toString());
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // COACH FEEDBACK
  // ==========================================

  createFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createFeedbackSchema.parse(req.body);
      const result = await developmentService.createFeedback(validated, {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (req.user!.role === 'Athlete') {
        const ownAthleteId = await developmentService.getAthleteProfileForUser(
          req.user!.id
        );
        if (!ownAthleteId || ownAthleteId.toString() !== req.params.id) {
          throw new ApiError(404, 'Athlete not found');
        }
      } else if (req.user!.role === 'Coach') {
        const inScope = await developmentService.isCoachAssignedToAthlete(
          req.user!.id,
          req.params.id
        );
        if (!inScope) {
          throw new ApiError(404, 'Athlete not found');
        }
      }

      const result = await developmentService.listFeedback(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteSelfFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const athleteId = await developmentService.getAthleteProfileForUser(
        req.user!.id
      );
      if (!athleteId) {
        res.json([]);
        return;
      }
      const result = await developmentService.listFeedback(athleteId.toString());
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  acknowledgeFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await developmentService.acknowledgeFeedback(
        req.params.id,
        { id: req.user!.id, role: req.user!.role }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteFeedback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await developmentService.deleteFeedback(
        req.params.id,
        { id: req.user!.id, role: req.user!.role }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // ATHLETE GOALS
  // ==========================================

  createGoal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createGoalSchema.parse(req.body);
      const result = await developmentService.createGoal(
        req.params.id,
        validated,
        { id: req.user!.id, role: req.user!.role }
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteGoals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (req.user!.role === 'Athlete') {
        const ownAthleteId = await developmentService.getAthleteProfileForUser(
          req.user!.id
        );
        if (!ownAthleteId || ownAthleteId.toString() !== req.params.id) {
          throw new ApiError(404, 'Athlete not found');
        }
      } else if (req.user!.role === 'Coach') {
        const inScope = await developmentService.isCoachAssignedToAthlete(
          req.user!.id,
          req.params.id
        );
        if (!inScope) {
          throw new ApiError(404, 'Athlete not found');
        }
      }

      const result = await developmentService.listGoals(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteSelfGoals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const athleteId = await developmentService.getAthleteProfileForUser(
        req.user!.id
      );
      if (!athleteId) {
        res.json([]);
        return;
      }
      const result = await developmentService.listGoals(athleteId.toString());
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateGoal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let validatedInput;
      if (req.user!.role === 'Athlete') {
        validatedInput = updateGoalSelfSchema.parse(req.body);
      } else {
        validatedInput = updateGoalStaffSchema.parse(req.body);
      }

      const result = await developmentService.updateGoal(
        req.params.id,
        validatedInput,
        { id: req.user!.id, role: req.user!.role }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // ATHLETE DEVELOPMENT DASHBOARD VIEW
  // ==========================================

  getAthleteDevelopment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (req.user!.role === 'Athlete') {
        const ownAthleteId = await developmentService.getAthleteProfileForUser(
          req.user!.id
        );
        if (!ownAthleteId || ownAthleteId.toString() !== req.params.id) {
          throw new ApiError(404, 'Athlete not found');
        }
      } else if (req.user!.role === 'Coach') {
        const inScope = await developmentService.isCoachAssignedToAthlete(
          req.user!.id,
          req.params.id
        );
        if (!inScope) {
          throw new ApiError(404, 'Athlete not found');
        }
      }

      const result = await developmentService.getDevelopmentView(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAthleteSelfDevelopment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const athleteId = await developmentService.getAthleteProfileForUser(
        req.user!.id
      );
      if (!athleteId) {
        res.json({
          athlete: { id: '', name: req.user!.name },
          latestAssessment: null,
          skillCategoryAverages: null,
          attendanceRate: null,
          assessmentHistory: [],
          feedback: [],
          goals: [],
        });
        return;
      }

      const result = await developmentService.getDevelopmentView(athleteId.toString());
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const developmentController = new DevelopmentController();
