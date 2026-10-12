import React, { useState, useEffect } from 'react';
import { Card, CrossAccent, AthleticBadge } from '../../design-system';
import {
  TrendingUp,
  Users,
  Calendar,
  Award,
  CheckCircle2,
  Trophy,
  Target,
} from 'lucide-react';
import { academyApi, type AnalyticsOverviewData } from '../../services/academyApi';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await academyApi.getAnalyticsOverview();
        if (mounted) setData(res);
      } catch {
        if (mounted) setError('Unable to load analytics data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-white/50 text-xs">
        Loading analytics overview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card variant="dark" className="p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
          <TrendingUp size={24} />
        </div>
        <h3 className="text-base font-bold text-white">Analytics Unavailable</h3>
        <p className="text-xs text-white/50 max-w-sm mx-auto">
          {error || 'Unable to load analytical metrics for your account role.'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl md:text-3xl font-black font-display text-white">
            ANALYTICS & METRICS <CrossAccent color="lime" size="sm" />
          </h1>
          <AthleticBadge variant="lime" size="sm">
            {data.role} Overview
          </AthleticBadge>
        </div>
        <p className="text-xs text-white/60">
          Continuous 8-week trend trajectory aligned to Monday 00:00 UTC ISO weekly buckets.
        </p>
      </div>

      {/* Role-specific content */}
      {data.role === 'Admin' && (
        <div className="space-y-6">
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Attendance Rate</span>
                <CheckCircle2 size={16} className="text-[#D8F500]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">{data.attendanceRate}%</div>
              <div className="text-[10px] text-white/50">Academy-wide average</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tournaments</span>
                <Trophy size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.tournamentSummary.totalTournaments}
              </div>
              <div className="text-[10px] text-white/50">Total competitions</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Matches</span>
                <Calendar size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.tournamentSummary.totalMatches}
              </div>
              <div className="text-[10px] text-white/50">Scheduled matches</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
                <Award size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.tournamentSummary.completedMatches}
              </div>
              <div className="text-[10px] text-white/50">Completed fixtures</div>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Registrations Chart */}
            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Weekly User Registrations</h3>
                <p className="text-[11px] text-white/50">New registrations grouped Monday 00:00 UTC</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                {data.weeklyRegistrations.map((bucket) => {
                  const maxCount = Math.max(
                    1,
                    ...data.weeklyRegistrations.map((b) => b.count)
                  );
                  const heightPercent = Math.max(8, (bucket.count / maxCount) * 100);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-white/70 group-hover:text-[#D8F500]">
                        {bucket.count}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#D8F500]/30 to-[#D8F500] rounded-t-lg transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Weekly Sessions Chart */}
            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Weekly Training Sessions</h3>
                <p className="text-[11px] text-white/50">Sessions conducted across all teams</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                {data.weeklySessions.map((bucket) => {
                  const maxCount = Math.max(
                    1,
                    ...data.weeklySessions.map((b) => b.count)
                  );
                  const heightPercent = Math.max(8, (bucket.count / maxCount) * 100);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-white/70 group-hover:text-cyan-400">
                        {bucket.count}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-cyan-500/30 to-cyan-400 rounded-t-lg transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {data.role === 'Coach' && (
        <div className="space-y-6">
          {/* Coach KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Managed Teams</span>
                <Trophy size={16} className="text-[#D8F500]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">{data.teamCount}</div>
              <div className="text-[10px] text-white/50">Active coaching squads</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Roster Athletes</span>
                <Users size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">{data.athleteCount}</div>
              <div className="text-[10px] text-white/50">Athletes in your teams</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tracking Window</span>
                <Calendar size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">8 Weeks</div>
              <div className="text-[10px] text-white/50">Historical trend window</div>
            </Card>
          </div>

          {/* Coach Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Team Attendance Rate Trend (%)</h3>
                <p className="text-[11px] text-white/50">Percentage of athletes attending sessions</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                {data.weeklyAttendance.map((bucket) => {
                  const heightPercent = Math.max(8, bucket.rate);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-white/70 group-hover:text-emerald-400">
                        {bucket.rate}%
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500/30 to-emerald-400 rounded-t-lg transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Skill Assessment Average Trend</h3>
                <p className="text-[11px] text-white/50">Average overall score recorded per week</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                {data.skillAssessmentsTrend.map((bucket) => {
                  const heightPercent = Math.max(8, (bucket.averageScore / 10) * 100);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-white/70 group-hover:text-[#D8F500]">
                        {bucket.averageScore > 0 ? bucket.averageScore : '—'}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#D8F500]/30 to-[#D8F500] rounded-t-lg transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {data.role === 'Athlete' && (
        <div className="space-y-6">
          {/* Athlete KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Goals</span>
                <Target size={16} className="text-[#D8F500]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.goalsSummary.active}
              </div>
              <div className="text-[10px] text-white/50">Goals currently in progress</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Achieved Goals</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.goalsSummary.achieved}
              </div>
              <div className="text-[10px] text-white/50">Target milestones reached</div>
            </Card>

            <Card variant="dark" className="p-5 space-y-1">
              <div className="flex items-center justify-between text-white/40 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Goals</span>
                <Award size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-white">
                {data.goalsSummary.total}
              </div>
              <div className="text-[10px] text-white/50">Total goals tracked</div>
            </Card>
          </div>

          {/* Athlete Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Weekly Session Attendance</h3>
                <p className="text-[11px] text-white/50">Attended vs scheduled sessions</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                {data.weeklyAttendance.map((bucket) => {
                  const rate = bucket.total > 0 ? (bucket.attended / bucket.total) * 100 : 0;
                  const heightPercent = Math.max(8, rate);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-white/70 group-hover:text-emerald-400">
                        {bucket.attended}/{bucket.total}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500/30 to-emerald-400 rounded-t-lg transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="dark" className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Skill Progression History</h3>
                <p className="text-[11px] text-white/50">Technical, physical, and tactical ratings</p>
              </div>

              {data.skillProgression.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-white/40">
                  No skill assessments recorded yet.
                </div>
              ) : (
                <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-white/10">
                  {data.skillProgression.slice(-8).map((item, idx) => {
                    const heightPercent = Math.max(8, (item.overall / 10) * 100);
                    const dateObj = new Date(item.date);
                    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-2 group relative"
                      >
                        <div className="text-[10px] font-bold text-white/70 group-hover:text-[#D8F500]">
                          {item.overall}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[28px] bg-gradient-to-t from-[#D8F500]/30 to-[#D8F500] rounded-t-lg transition-all group-hover:brightness-125"
                        />
                        <span className="text-[9px] text-white/40 whitespace-nowrap mt-1">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
