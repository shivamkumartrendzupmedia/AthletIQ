export interface Achievement {
  id: string;
  year: string;
  title: string;
  sport: string;
  description: string;
  icon: string;
}

export const achievementsData: Achievement[] = [
  {
    id: 'ach-1',
    year: '2026',
    title: 'National Academy of the Year',
    sport: 'Multi-Sport',
    description: 'Awarded top youth development academy for player progression and collegiate placements.',
    icon: 'Trophy',
  },
  {
    id: 'ach-2',
    year: '2025',
    title: 'Active NB Cup Champions',
    sport: 'Football',
    description: 'U16 Strikers won 6 straight matches with 18 goals scored to lift the trophy.',
    icon: 'Shield',
  },
  {
    id: 'ach-3',
    year: '2025',
    title: 'State Aquatics Team Trophy',
    sport: 'Swimming',
    description: 'Aqua Elite Squad took overall 1st place across 24 individual swim events.',
    icon: 'Zap',
  },
  {
    id: 'ach-4',
    year: '2024',
    title: '35+ NCAA Division 1 Commitments',
    sport: 'All Sports',
    description: 'Milestone reached for student-athletes earning NCAA D1 sports scholarships.',
    icon: 'Star',
  },
];
