import { Types } from 'mongoose';
import {
  SkillAssessment,
  type ISkillAssessment,
  type ISkillCategories,
  CoachFeedback,
  type ICoachFeedback,
  AthleteGoal,
  type IAthleteGoal,
  Athlete,
  Coach,
  Team,
  Attendance,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateAttendanceRate } from '../utils/attendance.util.js';
import { auditService } from './audit.service.js';
import { notify } from './notification.service.js';
import type {
  CreateAssessmentInput,
  CreateFeedbackInput,
  CreateGoalInput,
  UpdateGoalStaffInput,
  UpdateGoalSelfInput,
} from '../validators/development.validator.js';

export interface DisplayUserDto {
  id: string;
  name: string;
}

export interface SkillAssessmentDto {
  id: string;
  athlete: string;
  assessedBy: DisplayUserDto;
  date: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  stamina: number;
  agility: number;
  decisionMaking: number;
  leadership: number;
  workRate: number;
  categories: ISkillCategories;
  overall: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachFeedbackDto {
  id: string;
  athlete: string;
  coach: DisplayUserDto;
  text: string;
  type: string;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteGoalDto {
  id: string;
  athlete: string;
  title: string;
  description?: string;
  targetDate: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentViewDto {
  athlete: {
    id: string;
    name: string;
    jerseyNumber?: number;
    position?: string;
    teamName?: string;
    sportName?: string;
  };
  latestAssessment: SkillAssessmentDto | null;
  skillCategoryAverages: ISkillCategories & { overall: number } | null;
  attendanceRate: number | null;
  assessmentHistory: SkillAssessmentDto[];
  feedback: CoachFeedbackDto[];
  goals: AthleteGoalDto[];
}

export class DevelopmentService {
  /**
   * Helper to format an assessment into a clean, safe DTO
   */
  private formatAssessmentDto(
    doc: ISkillAssessment & {
      assessedBy?: { _id: Types.ObjectId; name?: string } | Types.ObjectId;
    }
  ): SkillAssessmentDto {
    const assessedByObj = doc.assessedBy as { _id?: Types.ObjectId; name?: string } | undefined;
    const assessedById = assessedByObj?._id ? assessedByObj._id.toString() : doc.assessedBy?.toString() || '';
    const assessedByName = assessedByObj?.name || 'Coach';

    return {
      id: doc.id || doc._id.toString(),
      athlete: doc.athlete.toString(),
      assessedBy: {
        id: assessedById,
        name: assessedByName,
      },
      date: doc.date.toISOString(),
      pace: doc.pace,
      shooting: doc.shooting,
      passing: doc.passing,
      dribbling: doc.dribbling,
      defending: doc.defending,
      stamina: doc.stamina,
      agility: doc.agility,
      decisionMaking: doc.decisionMaking,
      leadership: doc.leadership,
      workRate: doc.workRate,
      categories: doc.categories,
      overall: doc.overall,
      note: doc.note,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Helper to format a feedback document into a clean, safe DTO
   */
  private formatFeedbackDto(
    doc: ICoachFeedback & {
      coach?: {
        _id: Types.ObjectId;
        user?: { _id: Types.ObjectId; name: string };
      } | Types.ObjectId;
    }
  ): CoachFeedbackDto {
    const coachObj = doc.coach as {
      _id?: Types.ObjectId;
      user?: { _id?: Types.ObjectId; name?: string };
    } | undefined;

    const coachId = coachObj?._id ? coachObj._id.toString() : doc.coach?.toString() || '';
    const coachName = coachObj?.user?.name || 'Coach';

    return {
      id: doc.id || doc._id.toString(),
      athlete: doc.athlete.toString(),
      coach: {
        id: coachId,
        name: coachName,
      },
      text: doc.text,
      type: doc.type,
      acknowledgedAt: doc.acknowledgedAt ? doc.acknowledgedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Helper to format a goal document into a clean, safe DTO
   */
  private formatGoalDto(doc: IAthleteGoal): AthleteGoalDto {
    return {
      id: doc.id || doc._id.toString(),
      athlete: doc.athlete.toString(),
      title: doc.title,
      description: doc.description,
      targetDate: doc.targetDate.toISOString(),
      status: doc.status,
      progress: doc.progress,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Helper to resolve Athlete profile for athlete user
   */
  async getAthleteProfileForUser(userId: string): Promise<Types.ObjectId | null> {
    const athlete = await Athlete.findOne({ user: new Types.ObjectId(userId) }).select('_id');
    return athlete ? athlete._id : null;
  }

  /**
   * Helper to resolve Coach profile for coach user
   */
  async getCoachProfileForUser(userId: string): Promise<Types.ObjectId | null> {
    const coach = await Coach.findOne({ user: new Types.ObjectId(userId) }).select('_id');
    return coach ? coach._id : null;
  }

  /**
   * Determine if a Coach user is assigned to coach the Athlete's team
   */
  async isCoachAssignedToAthlete(
    coachUserId: string | Types.ObjectId,
    athleteId: string | Types.ObjectId
  ): Promise<boolean> {
    const coach = await Coach.findOne({
      user: typeof coachUserId === 'string' ? new Types.ObjectId(coachUserId) : coachUserId,
    }).select('_id');
    if (!coach) return false;

    if (!Types.ObjectId.isValid(athleteId)) return false;
    const targetAthleteId =
      typeof athleteId === 'string' ? new Types.ObjectId(athleteId) : athleteId;
    const athlete = await Athlete.findById(targetAthleteId).select('team');
    if (!athlete || !athlete.team) return false;

    const team = await Team.findOne({
      _id: athlete.team,
      coach: coach._id,
    }).select('_id');
    return !!team;
  }

  // ==========================================
  // SKILL ASSESSMENTS
  // ==========================================

  /**
   * Record a new skill assessment for an athlete
   */
  async createAssessment(
    athleteId: string,
    input: CreateAssessmentInput,
    user: { id: string; role: string }
  ): Promise<SkillAssessmentDto> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    if (user.role === 'Coach') {
      const inScope = await this.isCoachAssignedToAthlete(user.id, athlete._id);
      if (!inScope) {
        throw new ApiError(404, 'Athlete not found');
      }
    }

    // Calculate skill categories (all rounded to 1 decimal place)
    const technical =
      Math.round(((input.shooting + input.passing + input.dribbling) / 3) * 10) / 10;
    const physical =
      Math.round(((input.pace + input.stamina + input.agility) / 3) * 10) / 10;
    const tactical =
      Math.round(((input.defending + input.decisionMaking) / 2) * 10) / 10;
    const mental =
      Math.round(((input.leadership + input.workRate) / 2) * 10) / 10;

    const allSkills = [
      input.pace,
      input.shooting,
      input.passing,
      input.dribbling,
      input.defending,
      input.stamina,
      input.agility,
      input.decisionMaking,
      input.leadership,
      input.workRate,
    ];
    const overall =
      Math.round((allSkills.reduce((a, b) => a + b, 0) / 10) * 10) / 10;

    const assessment = await SkillAssessment.create({
      athlete: athlete._id,
      assessedBy: new Types.ObjectId(user.id),
      date: input.date ? new Date(input.date) : new Date(),
      pace: input.pace,
      shooting: input.shooting,
      passing: input.passing,
      dribbling: input.dribbling,
      defending: input.defending,
      stamina: input.stamina,
      agility: input.agility,
      decisionMaking: input.decisionMaking,
      leadership: input.leadership,
      workRate: input.workRate,
      categories: {
        technical,
        physical,
        tactical,
        mental,
      },
      overall,
      note: input.note,
    });

    await auditService.logAudit({
      action: 'SKILL_ASSESSMENT_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: assessment._id,
      targetType: 'SkillAssessment',
      meta: {
        athleteId: athlete._id.toString(),
        overall,
      },
    });

    if (athlete.user) {
      notify([athlete.user], {
        type: 'Assessment',
        title: 'New Skill Assessment Recorded',
        body: `Skill assessment recorded with overall rating ${overall}/10.`,
        link: '/athlete/me',
      });
    }

    const populated = await SkillAssessment.findById(assessment._id).populate(
      'assessedBy',
      'name'
    );
    return this.formatAssessmentDto(populated!);
  }

  /**
   * List assessments for an athlete (capped to 50, sorted descending by date)
   */
  async listAssessments(athleteId: string): Promise<SkillAssessmentDto[]> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId).select('_id');
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    const assessments = await SkillAssessment.find({ athlete: athlete._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(50)
      .populate('assessedBy', 'name');

    return assessments.map((a) => this.formatAssessmentDto(a));
  }

  // ==========================================
  // COACH FEEDBACK
  // ==========================================

  /**
   * Create coach feedback for an athlete
   */
  async createFeedback(
    input: CreateFeedbackInput,
    user: { id: string; role: string }
  ): Promise<CoachFeedbackDto> {
    if (!Types.ObjectId.isValid(input.athlete)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(input.athlete);
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    if (user.role === 'Coach') {
      const inScope = await this.isCoachAssignedToAthlete(user.id, athlete._id);
      if (!inScope) {
        throw new ApiError(404, 'Athlete not found');
      }
    }

    // Resolve coach profile (Admin or Coach)
    let coachProfileId: Types.ObjectId | null = null;
    if (user.role === 'Coach') {
      coachProfileId = await this.getCoachProfileForUser(user.id);
      if (!coachProfileId) {
        throw new ApiError(404, 'Coach profile not found under your account');
      }
    } else {
      // If Admin, find an existing coach profile or default
      const anyCoach = await Coach.findOne();
      if (anyCoach) {
        coachProfileId = anyCoach._id;
      } else {
        throw new ApiError(404, 'No coach profile available for feedback assignment');
      }
    }

    const feedback = await CoachFeedback.create({
      athlete: athlete._id,
      coach: coachProfileId,
      text: input.text,
      type: input.type,
      acknowledgedAt: null,
    });

    await auditService.logAudit({
      action: 'COACH_FEEDBACK_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: feedback._id,
      targetType: 'CoachFeedback',
      meta: {
        athleteId: athlete._id.toString(),
        type: input.type,
      },
    });

    if (athlete.user) {
      notify([athlete.user], {
        type: 'Feedback',
        title: 'New Coach Feedback',
        body: input.text.length > 280 ? input.text.slice(0, 277) + '...' : input.text,
        link: '/athlete/me',
      });
    }

    const populated = await CoachFeedback.findById(feedback._id).populate({
      path: 'coach',
      populate: { path: 'user', select: 'name' },
    });

    return this.formatFeedbackDto(populated!);
  }

  /**
   * List feedback for an athlete (capped to 50, sorted descending by date)
   */
  async listFeedback(athleteId: string): Promise<CoachFeedbackDto[]> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId).select('_id');
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    const feedbackList = await CoachFeedback.find({ athlete: athlete._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'coach',
        populate: { path: 'user', select: 'name' },
      });

    return feedbackList.map((fb) => this.formatFeedbackDto(fb));
  }

  /**
   * Acknowledge feedback (Atomic & Idempotent)
   * A second call returns 200 with the ORIGINAL timestamp unchanged.
   * If feedback belongs to another athlete -> 404.
   */
  async acknowledgeFeedback(
    feedbackId: string,
    user: { id: string; role: string }
  ): Promise<CoachFeedbackDto> {
    if (!Types.ObjectId.isValid(feedbackId)) {
      throw new ApiError(400, 'Invalid feedback ID');
    }

    const athleteId = await this.getAthleteProfileForUser(user.id);
    if (!athleteId) {
      throw new ApiError(404, 'Athlete profile not found');
    }

    // Verify ownership
    const existing = await CoachFeedback.findOne({
      _id: new Types.ObjectId(feedbackId),
      athlete: athleteId,
    }).populate({
      path: 'coach',
      populate: { path: 'user', select: 'name' },
    });

    if (!existing) {
      throw new ApiError(404, 'Feedback not found under your athlete profile');
    }

    // Idempotent check: if already acknowledged, return original doc untouched!
    if (existing.acknowledgedAt) {
      return this.formatFeedbackDto(existing);
    }

    // Atomic findOneAndUpdate race protection
    const acknowledged = await CoachFeedback.findOneAndUpdate(
      {
        _id: new Types.ObjectId(feedbackId),
        athlete: athleteId,
        acknowledgedAt: null,
      },
      {
        $set: { acknowledgedAt: new Date() },
      },
      {
        new: true,
      }
    ).populate({
      path: 'coach',
      populate: { path: 'user', select: 'name' },
    });

    let finalDoc = acknowledged;
    if (!finalDoc) {
      finalDoc = await CoachFeedback.findById(feedbackId).populate({
        path: 'coach',
        populate: { path: 'user', select: 'name' },
      });
    }
    if (!finalDoc) {
      finalDoc = existing;
    }

    await auditService.logAudit({
      action: 'COACH_FEEDBACK_ACKNOWLEDGED',
      actor: new Types.ObjectId(user.id),
      targetId: finalDoc._id,
      targetType: 'CoachFeedback',
      meta: {
        athleteId: athleteId.toString(),
      },
    });

    return this.formatFeedbackDto(finalDoc);
  }

  /**
   * Delete feedback (Creator Coach or Admin)
   * In-scope coach but not creator -> 403
   * Out-of-scope coach -> 404
   */
  async deleteFeedback(
    feedbackId: string,
    user: { id: string; role: string }
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(feedbackId)) {
      throw new ApiError(400, 'Invalid feedback ID');
    }

    const feedback = await CoachFeedback.findById(feedbackId);
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }

    if (user.role === 'Coach') {
      const inScope = await this.isCoachAssignedToAthlete(user.id, feedback.athlete);
      if (!inScope) {
        throw new ApiError(404, 'Feedback not found');
      }
      const coachProfileId = await this.getCoachProfileForUser(user.id);
      if (!coachProfileId || !feedback.coach.equals(coachProfileId)) {
        throw new ApiError(403, 'Forbidden: You can only delete feedback that you created');
      }
    } else if (user.role !== 'Admin') {
      throw new ApiError(403, 'Forbidden');
    }

    await CoachFeedback.findByIdAndDelete(feedback._id);

    await auditService.logAudit({
      action: 'COACH_FEEDBACK_DELETED',
      actor: new Types.ObjectId(user.id),
      targetId: feedback._id,
      targetType: 'CoachFeedback',
      meta: {
        athleteId: feedback.athlete.toString(),
      },
    });

    return { message: 'Feedback deleted successfully' };
  }

  // ==========================================
  // ATHLETE GOALS
  // ==========================================

  /**
   * Create an athlete goal
   */
  async createGoal(
    athleteId: string,
    input: CreateGoalInput,
    user: { id: string; role: string }
  ): Promise<AthleteGoalDto> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    if (user.role === 'Coach') {
      const inScope = await this.isCoachAssignedToAthlete(user.id, athlete._id);
      if (!inScope) {
        throw new ApiError(404, 'Athlete not found');
      }
    }

    const goal = await AthleteGoal.create({
      athlete: athlete._id,
      title: input.title,
      description: input.description,
      targetDate: new Date(input.targetDate),
      status: input.status,
      progress: input.progress,
      createdBy: new Types.ObjectId(user.id),
    });

    await auditService.logAudit({
      action: 'ATHLETE_GOAL_CREATED',
      actor: new Types.ObjectId(user.id),
      targetId: goal._id,
      targetType: 'AthleteGoal',
      meta: {
        athleteId: athlete._id.toString(),
        title: input.title,
      },
    });

    if (athlete.user) {
      notify([athlete.user], {
        type: 'Goal',
        title: `New Goal: ${goal.title}`,
        body: `A new athletic goal "${goal.title}" was created for you.`,
        link: '/athlete/me',
      });
    }

    return this.formatGoalDto(goal);
  }

  /**
   * List goals for an athlete (capped to 50, sorted by targetDate)
   */
  async listGoals(athleteId: string): Promise<AthleteGoalDto[]> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    const athlete = await Athlete.findById(athleteId).select('_id');
    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    const goals = await AthleteGoal.find({ athlete: athlete._id })
      .sort({ targetDate: 1, createdAt: -1 })
      .limit(50);

    return goals.map((g) => this.formatGoalDto(g));
  }

  /**
   * Update a goal (Strict separation between Staff and Athlete self-update)
   */
  async updateGoal(
    goalId: string,
    input: UpdateGoalStaffInput | UpdateGoalSelfInput,
    user: { id: string; role: string }
  ): Promise<AthleteGoalDto> {
    if (!Types.ObjectId.isValid(goalId)) {
      throw new ApiError(400, 'Invalid goal ID');
    }

    const goal = await AthleteGoal.findById(goalId);
    if (!goal) {
      throw new ApiError(404, 'Goal not found');
    }

    if (user.role === 'Athlete') {
      const athleteId = await this.getAthleteProfileForUser(user.id);
      if (!athleteId || !goal.athlete.equals(athleteId)) {
        throw new ApiError(404, 'Goal not found under your athlete profile');
      }

      // Athlete can ONLY update progress
      const selfInput = input as UpdateGoalSelfInput;
      goal.progress = selfInput.progress;
      if (goal.progress === 100) {
        goal.status = 'Achieved';
      }
    } else {
      if (user.role === 'Coach') {
        const inScope = await this.isCoachAssignedToAthlete(user.id, goal.athlete);
        if (!inScope) {
          throw new ApiError(404, 'Goal not found');
        }
      }
      // Staff (Admin or Coach) update
      const staffInput = input as UpdateGoalStaffInput;
      if (staffInput.title !== undefined) goal.title = staffInput.title;
      if (staffInput.description !== undefined) goal.description = staffInput.description;
      if (staffInput.targetDate !== undefined) goal.targetDate = new Date(staffInput.targetDate);
      if (staffInput.status !== undefined) goal.status = staffInput.status;
      if (staffInput.progress !== undefined) goal.progress = staffInput.progress;
    }

    await goal.save();

    await auditService.logAudit({
      action: 'ATHLETE_GOAL_UPDATED',
      actor: new Types.ObjectId(user.id),
      targetId: goal._id,
      targetType: 'AthleteGoal',
      meta: {
        athleteId: goal.athlete.toString(),
        progress: goal.progress,
        status: goal.status,
      },
    });

    (async () => {
      try {
        const athDoc = await Athlete.findById(goal.athlete).select('user');
        if (athDoc?.user) {
          await notify([athDoc.user], {
            type: 'Goal',
            title: `Goal Updated: ${goal.title}`,
            body: `Goal status: ${goal.status}, progress: ${goal.progress}%.`,
            link: '/athlete/me',
          });
        }
      } catch {
        // Safe ignore
      }
    })();

    return this.formatGoalDto(goal);
  }

  // ==========================================
  // UNIFIED ATHLETE DEVELOPMENT VIEW
  // Max 5 Queries, Lists capped to 50
  // ==========================================

  /**
   * Get unified development profile for an athlete
   */
  async getDevelopmentView(athleteId: string): Promise<DevelopmentViewDto> {
    if (!Types.ObjectId.isValid(athleteId)) {
      throw new ApiError(400, 'Invalid athlete ID');
    }

    // Query 1: Athlete document lookup with populated user, sport, and team
    const athlete = await Athlete.findById(athleteId)
      .populate('user', 'name')
      .populate('sport', 'name')
      .populate('team', 'name');

    if (!athlete) {
      throw new ApiError(404, 'Athlete not found');
    }

    // Query 2: Skill Assessments (max 50, sorted descending)
    const assessments = await SkillAssessment.find({ athlete: athlete._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(50)
      .populate('assessedBy', 'name');

    // Query 3: Feedback (max 50, sorted descending)
    const feedbackList = await CoachFeedback.find({ athlete: athlete._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'coach',
        populate: { path: 'user', select: 'name' },
      });

    // Query 4: Goals (max 50, sorted ascending by target date)
    const goalsList = await AthleteGoal.find({ athlete: athlete._id })
      .sort({ targetDate: 1, createdAt: -1 })
      .limit(50);

    // Query 5: Attendance rate summary aggregate
    const attendanceRecords = await Attendance.aggregate([
      { $match: { athlete: athlete._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    let present = 0;
    let late = 0;
    let absent = 0;
    for (const r of attendanceRecords) {
      if (r._id === 'Present') present += r.count;
      else if (r._id === 'Late') late += r.count;
      else if (r._id === 'Absent') absent += r.count;
    }
    const attendanceRate = calculateAttendanceRate(present, late, absent);

    // Compute category averages if assessments exist
    let skillCategoryAverages: (ISkillCategories & { overall: number }) | null = null;
    if (assessments.length > 0) {
      const totalTechnical = assessments.reduce((acc, curr) => acc + curr.categories.technical, 0);
      const totalPhysical = assessments.reduce((acc, curr) => acc + curr.categories.physical, 0);
      const totalTactical = assessments.reduce((acc, curr) => acc + curr.categories.tactical, 0);
      const totalMental = assessments.reduce((acc, curr) => acc + curr.categories.mental, 0);
      const totalOverall = assessments.reduce((acc, curr) => acc + curr.overall, 0);
      const count = assessments.length;

      skillCategoryAverages = {
        technical: Math.round((totalTechnical / count) * 10) / 10,
        physical: Math.round((totalPhysical / count) * 10) / 10,
        tactical: Math.round((totalTactical / count) * 10) / 10,
        mental: Math.round((totalMental / count) * 10) / 10,
        overall: Math.round((totalOverall / count) * 10) / 10,
      };
    }

    const latestAssessment =
      assessments.length > 0 ? this.formatAssessmentDto(assessments[0]) : null;

    const athleteUser = athlete.user as { name?: string } | undefined;
    const athleteSport = athlete.sport as { name?: string } | undefined;
    const athleteTeam = athlete.team as { name?: string } | undefined;

    return {
      athlete: {
        id: athlete._id.toString(),
        name: athleteUser?.name || 'Athlete',
        jerseyNumber: athlete.jerseyNumber,
        position: athlete.position,
        teamName: athleteTeam?.name,
        sportName: athleteSport?.name,
      },
      latestAssessment,
      skillCategoryAverages,
      attendanceRate,
      assessmentHistory: assessments.map((a) => this.formatAssessmentDto(a)),
      feedback: feedbackList.map((fb) => this.formatFeedbackDto(fb)),
      goals: goalsList.map((g) => this.formatGoalDto(g)),
    };
  }
}

export const developmentService = new DevelopmentService();
