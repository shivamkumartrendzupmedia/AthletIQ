export interface Coach {
  id: string;
  name: string;
  role: string;
  sport: string;
  image: string;
  experience: string;
  certification: string;
  bio: string;
  specialties: string[];
  achievements: string[];
  contactEmail: string;
  teamsCoached: string[];
}

export const coachesData: Coach[] = [
  {
    id: 'coach-1',
    name: 'David Vance',
    role: 'Head Soccer Coach',
    sport: 'Football',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    experience: '12 Years',
    certification: 'UEFA Pro License',
    bio: 'Former professional player with over 12 years of youth academy coaching. Specializes in modern positional play, high-pressing transition tactics, and individual technical acceleration.',
    specialties: ['Tactical Periodization', 'Position Intelligence', 'High-Tempo Transitions'],
    achievements: ['National U16 League Champions 2024', '30+ Athletes Placed in NCAA Division 1'],
    contactEmail: 'david.vance@athletiq.com',
    teamsCoached: ['U16 Strikers', 'U18 Academy Stars'],
  },
  {
    id: 'coach-2',
    name: 'Emily Carter',
    role: 'Head Basketball Coach',
    sport: 'Basketball',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
    experience: '9 Years',
    certification: 'USA Basketball Gold Certified',
    bio: 'Former WNBA guard passionate about player development, footwork precision, and shot mechanics analytics.',
    specialties: ['Shooting Mechanics', 'Pick & Roll Read Analysis', 'Explosive Guard Play'],
    achievements: ['AAU Summer Invitational Winner 2025', 'State High School Coach of the Year'],
    contactEmail: 'emily.carter@athletiq.com',
    teamsCoached: ['U18 Hoops Elite', 'U16 Lightning'],
  },
  {
    id: 'coach-3',
    name: 'Mike Kowalski',
    role: 'Fitness & Conditioning Director',
    sport: 'Multi-Sport',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
    experience: '15 Years',
    certification: 'CSCS (NSCA)',
    bio: 'Expert in sports biomechanics, injury prevention, power output, and speed mechanics across all sports disciplines.',
    specialties: ['Injury Prevention', 'Vertical Jump Power', 'GPS Workload Management'],
    achievements: ['Trained 5 Olympic Qualified Athletes', 'Published Sports Science Author'],
    contactEmail: 'mike.kowalski@athletiq.com',
    teamsCoached: ['All Academy Elite Squads'],
  },
  {
    id: 'coach-4',
    name: 'Sara Martinez',
    role: 'Head Aquatics Coach',
    sport: 'Swimming',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop',
    experience: '11 Years',
    certification: 'ASCA Level 5',
    bio: 'Former Olympic semi-finalist specializing in stroke biomechanics, underwater turn timing, and race pacing strategy.',
    specialties: ['Stroke Hydrodynamics', 'Race Turn Efficiency', 'Aerobic Energy Systems'],
    achievements: ['State Aquatics Champions 2023 & 2024', '12 Junior National Qualifiers'],
    contactEmail: 'sara.martinez@athletiq.com',
    teamsCoached: ['Aqua Elite Squad'],
  },
  {
    id: 'coach-5',
    name: 'Liam Henderson',
    role: 'Sprint & Track Coach',
    sport: 'Athletics',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
    experience: '8 Years',
    certification: 'USATF Level 3 Sprints',
    bio: 'Pioneers data-backed sprinting mechanics, acceleration angle optimization, and plyometric force development.',
    specialties: ['Top-End Velocity', 'Acceleration Mechanics', 'Block Starts'],
    achievements: ['Sub-10.2s Sprinter Development', 'National Junior Track Gold Medalist Coach'],
    contactEmail: 'liam.henderson@athletiq.com',
    teamsCoached: ['Track Velocity Team'],
  },
  {
    id: 'coach-6',
    name: 'Anna Novak',
    role: 'Head Volleyball Coach',
    sport: 'Volleyball',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    experience: '10 Years',
    certification: 'FIVB Level 2',
    bio: 'Drives tactical aggression, defensive coverage system efficiency, and court communication for championship teams.',
    specialties: ['Outside Hitting Mechanics', 'Defensive Reading', 'Setter Decision Speed'],
    achievements: ['Regional Club League Champions 2025', 'Best Youth Volleyball Program Award'],
    contactEmail: 'anna.novak@athletiq.com',
    teamsCoached: ['Spike Force U18'],
  },
];
