import { apiClient, apiDownload } from '../lib/apiClient';
import {
  normalizeListResponse,
  normalizeSingleResponse,
  type PaginationMeta,
  type PaginatedResult,
} from './listHelpers';

export type { PaginationMeta, PaginatedResult };

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// User types
export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
  avatar?: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAuditItem {
  id: string;
  action: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  targetId?: string;
  targetModel?: string;
  ipAddress?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// Sport types
// Sport types
export interface SportItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  ageGroups: string[];
  features?: string[];
  icon?: string;
  image?: string;
  status: 'Active' | 'Inactive';
  teamCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Coach types
export interface CoachItem {
  id: string;
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    isActive?: boolean;
  };
  title: string;
  sports: Array<{ id: string; name: string; slug: string }>;
  specialties?: string[];
  experienceYears?: number;
  bio?: string;
  photo?: string;
  isPublic: boolean;
  createdAt?: string;
}

// Team types
export interface TeamItem {
  id: string;
  name: string;
  slug: string;
  sport: { id: string; name: string; slug: string; ageGroups?: string[] };
  ageGroup: string;
  season: string;
  logo?: string;
  coach?: {
    id: string;
    title: string;
    specialties?: string[];
    photo?: string;
    user?: { id: string; name: string };
  } | null;
  status: 'Active' | 'Inactive';
  athleteCount?: number;
  createdAt?: string;
}

// Athlete types
export interface AthleteItem {
  id: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null;
  sport: { id: string; name: string; slug: string; ageGroups?: string[] };
  team?: {
    id: string;
    name: string;
    slug: string;
    ageGroup?: string;
  } | null;
  jerseyNumber?: number;
  position?: string;
  dateOfBirth: string;
  age?: number;
  gender: 'Male' | 'Female' | 'Other';
  status: 'Active' | 'Injured' | 'Trial' | 'Inactive';
  verificationStatus: 'Verified' | 'Pending ID' | 'Medical Required';
  medicalNotes?: string;
  heightCm?: number;
  weightKg?: number;
  createdAt?: string;
}

// Public catalog types
export interface PublicSportItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  ageGroups: string[];
  features?: string[];
  icon?: string;
  image?: string;
  status: string;
}

export interface PublicCoachItem {
  id: string;
  title: string;
  name?: string;
  sports: Array<{ name: string; slug: string }>;
  specialties?: string[];
  experienceYears?: number;
  bio?: string;
  photo?: string;
}

export interface PublicTeamItem {
  id: string;
  name: string;
  slug: string;
  sport: { name: string; slug: string };
  ageGroup: string;
  season: string;
  logo?: string;
  coach?: {
    name?: string;
    title?: string;
    photo?: string;
  } | null;
  status: string;
  athleteCount: number;
}

// Training Session & Attendance types
export interface AttendanceSummary {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
}

export interface TrainingSessionItem {
  id: string;
  team: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  coach: {
    id: string;
    user?: { name: string };
  } | null;
  title: string;
  type: SessionType;
  startsAt: string;
  endsAt: string;
  venue?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  cancellationReason?: string;
  attendanceSummary?: AttendanceSummary | null;
  myAttendance?: {
    status: 'Present' | 'Late' | 'Excused' | 'Absent';
    note?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RosterAttendanceItem {
  athleteId: string;
  athleteName: string;
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  note?: string;
  onRoster: boolean;
}

export interface SessionAttendanceResponse {
  session: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  summary: AttendanceSummary;
  records: RosterAttendanceItem[];
}

export interface AthleteAttendanceItem {
  id: string;
  session: {
    id: string;
    title: string;
    startsAt: string;
    type?: SessionType;
    venue?: string;
  } | null;
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  note?: string;
  markedAt?: string;
  createdAt?: string;
}

export interface AthleteAttendanceSummary {
  present: number;
  late: number;
  excused: number;
  absent: number;
  totalSessions: number;
  attendanceRate: number | null;
}

export interface AthleteAttendanceResponse {
  summary: AthleteAttendanceSummary;
  records: PaginatedResult<AthleteAttendanceItem>;
}

export type SessionType =
  | 'Training'
  | 'Match'
  | 'Gym'
  | 'Recovery'
  | 'Other';

export interface TrainingSessionQuery extends PaginationQuery {
  team?: string;
  coach?: string;
  type?: SessionType;
  status?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTrainingSessionInput {
  team: string;
  coach?: string;
  title: string;
  type?: SessionType;
  startsAt: string;
  endsAt: string;
  venue: string;
  notes?: string;
}

export interface UpdateTrainingSessionInput {
  coach?: string;
  title?: string;
  type?: SessionType;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  notes?: string;
}

export interface AttendanceRecordInput {
  athlete: string;
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  note?: string;
}

// Strict Request Payload Types matching Backend Zod Schemas (.strict())
export interface CreateSportInput {
  name: string;
  description: string;
  shortDescription?: string;
  icon?: string;
  image?: string;
  ageGroups?: string[];
  features?: string[];
  status?: 'Active' | 'Inactive';
}

export interface UpdateSportInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  icon?: string;
  image?: string;
  ageGroups?: string[];
  features?: string[];
  status?: 'Active' | 'Inactive';
}

export interface CreateTeamInput {
  name: string;
  sport: string;
  ageGroup: string;
  coach?: string;
  season?: string;
  logo?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateTeamInput {
  name?: string;
  sport?: string;
  ageGroup?: string;
  coach?: string | null;
  season?: string;
  logo?: string;
  status?: 'Active' | 'Inactive';
}

export interface CreateCoachInput {
  user: string;
  title?: string;
  bio?: string;
  specialization?: string;
  specialties?: string[];
  sports?: string[];
  certifications?: Array<{ name: string; issuer?: string; year?: number }>;
  experienceYears?: number;
  achievements?: string[];
  photo?: string;
  isPublic?: boolean;
}

export interface UpdateCoachInput {
  title?: string;
  bio?: string;
  specialization?: string;
  specialties?: string[];
  sports?: string[];
  certifications?: Array<{ name: string; issuer?: string; year?: number }>;
  experienceYears?: number;
  achievements?: string[];
  photo?: string;
  isPublic?: boolean;
}

export interface CreateAthleteInput {
  user?: string;
  sport: string;
  team?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  position?: string;
  jerseyNumber?: number;
  heightCm?: number;
  weightKg?: number;
  status?: 'Active' | 'Injured' | 'Trial' | 'Inactive';
  verificationStatus?: 'Verified' | 'Pending ID' | 'Medical Required';
  medicalClearance?: boolean;
  guardian?: { name: string; phone: string; email?: string };
  medicalNotes?: string;
  profileVisibility?: 'Public' | 'AcademyOnly' | 'Private';
}

export interface UpdateAthleteInput {
  user?: string | null;
  sport?: string;
  team?: string | null;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  position?: string;
  jerseyNumber?: number | null;
  heightCm?: number;
  weightKg?: number;
  status?: 'Active' | 'Injured' | 'Trial' | 'Inactive';
  verificationStatus?: 'Verified' | 'Pending ID' | 'Medical Required';
  medicalClearance?: boolean;
  guardian?: { name: string; phone: string; email?: string };
  medicalNotes?: string;
  profileVisibility?: 'Public' | 'AcademyOnly' | 'Private';
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
  phone?: string;
  avatar?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  avatar?: string;
  role?: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
  isActive?: boolean;
}

/**
 * Maps ApiFieldError[] from ApiClientError to a Record<string, string> keyed by field path.
 */
export const mapFieldErrors = (err: unknown): Record<string, string> => {
  const result: Record<string, string> = {};
  if (err && typeof err === 'object' && 'fieldErrors' in err) {
    const fieldErrors = (err as { fieldErrors?: Array<{ field: string; message: string }> }).fieldErrors;
    if (Array.isArray(fieldErrors)) {
      for (const item of fieldErrors) {
        if (item.field && item.message) {
          result[item.field] = item.message;
        }
      }
    }
  }
  return result;
};

// Query parameters interfaces
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UserQuery extends PaginationQuery {
  role?: string;
  isActive?: boolean;
}

export interface SportQuery extends PaginationQuery {
  status?: string;
}

export interface TeamQuery extends PaginationQuery {
  sport?: string;
  ageGroup?: string;
  status?: string;
}

export interface CoachQuery extends PaginationQuery {
  sport?: string;
  isPublic?: boolean;
}

export interface AthleteQuery extends PaginationQuery {
  sport?: string;
  team?: string;
  ageGroup?: string;
  status?: string;
  verificationStatus?: string;
  unassigned?: boolean;
}

const buildQueryString = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export const academyApi = {
  // Sports
  listSports: async (query: SportQuery = {}): Promise<PaginatedResult<SportItem>> => {
    const res = await apiClient(`/sports${buildQueryString(query as Record<string, unknown>)}`);
    return normalizeListResponse<SportItem>(res);
  },
  getSport: async (id: string): Promise<SportItem | null> => {
    const res = await apiClient(`/sports/${id}`);
    return normalizeSingleResponse<SportItem>(res);
  },
  createSport: async (payload: CreateSportInput): Promise<SportItem | null> => {
    const res = await apiClient('/sports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<SportItem>(res);
  },
  updateSport: async (id: string, payload: UpdateSportInput): Promise<SportItem | null> => {
    const res = await apiClient(`/sports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<SportItem>(res);
  },
  deleteSport: async (id: string): Promise<{ message: string } | null> => {
    const res = await apiClient(`/sports/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ message: string }>(res);
  },

  // Teams
  listTeams: async (query: TeamQuery = {}): Promise<PaginatedResult<TeamItem>> => {
    const res = await apiClient(`/teams${buildQueryString(query as Record<string, unknown>)}`);
    return normalizeListResponse<TeamItem>(res);
  },
  getTeam: async (id: string): Promise<TeamItem | null> => {
    const res = await apiClient(`/teams/${id}`);
    return normalizeSingleResponse<TeamItem>(res);
  },
  createTeam: async (payload: CreateTeamInput): Promise<TeamItem | null> => {
    const res = await apiClient('/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<TeamItem>(res);
  },
  updateTeam: async (id: string, payload: UpdateTeamInput): Promise<TeamItem | null> => {
    const res = await apiClient(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<TeamItem>(res);
  },
  deleteTeam: async (id: string): Promise<{ message: string } | null> => {
    const res = await apiClient(`/teams/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ message: string }>(res);
  },
  getTeamRoster: async (teamId: string): Promise<PaginatedResult<AthleteItem>> => {
    const res = await apiClient(`/teams/${teamId}/roster`);
    return normalizeListResponse<AthleteItem>(res);
  },

  // Coaches
  listCoaches: async (query: CoachQuery = {}): Promise<PaginatedResult<CoachItem>> => {
    const res = await apiClient(`/coaches${buildQueryString(query as Record<string, unknown>)}`);
    return normalizeListResponse<CoachItem>(res);
  },
  getCoach: async (id: string): Promise<CoachItem | null> => {
    const res = await apiClient(`/coaches/${id}`);
    return normalizeSingleResponse<CoachItem>(res);
  },
  createCoach: async (payload: CreateCoachInput): Promise<CoachItem | null> => {
    const res = await apiClient('/coaches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<CoachItem>(res);
  },
  updateCoach: async (id: string, payload: UpdateCoachInput): Promise<CoachItem | null> => {
    const res = await apiClient(`/coaches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<CoachItem>(res);
  },
  deleteCoach: async (id: string): Promise<{ message: string } | null> => {
    const res = await apiClient(`/coaches/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ message: string }>(res);
  },

  // Athletes
  listAthletes: async (query: AthleteQuery = {}): Promise<PaginatedResult<AthleteItem>> => {
    const res = await apiClient(`/athletes${buildQueryString(query as Record<string, unknown>)}`);
    return normalizeListResponse<AthleteItem>(res);
  },
  getAthlete: async (id: string): Promise<AthleteItem | null> => {
    const res = await apiClient(`/athletes/${id}`);
    return normalizeSingleResponse<AthleteItem>(res);
  },
  createAthlete: async (payload: CreateAthleteInput): Promise<AthleteItem | null> => {
    const res = await apiClient('/athletes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AthleteItem>(res);
  },
  updateAthlete: async (id: string, payload: UpdateAthleteInput): Promise<AthleteItem | null> => {
    const res = await apiClient(`/athletes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AthleteItem>(res);
  },
  deleteAthlete: async (id: string): Promise<{ message: string } | null> => {
    const res = await apiClient(`/athletes/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ message: string }>(res);
  },
  assignAthleteTeam: async (
    athleteId: string,
    teamId: string,
    jerseyNumber?: number
  ): Promise<AthleteItem | null> => {
    const res = await apiClient(`/athletes/${athleteId}/team`, {
      method: 'PUT',
      body: JSON.stringify({ team: teamId, jerseyNumber }),
    });
    return normalizeSingleResponse<AthleteItem>(res);
  },
  unassignAthleteTeam: async (athleteId: string): Promise<AthleteItem | null> => {
    const res = await apiClient(`/athletes/${athleteId}/team`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<AthleteItem>(res);
  },
  updateAthleteVerification: async (
    athleteId: string,
    verificationStatus: 'Verified' | 'Pending ID' | 'Medical Required',
    documents?: string[]
  ): Promise<AthleteItem | null> => {
    const res = await apiClient(`/athletes/${athleteId}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, documents }),
    });
    return normalizeSingleResponse<AthleteItem>(res);
  },

  // User Accounts (Admin)
  listUsers: async (query: UserQuery = {}): Promise<PaginatedResult<AdminUserItem>> => {
    const res = await apiClient(`/users${buildQueryString(query as Record<string, unknown>)}`);
    return normalizeListResponse<AdminUserItem>(res);
  },
  getUser: async (id: string): Promise<AdminUserItem | null> => {
    const res = await apiClient(`/users/${id}`);
    return normalizeSingleResponse<AdminUserItem>(res);
  },
  createUser: async (payload: {
    name: string;
    email: string;
    password: string;
    role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
    isActive?: boolean;
  }): Promise<AdminUserItem | null> => {
    const res = await apiClient('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AdminUserItem>(res);
  },
  updateUser: async (
    id: string,
    payload: {
      name?: string;
      email?: string;
      role?: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
      isActive?: boolean;
    }
  ): Promise<AdminUserItem | null> => {
    const res = await apiClient(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AdminUserItem>(res);
  },

  unlockUser: async (id: string): Promise<AdminUserItem | null> => {
    const res = await apiClient(`/users/${id}/unlock`, {
      method: 'POST',
    });
    return normalizeSingleResponse<AdminUserItem>(res);
  },
  resetUserPassword: async (id: string, newPassword: string): Promise<{ message: string } | null> => {
    const res = await apiClient(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    return normalizeSingleResponse<{ message: string }>(res);
  },
  getUserAudit: async (id: string): Promise<PaginatedResult<UserAuditItem>> => {
    const res = await apiClient(`/users/${id}/audit`);
    return normalizeListResponse<UserAuditItem>(res);
  },

  // Public Catalog
  getPublicSports: async (query: PaginationQuery = {}): Promise<PaginatedResult<PublicSportItem>> => {
    const res = await apiClient(
      `/public/sports${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<PublicSportItem>(res);
  },
  getPublicSportBySlug: async (slug: string): Promise<PublicSportItem | null> => {
    const res = await apiClient(`/public/sports/${slug}`);
    return normalizeSingleResponse<PublicSportItem>(res);
  },
  getPublicTeams: async (query: PaginationQuery = {}): Promise<PaginatedResult<PublicTeamItem>> => {
    const res = await apiClient(
      `/public/teams${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<PublicTeamItem>(res);
  },
  getPublicTeamBySlug: async (slug: string): Promise<PublicTeamItem | null> => {
    const res = await apiClient(`/public/teams/${slug}`);
    return normalizeSingleResponse<PublicTeamItem>(res);
  },
  getPublicCoaches: async (query: PaginationQuery = {}): Promise<PaginatedResult<PublicCoachItem>> => {
    const res = await apiClient(
      `/public/coaches${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<PublicCoachItem>(res);
  },
  getPublicCoachById: async (id: string): Promise<PublicCoachItem | null> => {
    const res = await apiClient(`/public/coaches/${id}`);
    return normalizeSingleResponse<PublicCoachItem>(res);
  },

  // Training Sessions & Attendance
  listTrainingSessions: async (
    query: TrainingSessionQuery = {}
  ): Promise<PaginatedResult<TrainingSessionItem>> => {
    const res = await apiClient(
      `/training-sessions${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<TrainingSessionItem>(res);
  },
  getTrainingSessionById: async (id: string): Promise<TrainingSessionItem | null> => {
    const res = await apiClient(`/training-sessions/${id}`);
    return normalizeSingleResponse<TrainingSessionItem>(res);
  },
  createTrainingSession: async (
    payload: CreateTrainingSessionInput
  ): Promise<TrainingSessionItem | null> => {
    const res = await apiClient('/training-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<TrainingSessionItem>(res);
  },
  updateTrainingSession: async (
    id: string,
    payload: UpdateTrainingSessionInput
  ): Promise<TrainingSessionItem | null> => {
    const res = await apiClient(`/training-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<TrainingSessionItem>(res);
  },
  cancelTrainingSession: async (
    id: string,
    reason: string
  ): Promise<TrainingSessionItem | null> => {
    const res = await apiClient(`/training-sessions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return normalizeSingleResponse<TrainingSessionItem>(res);
  },
  deleteTrainingSession: async (id: string): Promise<{ success: boolean; message: string } | null> => {
    const res = await apiClient(`/training-sessions/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ success: boolean; message: string }>(res);
  },
  getSessionAttendance: async (sessionId: string): Promise<SessionAttendanceResponse | null> => {
    const res = await apiClient(`/training-sessions/${sessionId}/attendance`);
    return normalizeSingleResponse<SessionAttendanceResponse>(res);
  },
  markSessionAttendance: async (
    sessionId: string,
    records: AttendanceRecordInput[]
  ): Promise<SessionAttendanceResponse | null> => {
    const res = await apiClient(`/training-sessions/${sessionId}/attendance`, {
      method: 'PUT',
      body: JSON.stringify({ records }),
    });
    return normalizeSingleResponse<SessionAttendanceResponse>(res);
  },
  getAthleteSelfAttendance: async (
    query: PaginationQuery = {}
  ): Promise<AthleteAttendanceResponse | null> => {
    const res = await apiClient(
      `/athletes/me/attendance${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeSingleResponse<AthleteAttendanceResponse>(res);
  },
  getAthleteAttendance: async (
    athleteId: string,
    query: PaginationQuery = {}
  ): Promise<AthleteAttendanceResponse | null> => {
    const res = await apiClient(
      `/athletes/${athleteId}/attendance${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeSingleResponse<AthleteAttendanceResponse>(res);
  },

  // ==================== ANNOUNCEMENTS (STEP 6B) ====================
  getAnnouncements: async (
    query: AnnouncementQuery = {}
  ): Promise<PaginatedResult<AnnouncementItem>> => {
    const res = await apiClient(
      `/announcements${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<AnnouncementItem>(res);
  },

  getAnnouncementById: async (id: string): Promise<AnnouncementItem | null> => {
    const res = await apiClient(`/announcements/${id}`);
    return normalizeSingleResponse<AnnouncementItem>(res);
  },

  createAnnouncement: async (
    payload: CreateAnnouncementInput
  ): Promise<AnnouncementItem | null> => {
    const res = await apiClient('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AnnouncementItem>(res);
  },

  updateAnnouncement: async (
    id: string,
    payload: UpdateAnnouncementInput
  ): Promise<AnnouncementItem | null> => {
    const res = await apiClient(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeSingleResponse<AnnouncementItem>(res);
  },

  deleteAnnouncement: async (
    id: string
  ): Promise<{ success: boolean; message: string } | null> => {
    const res = await apiClient(`/announcements/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ success: boolean; message: string }>(res);
  },

  // ==================== DOCUMENTS (STEP 6B) ====================
  getDocuments: async (
    query: DocumentQuery = {}
  ): Promise<PaginatedResult<DocumentItem>> => {
    const res = await apiClient(
      `/documents${buildQueryString(query as Record<string, unknown>)}`
    );
    return normalizeListResponse<DocumentItem>(res);
  },

  getDocumentById: async (id: string): Promise<DocumentItem | null> => {
    const res = await apiClient(`/documents/${id}`);
    return normalizeSingleResponse<DocumentItem>(res);
  },

  uploadDocument: async (
    input: CreateDocumentInput
  ): Promise<DocumentItem | null> => {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('category', input.category);
    formData.append('visibility', input.visibility);
    if (input.team) formData.append('team', input.team);
    formData.append('file', input.file);

    const res = await apiClient('/documents', {
      method: 'POST',
      body: formData,
    });
    return normalizeSingleResponse<DocumentItem>(res);
  },

  downloadDocument: async (id: string, fileName: string): Promise<void> => {
    const blob = await apiDownload(`/documents/${id}/download`);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  },

  deleteDocument: async (
    id: string
  ): Promise<{ success: boolean; message: string } | null> => {
    const res = await apiClient(`/documents/${id}`, {
      method: 'DELETE',
    });
    return normalizeSingleResponse<{ success: boolean; message: string }>(res);
  },
};

// Announcement & Document Interfaces
export type AnnouncementAudience =
  | 'Public'
  | 'All'
  | 'Athletes'
  | 'Coaches'
  | 'Organizers'
  | 'Team';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  team: { id: string; name: string } | null;
  pinned: boolean;
  publishedAt: string;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  audience?: AnnouncementAudience;
  team?: string;
  pinned?: boolean;
  publishedAt?: string;
}

export interface AnnouncementQuery extends PaginationQuery {
  audience?: string;
  team?: string;
  search?: string;
  pinned?: boolean;
}

export type DocumentCategory =
  | 'Policy'
  | 'Form'
  | 'Schedule'
  | 'Report'
  | 'Other';

export type DocumentVisibility =
  | 'Public'
  | 'All'
  | 'Athletes'
  | 'Coaches'
  | 'Organizers'
  | 'Team';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  file: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  visibility: DocumentVisibility;
  team: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  team?: string;
  file: File;
}

export interface DocumentQuery extends PaginationQuery {
  category?: string;
  visibility?: string;
  team?: string;
  search?: string;
}


