/**
 * Pure Payload Builders for Tournaments Domain
 * Validates, trims, type-converts, and formats payloads for backend API endpoints.
 * Zero UI dependencies; thoroughly testable against Backend Zod schemas.
 */

export interface CreateTournamentInput {
  name: string;
  sport: string;
  category: string;
  ageGroup: string;
  format: 'League' | 'Knockout';
  startDate: string;
  endDate: string;
  rules?: string;
  maxTeams?: string | number;
  status?: 'Draft' | 'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled';
}

export function buildCreateTournamentPayload(input: CreateTournamentInput) {
  const payload: {
    name: string;
    sport: string;
    category: string;
    ageGroup: string;
    format: 'League' | 'Knockout';
    startDate: string;
    endDate: string;
    rules?: string;
    maxTeams?: number;
    status?: 'Draft' | 'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled';
  } = {
    name: input.name.trim(),
    sport: input.sport.trim(),
    category: input.category.trim(),
    ageGroup: input.ageGroup.trim(),
    format: input.format,
    startDate: new Date(input.startDate).toISOString(),
    endDate: new Date(input.endDate).toISOString(),
  };

  if (input.rules && input.rules.trim().length > 0) {
    payload.rules = input.rules.trim();
  }

  if (input.maxTeams !== undefined && input.maxTeams !== null && String(input.maxTeams).trim() !== '') {
    const parsed = Number(input.maxTeams);
    if (!isNaN(parsed)) {
      payload.maxTeams = parsed;
    }
  }

  if (input.status) {
    payload.status = input.status;
  }

  return payload;
}

export interface UpdateTournamentInput {
  name?: string;
  sport?: string;
  category?: string;
  ageGroup?: string;
  format?: 'League' | 'Knockout';
  startDate?: string;
  endDate?: string;
  rules?: string;
  maxTeams?: string | number | null;
  status?: 'Draft' | 'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled';
}

export function buildUpdateTournamentPayload(input: UpdateTournamentInput) {
  const payload: {
    name?: string;
    sport?: string;
    category?: string;
    ageGroup?: string;
    format?: 'League' | 'Knockout';
    startDate?: string;
    endDate?: string;
    rules?: string;
    maxTeams?: number;
    status?: 'Draft' | 'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled';
  } = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.sport !== undefined) payload.sport = input.sport.trim();
  if (input.category !== undefined) payload.category = input.category.trim();
  if (input.ageGroup !== undefined) payload.ageGroup = input.ageGroup.trim();
  if (input.format !== undefined) payload.format = input.format;
  if (input.startDate !== undefined) payload.startDate = new Date(input.startDate).toISOString();
  if (input.endDate !== undefined) payload.endDate = new Date(input.endDate).toISOString();
  if (input.rules !== undefined) payload.rules = input.rules.trim();

  if (input.maxTeams !== undefined && input.maxTeams !== null && String(input.maxTeams).trim() !== '') {
    const parsed = Number(input.maxTeams);
    if (!isNaN(parsed)) {
      payload.maxTeams = parsed;
    }
  }

  if (input.status !== undefined) payload.status = input.status;

  return payload;
}

export interface CreateRegistrationInput {
  team: string;
  squad?: string[];
}

export function buildCreateRegistrationPayload(input: CreateRegistrationInput) {
  const payload: { team: string; squad: string[] } = {
    team: input.team.trim(),
    squad: Array.isArray(input.squad) ? input.squad.map((id) => id.trim()).filter(Boolean) : [],
  };
  return payload;
}

export interface UpdateSquadInput {
  squad: string[];
}

export function buildUpdateSquadPayload(input: UpdateSquadInput) {
  return {
    squad: input.squad.map((id) => id.trim()).filter(Boolean),
  };
}

export interface ReviewRegistrationInput {
  status: 'Approved' | 'Rejected';
  reason?: string;
}

export function buildReviewRegistrationPayload(input: ReviewRegistrationInput) {
  const payload: { status: 'Approved' | 'Rejected'; reason?: string } = {
    status: input.status,
  };
  if (input.reason && input.reason.trim().length > 0) {
    payload.reason = input.reason.trim();
  }
  return payload;
}

export interface CreateVenueInput {
  name: string;
  address: string;
  capacity?: string | number;
  active?: boolean;
}

export function buildCreateVenuePayload(input: CreateVenueInput) {
  const payload: { name: string; address: string; capacity?: number; active?: boolean } = {
    name: input.name.trim(),
    address: input.address.trim(),
  };

  if (input.capacity !== undefined && input.capacity !== null && String(input.capacity).trim() !== '') {
    const parsed = Number(input.capacity);
    if (!isNaN(parsed)) {
      payload.capacity = parsed;
    }
  }

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  return payload;
}

export interface UpdateVenueInput {
  name?: string;
  address?: string;
  capacity?: string | number | null;
  active?: boolean;
}

export function buildUpdateVenuePayload(input: UpdateVenueInput) {
  const payload: { name?: string; address?: string; capacity?: number; active?: boolean } = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.address !== undefined) payload.address = input.address.trim();

  if (input.capacity !== undefined && input.capacity !== null && String(input.capacity).trim() !== '') {
    const parsed = Number(input.capacity);
    if (!isNaN(parsed)) {
      payload.capacity = parsed;
    }
  }

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  return payload;
}

export interface CreateOfficialInput {
  name: string;
  type: 'Referee' | 'Assistant Referee' | 'Scorer';
  active?: boolean;
}

export function buildCreateOfficialPayload(input: CreateOfficialInput) {
  const payload: { name: string; type: 'Referee' | 'Assistant Referee' | 'Scorer'; active?: boolean } = {
    name: input.name.trim(),
    type: input.type,
  };

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  return payload;
}

export interface UpdateOfficialInput {
  name?: string;
  type?: 'Referee' | 'Assistant Referee' | 'Scorer';
  active?: boolean;
  user?: string | null;
}

export function buildUpdateOfficialPayload(input: UpdateOfficialInput) {
  const payload: {
    name?: string;
    type?: 'Referee' | 'Assistant Referee' | 'Scorer';
    active?: boolean;
    user?: string | null;
  } = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.type !== undefined) payload.type = input.type;
  if (input.active !== undefined) payload.active = Boolean(input.active);
  if (input.user !== undefined) payload.user = input.user;

  return payload;
}

export interface CreateMatchInput {
  homeTeam: string;
  awayTeam: string;
  round: string;
  group?: string;
  scheduledAt: string;
  durationMinutes?: string | number;
  venue: string;
  referee?: string;
}

export function buildCreateMatchPayload(input: CreateMatchInput) {
  const payload: {
    homeTeam: string;
    awayTeam: string;
    round: string;
    group?: string;
    scheduledAt: string;
    durationMinutes: number;
    venue: string;
    referee?: string;
  } = {
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    round: input.round.trim(),
    scheduledAt: new Date(input.scheduledAt).toISOString(),
    durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : 90,
    venue: input.venue.trim(),
  };

  if (input.group && input.group.trim().length > 0) {
    payload.group = input.group.trim();
  }

  if (input.referee && input.referee.trim().length > 0) {
    payload.referee = input.referee.trim();
  }

  return payload;
}

export interface UpdateMatchInput {
  round?: string;
  group?: string;
  scheduledAt?: string;
  durationMinutes?: string | number;
  venue?: string;
  referee?: string | null;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
}

export function buildUpdateMatchPayload(input: UpdateMatchInput) {
  const payload: {
    round?: string;
    group?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    venue?: string;
    referee?: string | null;
    status?: 'Scheduled' | 'Completed' | 'Cancelled';
  } = {};

  if (input.round !== undefined) payload.round = input.round.trim();
  if (input.group !== undefined) payload.group = input.group.trim();
  if (input.scheduledAt !== undefined) payload.scheduledAt = new Date(input.scheduledAt).toISOString();
  if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
    payload.durationMinutes = Number(input.durationMinutes);
  }
  if (input.venue !== undefined) payload.venue = input.venue.trim();
  if (input.referee !== undefined) {
    payload.referee = input.referee ? input.referee.trim() : null;
  }
  if (input.status !== undefined) payload.status = input.status;

  return payload;
}

export interface EnterMatchResultInput {
  homeScore: string | number;
  awayScore: string | number;
}

export function buildEnterMatchResultPayload(input: EnterMatchResultInput) {
  return {
    homeScore: Number(input.homeScore),
    awayScore: Number(input.awayScore),
  };
}
