export interface Tournament {
  id: string;
  name: string;
  sport: string;
  ageGroup: string;
  dates: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  venue: string;
  teamsCount: number;
  matchesCount: number;
  bannerImage: string;
  description: string;
  groups: { name: string; teams: string[] }[];
  knockoutMatches: {
    round: string;
    team1: string;
    score1?: number;
    team2: string;
    score2?: number;
    winner?: string;
  }[];
}

export const tournamentsData: Tournament[] = [
  {
    id: 'active-nb-cup-2026',
    name: 'Active NB Cup 2026',
    sport: 'Football',
    ageGroup: 'U16 / U18',
    dates: 'October 14 - 20, 2026',
    status: 'Upcoming',
    venue: 'Moncton Sports Complex • Pitch A & B',
    teamsCount: 24,
    matchesCount: 48,
    bannerImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
    description: 'The premier youth academy soccer championship of the season featuring top regional academies, scout panels, and live multi-camera broadcast.',
    groups: [
      { name: 'Group A', teams: ['U16 Strikers', 'Thunder FC', 'United Youth', 'Blue Hawks'] },
      { name: 'Group B', teams: ['Elite Squad', 'Rising Stars', 'Young Titans', 'Victory FC'] },
    ],
    knockoutMatches: [
      { round: 'Quarter Final', team1: 'U16 Strikers', score1: 3, team2: 'Thunder FC', score2: 1, winner: 'U16 Strikers' },
      { round: 'Quarter Final', team1: 'United Youth', score1: 0, team2: 'Blue Hawks', score2: 2, winner: 'Blue Hawks' },
      { round: 'Quarter Final', team1: 'Elite Squad', score1: 1, team2: 'Rising Stars', score2: 2, winner: 'Rising Stars' },
      { round: 'Quarter Final', team1: 'Young Titans', score1: 0, team2: 'Victory FC', score2: 4, winner: 'Victory FC' },
      { round: 'Semi Final', team1: 'U16 Strikers', score1: 2, team2: 'Blue Hawks', score2: 1, winner: 'U16 Strikers' },
      { round: 'Semi Final', team1: 'Rising Stars', score1: 1, team2: 'Victory FC', score2: 3, winner: 'Victory FC' },
      { round: 'Final', team1: 'U16 Strikers', team2: 'Victory FC' },
    ],
  },
  {
    id: 'athletiq-hoops-invitational',
    name: 'AthletiQ Basketball Invitational',
    sport: 'Basketball',
    ageGroup: 'U18 Boys & Girls',
    dates: 'November 5 - 8, 2026',
    status: 'Upcoming',
    venue: 'AthletiQ Main Arena • Courts 1-3',
    teamsCount: 16,
    matchesCount: 32,
    bannerImage: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop',
    description: 'High-octane 4-day hardwood tournament bringing together the top prep high school and academy basketball teams.',
    groups: [
      { name: 'Pool 1', teams: ['U18 Hoops Elite', 'Metros Basketball', 'Northside Flyers', 'Apex Ballers'] },
    ],
    knockoutMatches: [],
  },
  {
    id: 'summer-slam-tennis-open',
    name: 'Summer Slam Tennis Open 2026',
    sport: 'Tennis',
    ageGroup: 'Junior Ranking (U14-U18)',
    dates: 'August 10 - 15, 2026',
    status: 'Completed',
    venue: 'AthletiQ Clay Tennis Center',
    teamsCount: 32,
    matchesCount: 64,
    bannerImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop',
    description: 'Official UTR & National Ranking event held under championship conditions with ball crews and electronic line calling.',
    groups: [],
    knockoutMatches: [
      { round: 'Final', team1: 'Sophia Chen', score1: 2, team2: 'Maria Santos', score2: 0, winner: 'Sophia Chen' },
    ],
  },
];
