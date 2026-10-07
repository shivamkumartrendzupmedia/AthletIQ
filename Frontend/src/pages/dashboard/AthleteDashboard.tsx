import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  athleteDevelopmentService,
  type FullAthleteProfileData,
} from '../../services/athleteDevelopmentService';
import {
  AthletiqRadarChart,
  AthletiqProgressGauge,
} from '../../design-system/AthletiqCharts';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  User,
  Calendar,
  Activity,
  Target,
  MessageSquare,
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Shield,
  ThumbsUp,
} from 'lucide-react';

export const AthleteDashboard: React.FC = () => {
  const [profile, setProfile] = useState<FullAthleteProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'next-training' | 'attendance' | 'performance' | 'goals' | 'feedback' | 'tournaments' | 'achievements'
  >('next-training');

  useEffect(() => {
    const load = async () => {
      const data = await athleteDevelopmentService.getAthleteProfile('ath-1');
      setProfile(data);
    };
    load();
    const unsub = athleteDevelopmentService.subscribe(load);
    return () => unsub();
  }, []);

  if (!profile) return null;

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Welcome Card */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#171044]/10 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <AthleticBadge variant="orange">ATHLETE PORTAL</AthleticBadge>
              <AthleticBadge variant="lime">{profile.teamName}</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-[#171044] uppercase tracking-tight">
              Welcome back, <br />
              {profile.name}! 👋 <CrossAccent color="orange" size="lg" />
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <Link to={`/athlete/${profile.id}`}>
                <Button variant="primary" size="sm">
                  <User size={16} /> View Full Public Profile
                </Button>
              </Link>
              <span className="text-xs font-extrabold text-[#171044]/60">
                OVR Index: <strong className="text-[#FF5A00] font-black text-sm">{profile.ovr} OVR</strong>
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="relative rounded-3xl overflow-hidden border-4 border-[#171044]/15 shadow-2xl max-w-xs w-full">
              <img src={profile.avatar} alt={profile.name} className="w-full h-64 object-cover" />
              <div className="absolute bottom-3 left-3 bg-[#171044]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white text-xs font-black">
                #{profile.jerseyNumber} • {profile.position}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8 DASHBOARD TABS */}
      <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-[#171044]/10 scrollbar-none">
        {[
          { id: 'next-training', label: 'Next Training', icon: <Calendar size={16} /> },
          { id: 'profile', label: 'Profile Summary', icon: <User size={16} /> },
          { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 size={16} /> },
          { id: 'performance', label: 'Performance', icon: <Activity size={16} /> },
          { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
          { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
          { id: 'tournaments', label: 'Tournaments', icon: <Shield size={16} /> },
          { id: 'achievements', label: 'Achievements', icon: <Trophy size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#171044] text-[#D8F500] shadow-md'
                : 'bg-white text-[#171044] hover:bg-[#171044]/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">
        {/* NEXT TRAINING */}
        {activeTab === 'next-training' && (
          <motion.div key="next-training" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <AthleticBadge variant="lime">UPCOMING SESSION</AthleticBadge>
                  <h3 className="text-3xl font-black font-display uppercase tracking-tight text-white mt-2">
                    High-Tempo Counter Attack Drills
                  </h3>
                  <p className="text-xs text-white/70">Coach David Vance • Pitch A (Turf)</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-2xl text-right">
                  <div className="text-xs text-[#D8F500] font-bold">Today</div>
                  <div className="text-sm font-black text-white">04:30 PM</div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase text-[#D8F500]">Key Drill Objectives</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Passing velocity under pressure', 'Overlapping wing runs', 'Finishing inside the box'].map((obj, i) => (
                    <div key={i} className="p-3 bg-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#D8F500]" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-xs text-white/60">Squad RSVP: 16 Athletes Confirmed</span>
                <button className="px-6 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors">
                  Confirm Attendance
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* PROFILE SUMMARY */}
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <h3 className="text-2xl font-black font-display text-[#171044]">Athlete Profile Summary</h3>
              <p className="text-xs text-[#171044]/70">
                {profile.name} is currently rated <strong className="text-[#FF5A00]">{profile.ovr} OVR</strong> in the {profile.teamName} squad.
              </p>
              <Link to={`/athlete/${profile.id}`}>
                <Button variant="primary" size="sm">
                  Launch Full Athlete Profile Page <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black font-display text-[#171044]">Attendance Record</h3>
                <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                  96% Attendance • 12 Session Streak 🔥
                </span>
              </div>
              <div className="space-y-3">
                {profile.attendanceHistory.map((att) => (
                  <div key={att.id} className="flex justify-between items-center p-4 bg-[#F7F1E8] rounded-2xl">
                    <span className="font-bold text-xs text-[#171044]">{att.sessionTitle} ({att.date})</span>
                    <span className="text-xs font-black text-emerald-700">{att.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* PERFORMANCE */}
        {activeTab === 'performance' && (
          <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center space-y-6">
              <h3 className="text-2xl font-black font-display text-white uppercase">Performance Radar</h3>
              <AthletiqRadarChart
                metrics={[
                  { label: 'Technical', value: 90 },
                  { label: 'Tactical', value: 86 },
                  { label: 'Physical', value: 92 },
                  { label: 'Mental', value: 88 },
                  { label: 'Pace', value: 94 },
                  { label: 'Shooting', value: 91 },
                ]}
                size={290}
                colorScheme="lime"
              />
            </div>
          </motion.div>
        )}

        {/* GOALS */}
        {activeTab === 'goals' && (
          <motion.div key="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.goals.map((g) => (
                <div key={g.id} className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-[#171044]">
                    <span>{g.title}</span>
                    <span className="text-[#FF5A00] font-black">{g.progressPercentage}%</span>
                  </div>
                  <div className="h-3 bg-[#171044]/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF5A00]" style={{ width: `${g.progressPercentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FEEDBACK */}
        {activeTab === 'feedback' && (
          <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="space-y-4">
              {profile.feedback.map((fb) => (
                <div key={fb.id} className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#171044]">
                    <span>{fb.coachName} • {fb.title}</span>
                    <span className="text-[#171044]/50">{fb.date}</span>
                  </div>
                  <p className="text-xs text-[#171044]/80">{fb.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <motion.div key="tournaments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <AthleticBadge variant="orange">Active Tournament</AthleticBadge>
              <h3 className="text-2xl font-black font-display text-[#171044]">Active NB Cup 2026</h3>
              <p className="text-xs text-[#171044]/70">Next Match: Championship Final vs Victory FC (Oct 20, 2026)</p>
              <Link to="/tournaments/active-nb-cup-2026">
                <Button variant="primary" size="sm">View Tournament Hub</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {profile.achievements.map((a) => (
                <div key={a.id} className="bg-white p-5 rounded-2xl text-center space-y-2 border border-[#171044]/10">
                  <div className="text-3xl">{a.icon}</div>
                  <div className="font-bold text-xs text-[#171044]">{a.title}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
