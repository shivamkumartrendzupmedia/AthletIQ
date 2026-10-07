export interface AcademyAthlete {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
  sport: string;
  teamId: string;
  teamName: string;
  position: string;
  jerseyNumber: number;
  ovr: number;
  attendanceRate: string;
  status: 'Active' | 'Injured' | 'Trial';
  avatar: string;
  medicalClearance: boolean;
  parentContact: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  sport: string;
  teamId: string;
  teamName: string;
  coachName: string;
  date: string;
  time: string;
  pitchLocation: string;
  objectives: string[];
  status: 'Upcoming' | 'Completed' | 'In Progress';
  attendanceCount: { present: number; total: number };
}

export interface AcademyDocument {
  id: string;
  title: string;
  category: 'Medical Waiver' | 'Player Contract' | 'ID Verification' | 'Insurance';
  athleteName: string;
  uploadedDate: string;
  status: 'Verified' | 'Pending Review' | 'Expired';
}

export interface AcademyAnnouncement {
  id: string;
  title: string;
  audience: 'All Academy' | 'Coaches Only' | 'Parents & Athletes';
  date: string;
  author: string;
  content: string;
  priority: 'High' | 'Normal';
}

export const mockAthletes: AcademyAthlete[] = [
  {
    id: 'ath-1',
    name: 'Alex Morgan',
    age: 15,
    ageGroup: 'U16',
    sport: 'Football',
    teamId: 'u16-strikers',
    teamName: 'U16 Strikers',
    position: 'Forward',
    jerseyNumber: 9,
    ovr: 87,
    attendanceRate: '96%',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
    medicalClearance: true,
    parentContact: '+1 506 555-0192',
  },
  {
    id: 'ath-2',
    name: 'Liam Anderson',
    age: 16,
    ageGroup: 'U16',
    sport: 'Football',
    teamId: 'u16-strikers',
    teamName: 'U16 Strikers',
    position: 'Midfielder',
    jerseyNumber: 10,
    ovr: 84,
    attendanceRate: '92%',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
    medicalClearance: true,
    parentContact: '+1 506 555-0144',
  },
  {
    id: 'ath-3',
    name: 'Marcus Johnson',
    age: 17,
    ageGroup: 'U18',
    sport: 'Basketball',
    teamId: 'u18-hoops-elite',
    teamName: 'U18 Hoops Elite',
    position: 'Point Guard',
    jerseyNumber: 3,
    ovr: 89,
    attendanceRate: '98%',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
    medicalClearance: true,
    parentContact: '+1 506 555-0188',
  },
  {
    id: 'ath-4',
    name: 'Chloe Vance',
    age: 14,
    ageGroup: 'Junior Elite',
    sport: 'Swimming',
    teamId: 'aqua-elite-squad',
    teamName: 'Aqua Elite Squad',
    position: 'Freestyle Specialist',
    jerseyNumber: 5,
    ovr: 91,
    attendanceRate: '100%',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    medicalClearance: true,
    parentContact: '+1 506 555-0111',
  },
];

export const mockTrainingSessions: TrainingSession[] = [
  {
    id: 'ts-1',
    title: 'High-Tempo Counter-Attack Drills',
    sport: 'Football',
    teamId: 'u16-strikers',
    teamName: 'U16 Strikers',
    coachName: 'David Vance',
    date: 'Today',
    time: '04:30 PM - 06:30 PM',
    pitchLocation: 'Pitch A (Turf)',
    objectives: ['Passing velocity under pressure', 'Overlapping wing runs', 'Finishing inside the box'],
    status: 'Upcoming',
    attendanceCount: { present: 16, total: 18 },
  },
  {
    id: 'ts-2',
    title: 'Pick & Roll Read Analytics & Shooting',
    sport: 'Basketball',
    teamId: 'u18-hoops-elite',
    teamName: 'U18 Hoops Elite',
    coachName: 'Emily Carter',
    date: 'Tomorrow',
    time: '05:00 PM - 07:00 PM',
    pitchLocation: 'Main Indoor Arena Court 1',
    objectives: ['Corner 3-point accuracy', 'High screen defensive reads', 'Free throw pressure reps'],
    status: 'Upcoming',
    attendanceCount: { present: 12, total: 12 },
  },
  {
    id: 'ts-3',
    title: '50m Freestyle Sprint & Turn Hydrodynamics',
    sport: 'Swimming',
    teamId: 'aqua-elite-squad',
    teamName: 'Aqua Elite Squad',
    coachName: 'Sara Martinez',
    date: 'Yesterday',
    time: '06:00 AM - 08:00 AM',
    pitchLocation: 'Olympic Pool (Lane 1-4)',
    objectives: ['Underwater flip turn velocity', 'High stroke rate maintenance'],
    status: 'Completed',
    attendanceCount: { present: 15, total: 15 },
  },
];

export const mockDocuments: AcademyDocument[] = [
  {
    id: 'doc-1',
    title: 'Medical Fitness & Cardiac Clearance 2026',
    category: 'Medical Waiver',
    athleteName: 'Alex Morgan',
    uploadedDate: 'Aug 14, 2026',
    status: 'Verified',
  },
  {
    id: 'doc-2',
    title: 'Academy Student-Athlete Code Contract',
    category: 'Player Contract',
    athleteName: 'Marcus Johnson',
    uploadedDate: 'Aug 02, 2026',
    status: 'Verified',
  },
  {
    id: 'doc-3',
    title: 'Youth League Insurance Coverage Waiver',
    category: 'Insurance',
    athleteName: 'Chloe Vance',
    uploadedDate: 'Aug 20, 2026',
    status: 'Pending Review',
  },
];

export const mockAnnouncements: AcademyAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Active NB Cup 2026 Trial Rosters Finalized',
    audience: 'All Academy',
    date: 'Aug 29, 2026',
    author: 'Director Marcus Vance',
    content: 'All athletes must submit their updated medical clearance forms by Friday ahead of the Active NB Cup opening matchday.',
    priority: 'High',
  },
  {
    id: 'ann-2',
    title: 'GPS Sensor Pod Distribution & Calibration',
    audience: 'Coaches Only',
    date: 'Aug 25, 2026',
    author: 'Sports Science Team',
    content: 'Coaches please collect your team GPS tracking pods from the biometrics lab before Wednesday session.',
    priority: 'Normal',
  },
];
