// Centralized Tournament Management Service for AthletiQ

export interface RosterPlayer {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  age: number;
  verificationStatus: 'Verified' | 'Pending ID' | 'Medical Required';
}

export interface RegisteredTeam {
  id: string;
  name: string;
  logo: string;
  coachName: string;
  contactEmail: string;
  roster: RosterPlayer[];
  status: 'Approved' | 'Pending Review' | 'Rejected';
  rejectionReason?: string;
  appliedDate: string;
}

export interface TournamentMatch {
  id: string;
  round: string; // e.g. "Group A - Match 1", "Quarter Final 1", "Semi Final 2", "Championship Final"
  stage: 'Group Stage' | 'Quarter Final' | 'Semi Final' | 'Final';
  team1: { name: string; score?: number; logo?: string };
  team2: { name: string; score?: number; logo?: string };
  date: string;
  time: string;
  pitch: string;
  status: 'Upcoming' | 'Live' | 'Completed' | 'Postponed';
  winner?: string;
  referee?: string;
  events?: { time: string; type: 'Goal' | 'Yellow Card' | 'Red Card' | 'Substitution'; player: string; team: string }[];
  stats?: { possession1: number; possession2: number; shots1: number; shots2: number; fouls1: number; fouls2: number };
}

export interface TournamentGroup {
  name: string;
  standings: {
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
  }[];
}

export interface TournamentVenue {
  id: string;
  name: string;
  address: string;
  pitches: string[];
  capacity: string;
  facilities: string[];
  image: string;
}

export interface FullTournamentData {
  id: string;
  name: string;
  sport: string;
  category: 'Academy Championship' | 'Invitational' | 'Open League' | 'National Qualifier';
  ageGroup: 'U14' | 'U16' | 'U18' | 'Senior Elite';
  format: 'Group Stage + Knockout' | 'Single Elimination' | 'Round Robin';
  startDate: string;
  endDate: string;
  datesFormatted: string;
  registrationDeadline: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  venue: string;
  description: string;
  bannerImage: string;
  rulesText: string;
  teams: RegisteredTeam[];
  groups: TournamentGroup[];
  fixtures: TournamentMatch[];
  venues: TournamentVenue[];
  officials: { name: string; role: string; assignedMatches: number }[];
  stats: {
    topScorers: { name: string; team: string; goals: number }[];
    topAssists: { name: string; team: string; assists: number }[];
    cleanSheets: { name: string; team: string; count: number }[];
  };
}

// Initial Mock Tournament Store
const INITIAL_TOURNAMENTS: Record<string, FullTournamentData> = {
  'active-nb-cup-2026': {
    id: 'active-nb-cup-2026',
    name: 'Active NB Cup 2026',
    sport: 'Football',
    category: 'Academy Championship',
    ageGroup: 'U16',
    format: 'Group Stage + Knockout',
    startDate: '2026-10-14',
    endDate: '2026-10-20',
    datesFormatted: 'October 14 - 20, 2026',
    registrationDeadline: 'October 01, 2026',
    status: 'Upcoming',
    venue: 'Moncton Sports Complex • Pitch A, B & Main Arena',
    bannerImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
    description: 'The premier youth academy soccer championship featuring top regional academies, talent scout panels, and live multi-camera broadcast.',
    rulesText: 'Standard FIFA U16 rules apply. 35-minute halves with 10-minute halftime interval. Maximum 18 registered players per roster. 5 substitutions permitted per match across 3 stoppages.',
    teams: [
      {
        id: 'team-1',
        name: 'U16 Strikers',
        logo: '⚽',
        coachName: 'Coach David Vance',
        contactEmail: 'david.vance@athletiq.com',
        status: 'Approved',
        appliedDate: 'Sep 01, 2026',
        roster: [
          { id: 'p-1', name: 'Alex Morgan', jerseyNumber: 9, position: 'Forward', age: 15, verificationStatus: 'Verified' },
          { id: 'p-2', name: 'Liam Anderson', jerseyNumber: 10, position: 'Midfielder', age: 16, verificationStatus: 'Verified' },
          { id: 'p-3', name: 'Noah Miller', jerseyNumber: 1, position: 'Goalkeeper', age: 16, verificationStatus: 'Verified' },
        ],
      },
      {
        id: 'team-2',
        name: 'Victory FC',
        logo: '🛡️',
        coachName: 'Coach Mark Reynolds',
        contactEmail: 'mark@victoryfc.ca',
        status: 'Approved',
        appliedDate: 'Sep 02, 2026',
        roster: [
          { id: 'p-10', name: 'Ethan Hunt', jerseyNumber: 7, position: 'Forward', age: 16, verificationStatus: 'Verified' },
          { id: 'p-11', name: 'Lucas Scott', jerseyNumber: 4, position: 'Defender', age: 16, verificationStatus: 'Verified' },
        ],
      },
      {
        id: 'team-3',
        name: 'Blue Hawks',
        logo: '🦅',
        coachName: 'Coach Sarah Jenkins',
        contactEmail: 's.jenkins@bluehawks.org',
        status: 'Approved',
        appliedDate: 'Sep 03, 2026',
        roster: [
          { id: 'p-20', name: 'Mason Thorne', jerseyNumber: 11, position: 'Winger', age: 15, verificationStatus: 'Verified' },
        ],
      },
      {
        id: 'team-4',
        name: 'Rising Stars Academy',
        logo: '⭐',
        coachName: 'Coach Carlos Rossi',
        contactEmail: 'carlos@risingstars.com',
        status: 'Pending Review',
        appliedDate: 'Sep 04, 2026',
        roster: [
          { id: 'p-30', name: 'Mateo Rossi', jerseyNumber: 10, position: 'Midfielder', age: 15, verificationStatus: 'Pending ID' },
        ],
      },
    ],
    groups: [
      {
        name: 'Group A',
        standings: [
          { teamName: 'U16 Strikers', played: 3, won: 3, drawn: 0, lost: 0, gf: 9, ga: 2, gd: 7, points: 9 },
          { teamName: 'Blue Hawks', played: 3, won: 2, drawn: 0, lost: 1, gf: 6, ga: 4, gd: 2, points: 6 },
          { teamName: 'United Youth', played: 3, won: 1, drawn: 0, lost: 2, gf: 3, ga: 5, gd: -2, points: 3 },
          { teamName: 'Thunder FC', played: 3, won: 0, drawn: 0, lost: 3, gf: 1, ga: 8, gd: -7, points: 0 },
        ],
      },
      {
        name: 'Group B',
        standings: [
          { teamName: 'Victory FC', played: 3, won: 2, drawn: 1, lost: 0, gf: 8, ga: 3, gd: 5, points: 7 },
          { teamName: 'Rising Stars', played: 3, won: 2, drawn: 0, lost: 1, gf: 5, ga: 4, gd: 1, points: 6 },
          { teamName: 'Elite Squad', played: 3, won: 1, drawn: 1, lost: 1, gf: 4, ga: 4, gd: 0, points: 4 },
          { teamName: 'Young Titans', played: 3, won: 0, drawn: 0, lost: 3, gf: 2, ga: 8, gd: -6, points: 0 },
        ],
      },
    ],
    fixtures: [
      {
        id: 'fix-1',
        round: 'Quarter Final 1',
        stage: 'Quarter Final',
        team1: { name: 'U16 Strikers', score: 3 },
        team2: { name: 'Thunder FC', score: 1 },
        date: 'Oct 17, 2026',
        time: '10:00 AM',
        pitch: 'Pitch A (Turf)',
        status: 'Completed',
        winner: 'U16 Strikers',
        referee: 'Chief Referee Arthur Pendelton',
        events: [
          { time: "14'", type: 'Goal', player: 'Alex Morgan', team: 'U16 Strikers' },
          { time: "32'", type: 'Goal', player: 'Liam Anderson', team: 'U16 Strikers' },
          { time: "55'", type: 'Goal', player: 'Kevin Vance', team: 'Thunder FC' },
          { time: "78'", type: 'Goal', player: 'Alex Morgan', team: 'U16 Strikers' },
        ],
        stats: { possession1: 62, possession2: 38, shots1: 14, shots2: 5, fouls1: 6, fouls2: 11 },
      },
      {
        id: 'fix-2',
        round: 'Quarter Final 2',
        stage: 'Quarter Final',
        team1: { name: 'United Youth', score: 0 },
        team2: { name: 'Blue Hawks', score: 2 },
        date: 'Oct 17, 2026',
        time: '12:00 PM',
        pitch: 'Pitch B (Grass)',
        status: 'Completed',
        winner: 'Blue Hawks',
        referee: 'Ref Maria Santos',
        events: [
          { time: "22'", type: 'Goal', player: 'Mason Thorne', team: 'Blue Hawks' },
          { time: "67'", type: 'Goal', player: 'Leo Vance', team: 'Blue Hawks' },
        ],
        stats: { possession1: 45, possession2: 55, shots1: 6, shots2: 12, fouls1: 8, fouls2: 7 },
      },
      {
        id: 'fix-3',
        round: 'Quarter Final 3',
        stage: 'Quarter Final',
        team1: { name: 'Elite Squad', score: 1 },
        team2: { name: 'Rising Stars', score: 2 },
        date: 'Oct 17, 2026',
        time: '02:30 PM',
        pitch: 'Pitch A (Turf)',
        status: 'Completed',
        winner: 'Rising Stars',
        referee: 'Ref Robert Kim',
      },
      {
        id: 'fix-4',
        round: 'Quarter Final 4',
        stage: 'Quarter Final',
        team1: { name: 'Young Titans', score: 0 },
        team2: { name: 'Victory FC', score: 4 },
        date: 'Oct 17, 2026',
        time: '04:30 PM',
        pitch: 'Pitch B (Grass)',
        status: 'Completed',
        winner: 'Victory FC',
        referee: 'Chief Referee Arthur Pendelton',
      },
      {
        id: 'fix-5',
        round: 'Semi Final 1',
        stage: 'Semi Final',
        team1: { name: 'U16 Strikers', score: 2 },
        team2: { name: 'Blue Hawks', score: 1 },
        date: 'Oct 19, 2026',
        time: '11:00 AM',
        pitch: 'Main Stadium Pitch',
        status: 'Completed',
        winner: 'U16 Strikers',
        referee: 'Chief Referee Arthur Pendelton',
        events: [
          { time: "09'", type: 'Goal', player: 'Mason Thorne', team: 'Blue Hawks' },
          { time: "41'", type: 'Goal', player: 'Alex Morgan', team: 'U16 Strikers' },
          { time: "88'", type: 'Goal', player: 'Alex Morgan', team: 'U16 Strikers' },
        ],
        stats: { possession1: 58, possession2: 42, shots1: 15, shots2: 8, fouls1: 9, fouls2: 12 },
      },
      {
        id: 'fix-6',
        round: 'Semi Final 2',
        stage: 'Semi Final',
        team1: { name: 'Rising Stars', score: 1 },
        team2: { name: 'Victory FC', score: 3 },
        date: 'Oct 19, 2026',
        time: '02:00 PM',
        pitch: 'Main Stadium Pitch',
        status: 'Completed',
        winner: 'Victory FC',
        referee: 'Ref Maria Santos',
      },
      {
        id: 'fix-7',
        round: 'Championship Final',
        stage: 'Final',
        team1: { name: 'U16 Strikers' },
        team2: { name: 'Victory FC' },
        date: 'Oct 20, 2026',
        time: '04:00 PM',
        pitch: 'Main Stadium Arena • Championship Pitch',
        status: 'Upcoming',
        referee: 'FIFA Badge Ref David Harrison',
      },
    ],
    venues: [
      {
        id: 'v-1',
        name: 'Moncton Sports Complex • Main Arena',
        address: '400 Russia St, Moncton, NB',
        pitches: ['Championship Field (Hybrid Turf)', 'Pitch A (Synthetic)', 'Pitch B (Natural Grass)'],
        capacity: '5,000 Spectators',
        facilities: ['VAR Replay Booth', 'Biometrics Lab', 'Hydrotherapy Suite', 'VIP Scout Boxes'],
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
      },
    ],
    officials: [
      { name: 'Arthur Pendelton', role: 'Tournament Head Referee', assignedMatches: 6 },
      { name: 'Maria Santos', role: 'Senior Assistant Referee', assignedMatches: 5 },
      { name: 'Robert Kim', role: 'Match Pitch Inspector', assignedMatches: 4 },
    ],
    stats: {
      topScorers: [
        { name: 'Alex Morgan', team: 'U16 Strikers', goals: 8 },
        { name: 'Ethan Hunt', team: 'Victory FC', goals: 6 },
        { name: 'Mason Thorne', team: 'Blue Hawks', goals: 5 },
        { name: 'Mateo Rossi', team: 'Rising Stars', goals: 4 },
      ],
      topAssists: [
        { name: 'Liam Anderson', team: 'U16 Strikers', assists: 7 },
        { name: 'Lucas Scott', team: 'Victory FC', assists: 5 },
      ],
      cleanSheets: [
        { name: 'Noah Miller', team: 'U16 Strikers', count: 3 },
        { name: 'Jordan Croft', team: 'Victory FC', count: 2 },
      ],
    },
  },
  'athletiq-hoops-invitational': {
    id: 'athletiq-hoops-invitational',
    name: 'AthletiQ Basketball Invitational',
    sport: 'Basketball',
    category: 'Invitational',
    ageGroup: 'U18',
    format: 'Single Elimination',
    startDate: '2026-11-05',
    endDate: '2026-11-08',
    datesFormatted: 'November 5 - 8, 2026',
    registrationDeadline: 'October 25, 2026',
    status: 'Upcoming',
    venue: 'AthletiQ Main Arena • Courts 1-3',
    bannerImage: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop',
    description: 'High-octane 4-day hardwood tournament bringing together top prep high school and academy basketball programs.',
    rulesText: 'FIBA U18 official rules. 10-minute quarters, 24-second shot clock.',
    teams: [],
    groups: [],
    fixtures: [],
    venues: [],
    officials: [],
    stats: { topScorers: [], topAssists: [], cleanSheets: [] },
  },
};

class TournamentService {
  private tournaments: Record<string, FullTournamentData> = { ...INITIAL_TOURNAMENTS };
  private listeners: (() => void)[] = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async getTournaments(): Promise<FullTournamentData[]> {
    await new Promise((res) => setTimeout(res, 200));
    return Object.values(this.tournaments);
  }

  public async getTournamentById(id: string): Promise<FullTournamentData> {
    await new Promise((res) => setTimeout(res, 250));
    if (this.tournaments[id]) {
      return this.tournaments[id];
    }
    return this.tournaments['active-nb-cup-2026'];
  }

  public async createTournament(
    newTournament: Omit<FullTournamentData, 'id' | 'teams' | 'groups' | 'fixtures' | 'venues' | 'officials' | 'stats' | 'datesFormatted'>
  ): Promise<FullTournamentData> {
    await new Promise((res) => setTimeout(res, 400));
    const id = `tourn-${Date.now()}`;
    const created: FullTournamentData = {
      ...newTournament,
      id,
      datesFormatted: `${newTournament.startDate} to ${newTournament.endDate}`,
      teams: [],
      groups: [],
      fixtures: [],
      venues: [],
      officials: [],
      stats: { topScorers: [], topAssists: [], cleanSheets: [] },
    };
    this.tournaments[id] = created;
    this.notify();
    return created;
  }

  public async registerTeam(tournamentId: string, team: Omit<RegisteredTeam, 'id' | 'status' | 'appliedDate'>): Promise<RegisteredTeam> {
    await new Promise((res) => setTimeout(res, 300));
    const tournament = this.tournaments[tournamentId] || this.tournaments['active-nb-cup-2026'];
    const registered: RegisteredTeam = {
      ...team,
      id: `team-${Date.now()}`,
      status: 'Pending Review',
      appliedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
    tournament.teams.push(registered);
    this.notify();
    return registered;
  }

  public async updateTeamStatus(tournamentId: string, teamId: string, status: 'Approved' | 'Rejected', reason?: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 250));
    const tournament = this.tournaments[tournamentId] || this.tournaments['active-nb-cup-2026'];
    const team = tournament.teams.find((t) => t.id === teamId);
    if (team) {
      team.status = status;
      if (reason) team.rejectionReason = reason;
      this.notify();
    }
  }

  public async updateMatchStatus(tournamentId: string, matchId: string, status: TournamentMatch['status'], score1?: number, score2?: number): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    const tournament = this.tournaments[tournamentId] || this.tournaments['active-nb-cup-2026'];
    const match = tournament.fixtures.find((m) => m.id === matchId);
    if (match) {
      match.status = status;
      if (score1 !== undefined) match.team1.score = score1;
      if (score2 !== undefined) match.team2.score = score2;
      if (score1 !== undefined && score2 !== undefined) {
        if (score1 > score2) match.winner = match.team1.name;
        else if (score2 > score1) match.winner = match.team2.name;
      }
      this.notify();
    }
  }
}

export const tournamentService = new TournamentService();
