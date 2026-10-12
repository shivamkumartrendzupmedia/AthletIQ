import { redactText } from './redaction.js';

interface PublicInfoResult {
  activeAthletes: number;
  activeCoaches: number;
  activeTeams: number;
  sportsCount: number;
  nextTournaments: Array<{
    name: string;
    sport: string;
    category: string;
    format: string;
    startDate: string | Date;
    status: string;
  }>;
  liveMatches: Array<{
    tournament: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    period: string;
  }>;
}

interface StandingsResult {
  status?: string;
  tournamentName: string;
  standings: Array<{
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }>;
  topScorer?: {
    name: string;
    goals: number;
  } | null;
}

interface NotificationsResult {
  unreadNotifications: number;
}

interface ProfileSummaryResult {
  status: string;
  name: string;
  team: string;
  sport: string;
  jerseyNumber: number | null;
  position: string | null;
  statusFlag: string;
}

interface AttendanceResult {
  status: string;
  attendanceRate: number | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

interface UpcomingSessionsResult {
  total: number;
  sessions: Array<{
    title: string;
    startsAt: string;
    venue: string;
    type: string;
    teamName: string;
  }>;
}

interface GoalsResult {
  status: string;
  total: number;
  active: number;
  achieved: number;
  goals: Array<{
    title: string;
    status: string;
    progress: number;
    targetDate: string | null;
  }>;
}

interface FeedbackSummaryResult {
  status: string;
  totalCount: number;
  feedbacks: Array<{
    coachName: string;
    type: string;
    text: string;
    date: string;
  }>;
}

interface LatestAssessmentResult {
  status: string;
  message?: string;
  overall: number;
  date: string;
  assessedBy: string;
  scores: {
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
  };
}

interface TournamentPerformanceResult {
  status: string;
  tournamentsCount: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface NextMatchesResult {
  total: number;
  matches: Array<{
    tournament: string;
    opponent: string;
    homeOrAway: string;
    scheduledAt: string;
    venue: string;
  }>;
}

interface CoachTeamsResult {
  totalTeams: number;
  teams: Array<{
    name: string;
    sport: string;
    athleteCount: number;
  }>;
}

interface TeamRosterResult {
  status: string;
  totalAthletes: number;
  roster: Array<{
    name: string;
    team: string;
    jerseyNumber: number | null;
    position: string | null;
  }>;
}

interface TeamAttendanceResult {
  status: string;
  attendanceRate: number | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  totalRecords: number;
  athleteCount: number;
}

interface AthleteDevResult {
  status: string;
  athleteName: string;
  teamName: string;
  sportName: string;
  attendanceRate: number | null;
  latestOverallScore: number | null;
  goalsCount: number;
  feedbackCount: number;
}

interface OrganizerTournamentsResult {
  total: number;
  tournaments: Array<{
    name: string;
    sport: string;
    category: string;
    format: string;
    status: string;
    startDate: string;
    endDate: string;
    approvedTeams: number;
  }>;
}

interface RegistrationsSummaryResult {
  totalRegistrations: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface UpcomingMatchesResult {
  total: number;
  matches: Array<{
    tournament: string;
    homeTeam: string;
    awayTeam: string;
    scheduledAt: string;
    venue: string;
  }>;
}

interface AssignedMatchesResult {
  total: number;
  matches: Array<{
    tournament: string;
    homeTeam: string;
    awayTeam: string;
    status: string;
    scheduledAt: string;
    venue: string;
  }>;
}

interface AcademyOverviewResult {
  userCounts: {
    Admin: number;
    Coach: number;
    Athlete: number;
    Organizer: number;
  };
  activeAthletes: number;
  teams: number;
  coaches: number;
  upcomingSessions: number;
  tournaments: {
    Draft: number;
    'Registration Open': number;
    'In Progress': number;
    Completed: number;
    Cancelled: number;
  };
  pendingRegistrations: number;
  unreadContactMessages: number;
}

interface GenericResult {
  status?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Deterministic plain-text response templates for chatbot tool outputs.
 */
export function formatToolResponse(toolName: string, rawData: unknown): string {
  if (!rawData || typeof rawData !== 'object') {
    return 'I don\'t have that information.';
  }

  const generic = rawData as GenericResult;
  if (generic.status === 'not_available') {
    return redactText(generic.message || 'I don\'t have that information.');
  }

  let text = '';

  switch (toolName) {
    case 'getPublicInfo': {
      const data = rawData as PublicInfoResult;
      const parts: string[] = [
        '--- Athletiq Academy Overview ---',
        `Active Athletes: ${data.activeAthletes}`,
        `Active Coaches: ${data.activeCoaches}`,
        `Active Teams: ${data.activeTeams}`,
        `Sports Programs: ${data.sportsCount}`,
      ];

      if (data.nextTournaments && data.nextTournaments.length > 0) {
        parts.push('\nUpcoming Tournaments:');
        for (const t of data.nextTournaments) {
          parts.push(`- ${t.name} (${t.sport}, ${t.category}): Starts ${new Date(t.startDate).toLocaleDateString()}`);
        }
      }

      if (data.liveMatches && data.liveMatches.length > 0) {
        parts.push('\nLive Matches Now:');
        for (const m of data.liveMatches) {
          parts.push(`- [${m.tournament}] ${m.homeTeam} ${m.homeScore} - ${m.awayScore} ${m.awayTeam} (${m.period})`);
        }
      } else {
        parts.push('\nNo matches currently live.');
      }

      text = parts.join('\n');
      break;
    }

    case 'getStandings': {
      const data = rawData as StandingsResult;
      if (data.status === 'not_available' || !data.standings || data.standings.length === 0) {
        text = `No standings currently available for "${data.tournamentName || 'tournament'}".`;
        break;
      }

      const parts: string[] = [`--- Standings: ${data.tournamentName} ---`];
      parts.push('Pos | Team | P | W | D | L | GF | GA | GD | Pts');
      parts.push('-----------------------------------------------');
      data.standings.forEach((s, idx: number) => {
        parts.push(
          `${idx + 1}. ${s.teamName} | ${s.played} | ${s.won} | ${s.drawn} | ${s.lost} | ${s.goalsFor} | ${s.goalsAgainst} | ${s.goalDifference} | ${s.points}`
        );
      });

      if (data.topScorer) {
        parts.push(`\nTop Scorer: ${data.topScorer.name} - ${data.topScorer.goals} goals`);
      }

      text = parts.join('\n');
      break;
    }

    case 'getMyNotificationsSummary': {
      const data = rawData as NotificationsResult;
      const count = data.unreadNotifications ?? 0;
      text = count === 0
        ? 'You have no unread notifications.'
        : `You have ${count} unread notification${count === 1 ? '' : 's'}.`;
      break;
    }

    case 'getMyProfileSummary': {
      const data = rawData as ProfileSummaryResult;
      text = [
        '--- Athlete Profile ---',
        `Name: ${data.name}`,
        `Team: ${data.team}`,
        `Sport: ${data.sport}`,
        data.jerseyNumber !== null ? `Jersey Number: #${data.jerseyNumber}` : null,
        data.position ? `Position: ${data.position}` : null,
        `Status: ${data.statusFlag}`,
      ]
        .filter(Boolean)
        .join('\n');
      break;
    }

    case 'getMyAttendance': {
      const data = rawData as AttendanceResult;
      const rate = data.attendanceRate !== null ? `${data.attendanceRate}%` : 'N/A';
      text = [
        '--- Training Attendance Summary ---',
        `Attendance Rate: ${rate}`,
        `Total Sessions: ${data.total}`,
        `Present: ${data.present}`,
        `Late: ${data.late}`,
        `Excused: ${data.excused}`,
        `Absent: ${data.absent}`,
      ].join('\n');
      break;
    }

    case 'getMyUpcomingSessions': {
      const data = rawData as UpcomingSessionsResult;
      if (!data.sessions || data.sessions.length === 0) {
        text = 'No upcoming training sessions currently scheduled.';
        break;
      }
      const parts = ['--- Upcoming Training Sessions ---'];
      for (const s of data.sessions) {
        const timeStr = new Date(s.startsAt).toLocaleString();
        parts.push(`- ${s.title} (${s.type}) | ${s.teamName} | ${s.venue} | ${timeStr}`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyGoals': {
      const data = rawData as GoalsResult;
      if (!data.goals || data.goals.length === 0) {
        text = 'You currently have no development goals registered.';
        break;
      }
      const parts = [
        `--- Development Goals (${data.active} active / ${data.total} total) ---`,
      ];
      for (const g of data.goals) {
        const target = g.targetDate ? ` (Target: ${g.targetDate})` : '';
        parts.push(`- [${g.status}] ${g.title} - ${g.progress}%${target}`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyFeedbackSummary': {
      const data = rawData as FeedbackSummaryResult;
      if (!data.feedbacks || data.feedbacks.length === 0) {
        text = 'No coach feedback notes have been recorded yet.';
        break;
      }
      const parts = [`--- Coach Feedback (Total: ${data.totalCount}) ---`];
      for (const fb of data.feedbacks) {
        parts.push(`- [${fb.date}] ${fb.type} by ${fb.coachName}: "${fb.text}"`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyLatestAssessment': {
      const data = rawData as LatestAssessmentResult;
      if (data.status === 'none') {
        text = data.message || 'No skill assessments recorded.';
        break;
      }
      const parts = [
        `--- Latest Skill Assessment (Overall: ${data.overall}/100) ---`,
        `Assessed On: ${data.date} by ${data.assessedBy}`,
        `Pace: ${data.scores.pace}/100 | Shooting: ${data.scores.shooting}/100 | Passing: ${data.scores.passing}/100`,
        `Dribbling: ${data.scores.dribbling}/100 | Defending: ${data.scores.defending}/100 | Stamina: ${data.scores.stamina}/100`,
        `Agility: ${data.scores.agility}/100 | Decision Making: ${data.scores.decisionMaking}/100`,
      ];
      text = parts.join('\n');
      break;
    }

    case 'getMyTournamentPerformance': {
      const data = rawData as TournamentPerformanceResult;
      text = [
        '--- Tournament Performance ---',
        `Tournaments Entered: ${data.tournamentsCount}`,
        `Matches Played: ${data.matchesPlayed}`,
        `Record: ${data.wins}W - ${data.draws}D - ${data.losses}L`,
        `Goals Scored: ${data.goalsFor}`,
        `Goals Conceded: ${data.goalsAgainst}`,
      ].join('\n');
      break;
    }

    case 'getMyNextMatches': {
      const data = rawData as NextMatchesResult;
      if (!data.matches || data.matches.length === 0) {
        text = 'No upcoming matches currently scheduled.';
        break;
      }
      const parts = ['--- Upcoming Matches ---'];
      for (const m of data.matches) {
        const dateStr = new Date(m.scheduledAt).toLocaleString();
        parts.push(`- [${m.tournament}] vs ${m.opponent} (${m.homeOrAway}) at ${m.venue} on ${dateStr}`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyTeams': {
      const data = rawData as CoachTeamsResult;
      if (!data.teams || data.teams.length === 0) {
        text = 'No teams currently assigned under your coaching profile.';
        break;
      }
      const parts = [`--- Coaching Teams (${data.totalTeams}) ---`];
      for (const t of data.teams) {
        parts.push(`- ${t.name} (${t.sport}): ${t.athleteCount} athletes`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyTeamRoster': {
      const data = rawData as TeamRosterResult;
      if (!data.roster || data.roster.length === 0) {
        text = 'No athletes found in the specified team roster.';
        break;
      }
      const parts = [`--- Team Roster (${data.totalAthletes} athletes) ---`];
      for (const a of data.roster) {
        const num = a.jerseyNumber !== null ? ` #${a.jerseyNumber}` : '';
        const pos = a.position ? ` (${a.position})` : '';
        parts.push(`- ${a.name}${num}${pos} [${a.team}]`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyTeamAttendance': {
      const data = rawData as TeamAttendanceResult;
      const rate = data.attendanceRate !== null ? `${data.attendanceRate}%` : 'N/A';
      text = [
        '--- Team Attendance Overview ---',
        `Overall Attendance Rate: ${rate}`,
        `Rostered Athletes: ${data.athleteCount}`,
        `Present Records: ${data.present}`,
        `Late Records: ${data.late}`,
        `Absent Records: ${data.absent}`,
        `Excused Records: ${data.excused}`,
      ].join('\n');
      break;
    }

    case 'getAthleteDevelopmentSummary': {
      const data = rawData as AthleteDevResult;
      const rate = data.attendanceRate !== null ? `${data.attendanceRate}%` : 'N/A';
      const score = data.latestOverallScore !== null ? `${data.latestOverallScore}/100` : 'None';
      text = [
        `--- Athlete Development: ${data.athleteName} ---`,
        `Team: ${data.teamName} (${data.sportName})`,
        `Attendance Rate: ${rate}`,
        `Latest Assessment Score: ${score}`,
        `Active Goals: ${data.goalsCount}`,
        `Feedback Entries: ${data.feedbackCount}`,
      ].join('\n');
      break;
    }

    case 'getMyTournaments': {
      const data = rawData as OrganizerTournamentsResult;
      if (!data.tournaments || data.tournaments.length === 0) {
        text = 'You have not created or managed any tournaments yet.';
        break;
      }
      const parts = [`--- Your Organized Tournaments (${data.total}) ---`];
      for (const t of data.tournaments) {
        parts.push(`- ${t.name} [${t.status}] (${t.sport}, ${t.format}) - ${t.approvedTeams} approved teams`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyRegistrationsSummary': {
      const data = rawData as RegistrationsSummaryResult;
      text = [
        '--- Tournament Registrations Summary ---',
        `Total Applications: ${data.totalRegistrations}`,
        `Pending Review: ${data.pending}`,
        `Approved: ${data.approved}`,
        `Rejected: ${data.rejected}`,
      ].join('\n');
      break;
    }

    case 'getMyUpcomingMatches': {
      const data = rawData as UpcomingMatchesResult;
      if (!data.matches || data.matches.length === 0) {
        text = 'No upcoming matches scheduled in your tournaments.';
        break;
      }
      const parts = [`--- Upcoming Tournament Matches (${data.total}) ---`];
      for (const m of data.matches) {
        const timeStr = new Date(m.scheduledAt).toLocaleString();
        parts.push(`- [${m.tournament}] ${m.homeTeam} vs ${m.awayTeam} at ${m.venue} (${timeStr})`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getMyAssignedMatches': {
      const data = rawData as AssignedMatchesResult;
      if (!data.matches || data.matches.length === 0) {
        text = '--- Official Match Assignments ---\nYou have no assigned matches scheduled.';
        break;
      }
      const parts = [`--- Official Match Assignments (${data.total}) ---`];
      for (const m of data.matches) {
        const timeStr = new Date(m.scheduledAt).toLocaleString();
        parts.push(`- [${m.status}] ${m.homeTeam} vs ${m.awayTeam} | ${m.tournament} | ${m.venue} | ${timeStr}`);
      }
      text = parts.join('\n');
      break;
    }

    case 'getAcademyOverview': {
      const data = rawData as AcademyOverviewResult;
      text = [
        '--- Academy Management Overview ---',
        `User Accounts: ${data.userCounts.Admin} Admins, ${data.userCounts.Coach} Coaches, ${data.userCounts.Athlete} Athletes, ${data.userCounts.Organizer} Organizers`,
        `Active Athletes: ${data.activeAthletes}`,
        `Active Teams: ${data.teams}`,
        `Active Coaches: ${data.coaches}`,
        `Upcoming Sessions: ${data.upcomingSessions}`,
        `Pending Registrations: ${data.pendingRegistrations}`,
        `Unread Contact Messages: ${data.unreadContactMessages}`,
        `Tournaments: ${data.tournaments['In Progress']} in progress, ${data.tournaments['Registration Open']} registration open, ${data.tournaments.Completed} completed`,
      ].join('\n');
      break;
    }

    case 'getPendingRegistrationsCount': {
      const data = rawData as { pendingRegistrationsCount: number };
      const c = data.pendingRegistrationsCount ?? 0;
      text = `There are ${c} pending tournament registration${c === 1 ? '' : 's'} awaiting review.`;
      break;
    }

    case 'getUnreadContactMessagesCount': {
      const data = rawData as { unreadContactMessagesCount: number };
      const c = data.unreadContactMessagesCount ?? 0;
      text = `There are ${c} unread contact message${c === 1 ? '' : 's'} awaiting review.`;
      break;
    }

    default:
      text = 'I don\'t have that information.';
  }

  return redactText(text);
}
