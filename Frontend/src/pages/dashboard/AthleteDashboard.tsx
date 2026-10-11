import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  academyApi,
  type AthleteDashboardOverview,
  type AthleteDevelopmentView,
} from '../../services/academyApi';
import { useAuth } from '../../context/AuthContext';
import { AthletiqRadarChart } from '../../design-system/AthletiqCharts';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { getInitials } from '../../components/SafeImage';
import {
  User,
  Calendar,
  Activity,
  Target,
  MessageSquare,
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  MapPin,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const AthleteDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AthleteDashboardOverview | null>(null);
  const [devData, setDevData] = useState<AthleteDevelopmentView | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'next-training' | 'performance' | 'goals' | 'feedback' | 'matches'
  >('next-training');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashData, devResult] = await Promise.all([
        academyApi.getDashboardOverview(),
        academyApi.getAthleteSelfDevelopment().catch(() => null),
      ]);
      if (dashData && dashData.role === 'Athlete') {
        setOverview(dashData);
      }
      if (devResult) {
        setDevData(devResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athlete dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayName = overview?.displayName || user?.name || 'Athlete';
  const teamName = overview?.teamName || devData?.athlete.teamName || 'Unassigned';
  const attendanceRate =
    overview?.attendanceRate !== null && overview?.attendanceRate !== undefined
      ? `${overview.attendanceRate}%`
      : devData?.attendanceRate !== null && devData?.attendanceRate !== undefined
      ? `${devData.attendanceRate}%`
      : 'N/A';
  const ovrRating =
    overview?.latestAssessmentOverallScore ??
    devData?.skillCategoryAverages?.overall ??
    null;

  const radarMetrics = devData?.skillCategoryAverages
    ? [
        { label: 'Technical', value: Math.round(devData.skillCategoryAverages.technical * 10) },
        { label: 'Tactical', value: Math.round(devData.skillCategoryAverages.tactical * 10) },
        { label: 'Physical', value: Math.round(devData.skillCategoryAverages.physical * 10) },
        { label: 'Mental', value: Math.round(devData.skillCategoryAverages.mental * 10) },
      ]
    : [];

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Welcome Card */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#171044]/10 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <AthleticBadge variant="orange">ATHLETE PORTAL</AthleticBadge>
              <AthleticBadge variant="lime">{teamName}</AthleticBadge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display text-[#171044] uppercase tracking-tight">
              Welcome back, <br />
              {displayName}! 👋 <CrossAccent color="orange" size="lg" />
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/athlete/me">
                <Button variant="primary" size="sm">
                  <User size={16} /> View Full Profile &amp; Development
                </Button>
              </Link>
              <span className="text-xs font-extrabold text-[#171044]/60">
                OVR Index:{' '}
                <strong className="text-[#FF5A00] font-black text-sm">
                  {ovrRating !== null ? `${ovrRating} OVR` : 'Unrated'}
                </strong>
              </span>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="text-xs font-bold text-[#171044]/60 hover:text-[#171044] flex items-center gap-1.5 transition-colors"
                title="Refresh dashboard data"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="relative rounded-3xl overflow-hidden border-4 border-[#171044]/15 shadow-2xl max-w-xs w-full bg-[#171044] flex items-center justify-center p-6 text-center">
              <div className="space-y-3">
                <div className="w-24 h-24 rounded-2xl bg-[#FF5A00] text-white flex items-center justify-center text-3xl font-black mx-auto shadow-inner">
                  {getInitials(displayName)}
                </div>
                <div>
                  <h3 className="text-white font-black font-display text-lg tracking-wide uppercase">
                    {displayName}
                  </h3>
                  <p className="text-[#D8F500] text-xs font-bold">
                    {devData?.athlete.position ? `${devData.athlete.position} • ` : ''}
                    {teamName}
                  </p>
                </div>
                {devData?.athlete.jerseyNumber !== undefined && devData?.athlete.jerseyNumber !== null && (
                  <div className="inline-block bg-white/10 px-3 py-1 rounded-xl text-white text-xs font-black">
                    Jersey #{devData.athlete.jerseyNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white border border-[#171044]/10 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#171044]/60">Attendance Rate</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171044] mt-2 font-display">
            {attendanceRate}
          </div>
          <p className="text-[11px] text-[#171044]/60 mt-1">Past 30 days attendance</p>
        </Card>

        <Card className="p-5 bg-white border border-[#171044]/10 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#171044]/60">Active Goals</span>
            <div className="p-2 bg-[#FF5A00]/10 rounded-xl text-[#FF5A00]">
              <Target size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171044] mt-2 font-display">
            {overview?.activeGoalsCount ?? devData?.goals?.filter((g) => g.status === 'Active').length ?? 0}
          </div>
          <p className="text-[11px] text-[#171044]/60 mt-1">Development targets</p>
        </Card>

        <Card className="p-5 bg-white border border-[#171044]/10 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#171044]/60">Coach Feedback</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171044] mt-2 font-display">
            {overview?.unacknowledgedFeedbackCount ?? devData?.feedback?.filter((f) => !f.acknowledgedAt).length ?? 0}
          </div>
          <p className="text-[11px] text-[#171044]/60 mt-1">Unacknowledged notes</p>
        </Card>

        <Card className="p-5 bg-white border border-[#171044]/10 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#171044]/60">Next Matches</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Trophy size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171044] mt-2 font-display">
            {overview?.nextMatches?.length ?? 0}
          </div>
          <p className="text-[11px] text-[#171044]/60 mt-1">Scheduled tournament ties</p>
        </Card>
      </div>

      {/* DASHBOARD TABS */}
      <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-[#171044]/10 scrollbar-none">
        {[
          { id: 'next-training', label: 'Upcoming Training', icon: <Calendar size={16} /> },
          { id: 'performance', label: 'Performance Radar', icon: <Activity size={16} /> },
          { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
          { id: 'feedback', label: 'Coach Feedback', icon: <MessageSquare size={16} /> },
          { id: 'matches', label: 'Tournament Matches', icon: <Shield size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                  <AthleticBadge variant="lime">UPCOMING SESSIONS</AthleticBadge>
                  <h3 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-white mt-2">
                    Training Schedule
                  </h3>
                  <p className="text-xs text-white/70">Next scheduled sessions for your squad</p>
                </div>
              </div>

              {overview?.nextSessions && overview.nextSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {overview.nextSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-5 bg-white/10 rounded-2xl border border-white/10 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-[#D8F500] uppercase tracking-wider">
                          {session.type}
                        </span>
                        <span className="text-xs text-white/60">
                          {new Date(session.scheduledAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-black text-white">
                        {new Date(session.scheduledAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(session.endsAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/70">
                        <MapPin size={13} className="shrink-0 text-[#FF5A00]" />
                        <span className="truncate">{session.venue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-white/60 text-xs">
                  No upcoming training sessions scheduled for your team.
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-xs text-white/60">Squad Training Routine</span>
                <Link to="/athlete/me">
                  <button className="px-5 py-2 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors">
                    View Attendance Record
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* PERFORMANCE */}
        {activeTab === 'performance' && (
          <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center space-y-6 border border-white/10">
              <div className="text-center space-y-1">
                <AthleticBadge variant="orange">EVALUATION METRICS</AthleticBadge>
                <h3 className="text-2xl font-black font-display text-white uppercase tracking-tight mt-2">
                  Performance Radar
                </h3>
                <p className="text-xs text-white/60">
                  {ovrRating !== null ? `Current Overall Rating: ${ovrRating} OVR` : 'No verified score yet'}
                </p>
              </div>

              {radarMetrics.length > 0 ? (
                <AthletiqRadarChart
                  metrics={radarMetrics}
                  size={290}
                  colorScheme="lime"
                />
              ) : (
                <div className="text-center py-12 text-white/60 text-xs space-y-3">
                  <Activity size={32} className="mx-auto text-white/30" />
                  <p>No skill assessment completed yet for your profile.</p>
                  <p className="text-[11px] text-white/40">
                    Your coach will evaluate your technical, physical, and tactical capabilities.
                  </p>
                </div>
              )}

              <Link to="/athlete/me">
                <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10">
                  View Full Assessment History <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* GOALS */}
        {activeTab === 'goals' && (
          <motion.div key="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {devData?.goals && devData.goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {devData.goals.map((g) => (
                  <div
                    key={g.id}
                    className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black text-[#171044]">{g.title}</span>
                      <span className="text-xs font-black text-[#FF5A00]">{g.progress}%</span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-[#171044]/70 line-clamp-2">{g.description}</p>
                    )}
                    <div className="h-2.5 bg-[#171044]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF5A00] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, g.progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#171044]/50 pt-1">
                      <span>Status: {g.status}</span>
                      {g.targetDate && (
                        <span>
                          Target: {new Date(g.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2.5rem] border border-[#171044]/10 text-center space-y-3">
                <Target size={32} className="mx-auto text-[#171044]/30" />
                <h4 className="font-display font-black text-[#171044] uppercase">No Goals Set</h4>
                <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                  You do not have any active targets yet. Visit your development page to set your first goal.
                </p>
                <Link to="/athlete/me">
                  <Button variant="primary" size="sm" className="mt-2">
                    Open Development Portal
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* FEEDBACK */}
        {activeTab === 'feedback' && (
          <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {devData?.feedback && devData.feedback.length > 0 ? (
              <div className="space-y-4">
                {devData.feedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-2"
                  >
                    <div className="flex justify-between text-xs font-bold text-[#171044]">
                      <span>{fb.coach.name} • {fb.type}</span>
                      <span className="text-[#171044]/50">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#171044]/80">{fb.text}</p>
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#171044]/50">Feedback Type: {fb.type}</span>
                      {fb.acknowledgedAt ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Acknowledged
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">Unacknowledged</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2.5rem] border border-[#171044]/10 text-center space-y-3">
                <MessageSquare size={32} className="mx-auto text-[#171044]/30" />
                <h4 className="font-display font-black text-[#171044] uppercase">No Feedback Yet</h4>
                <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                  Your coaches have not recorded evaluation notes yet. Notes will appear here as soon as they are submitted.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* MATCHES */}
        {activeTab === 'matches' && (
          <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {overview?.nextMatches && overview.nextMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {overview.nextMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <AthleticBadge variant="orange">{m.tournamentName}</AthleticBadge>
                      <span className="text-[#171044]/60 font-bold">{m.round}</span>
                    </div>
                    <div className="text-base font-black text-[#171044] font-display flex items-center justify-between">
                      <span>{m.homeTeamName}</span>
                      <span className="text-xs text-[#FF5A00]">VS</span>
                      <span>{m.awayTeamName}</span>
                    </div>
                    <div className="text-xs text-[#171044]/70 flex items-center justify-between pt-2 border-t border-[#171044]/10">
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-[#FF5A00]" />
                        <span>{m.venueName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-[#171044]/60" />
                        <span>{new Date(m.scheduledAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2.5rem] border border-[#171044]/10 text-center space-y-3">
                <Trophy size={32} className="mx-auto text-[#171044]/30" />
                <h4 className="font-display font-black text-[#171044] uppercase">No Upcoming Matches</h4>
                <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                  Your team does not have any upcoming tournament matches scheduled at this time.
                </p>
                <Link to="/tournaments">
                  <Button variant="primary" size="sm" className="mt-2">
                    Browse All Tournaments
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
