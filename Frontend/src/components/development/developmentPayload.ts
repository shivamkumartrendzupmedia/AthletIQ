import type {
  CreateSkillAssessmentInput,
  CreateCoachFeedbackInput,
  CreateAthleteGoalInput,
  UpdateAthleteGoalInput,
} from '../../services/academyApi';

export interface AssessmentFormState {
  pace: number | string;
  shooting: number | string;
  passing: number | string;
  dribbling: number | string;
  defending: number | string;
  stamina: number | string;
  agility: number | string;
  decisionMaking: number | string;
  leadership: number | string;
  workRate: number | string;
  note?: string;
  date?: string;
}

export function buildCreateAssessmentPayload(
  form: AssessmentFormState
): CreateSkillAssessmentInput {
  const payload: CreateSkillAssessmentInput = {
    pace: Number(form.pace),
    shooting: Number(form.shooting),
    passing: Number(form.passing),
    dribbling: Number(form.dribbling),
    defending: Number(form.defending),
    stamina: Number(form.stamina),
    agility: Number(form.agility),
    decisionMaking: Number(form.decisionMaking),
    leadership: Number(form.leadership),
    workRate: Number(form.workRate),
  };

  if (form.note && form.note.trim()) {
    payload.note = form.note.trim();
  }

  if (form.date && form.date.trim()) {
    payload.date = form.date.trim();
  }

  return payload;
}

export interface FeedbackFormState {
  athlete: string;
  text: string;
  type?: 'Praise' | 'Improvement' | 'General';
}

export function buildCreateFeedbackPayload(
  form: FeedbackFormState
): CreateCoachFeedbackInput {
  return {
    athlete: form.athlete.trim(),
    text: form.text.trim(),
    type: form.type || 'General',
  };
}

export interface GoalFormState {
  title: string;
  description?: string;
  targetDate: string;
  status?: 'Active' | 'Achieved' | 'Dropped';
  progress?: number | string;
}

export function buildCreateGoalPayload(
  form: GoalFormState
): CreateAthleteGoalInput {
  const payload: CreateAthleteGoalInput = {
    title: form.title.trim(),
    targetDate: form.targetDate.trim(),
  };

  if (form.description && form.description.trim()) {
    payload.description = form.description.trim();
  }

  if (form.status) {
    payload.status = form.status;
  }

  if (form.progress !== undefined && form.progress !== '') {
    payload.progress = Math.floor(Number(form.progress));
  }

  return payload;
}

export function buildUpdateGoalPayload(
  form: Partial<GoalFormState>
): UpdateAthleteGoalInput {
  const payload: UpdateAthleteGoalInput = {};

  if (form.title !== undefined) {
    payload.title = form.title.trim();
  }

  if (form.description !== undefined) {
    payload.description = form.description.trim() || undefined;
  }

  if (form.targetDate !== undefined) {
    payload.targetDate = form.targetDate.trim();
  }

  if (form.status !== undefined) {
    payload.status = form.status;
  }

  if (form.progress !== undefined && form.progress !== '') {
    payload.progress = Math.floor(Number(form.progress));
  }

  return payload;
}
