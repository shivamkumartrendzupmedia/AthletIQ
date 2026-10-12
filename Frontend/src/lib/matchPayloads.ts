/**
 * Pure payload builders for live match operations.
 * Tested against Backend Zod schemas (matchStatusTransitionSchema, createMatchEventSchema).
 */

export interface BuildMatchStatusInput {
  status: 'Scheduled' | 'Live' | 'HalfTime' | 'Completed' | 'Cancelled' | string;
}

export function buildMatchStatusPayload(input: BuildMatchStatusInput | string) {
  const status = typeof input === 'string' ? input : input.status;
  return {
    status,
  };
}

export interface BuildMatchEventInput {
  type: string;
  side: 'home' | 'away' | string;
  minute: number;
  player?: string | null;
  relatedPlayer?: string | null;
  note?: string | null;
}

export function buildMatchEventPayload(input: BuildMatchEventInput) {
  const payload: Record<string, unknown> = {
    type: input.type,
    side: input.side,
    minute: Math.floor(Number(input.minute)),
  };

  if (input.player && input.player.trim().length > 0) {
    payload.player = input.player.trim();
  } else if (input.player === null) {
    payload.player = null;
  }

  if (input.relatedPlayer && input.relatedPlayer.trim().length > 0) {
    payload.relatedPlayer = input.relatedPlayer.trim();
  } else if (input.relatedPlayer === null) {
    payload.relatedPlayer = null;
  }

  if (input.note && input.note.trim().length > 0) {
    payload.note = input.note.trim();
  }

  return payload;
}
