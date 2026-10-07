export interface Team {
  id: string;
  name: string;
  sport: string;
  ageGroup: string;
  coachName: string;
  coachId: string;
  playersCount: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: string;
  image: string;
  recentForm: ('W' | 'D' | 'L')[];
  rosterSnippet: { name: string; position: string; number: number; ovr: number }[];
}

export const teamsData: Team[] = [
  {
    id: 'u16-strikers',
    name: 'U16 Strikers',
    sport: 'Football',
    ageGroup: 'U16',
    coachName: 'David Vance',
    coachId: 'coach-1',
    playersCount: 18,
    matchesPlayed: 24,
    wins: 17,
    draws: 4,
    losses: 3,
    winRate: '70.8%',
    image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=800&auto=format&fit=crop',
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    rosterSnippet: [
      { name: 'Alex Morgan', position: 'Forward', number: 9, ovr: 87 },
      { name: 'Liam Anderson', position: 'Midfielder', number: 10, ovr: 84 },
      { name: 'Noah Williams', position: 'Defender', number: 4, ovr: 82 },
      { name: 'Ethan Brown', position: 'Goalkeeper', number: 1, ovr: 85 },
    ],
  },
  {
    id: 'u18-hoops-elite',
    name: 'U18 Hoops Elite',
    sport: 'Basketball',
    ageGroup: 'U18',
    coachName: 'Emily Carter',
    coachId: 'coach-2',
    playersCount: 12,
    matchesPlayed: 20,
    wins: 16,
    draws: 0,
    losses: 4,
    winRate: '80.0%',
    image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=800&auto=format&fit=crop',
    recentForm: ['W', 'W', 'L', 'W', 'W'],
    rosterSnippet: [
      { name: 'Marcus Johnson', position: 'Point Guard', number: 3, ovr: 89 },
      { name: 'Tariq Al-Mansoor', position: 'Shooting Guard', number: 11, ovr: 86 },
      { name: 'Jason Miller', position: 'Power Forward', number: 23, ovr: 88 },
    ],
  },
  {
    id: 'aqua-elite-squad',
    name: 'Aqua Elite Squad',
    sport: 'Swimming',
    ageGroup: 'Junior Elite',
    coachName: 'Sara Martinez',
    coachId: 'coach-4',
    playersCount: 15,
    matchesPlayed: 12,
    wins: 10,
    draws: 0,
    losses: 2,
    winRate: '83.3%',
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop',
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    rosterSnippet: [
      { name: 'Chloe Vance', position: 'Freestyle / Fly', number: 5, ovr: 91 },
      { name: 'Lucas Scott', position: 'Backstroke', number: 2, ovr: 86 },
    ],
  },
  {
    id: 'tennis-pro-elites',
    name: 'Tennis Pro Elites',
    sport: 'Tennis',
    ageGroup: 'U18',
    coachName: 'Mike Kowalski',
    coachId: 'coach-3',
    playersCount: 8,
    matchesPlayed: 16,
    wins: 13,
    draws: 0,
    losses: 3,
    winRate: '81.2%',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    rosterSnippet: [
      { name: 'Sophia Chen', position: 'Singles Rank #1', number: 1, ovr: 92 },
      { name: 'David Rossi', position: 'Doubles Specialist', number: 4, ovr: 87 },
    ],
  },
];
