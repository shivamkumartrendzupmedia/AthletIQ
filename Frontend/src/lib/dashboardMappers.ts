import type {
  AdminDashboardOverview,
  CoachDashboardOverview,
  AthleteDashboardOverview,
  OrganizerDashboardOverview,
  OfficialDashboardOverview,
} from '../services/academyApi';

/**
 * Formats a numeric value safely:
 * - If value is null or undefined: returns '-' (missing data placeholder)
 * - If value is a valid finite number: returns its string representation (including '0')
 */
export function formatCardMetric(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '-';
  }
  return String(val);
}

export interface AdminDashboardCards {
  totalUsers: string;
  totalUsersRaw: number | null;
  activeAthletes: string;
  activeAthletesRaw: number | null;
  activeCoaches: string;
  activeCoachesRaw: number | null;
  activeTeams: string;
  activeTeamsRaw: number | null;
  upcomingSessions: string;
  upcomingSessionsRaw: number | null;
  unreadInquiries: string;
  unreadInquiriesRaw: number | null;
  pendingRegistrations: string;
  pendingRegistrationsRaw: number | null;
}

export function mapAdminDashboardCards(
  overview: AdminDashboardOverview | null | undefined
): AdminDashboardCards {
  if (!overview) {
    return {
      totalUsers: '-',
      totalUsersRaw: null,
      activeAthletes: '-',
      activeAthletesRaw: null,
      activeCoaches: '-',
      activeCoachesRaw: null,
      activeTeams: '-',
      activeTeamsRaw: null,
      upcomingSessions: '-',
      upcomingSessionsRaw: null,
      unreadInquiries: '-',
      unreadInquiriesRaw: null,
      pendingRegistrations: '-',
      pendingRegistrationsRaw: null,
    };
  }

  // Calculate total users by summing available role counts or using explicit total
  let totalUsersRaw: number | null = null;
  if (overview.userCounts && typeof overview.userCounts === 'object') {
    if (typeof overview.userCounts.total === 'number') {
      totalUsersRaw = overview.userCounts.total;
    } else {
      const adminCount = typeof overview.userCounts.Admin === 'number' ? overview.userCounts.Admin : 0;
      const coachCount = typeof overview.userCounts.Coach === 'number' ? overview.userCounts.Coach : 0;
      const athleteCount = typeof overview.userCounts.Athlete === 'number' ? overview.userCounts.Athlete : 0;
      const organizerCount = typeof overview.userCounts.Organizer === 'number' ? overview.userCounts.Organizer : 0;
      totalUsersRaw = adminCount + coachCount + athleteCount + organizerCount;
    }
  }

  const activeAthletesRaw = typeof overview.activeAthletes === 'number' ? overview.activeAthletes : null;
  const activeCoachesRaw = typeof overview.coaches === 'number' ? overview.coaches : null;
  const activeTeamsRaw = typeof overview.teams === 'number' ? overview.teams : null;
  const upcomingSessionsRaw = typeof overview.upcomingSessions === 'number' ? overview.upcomingSessions : null;
  const unreadInquiriesRaw = typeof overview.unreadContactMessages === 'number' ? overview.unreadContactMessages : null;
  const pendingRegistrationsRaw = typeof overview.pendingRegistrations === 'number' ? overview.pendingRegistrations : null;

  return {
    totalUsers: formatCardMetric(totalUsersRaw),
    totalUsersRaw,
    activeAthletes: formatCardMetric(activeAthletesRaw),
    activeAthletesRaw,
    activeCoaches: formatCardMetric(activeCoachesRaw),
    activeCoachesRaw,
    activeTeams: formatCardMetric(activeTeamsRaw),
    activeTeamsRaw,
    upcomingSessions: formatCardMetric(upcomingSessionsRaw),
    upcomingSessionsRaw,
    unreadInquiries: formatCardMetric(unreadInquiriesRaw),
    unreadInquiriesRaw,
    pendingRegistrations: formatCardMetric(pendingRegistrationsRaw),
    pendingRegistrationsRaw,
  };
}

export interface CoachDashboardCards {
  assignedTeams: string;
  assignedTeamsRaw: number | null;
  rosteredAthletes: string;
  rosteredAthletesRaw: number | null;
  upcomingDrills: string;
  upcomingDrillsRaw: number | null;
  attendanceRate: string;
  attendanceRateRaw: number | null;
}

export function mapCoachDashboardCards(
  overview: CoachDashboardOverview | null | undefined
): CoachDashboardCards {
  if (!overview) {
    return {
      assignedTeams: '-',
      assignedTeamsRaw: null,
      rosteredAthletes: '-',
      rosteredAthletesRaw: null,
      upcomingDrills: '-',
      upcomingDrillsRaw: null,
      attendanceRate: '-',
      attendanceRateRaw: null,
    };
  }

  const assignedTeamsRaw = Array.isArray(overview.teams) ? overview.teams.length : null;
  const rosteredAthletesRaw = Array.isArray(overview.teams)
    ? overview.teams.reduce((acc, t) => acc + (typeof t.athleteCount === 'number' ? t.athleteCount : 0), 0)
    : null;
  const upcomingDrillsRaw = Array.isArray(overview.nextSessions) ? overview.nextSessions.length : null;
  const attendanceRateRaw = typeof overview.attendanceRate === 'number' ? overview.attendanceRate : null;

  return {
    assignedTeams: formatCardMetric(assignedTeamsRaw),
    assignedTeamsRaw,
    rosteredAthletes: formatCardMetric(rosteredAthletesRaw),
    rosteredAthletesRaw,
    upcomingDrills: formatCardMetric(upcomingDrillsRaw),
    upcomingDrillsRaw,
    attendanceRate: attendanceRateRaw !== null ? `${attendanceRateRaw}%` : '-',
    attendanceRateRaw,
  };
}

export interface AthleteDashboardCards {
  attendanceRate: string;
  attendanceRateRaw: number | null;
  activeGoals: string;
  activeGoalsRaw: number | null;
  coachFeedback: string;
  coachFeedbackRaw: number | null;
  nextMatches: string;
  nextMatchesRaw: number | null;
}

export function mapAthleteDashboardCards(
  overview: AthleteDashboardOverview | null | undefined
): AthleteDashboardCards {
  if (!overview) {
    return {
      attendanceRate: '-',
      attendanceRateRaw: null,
      activeGoals: '-',
      activeGoalsRaw: null,
      coachFeedback: '-',
      coachFeedbackRaw: null,
      nextMatches: '-',
      nextMatchesRaw: null,
    };
  }

  const attendanceRateRaw = typeof overview.attendanceRate === 'number' ? overview.attendanceRate : null;
  const activeGoalsRaw = typeof overview.activeGoalsCount === 'number' ? overview.activeGoalsCount : null;
  const coachFeedbackRaw = typeof overview.unacknowledgedFeedbackCount === 'number' ? overview.unacknowledgedFeedbackCount : null;
  const nextMatchesRaw = Array.isArray(overview.nextMatches) ? overview.nextMatches.length : null;

  return {
    attendanceRate: attendanceRateRaw !== null ? `${attendanceRateRaw}%` : '-',
    attendanceRateRaw,
    activeGoals: formatCardMetric(activeGoalsRaw),
    activeGoalsRaw,
    coachFeedback: formatCardMetric(coachFeedbackRaw),
    coachFeedbackRaw,
    nextMatches: formatCardMetric(nextMatchesRaw),
    nextMatchesRaw,
  };
}

export interface OrganizerDashboardCards {
  totalTournaments: string;
  totalTournamentsRaw: number | null;
  registrationOpen: string;
  registrationOpenRaw: number | null;
  pendingRegistrations: string;
  pendingRegistrationsRaw: number | null;
  inProgressTournaments: string;
  inProgressTournamentsRaw: number | null;
  upcomingMatches: string;
  upcomingMatchesRaw: number | null;
}

export function mapOrganizerDashboardCards(
  overview: OrganizerDashboardOverview | null | undefined
): OrganizerDashboardCards {
  if (!overview) {
    return {
      totalTournaments: '-',
      totalTournamentsRaw: null,
      registrationOpen: '-',
      registrationOpenRaw: null,
      pendingRegistrations: '-',
      pendingRegistrationsRaw: null,
      inProgressTournaments: '-',
      inProgressTournamentsRaw: null,
      upcomingMatches: '-',
      upcomingMatchesRaw: null,
    };
  }

  let totalTournamentsRaw: number | null = null;
  let registrationOpenRaw: number | null = null;
  let inProgressTournamentsRaw: number | null = null;

  if (overview.tournaments && typeof overview.tournaments === 'object') {
    const counts = Object.values(overview.tournaments).filter((v): v is number => typeof v === 'number');
    totalTournamentsRaw = counts.reduce((acc, c) => acc + c, 0);
    registrationOpenRaw = typeof overview.tournaments['Registration Open'] === 'number' ? overview.tournaments['Registration Open'] : 0;
    inProgressTournamentsRaw = typeof overview.tournaments['In Progress'] === 'number' ? overview.tournaments['In Progress'] : 0;
  }

  const pendingRegistrationsRaw = typeof overview.pendingRegistrations === 'number' ? overview.pendingRegistrations : null;
  const upcomingMatchesRaw = Array.isArray(overview.nextMatches) ? overview.nextMatches.length : null;

  return {
    totalTournaments: formatCardMetric(totalTournamentsRaw),
    totalTournamentsRaw,
    registrationOpen: formatCardMetric(registrationOpenRaw),
    registrationOpenRaw,
    pendingRegistrations: formatCardMetric(pendingRegistrationsRaw),
    pendingRegistrationsRaw,
    inProgressTournaments: formatCardMetric(inProgressTournamentsRaw),
    inProgressTournamentsRaw,
    upcomingMatches: formatCardMetric(upcomingMatchesRaw),
    upcomingMatchesRaw,
  };
}

export interface OfficialDashboardCards {
  totalAssigned: string;
  totalAssignedRaw: number | null;
  upcoming: string;
  upcomingRaw: number | null;
  assignedTournaments: string;
  assignedTournamentsRaw: number | null;
}

export function mapOfficialDashboardCards(
  overview: OfficialDashboardOverview | null | undefined
): OfficialDashboardCards {
  if (!overview || !Array.isArray(overview.matches)) {
    return {
      totalAssigned: '-',
      totalAssignedRaw: null,
      upcoming: '-',
      upcomingRaw: null,
      assignedTournaments: '-',
      assignedTournamentsRaw: null,
    };
  }

  const totalAssignedRaw = overview.matches.length;
  const upcomingRaw = overview.matches.filter((m) => {
    return typeof m.scheduledAt === 'string' && m.scheduledAt.length > 0;
  }).length;
  const tournaments = new Set(
    overview.matches
      .map((m) => m.tournamentName)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
  );
  const assignedTournamentsRaw = tournaments.size;

  return {
    totalAssigned: formatCardMetric(totalAssignedRaw),
    totalAssignedRaw,
    upcoming: formatCardMetric(upcomingRaw),
    upcomingRaw,
    assignedTournaments: formatCardMetric(assignedTournamentsRaw),
    assignedTournamentsRaw,
  };
}

/**
 * Validates that an overview payload object contains all expected top-level keys for its role.
 */
export function validateOverviewKeys(
  role: 'Admin' | 'Coach' | 'Athlete' | 'Organizer' | 'Official',
  payload: Record<string, unknown>
): { valid: boolean; missingKeys: string[] } {
  const expectedKeysByRole: Record<string, string[]> = {
    Admin: [
      'role',
      'userCounts',
      'activeAthletes',
      'teams',
      'coaches',
      'upcomingSessions',
      'tournaments',
      'pendingRegistrations',
      'unreadContactMessages',
    ],
    Coach: ['role', 'teams', 'nextSessions', 'attendanceRate'],
    Athlete: [
      'role',
      'displayName',
      'teamName',
      'attendanceRate',
      'nextSessions',
      'latestAssessmentOverallScore',
      'activeGoalsCount',
      'unacknowledgedFeedbackCount',
      'nextMatches',
    ],
    Organizer: ['role', 'tournaments', 'pendingRegistrations', 'nextMatches'],
    Official: ['role', 'matches'],
  };

  const expected = expectedKeysByRole[role] || [];
  const missingKeys = expected.filter((k) => !(k in payload));
  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
}
