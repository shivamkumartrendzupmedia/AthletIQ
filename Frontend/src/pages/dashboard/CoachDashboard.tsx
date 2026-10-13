import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  academyApi,
  type CoachDashboardOverview,
  type AthleteItem,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import { SafeImage, getInitials, isValidImageUrl } from '../../components/SafeImage';
import {
  Users,
  Calendar,
  Plus,
  Shield,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { mapCoachDashboardCards } from '../../lib/dashboardMappers';

export const CoachDashboard: React.FC = () => {
  const [overview, setOverview] = useState<CoachDashboardOverview | null>(null);
  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teams' | 'athletes' | 'sessions'>('teams');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, athletesData] = await Promise.all([
        academyApi.getDashboardOverview(),
        academyApi.listAthletes({ limit: 12 }),
      ]);
      if (overviewData && overviewData.role === 'Coach') {
        setOverview(overviewData);
      }
      if (athletesData) {
        setAthletes(athletesData.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coach dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Banner */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AthleticBadge variant="lime">HEAD COACH HUB</AthleticBadge>
            <span className="text-xs text-white/70">Season 2026</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight">
            Team Control Center <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-sm text-white/80 mt-1 max-w-xl">
            Manage your squad assignments, coordinate scheduled training drills, log attendance, and review player development.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white/10 text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-white/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to="/dashboard/training">
            <button className="px-5 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-colors flex items-center gap-1.5 cursor-pointer">
              <Plus size={16} /> Schedule Session
            </button>
          </Link>
          <Link to="/dashboard/tournaments">
            <button className="px-5 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors flex items-center gap-1.5 shadow-md cursor-pointer">
              <Shield size={16} /> Register Team
            </button>
          </Link>
        </div>
      </div>

      {/* Error state if fetch fails */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Statistics Grid */}
      {(() => {
        const cards = mapCoachDashboardCards(overview);
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Assigned Teams</div>
              <div className="text-4xl font-black font-display text-[#171044]">
                {cards.assignedTeams}
              </div>
              <div className="text-xs font-bold text-emerald-600">Active squads</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Rostered Athletes</div>
              <div className="text-4xl font-black font-display text-[#FF5A00]">
                {cards.rosteredAthletes}
              </div>
              <div className="text-xs font-bold text-[#171044]/60">Across assigned teams</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Upcoming Drills</div>
              <div className="text-4xl font-black font-display text-[#4B2A9B]">
                {cards.upcomingDrills}
              </div>
              <div className="text-xs font-bold text-emerald-600">Next 5 sessions</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Attendance Rate</div>
              <div className="text-4xl font-black font-display text-[#171044]">
                {cards.attendanceRate}
              </div>
              <div className="text-xs font-bold text-[#171044]/60">Last 30 days</div>
            </div>
          </div>
        );
      })()}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#171044]/10 pb-3">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-[#171044] text-[#D8F500] shadow-md'
              : 'text-[#171044]/70 hover:bg-white/60'
          }`}
        >
          My Teams
        </button>
        <button
          onClick={() => setActiveTab('athletes')}
          className={`px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'athletes'
              ? 'bg-[#171044] text-[#D8F500] shadow-md'
              : 'text-[#171044]/70 hover:bg-white/60'
          }`}
        >
          Squad Athletes
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-[#171044] text-[#D8F500] shadow-md'
              : 'text-[#171044]/70 hover:bg-white/60'
          }`}
        >
          Upcoming Sessions
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'teams' && (
        <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Coached Teams <CrossAccent color="orange" size="sm" />
            </h2>
            <Link
              to="/dashboard/teams"
              className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1"
            >
              All Teams <ArrowRight size={14} />
            </Link>
          </div>

          {(!overview?.teams || overview.teams.length === 0) ? (
            <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
              <Shield size={36} className="mx-auto text-[#171044]/30" />
              <h3 className="font-display font-bold text-base text-[#171044]">
                No Teams Assigned
              </h3>
              <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                Once an administrator assigns you as head coach or assistant coach to an academy team, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {overview.teams.map((t) => (
                <div
                  key={t.id}
                  className="p-5 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 hover:border-[#FF5A00] transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <AthleticBadge variant="purple">TEAM</AthleticBadge>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-[#171044]">{t.name}</h3>
                  <div className="flex items-center justify-between text-xs text-[#171044]/70 pt-2 border-t border-[#171044]/10">
                    <span className="flex items-center gap-1 font-bold">
                      <Users size={14} /> {t.athleteCount} Athletes
                    </span>
                    <Link
                      to="/dashboard/training"
                      className="font-bold text-[#FF5A00] hover:underline"
                    >
                      Schedule Drill →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'athletes' && (
        <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Squad Athletes <CrossAccent color="orange" size="sm" />
            </h2>
            <Link
              to="/dashboard/athletes"
              className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1"
            >
              Full Roster <ArrowRight size={14} />
            </Link>
          </div>

          {athletes.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
              <Users size={36} className="mx-auto text-[#171044]/30" />
              <h3 className="font-display font-bold text-base text-[#171044]">
                No Athletes Found
              </h3>
              <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                Athletes rostered in your teams will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {athletes.map((ath) => {
                const athleteName = ath.user?.name || 'Athlete';
                return (
                  <div
                    key={ath.id}
                    className="p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#171044] flex items-center justify-center text-white font-bold text-xs shrink-0 border-2 border-[#171044]">
                        {ath.user?.avatar && isValidImageUrl(ath.user.avatar) ? (
                          <SafeImage
                            src={ath.user.avatar}
                            alt={athleteName}
                            fallbackKind="person"
                            name={athleteName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(athleteName, 'A')}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold font-display text-sm text-[#171044]">
                          {athleteName}
                        </div>
                        <div className="text-[11px] text-[#171044]/60">
                          {ath.team?.name || 'Assigned Team'}
                          {ath.jerseyNumber ? ` • #${ath.jerseyNumber}` : ''}
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/athlete/${ath.id}`}
                      className="p-2 rounded-xl bg-white text-[#171044] hover:bg-[#FF5A00] hover:text-white transition-colors"
                      title="View Profile"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
              Upcoming Training Sessions <CrossAccent color="orange" size="sm" />
            </h2>
            <Link
              to="/dashboard/training"
              className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1"
            >
              Calendar Schedule <ArrowRight size={14} />
            </Link>
          </div>

          {(!overview?.nextSessions || overview.nextSessions.length === 0) ? (
            <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
              <Calendar size={36} className="mx-auto text-[#171044]/30" />
              <h3 className="font-display font-bold text-base text-[#171044]">
                No Sessions Scheduled
              </h3>
              <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                Schedule your next tactical drill or conditioning workout on the training calendar.
              </p>
              <Link to="/dashboard/training">
                <button className="px-4 py-2 bg-[#D8F500] text-[#171044] font-display font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-colors inline-flex items-center gap-1.5 mt-2 cursor-pointer">
                  <Plus size={14} /> Add Session
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.nextSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AthleticBadge variant="lime" size="sm">
                        {s.teamName}
                      </AthleticBadge>
                      <span className="text-xs font-bold text-[#171044]">{s.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#171044]/70">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {s.venue}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={12} /> {new Date(s.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/dashboard/training"
                    className="px-3.5 py-1.5 bg-white text-[#171044] font-bold text-xs rounded-xl hover:bg-[#FF5A00] hover:text-white transition-colors self-end sm:self-center"
                  >
                    Manage Roster
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
