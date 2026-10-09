/**
 * Pure helper functions for constructing strict API request payloads
 * for Training Session create (POST) and update (PATCH) endpoints.
 *
 * Rules:
 * 1. Update payload must never include `team`.
 * 2. Empty string or null values for optional fields (notes, coach) are omitted,
 *    never sent as empty strings or nulls to adhere to backend Zod schemas (.strict()).
 * 3. Handles null/undefined inputs safely without throwing on `.trim()`.
 */
import type {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
  SessionType,
} from '../../services/academyApi';

export interface SessionPayloadInputValues {
  title: string;
  teamId?: string | null;
  coachId?: string | null;
  type: SessionType;
  startsAtUtc: string;
  endsAtUtc: string;
  venue: string;
  notes?: string | null;
}

/**
 * Builds a strict payload for creating a new training session (POST /training-sessions).
 */
export function buildCreateSessionPayload(
  values: SessionPayloadInputValues
): CreateTrainingSessionInput {
  const trimmedTitle = (values.title ?? '').trim();
  const trimmedVenue = (values.venue ?? '').trim();
  const trimmedTeam = (values.teamId ?? '').trim();
  const trimmedNotes = (values.notes ?? '').trim();
  const trimmedCoach = (values.coachId ?? '').trim();

  const payload: CreateTrainingSessionInput = {
    team: trimmedTeam,
    title: trimmedTitle,
    type: values.type,
    startsAt: values.startsAtUtc,
    endsAt: values.endsAtUtc,
    venue: trimmedVenue,
  };

  if (trimmedCoach.length > 0) {
    payload.coach = trimmedCoach;
  }

  if (trimmedNotes.length > 0) {
    payload.notes = trimmedNotes;
  }

  return payload;
}

/**
 * Builds a strict payload for updating an existing training session (PATCH /training-sessions/:id).
 * Never includes `team`.
 * Omits startsAt/endsAt if session is already Completed or Cancelled.
 */
export function buildUpdateSessionPayload(
  values: SessionPayloadInputValues,
  options?: {
    isCompletedOrCancelled?: boolean;
    isAdmin?: boolean;
  }
): UpdateTrainingSessionInput {
  const isCompletedOrCancelled = options?.isCompletedOrCancelled ?? false;
  const isAdmin = options?.isAdmin ?? false;

  const trimmedTitle = (values.title ?? '').trim();
  const trimmedVenue = (values.venue ?? '').trim();
  const trimmedNotes = (values.notes ?? '').trim();

  const payload: UpdateTrainingSessionInput = {
    title: trimmedTitle,
    type: values.type,
    venue: trimmedVenue,
  };

  if (trimmedNotes.length > 0) {
    payload.notes = trimmedNotes;
  }

  if (isAdmin) {
    const trimmedCoach = (values.coachId ?? '').trim();
    if (trimmedCoach.length > 0) {
      payload.coach = trimmedCoach;
    }
  }

  if (!isCompletedOrCancelled) {
    if (values.startsAtUtc) {
      payload.startsAt = values.startsAtUtc;
    }
    if (values.endsAtUtc) {
      payload.endsAt = values.endsAtUtc;
    }
  }

  return payload;
}
