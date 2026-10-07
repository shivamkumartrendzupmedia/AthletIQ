import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AthletiqRadarChart,
  AthletiqBarChart,
  AthletiqProgressGauge,
  AthletiqLineChart,
} from '../design-system/AthletiqCharts';
import {
  athleteDevelopmentService,
  type FullAthleteProfileData,
  type CoachFeedback,
  type AthleteGoal,
} from '../services/athleteDevelopmentService';
import { StateContainer } from '../components/StateContainer';
import { Card, CrossAccent, AthleticBadge, Button } from '../design-system';
import {
  ArrowLeft,
  Trophy,
  Activity,
  Target,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Plus,
  ThumbsUp,
  Send,
  Flame,
  Shield,
  Star,
  User,
} from 'lucide-react';

export const AthleteProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const athleteId = id || 'ath-1';

  const [profile, setProfile] = useState<FullAthleteProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    'performance' | 'skills' | 'goals' | 'feedback' | 'attendance' | 'development' | 'achievements'
  >('performance');

  // Modal States
  const [showAddGoalModal, setShowAddGoalModal] = useState<boolean>(false);
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalCategory, setNewGoalCategory] = useState<'Physical' | 'Technical' | 'Tactical' | 'Mental'>('Technical');
  const [newGoalDate, setNewGoalDate] = useState<string>('2026-11-30');

  const [replyInput, setReplyInput] = useState<{ [fbId: string]: string }>({});

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await athleteDevelopmentService.getAthleteProfile(athleteId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load athlete profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const unsubscribe = athleteDevelopmentService.subscribe(fetchProfile);
    return () => unsubscribe();
  }, [athleteId]);

  const handleAcknowledge = async (fbId: string) => {
    if (!profile) return;
    await athleteDevelopmentService.acknowledgeFeedback(profile.id, fbId);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newGoalTitle.trim()) return;
    await athleteDevelopmentService.addAthleteGoal(profile.id, {
      athleteId: profile.id,
      title: newGoalTitle,
      category: newGoalCategory,
      targetDate: newGoalDate,
      progressPercentage: 10,
      checkpoints: [{ text: 'Initial baseline setup', completed: true }],
    });
    setNewGoalTitle('');
    setShowAddGoalModal(false);
  };

  const handleProgressUpdate = async (goalId: string, currentPct: number) => {
    if (!profile) return;
    const newPct = Math.min(100, currentPct + 15);
    await athleteDevelopmentService.updateGoalProgress(profile.id, goalId, newPct);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <StateContainer loading={true} children={null} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <StateContainer error={error || 'Athlete profile not found'} onRetry={fetchProfile} children={null} />
      </div>
    );
  }

  // Calculate radar chart metrics from latest assessment
  const latestAssessment = profile.assessments[0];
  const radarMetrics = [
    { label: 'Technical', value: latestAssessment?.categories.technical ?? 90 },
    { label: 'Tactical', value: latestAssessment?.categories.tactical ?? 86 },
    { label: 'Physical', value: latestAssessment?.categories.physical ?? 92 },
    { label: 'Mental', value: latestAssessment?.categories.mental ?? 88 },
    { label: 'Speed/Pace', value: latestAssessment?.subSkills.pace ?? 94 },
    { label: 'Shooting', value: latestAssessment?.subSkills.shooting ?? 91 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/dashboard/athletes" className="inline-flex items-center gap-2 text-sm font-bold text-[#171044] hover:text-[#FF5A00] transition-colors">
          <ArrowLeft size={16} /> Back to Athletes Directory
        </Link>
        <div className="flex items-center gap-2">
          <AthleticBadge variant="lime">{profile.statusTag}</AthleticBadge>
          <AthleticBadge variant="dark">{profile.sport}</AthleticBadge>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="bg-[#171044] text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/10">
        {/* Glow backdrop shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5A00]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#D8F500]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Athlete Cutout Portrait & Jersey Badge */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative group">
              <div className="w-64 h-72 rounded-3xl overflow-hidden border-4 border-[#D8F500] shadow-2xl relative">
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#171044] via-[#171044]/60 to-transparent p-4 flex justify-between items-end">
                  <span className="text-3xl font-black font-display text-[#D8F500]">#{profile.jerseyNumber}</span>
                  <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-md">
                    {profile.position}
                  </span>
                </div>
              </div>

              {/* Rating Ring Overlay */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-[#FF5A00] to-[#E04F00] text-white p-3 rounded-2xl shadow-xl text-center border-2 border-white">
                <div className="text-2xl font-black font-display">{profile.ovr}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#D8F500]">OVR SCORE</div>
              </div>
            </div>
          </div>

          {/* Hero Details */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase text-[#D8F500] tracking-widest">
                  {profile.teamName} • Age {profile.age}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                  🔥 Active Season Record
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight text-white">
                {profile.name} <CrossAccent color="lime" size="lg" />
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base max-w-xl">
                {profile.performanceTrend}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-extrabold uppercase text-white/60">Overall Rating</div>
                <div className="text-2xl font-black font-display text-[#D8F500]">{profile.ovr} / 100</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-extrabold uppercase text-white/60">Attendance</div>
                <div className="text-2xl font-black font-display text-[#FF5A00]">96%</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-extrabold uppercase text-white/60">Goals / Points</div>
                <div className="text-2xl font-black font-display text-white">14</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-[10px] font-extrabold uppercase text-white/60">Coach Rating</div>
                <div className="text-2xl font-black font-display text-[#D8F500]">4.9 ⭐</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 NAV TABS */}
      <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-[#171044]/10 scrollbar-none">
        {[
          { id: 'performance', label: 'Performance', icon: <Activity size={16} /> },
          { id: 'skills', label: 'Skills', icon: <Zap size={16} /> },
          { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
          { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
          { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
          { id: 'development', label: 'Development', icon: <TrendingUp size={16} /> },
          { id: 'achievements', label: 'Achievements', icon: <Trophy size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#171044] text-[#D8F500] shadow-lg scale-105'
                : 'bg-white text-[#171044] hover:bg-[#171044]/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      <AnimatePresence mode="wait">
        {/* 1. PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Radar Chart Card */}
              <div className="lg:col-span-6 bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center space-y-6">
                <div className="w-full flex items-center justify-between">
                  <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">
                    Performance Spider Web <CrossAccent color="lime" size="sm" />
                  </h3>
                  <span className="text-xs text-[#D8F500] font-bold">Latest Q3 Telemetry</span>
                </div>
                <AthletiqRadarChart metrics={radarMetrics} size={310} colorScheme="lime" />
              </div>

              {/* Category Breakdown & Trend Line */}
              <div className="lg:col-span-6 space-y-6">
                <Card variant="standard" className="p-8 space-y-6">
                  <h3 className="text-xl font-black font-display text-[#171044] uppercase tracking-tight">
                    Biometric & Performance Categories
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1 border border-[#171044]/5">
                      <div className="text-xs font-extrabold uppercase text-[#171044]/60">Top Sprint Velocity</div>
                      <div className="text-3xl font-black font-display text-[#FF5A00]">32.4 km/h</div>
                      <div className="text-[10px] font-bold text-emerald-600">Top 1% Academy Record</div>
                    </div>
                    <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1 border border-[#171044]/5">
                      <div className="text-xs font-extrabold uppercase text-[#171044]/60">VO2 Max Score</div>
                      <div className="text-3xl font-black font-display text-[#171044]">58.2 ml/kg</div>
                      <div className="text-[10px] font-bold text-[#4B2A9B]">Elite Endurance</div>
                    </div>
                    <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1 border border-[#171044]/5">
                      <div className="text-xs font-extrabold uppercase text-[#171044]/60">Vertical Leap</div>
                      <div className="text-3xl font-black font-display text-[#171044]">64 cm</div>
                      <div className="text-[10px] font-bold text-[#FF5A00]">+4cm this season</div>
                    </div>
                    <div className="p-4 bg-[#F7F1E8] rounded-2xl space-y-1 border border-[#171044]/5">
                      <div className="text-xs font-extrabold uppercase text-[#171044]/60">Match Intensity Index</div>
                      <div className="text-3xl font-black font-display text-[#4B2A9B]">94 / 100</div>
                      <div className="text-[10px] font-bold text-emerald-600">High Work Rate</div>
                    </div>
                  </div>
                </Card>

                {/* Historical Progression Graph */}
                <Card variant="standard" className="p-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black font-display text-[#171044] uppercase tracking-tight">
                      Rating Progression (2026)
                    </h3>
                    <span className="text-xs font-black text-[#FF5A00]">+3 OVR Gain</span>
                  </div>
                  <AthletiqLineChart
                    points={[
                      { label: 'May', value: 86 },
                      { label: 'Jun', value: 87 },
                      { label: 'Jul', value: 88 },
                      { label: 'Aug', value: 89 },
                    ]}
                    height={130}
                    colorScheme="orange"
                  />
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. SKILLS TAB */}
        {activeTab === 'skills' && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Detailed Sub-Skills Breakdown */}
              <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                    Technical & Physical Attributes <CrossAccent color="orange" size="sm" />
                  </h3>
                  <span className="text-xs font-bold text-[#4B2A9B]">Evaluated by Coach David Vance</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Pace & Acceleration', score: latestAssessment?.subSkills.pace ?? 94, color: '#FF5A00' },
                    { label: 'Shooting & Finishing', score: latestAssessment?.subSkills.shooting ?? 91, color: '#171044' },
                    { label: 'Dribbling & Control', score: latestAssessment?.subSkills.dribbling ?? 93, color: '#D8F500' },
                    { label: 'Stamina & Recovery', score: latestAssessment?.subSkills.stamina ?? 88, color: '#4B2A9B' },
                    { label: 'Passing & Distribution', score: latestAssessment?.subSkills.passing ?? 84, color: '#171044' },
                    { label: 'Defending & Tackling', score: latestAssessment?.subSkills.defending ?? 70, color: '#FF5A00' },
                    { label: 'Tactical Decision Making', score: latestAssessment?.subSkills.decisionMaking ?? 87, color: '#4B2A9B' },
                    { label: 'Leadership & Work Rate', score: latestAssessment?.subSkills.workRate ?? 95, color: '#D8F500' },
                  ].map((skill, idx) => (
                    <div key={idx} className="space-y-2 p-4 bg-[#F7F1E8] rounded-2xl">
                      <div className="flex justify-between items-center text-xs font-black font-display uppercase text-[#171044]">
                        <span>{skill.label}</span>
                        <span className="text-sm font-black text-[#FF5A00]">{skill.score}</span>
                      </div>
                      <div className="h-3 bg-[#171044]/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#FF5A00]"
                          initial={{ width: '0%' }}
                          animate={{ width: `${skill.score}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.05 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div className="lg:col-span-4 space-y-6">
                <Card variant="standard" className="p-7 space-y-4 bg-[#171044] text-white">
                  <h4 className="text-lg font-black font-display uppercase tracking-tight text-[#D8F500]">
                    Key Strengths <CrossAccent color="lime" size="sm" />
                  </h4>
                  <ul className="space-y-2">
                    {latestAssessment?.keyStrengths.map((str, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 p-3 rounded-xl">
                        <CheckCircle2 size={16} className="text-[#D8F500] shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card variant="standard" className="p-7 space-y-4">
                  <h4 className="text-lg font-black font-display uppercase tracking-tight text-[#FF5A00]">
                    Target Development Areas
                  </h4>
                  <ul className="space-y-2">
                    {latestAssessment?.growthAreas.map((area, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-[#171044] bg-[#F7F1E8] p-3 rounded-xl">
                        <Target size={16} className="text-[#FF5A00] shrink-0" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. GOALS TAB */}
        {activeTab === 'goals' && (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                  Player Development Goals <CrossAccent color="orange" size="sm" />
                </h3>
                <p className="text-xs text-[#171044]/60">Short-term & long-term development targets set by player & coach.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowAddGoalModal(true)}>
                <Plus size={16} /> Add Development Goal
              </Button>
            </div>

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.goals.map((goal) => (
                <div key={goal.id} className="bg-white p-7 rounded-[2rem] border border-[#171044]/10 shadow-xl space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#171044] text-[#D8F500]">
                      {goal.category} Goal
                    </span>
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                        goal.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>

                  <h4 className="text-lg font-black font-display text-[#171044]">{goal.title}</h4>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-black text-[#171044]">
                      <span>Target Date: {goal.targetDate}</span>
                      <span className="text-[#FF5A00]">{goal.progressPercentage}%</span>
                    </div>
                    <div className="h-3 bg-[#171044]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF5A00] to-[#D8F500] rounded-full transition-all duration-500"
                        style={{ width: `${goal.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Checkpoints */}
                  <div className="space-y-2 pt-2 border-t border-[#171044]/5">
                    <div className="text-[11px] font-extrabold uppercase text-[#171044]/60">Checkpoints</div>
                    {goal.checkpoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium text-[#171044]">
                        <CheckCircle2
                          size={14}
                          className={cp.completed ? 'text-emerald-500' : 'text-gray-300'}
                        />
                        <span className={cp.completed ? 'line-through text-gray-400' : ''}>{cp.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Simulate Progress Button */}
                  {goal.status !== 'Completed' && (
                    <button
                      onClick={() => handleProgressUpdate(goal.id, goal.progressPercentage)}
                      className="w-full py-2.5 bg-[#F7F1E8] hover:bg-[#FF5A00] hover:text-white text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Update Progress (+15%)
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Goal Modal */}
            {showAddGoalModal && (
              <div className="fixed inset-0 z-50 bg-[#171044]/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6">
                  <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                    Add New Goal <CrossAccent color="orange" size="sm" />
                  </h3>

                  <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Goal Title</label>
                      <input
                        type="text"
                        required
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="e.g. Improve sprint acceleration..."
                        className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl border border-[#171044]/10 text-sm font-bold text-[#171044] focus:outline-none focus:border-[#FF5A00]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Category</label>
                        <select
                          value={newGoalCategory}
                          onChange={(e) => setNewGoalCategory(e.target.value as any)}
                          className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl border border-[#171044]/10 text-xs font-bold text-[#171044]"
                        >
                          <option value="Technical">Technical</option>
                          <option value="Physical">Physical</option>
                          <option value="Tactical">Tactical</option>
                          <option value="Mental">Mental</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Target Date</label>
                        <input
                          type="date"
                          value={newGoalDate}
                          onChange={(e) => setNewGoalDate(e.target.value)}
                          className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl border border-[#171044]/10 text-xs font-bold text-[#171044]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" size="sm" type="button" onClick={() => setShowAddGoalModal(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="submit" className="flex-1">
                        Create Goal
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 4. FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                  Coach Feedback Stream <CrossAccent color="lime" size="sm" />
                </h3>
                <p className="text-xs text-[#171044]/60">Continuous evaluations & technical advice from coaching staff.</p>
              </div>
            </div>

            <div className="space-y-4">
              {profile.feedback.map((fb) => (
                <div key={fb.id} className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <img src={fb.coachAvatar} alt={fb.coachName} className="w-12 h-12 rounded-2xl object-cover border-2 border-[#171044]" />
                      <div>
                        <h4 className="font-bold text-sm text-[#171044]">{fb.coachName}</h4>
                        <span className="text-[10px] font-bold text-[#FF5A00] bg-[#FF5A00]/10 px-2.5 py-0.5 rounded-full">
                          {fb.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#171044]/50">{fb.date}</span>
                  </div>

                  <div>
                    <h5 className="font-black font-display text-base text-[#171044] mb-1">{fb.title}</h5>
                    <p className="text-xs text-[#171044]/80 leading-relaxed bg-[#F7F1E8] p-4 rounded-2xl">{fb.message}</p>
                  </div>

                  {/* Likes & Replies */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleAcknowledge(fb.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all ${
                        fb.acknowledged
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#171044]/10 text-[#171044] hover:bg-[#171044] hover:text-white'
                      }`}
                    >
                      <ThumbsUp size={14} />
                      {fb.acknowledged ? `Acknowledged (${fb.likes})` : 'Acknowledge Feedback'}
                    </button>
                    {fb.replies && fb.replies.length > 0 && (
                      <span className="text-xs font-bold text-[#4B2A9B]">
                        {fb.replies.length} Reply from Athlete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 5. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Attendance Summary Meter */}
              <div className="lg:col-span-4 bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center space-y-6">
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">
                  Attendance Score <CrossAccent color="lime" size="sm" />
                </h3>
                <AthletiqProgressGauge score={96} label="Season Attendance" size={170} colorScheme="lime" />
                <div className="flex items-center gap-2 bg-emerald-950 text-emerald-400 px-4 py-2 rounded-full text-xs font-extrabold border border-emerald-500/30">
                  <Flame size={16} /> 12 Session Streak 🔥
                </div>
              </div>

              {/* Attendance Log Table */}
              <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                    Session Log History
                  </h3>
                  <span className="text-xs font-bold text-[#171044]/60">Total Sessions: {profile.attendanceHistory.length}</span>
                </div>

                <div className="space-y-3">
                  {profile.attendanceHistory.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#171044] text-[#D8F500] flex items-center justify-center font-black text-xs">
                          {att.type[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#171044]">{att.sessionTitle}</div>
                          <div className="text-[10px] text-[#171044]/60">{att.date} • {att.durationMinutes} mins</div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          att.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-700'
                            : att.status === 'Late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 6. DEVELOPMENT TIMELINE TAB */}
        {activeTab === 'development' && (
          <motion.div
            key="development"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Development History Timeline <CrossAccent color="orange" size="sm" />
            </h3>

            <div className="relative border-l-4 border-[#171044]/15 ml-6 space-y-8 pl-8 pt-2">
              {profile.timeline.map((event, idx) => (
                <div key={event.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[42px] top-1 w-6 h-6 rounded-full bg-[#FF5A00] border-4 border-white shadow-md" />

                  <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-lg space-y-2 max-w-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-[#4B2A9B] uppercase tracking-wider">{event.date}</span>
                      {event.badge && (
                        <span className="text-[10px] font-black bg-[#171044] text-[#D8F500] px-3 py-1 rounded-full">
                          {event.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-black font-display text-[#171044]">{event.title}</h4>
                    <p className="text-xs text-[#171044]/70">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 7. ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Trophy Cabinet & Badges <CrossAccent color="lime" size="sm" />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {profile.achievements.map((ach) => (
                <div key={ach.id} className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-xl space-y-4 text-center group hover:-translate-y-2 transition-transform">
                  <div className="w-16 h-16 rounded-2xl bg-[#171044] text-white flex items-center justify-center text-3xl mx-auto shadow-md group-hover:scale-110 transition-transform">
                    {ach.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#FF5A00]/10 text-[#FF5A00]">
                      {ach.tag}
                    </span>
                    <h4 className="font-black font-display text-base text-[#171044] mt-1">{ach.title}</h4>
                    <p className="text-xs text-[#171044]/60 mt-1">{ach.subtitle}</p>
                  </div>
                  <div className="text-[10px] font-bold text-[#171044]/40 pt-2 border-t border-[#171044]/5">{ach.date}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
