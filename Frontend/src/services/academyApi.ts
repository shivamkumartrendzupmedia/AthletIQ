import { apiClient, type ApiResponse } from '../lib/apiClient';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
export interface SportItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  ageGroups: string[];
  features?: string[];
  icon?: string;
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
  };
  title: string;
  sports: Array<SportItem | string>;
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
  sport: SportItem | string;
  ageGroup: string;
  season: string;
  coach?: CoachItem | null;
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
  } | null;
  sport: SportItem | string;
  team?: TeamItem | null;
  jerseyNumber?: number;
  position?: string;
  dateOfBirth: string;
  age?: number;
  gender: 'Male' | 'Female' | 'Other';
  status: 'Active' | 'Inactive' | 'Injured' | 'Suspended';
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
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
  status: string;
}

export interface PublicCoachItem {
  id: string;
  title: string;
  name?: string;
  sports: string[];
  specialties?: string[];
  experienceYears?: number;
  bio?: string;
  photo?: string;
}

export interface PublicTeamItem {
  id: string;
  name: string;
  slug: string;
  sport: string;
  ageGroup: string;
  season: string;
  coach?: {
    name?: string;
    title?: string;
  } | null;
  status: string;
  athleteCount: number;
}

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
  listSports: async (query: SportQuery = {}): Promise<ApiResponse<PaginatedResponse<SportItem>>> => {
    return apiClient<PaginatedResponse<SportItem>>(`/sports${buildQueryString(query as Record<string, unknown>)}`);
  },
  getSport: async (id: string): Promise<ApiResponse<SportItem>> => {
    return apiClient<SportItem>(`/sports/${id}`);
  },
  createSport: async (payload: Partial<SportItem>): Promise<ApiResponse<SportItem>> => {
    return apiClient<SportItem>('/sports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateSport: async (id: string, payload: Partial<SportItem>): Promise<ApiResponse<SportItem>> => {
    return apiClient<SportItem>(`/sports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteSport: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/sports/${id}`, {
      method: 'DELETE',
    });
  },

  // Teams
  listTeams: async (query: TeamQuery = {}): Promise<ApiResponse<PaginatedResponse<TeamItem>>> => {
    return apiClient<PaginatedResponse<TeamItem>>(`/teams${buildQueryString(query as Record<string, unknown>)}`);
  },
  getTeam: async (id: string): Promise<ApiResponse<TeamItem>> => {
    return apiClient<TeamItem>(`/teams/${id}`);
  },
  createTeam: async (payload: Record<string, unknown>): Promise<ApiResponse<TeamItem>> => {
    return apiClient<TeamItem>('/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateTeam: async (id: string, payload: Record<string, unknown>): Promise<ApiResponse<TeamItem>> => {
    return apiClient<TeamItem>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteTeam: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/teams/${id}`, {
      method: 'DELETE',
    });
  },
  getTeamRoster: async (teamId: string): Promise<ApiResponse<AthleteItem[]>> => {
    return apiClient<AthleteItem[]>(`/teams/${teamId}/roster`);
  },

  // Coaches
  listCoaches: async (query: CoachQuery = {}): Promise<ApiResponse<PaginatedResponse<CoachItem>>> => {
    return apiClient<PaginatedResponse<CoachItem>>(`/coaches${buildQueryString(query as Record<string, unknown>)}`);
  },
  getCoach: async (id: string): Promise<ApiResponse<CoachItem>> => {
    return apiClient<CoachItem>(`/coaches/${id}`);
  },
  createCoach: async (payload: Record<string, unknown>): Promise<ApiResponse<CoachItem>> => {
    return apiClient<CoachItem>('/coaches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateCoach: async (id: string, payload: Record<string, unknown>): Promise<ApiResponse<CoachItem>> => {
    return apiClient<CoachItem>(`/coaches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteCoach: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/coaches/${id}`, {
      method: 'DELETE',
    });
  },

  // Athletes
  listAthletes: async (query: AthleteQuery = {}): Promise<ApiResponse<PaginatedResponse<AthleteItem>>> => {
    return apiClient<PaginatedResponse<AthleteItem>>(`/athletes${buildQueryString(query as Record<string, unknown>)}`);
  },
  getAthlete: async (id: string): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>(`/athletes/${id}`);
  },
  createAthlete: async (payload: Record<string, unknown>): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>('/athletes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateAthlete: async (id: string, payload: Record<string, unknown>): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>(`/athletes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteAthlete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/athletes/${id}`, {
      method: 'DELETE',
    });
  },
  assignAthleteTeam: async (
    athleteId: string,
    teamId: string,
    jerseyNumber?: number
  ): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>(`/athletes/${athleteId}/team`, {
      method: 'PUT',
      body: JSON.stringify({ team: teamId, jerseyNumber }),
    });
  },
  unassignAthleteTeam: async (athleteId: string): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>(`/athletes/${athleteId}/team`, {
      method: 'DELETE',
    });
  },
  updateAthleteVerification: async (
    athleteId: string,
    verificationStatus: 'Pending' | 'Verified' | 'Rejected',
    notes?: string
  ): Promise<ApiResponse<AthleteItem>> => {
    return apiClient<AthleteItem>(`/athletes/${athleteId}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, notes }),
    });
  },

  // User Accounts (Admin)
  listUsers: async (query: UserQuery = {}): Promise<ApiResponse<PaginatedResponse<AdminUserItem>>> => {
    return apiClient<PaginatedResponse<AdminUserItem>>(`/users${buildQueryString(query as Record<string, unknown>)}`);
  },
  getUser: async (id: string): Promise<ApiResponse<AdminUserItem>> => {
    return apiClient<AdminUserItem>(`/users/${id}`);
  },
  createUser: async (payload: {
    name: string;
    email: string;
    password: string;
    role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
    isActive?: boolean;
  }): Promise<ApiResponse<AdminUserItem>> => {
    return apiClient<AdminUserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateUser: async (
    id: string,
    payload: {
      name?: string;
      email?: string;
      role?: 'Admin' | 'Coach' | 'Athlete' | 'Organizer';
      isActive?: boolean;
    }
  ): Promise<ApiResponse<AdminUserItem>> => {
    return apiClient<AdminUserItem>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  unlockUser: async (id: string): Promise<ApiResponse<AdminUserItem>> => {
    return apiClient<AdminUserItem>(`/users/${id}/unlock`, {
      method: 'POST',
    });
  },
  resetUserPassword: async (id: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
  getUserAudit: async (id: string): Promise<ApiResponse<UserAuditItem[]>> => {
    return apiClient<UserAuditItem[]>(`/users/${id}/audit`);
  },

  // Public Catalog
  getPublicSports: async (query: PaginationQuery = {}): Promise<ApiResponse<PaginatedResponse<PublicSportItem>>> => {
    return apiClient<PaginatedResponse<PublicSportItem>>(
      `/public/sports${buildQueryString(query as Record<string, unknown>)}`
    );
  },
  getPublicSportBySlug: async (slug: string): Promise<ApiResponse<PublicSportItem>> => {
    return apiClient<PublicSportItem>(`/public/sports/${slug}`);
  },
  getPublicTeams: async (query: PaginationQuery = {}): Promise<ApiResponse<PaginatedResponse<PublicTeamItem>>> => {
    return apiClient<PaginatedResponse<PublicTeamItem>>(
      `/public/teams${buildQueryString(query as Record<string, unknown>)}`
    );
  },
  getPublicTeamBySlug: async (slug: string): Promise<ApiResponse<PublicTeamItem>> => {
    return apiClient<PublicTeamItem>(`/public/teams/${slug}`);
  },
  getPublicCoaches: async (query: PaginationQuery = {}): Promise<ApiResponse<PaginatedResponse<PublicCoachItem>>> => {
    return apiClient<PaginatedResponse<PublicCoachItem>>(
      `/public/coaches${buildQueryString(query as Record<string, unknown>)}`
    );
  },
  getPublicCoachById: async (id: string): Promise<ApiResponse<PublicCoachItem>> => {
    return apiClient<PublicCoachItem>(`/public/coaches/${id}`);
  },
};
