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
      <div className="py-20 text-center text-[#171044]/60 text-sm font-semibold">
        Loading analytics overview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card variant="standard" className="p-10 text-center space-y-3 bg-white border border-[#171044]/10 rounded-3xl shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#171044]/5 flex items-center justify-center mx-auto text-[#171044]/40">
          <TrendingUp size={24} />
        </div>
        <h3 className="text-base font-bold text-[#171044]">Analytics Unavailable</h3>
        <p className="text-xs text-[#171044]/60 max-w-sm mx-auto font-medium">
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
          <h1 className="text-2xl md:text-3xl font-black font-display text-[#171044]">
            ANALYTICS & METRICS <CrossAccent color="orange" size="sm" />
          </h1>
          <AthleticBadge variant="orange" size="sm">
            {data.role} Overview
          </AthleticBadge>
        </div>
        <p className="text-xs text-[#171044]/60 font-medium">
          Continuous 8-week trend trajectory aligned to Monday 00:00 UTC ISO weekly buckets.
        </p>
      </div>

      {/* Role-specific content */}
      {data.role === 'Admin' && (
        <div className="space-y-6">
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Attendance Rate</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">{data.attendanceRate}%</div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Academy-wide average</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tournaments</span>
                <Trophy size={16} className="text-[#FF5A00]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.tournamentSummary.totalTournaments}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Total competitions</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Matches</span>
                <Calendar size={16} className="text-[#4B2A9B]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.tournamentSummary.totalMatches}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Scheduled matches</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
                <Award size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.tournamentSummary.completedMatches}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Completed fixtures</div>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Registrations Chart */}
            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Weekly User Registrations</h3>
                <p className="text-[11px] text-[#171044]/60">New registrations grouped Monday 00:00 UTC</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
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
                      <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-[#FF5A00]">
                        {bucket.count}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#FF5A00]/20 to-[#FF5A00] rounded-t-lg transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Weekly Sessions Chart */}
            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Weekly Training Sessions</h3>
                <p className="text-[11px] text-[#171044]/60">Sessions conducted across all teams</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
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
                      <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-[#4B2A9B]">
                        {bucket.count}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#4B2A9B]/20 to-[#4B2A9B] rounded-t-lg transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
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
            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Managed Teams</span>
                <Trophy size={16} className="text-[#FF5A00]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">{data.teamCount}</div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Active coaching squads</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Roster Athletes</span>
                <Users size={16} className="text-[#4B2A9B]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">{data.athleteCount}</div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Athletes in your teams</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tracking Window</span>
                <Calendar size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">8 Weeks</div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Historical trend window</div>
            </Card>
          </div>

          {/* Coach Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Team Attendance Rate Trend (%)</h3>
                <p className="text-[11px] text-[#171044]/60">Percentage of athletes attending sessions</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
                {data.weeklyAttendance.map((bucket) => {
                  const heightPercent = Math.max(8, bucket.rate);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-emerald-600">
                        {bucket.rate}%
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-lg transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Skill Assessment Average Trend</h3>
                <p className="text-[11px] text-[#171044]/60">Average overall score recorded per week</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
                {data.skillAssessmentsTrend.map((bucket) => {
                  const heightPercent = Math.max(8, (bucket.averageScore / 10) * 100);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-[#FF5A00]">
                        {bucket.averageScore > 0 ? bucket.averageScore : '—'}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#FF5A00]/20 to-[#FF5A00] rounded-t-lg transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
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
            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Goals</span>
                <Target size={16} className="text-[#FF5A00]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.goalsSummary.active}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Goals currently in progress</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Achieved Goals</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.goalsSummary.achieved}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Target milestones reached</div>
            </Card>

            <Card variant="standard" className="p-5 space-y-1 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#171044]/60 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Goals</span>
                <Award size={16} className="text-[#4B2A9B]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-[#171044]">
                {data.goalsSummary.total}
              </div>
              <div className="text-[10px] text-[#171044]/50 font-medium">Total goals tracked</div>
            </Card>
          </div>

          {/* Athlete Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Weekly Session Attendance</h3>
                <p className="text-[11px] text-[#171044]/60">Attended vs scheduled sessions</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
                {data.weeklyAttendance.map((bucket) => {
                  const rate = bucket.total > 0 ? (bucket.attended / bucket.total) * 100 : 0;
                  const heightPercent = Math.max(8, rate);
                  return (
                    <div
                      key={bucket.weekStart}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-emerald-600">
                        {bucket.attended}/{bucket.total}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-lg transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="standard" className="p-6 space-y-4 bg-white border border-[#171044]/10 rounded-2xl shadow-sm">
              <div>
                <h3 className="font-bold text-[#171044] text-sm">Skill Progression History</h3>
                <p className="text-[11px] text-[#171044]/60">Technical, physical, and tactical ratings</p>
              </div>

              {data.skillProgression.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-[#171044]/40 font-medium">
                  No skill assessments recorded yet.
                </div>
              ) : (
                <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#171044]/10">
                  {data.skillProgression.slice(-8).map((item, idx) => {
                    const heightPercent = Math.max(8, (item.overall / 10) * 100);
                    const dateObj = new Date(item.date);
                    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-2 group relative"
                      >
                        <div className="text-[10px] font-bold text-[#171044]/70 group-hover:text-[#FF5A00]">
                          {item.overall}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[28px] bg-gradient-to-t from-[#FF5A00]/20 to-[#FF5A00] rounded-t-lg transition-all group-hover:brightness-110"
                        />
                        <span className="text-[9px] text-[#171044]/50 whitespace-nowrap mt-1 font-semibold">
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
