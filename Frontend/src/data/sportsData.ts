export interface Program {
  id: string;
  name: string;
  category: string;
  iconName: string;
  heroImage: string;
  shortDesc: string;
  fullDesc: string;
  ageGroups: string[];
  features: string[];
  headCoachId: string;
  schedule: string;
  fee: string;
  enrolledCount: number;
}

export const sportsData: Program[] = [
  {
    id: 'football',
    name: 'Soccer Academy',
    category: 'Football',
    iconName: 'Activity',
    heroImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Elite tactical training, ball mastery, position intelligence, and competitive match exposure.',
    fullDesc: 'The AthletiQ Soccer Academy is designed for aspiring players seeking professional development. Our curriculum combines UEFA-licensed coaching, GPS performance tracking, tactical video breakdown, and high-tempo match scenarios.',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18', 'Pro Pathway'],
    features: [
      'FIFA-standard grass & turf pitches',
      'UEFA-certified coaching staff',
      'Bi-weekly performance tracking & video analysis',
      'Tournaments & scouting showcase matches',
    ],
    headCoachId: 'coach-1',
    schedule: 'Mon, Wed, Fri • 4:30 PM - 6:30 PM',
    fee: '$180 / month',
    enrolledCount: 142,
  },
  {
    id: 'basketball',
    name: 'Hoops Excellence',
    category: 'Basketball',
    iconName: 'Zap',
    heroImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Precision shooting, court vision, explosive athleticism, and high-IQ playmaking.',
    fullDesc: 'Transform your basketball game with our elite training program. Featuring hardwood indoor courts, shooting analytics technology, agility mechanics, and team strategy workshops.',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    features: [
      'FIBA regulation hardwood courts',
      'Noah Shooting Gun & analytics',
      'Vertical jump & speed strength training',
      'AAU & National League tournament entry',
    ],
    headCoachId: 'coach-2',
    schedule: 'Tue, Thu, Sat • 5:00 PM - 7:00 PM',
    fee: '$175 / month',
    enrolledCount: 98,
  },
  {
    id: 'tennis',
    name: 'Grand Slam Tennis',
    category: 'Tennis',
    iconName: 'Shield',
    heroImage: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Serve mechanics, court geometry, mental toughness, and tournament match preparation.',
    fullDesc: 'Our Tennis Academy provides personalized technical refinement and strategic drill routines on hard and clay courts for junior rankings and collegiate prep.',
    ageGroups: ['U10', 'U14', 'U18', 'Adults'],
    features: [
      'Clay & Hard court surfaces',
      'High-speed video stroke analysis',
      'Conditioning & flexibility routines',
      'Singles & Doubles match ladder tournaments',
    ],
    headCoachId: 'coach-3',
    schedule: 'Daily Slots • 7:00 AM - 7:00 PM',
    fee: '$210 / month',
    enrolledCount: 64,
  },
  {
    id: 'swimming',
    name: 'Aqua Elite Swimming',
    category: 'Swimming',
    iconName: 'Activity',
    heroImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Stroke refinement, turn efficiency, explosive starts, and aerobic endurance building.',
    fullDesc: 'Train in an Olympic-sized 50-meter heated pool equipped with underwater timing touchpads and biomechanics stroke camera analysis.',
    ageGroups: ['All Ages', 'Junior Elite', 'Competitive Masters'],
    features: [
      '50m Olympic pool & 25m warmup pool',
      'Underwater camera stroke breakdown',
      'Dryland strength & core conditioning',
      'National aquatics championship meets',
    ],
    headCoachId: 'coach-4',
    schedule: 'Mon to Sat • 6:00 AM - 8:00 AM / 4:00 PM - 6:00 PM',
    fee: '$160 / month',
    enrolledCount: 110,
  },
  {
    id: 'athletics',
    name: 'Track & Sprint Performance',
    category: 'Athletics',
    iconName: 'Trophy',
    heroImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Max velocity sprint mechanics, hurdle technique, explosive power, and race pacing.',
    fullDesc: 'Develop elite speed, acceleration, and athletic power under the direction of Olympic track veterans. Applicable for track runners and multi-sport speed development.',
    ageGroups: ['U14', 'U16', 'U18', 'Elite Track'],
    features: [
      '8-lane synthetic tartan track',
      'Laser timing gates & stride metrics',
      'Plyometric & power acceleration lab',
      'Regional track & field invitational meets',
    ],
    headCoachId: 'coach-5',
    schedule: 'Mon, Wed, Sat • 5:00 PM - 7:00 PM',
    fee: '$150 / month',
    enrolledCount: 75,
  },
  {
    id: 'volleyball',
    name: 'Spike & Block Volleyball',
    category: 'Volleyball',
    iconName: 'Zap',
    heroImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=1200&auto=format&fit=crop',
    shortDesc: 'Setter precision, outside spiking power, libero defense, and team rotation mastery.',
    fullDesc: 'Dynamic indoor volleyball training focused on vertical jump development, defensive reaction speed, communication, and high-level team tactical systems.',
    ageGroups: ['U14', 'U16', 'U18'],
    features: [
      'Shock-absorbing sprung hardwood courts',
      'Radar spike velocity measurement',
      'Positional specialization workshops',
      'Regional club league competitions',
    ],
    headCoachId: 'coach-6',
    schedule: 'Tue, Thu • 6:00 PM - 8:00 PM',
    fee: '$145 / month',
    enrolledCount: 52,
  },
];
