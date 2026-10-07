// Centralized Athlete Development Service for AthletiQ

export interface SkillAssessment {
  id: string;
  athleteId: string;
  date: string;
  evaluatorName: string;
  evaluatorRole: string;
  categories: {
    technical: number; // 0 - 100
    tactical: number;
    physical: number;
    mental: number;
  };
  subSkills: {
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
  notes: string;
  keyStrengths: string[];
  growthAreas: string[];
}

export interface CoachEvaluation {
  id: string;
  athleteId: string;
  date: string;
  coachName: string;
  overallRating: number;
  summary: string;
  tacticalNotes: string;
  physicalNotes: string;
  mentalNotes: string;
  nextEvaluationDate: string;
}

export interface CoachFeedback {
  id: string;
  athleteId: string;
  coachName: string;
  coachAvatar: string;
  date: string;
  category: 'Tactical' | 'Conditioning' | 'Mindset' | 'Match Performance' | 'General';
  title: string;
  message: string;
  acknowledged: boolean;
  likes: number;
  replies?: { author: string; text: string; date: string }[];
}

export interface AthleteGoal {
  id: string;
  athleteId: string;
  title: string;
  category: 'Physical' | 'Technical' | 'Tactical' | 'Mental';
  targetDate: string;
  progressPercentage: number;
  status: 'In Progress' | 'Completed' | 'Behind Schedule';
  checkpoints: { text: string; completed: boolean }[];
  coachNotes?: string;
}

export interface AttendanceRecord {
  id: string;
  athleteId: string;
  sessionTitle: string;
  date: string;
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  type: 'Training' | 'Match' | 'Gym' | 'Recovery';
  durationMinutes: number;
  coachNote?: string;
}

export interface DevelopmentTimelineEvent {
  id: string;
  athleteId: string;
  date: string;
  title: string;
  category: 'Assessment' | 'Achievement' | 'Milestone' | 'Physical Benchmark';
  description: string;
  impactScore?: string;
  badge?: string;
}

export interface FullAthleteProfileData {
  id: string;
  name: string;
  sport: string;
  teamName: string;
  jerseyNumber: number;
  position: string;
  age: number;
  ovr: number;
  avatar: string;
  statusTag: 'Elite Tier' | 'Peak Form' | 'Developing' | 'Rehab';
  performanceTrend: string;
  assessments: SkillAssessment[];
  evaluations: CoachEvaluation[];
  feedback: CoachFeedback[];
  goals: AthleteGoal[];
  attendanceHistory: AttendanceRecord[];
  timeline: DevelopmentTimelineEvent[];
  achievements: { id: string; title: string; subtitle: string; icon: string; date: string; tag: string }[];
}

// Initial Mock Data Store
const INITIAL_ATHLETES_PROFILE_DATA: Record<string, FullAthleteProfileData> = {
  'ath-1': {
    id: 'ath-1',
    name: 'Alex Morgan',
    sport: 'Football',
    teamName: 'U16 Strikers',
    jerseyNumber: 9,
    position: 'Forward',
    age: 15,
    ovr: 89,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
    statusTag: 'Elite Tier',
    performanceTrend: '+18% Sprint Speed • Top Scorer',
    assessments: [
      {
        id: 'sa-1',
        athleteId: 'ath-1',
        date: 'Aug 28, 2026',
        evaluatorName: 'Coach David Vance',
        evaluatorRole: 'Head Coach • UEFA Pro',
        categories: { technical: 90, tactical: 86, physical: 92, mental: 88 },
        subSkills: {
          pace: 94,
          shooting: 91,
          passing: 84,
          dribbling: 93,
          defending: 70,
          stamina: 88,
          agility: 92,
          decisionMaking: 87,
          leadership: 89,
          workRate: 95,
        },
        notes: 'Alex is demonstrating world-class attacking instincts. Transition speed and final third composure are elite level.',
        keyStrengths: ['Explosive first step', 'Clinical left-foot finish', 'High pressing intensity'],
        growthAreas: ['Weak foot distribution', 'Defensive tracking on set pieces'],
      },
      {
        id: 'sa-0',
        athleteId: 'ath-1',
        date: 'May 15, 2026',
        evaluatorName: 'Coach David Vance',
        evaluatorRole: 'Head Coach • UEFA Pro',
        categories: { technical: 86, tactical: 82, physical: 88, mental: 84 },
        subSkills: {
          pace: 90,
          shooting: 86,
          passing: 80,
          dribbling: 88,
          defending: 65,
          stamina: 84,
          agility: 89,
          decisionMaking: 82,
          leadership: 84,
          workRate: 90,
        },
        notes: 'Solid baseline assessment. Strong sprint athleticism with minor technical adjustments needed.',
        keyStrengths: ['Pace off the mark', 'Determination'],
        growthAreas: ['First touch in tight quarters', 'Aero stamina'],
      },
    ],
    evaluations: [
      {
        id: 'ev-1',
        athleteId: 'ath-1',
        date: 'Aug 30, 2026',
        coachName: 'Coach David Vance',
        overallRating: 89,
        summary: 'Alex has shown phenomenal development this quarter, dominating inside the box and leading by example in team drills.',
        tacticalNotes: 'Understands inverted winger overlaps and creates space for midfielders under high press.',
        physicalNotes: 'Sprint acceleration has reached 32.4 km/h peak velocity in high-intensity GPS tracking.',
        mentalNotes: 'Calm composure under high pressure penalty kicks and late-game deficit situations.',
        nextEvaluationDate: 'Nov 15, 2026',
      },
    ],
    feedback: [
      {
        id: 'fb-1',
        athleteId: 'ath-1',
        coachName: 'Coach David Vance',
        coachAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
        date: 'Sep 01, 2026',
        category: 'Tactical',
        title: 'Outstanding Off-the-Ball Movement',
        message: 'Your diagonal blind-side runs during the match drill yesterday opened up 4 clear scoring channels. Keep timing those runs just as the midfielder shapes to pass!',
        acknowledged: true,
        likes: 3,
        replies: [
          { author: 'Alex Morgan', text: 'Thank you coach! Focusing on timing against low-block defenses.', date: 'Sep 01, 2026' }
        ],
      },
      {
        id: 'fb-2',
        athleteId: 'ath-1',
        coachName: 'Coach Sara Martinez',
        coachAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
        date: 'Aug 24, 2026',
        category: 'Conditioning',
        title: 'VO2 Max Threshold Progress',
        message: 'Great endurance output in Thursday interval sessions. You maintained 92% max HR recovery speed.',
        acknowledged: true,
        likes: 2,
      },
    ],
    goals: [
      {
        id: 'gl-1',
        athleteId: 'ath-1',
        title: 'Master Non-Dominant Foot Volley Accuracy',
        category: 'Technical',
        targetDate: 'Oct 30, 2026',
        progressPercentage: 75,
        status: 'In Progress',
        checkpoints: [
          { text: '50 Wall reps daily with left foot', completed: true },
          { text: 'Score 3 goals using weak foot in official match', completed: true },
          { text: 'Achieve 85% target box hit rate in training', completed: false },
        ],
        coachNotes: 'Pace of execution is increasing nicely.',
      },
      {
        id: 'gl-2',
        athleteId: 'ath-1',
        title: 'Break 33 km/h Top Sprint Speed Barrier',
        category: 'Physical',
        targetDate: 'Sep 25, 2026',
        progressPercentage: 90,
        status: 'In Progress',
        checkpoints: [
          { text: 'Implement plyometric stride training twice weekly', completed: true },
          { text: 'Record 32.5 km/h in GPS tracking match', completed: true },
          { text: 'Hit 33 km/h benchmark', completed: false },
        ],
        coachNotes: 'Currently at 32.4 km/h. Almost there!',
      },
      {
        id: 'gl-3',
        athleteId: 'ath-1',
        title: 'Maintain 95%+ Season Attendance',
        category: 'Mental',
        targetDate: 'Dec 15, 2026',
        progressPercentage: 100,
        status: 'Completed',
        checkpoints: [
          { text: 'Attend all pre-season tactical briefings', completed: true },
          { text: 'Zero unexcused absences', completed: true },
        ],
      },
    ],
    attendanceHistory: [
      { id: 'att-1', athleteId: 'ath-1', sessionTitle: 'Tactical Counter-Attack Drill', date: 'Sep 03, 2026', status: 'Present', type: 'Training', durationMinutes: 120 },
      { id: 'att-2', athleteId: 'ath-1', sessionTitle: 'High-Tempo Scrimmage vs U18', date: 'Sep 01, 2026', status: 'Present', type: 'Match', durationMinutes: 90 },
      { id: 'att-3', athleteId: 'ath-1', sessionTitle: 'Lower Body Strength & Power', date: 'Aug 29, 2026', status: 'Present', type: 'Gym', durationMinutes: 60 },
      { id: 'att-4', athleteId: 'ath-1', sessionTitle: 'Active Recovery & Pool Hydrotherapy', date: 'Aug 27, 2026', status: 'Present', type: 'Recovery', durationMinutes: 45 },
      { id: 'att-5', athleteId: 'ath-1', sessionTitle: 'Set Piece Tactical Breakdown', date: 'Aug 25, 2026', status: 'Present', type: 'Training', durationMinutes: 90 },
      { id: 'att-6', athleteId: 'ath-1', sessionTitle: 'Friendship Cup Warmup', date: 'Aug 22, 2026', status: 'Late', type: 'Match', durationMinutes: 90, coachNote: 'Traffic delay acknowledged' },
      { id: 'att-7', athleteId: 'ath-1', sessionTitle: 'Core Conditioning Workout', date: 'Aug 20, 2026', status: 'Present', type: 'Gym', durationMinutes: 60 },
    ],
    timeline: [
      { id: 'tl-1', athleteId: 'ath-1', date: 'Aug 28, 2026', title: 'Achieved 89 Overall Rating Index', category: 'Assessment', description: 'Promoted to Elite Tier player evaluation category following Q3 comprehensive test.', impactScore: '+3 OVR', badge: '⭐ Elite Tier' },
      { id: 'tl-2', athleteId: 'ath-1', date: 'Aug 14, 2026', title: 'Awarded Player of the Tournament', category: 'Achievement', description: 'Netted 6 goals in 4 matches during regional academy showcase.', badge: '🏆 Top Scorer' },
      { id: 'tl-3', athleteId: 'ath-1', date: 'Jul 02, 2026', title: '32.4 km/h Peak Velocity Benchmark', category: 'Physical Benchmark', description: 'Set new academy speed record for U16 category in sprint telemetry testing.', impactScore: '32.4 km/h' },
      { id: 'tl-4', athleteId: 'ath-1', date: 'May 15, 2026', title: 'Baseline Skill Evaluation Completed', category: 'Milestone', description: 'First formal evaluation recorded 86 baseline score.' },
    ],
    achievements: [
      { id: 'ac-1', title: 'Top Scorer Award', subtitle: '14 Goals in 12 Season Matches', icon: '🏆', date: 'August 2026', tag: 'Gold' },
      { id: 'ac-2', title: 'Iron Athlete Streak', subtitle: '12 Consecutive 100% Attendance Sessions', icon: '⚡', date: 'September 2026', tag: 'Streak' },
      { id: 'ac-3', title: 'Speed Demon Record', subtitle: '32.4 km/h Top Sprint Speed', icon: '🚀', date: 'July 2026', tag: 'Record' },
      { id: 'ac-4', title: 'Captain Band Honor', subtitle: 'Matchday Leadership Award vs Blue Hawks', icon: '👑', date: 'June 2026', tag: 'Leadership' },
    ],
  },
  'ath-2': {
    id: 'ath-2',
    name: 'Liam Anderson',
    sport: 'Football',
    teamName: 'U16 Strikers',
    jerseyNumber: 10,
    position: 'Midfielder',
    age: 16,
    ovr: 84,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    statusTag: 'Developing',
    performanceTrend: '+12% Pass Completion • Master Playmaker',
    assessments: [
      {
        id: 'sa-2',
        athleteId: 'ath-2',
        date: 'Aug 26, 2026',
        evaluatorName: 'Coach David Vance',
        evaluatorRole: 'Head Coach • UEFA Pro',
        categories: { technical: 88, tactical: 91, physical: 80, mental: 86 },
        subSkills: {
          pace: 81,
          shooting: 78,
          passing: 94,
          dribbling: 87,
          defending: 76,
          stamina: 85,
          agility: 83,
          decisionMaking: 92,
          leadership: 88,
          workRate: 89,
        },
        notes: 'Outstanding vision and match tempo control. Excellent short & long distribution accuracy.',
        keyStrengths: ['94% Pass accuracy', 'Field vision', 'Spatial awareness'],
        growthAreas: ['Upper body strength', 'Explosive acceleration'],
      },
    ],
    evaluations: [
      {
        id: 'ev-2',
        athleteId: 'ath-2',
        date: 'Aug 25, 2026',
        coachName: 'Coach David Vance',
        overallRating: 84,
        summary: 'Liam is the brain of our midfield transition game.',
        tacticalNotes: 'Exceptional press-resistance and through-ball timing.',
        physicalNotes: 'Needs targeted resistance training to withstand physical challenges.',
        mentalNotes: 'Composed under heavy midfield pressure.',
        nextEvaluationDate: 'Nov 20, 2026',
      },
    ],
    feedback: [],
    goals: [
      {
        id: 'gl-20',
        athleteId: 'ath-2',
        title: 'Increase Pass Completion Rate to 90%+',
        category: 'Technical',
        targetDate: 'Oct 15, 2026',
        progressPercentage: 85,
        status: 'In Progress',
        checkpoints: [{ text: '100 Long diagonal passes in drill', completed: true }],
      },
    ],
    attendanceHistory: [],
    timeline: [],
    achievements: [
      { id: 'ac-10', title: 'Playmaker of the Year', subtitle: '18 Assists in 15 Matches', icon: '🎯', date: 'August 2026', tag: 'Silver' },
    ],
  },
};

// In-Memory Reactive Service Class
class AthleteDevelopmentService {
  private data: Record<string, FullAthleteProfileData> = { ...INITIAL_ATHLETES_PROFILE_DATA };
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

  public async getAthleteProfile(id: string): Promise<FullAthleteProfileData> {
    // Simulate brief network delay
    await new Promise((res) => setTimeout(res, 250));
    if (this.data[id]) {
      return this.data[id];
    }
    // Return first athlete as default fallback if not found
    return this.data['ath-1'];
  }

  public async getAllAthletes(): Promise<FullAthleteProfileData[]> {
    await new Promise((res) => setTimeout(res, 200));
    return Object.values(this.data);
  }

  public async addCoachFeedback(athleteId: string, feedback: Omit<CoachFeedback, 'id' | 'date' | 'acknowledged' | 'likes'>): Promise<CoachFeedback> {
    await new Promise((res) => setTimeout(res, 300));
    const athlete = this.data[athleteId] || this.data['ath-1'];
    const newFeedback: CoachFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      acknowledged: false,
      likes: 0,
      replies: [],
    };
    athlete.feedback.unshift(newFeedback);
    this.notify();
    return newFeedback;
  }

  public async acknowledgeFeedback(athleteId: string, feedbackId: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    const athlete = this.data[athleteId] || this.data['ath-1'];
    const fb = athlete.feedback.find((item) => item.id === feedbackId);
    if (fb) {
      fb.acknowledged = true;
      fb.likes += 1;
      this.notify();
    }
  }

  public async addAthleteGoal(athleteId: string, goal: Omit<AthleteGoal, 'id' | 'status'>): Promise<AthleteGoal> {
    await new Promise((res) => setTimeout(res, 300));
    const athlete = this.data[athleteId] || this.data['ath-1'];
    const newGoal: AthleteGoal = {
      ...goal,
      id: `gl-${Date.now()}`,
      status: 'In Progress',
    };
    athlete.goals.unshift(newGoal);
    this.notify();
    return newGoal;
  }

  public async updateGoalProgress(athleteId: string, goalId: string, progress: number): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    const athlete = this.data[athleteId] || this.data['ath-1'];
    const goal = athlete.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.progressPercentage = Math.min(100, Math.max(0, progress));
      if (goal.progressPercentage === 100) {
        goal.status = 'Completed';
      }
      this.notify();
    }
  }

  public async addSkillAssessment(assessment: Omit<SkillAssessment, 'id' | 'date'>): Promise<SkillAssessment> {
    await new Promise((res) => setTimeout(res, 350));
    const athlete = this.data[assessment.athleteId] || this.data['ath-1'];
    const newAssessment: SkillAssessment = {
      ...assessment,
      id: `sa-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };

    // Recalculate athlete OVR score index
    const cats = newAssessment.categories;
    const newOvr = Math.round((cats.technical + cats.tactical + cats.physical + cats.mental) / 4);
    athlete.ovr = newOvr;
    athlete.assessments.unshift(newAssessment);

    // Add to timeline
    athlete.timeline.unshift({
      id: `tl-${Date.now()}`,
      athleteId: athlete.id,
      date: newAssessment.date,
      title: `Skill Assessment Completed (${newOvr} OVR)`,
      category: 'Assessment',
      description: newAssessment.notes,
      impactScore: `${newOvr} OVR`,
      badge: '⭐ New Rating',
    });

    this.notify();
    return newAssessment;
  }

  public async logAttendance(athleteId: string, status: AttendanceRecord['status'], sessionTitle: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    const athlete = this.data[athleteId] || this.data['ath-1'];
    athlete.attendanceHistory.unshift({
      id: `att-${Date.now()}`,
      athleteId,
      sessionTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status,
      type: 'Training',
      durationMinutes: 90,
    });
    this.notify();
  }
}

export const athleteDevelopmentService = new AthleteDevelopmentService();
