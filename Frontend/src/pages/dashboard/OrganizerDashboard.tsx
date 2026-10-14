import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  academyApi,
  type OrganizerDashboardOverview,
  type TournamentItem,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import {
  Trophy,
  MapPin,
  UserCheck,
  Calendar,
  Plus,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { mapOrganizerDashboardCards } from '../../lib/dashboardMappers';

export const OrganizerDashboard: React.FC = () => {
  const [overview, setOverview] = useState<OrganizerDashboardOverview | null>(null);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, tournamentsData] = await Promise.all([
        academyApi.getDashboardOverview(),
        academyApi.listTournaments({ limit: 5 }),
      ]);
      if (overviewData && overviewData.role === 'Organizer') {
        setOverview(overviewData);
      }
      if (tournamentsData) {
        setTournaments(tournamentsData.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizer dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-8 h-8 animate-spin text-[#E65100]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Banner */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AthleticBadge variant="purple">ORGANIZER CONTROL CENTER</AthleticBadge>
            <span className="text-xs text-white/70">Season 2026</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight">
            Tournament Hub <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-sm text-white/80 mt-1 max-w-xl">
            Create and sanction athletic tournaments, manage participating team registrations, and allocate competition venues.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/tournaments">
            <button className="px-5 py-2.5 bg-[#FF5A00] text-white font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors flex items-center gap-1.5 shadow-md">
              <Plus size={16} /> New Tournament
            </button>
          </Link>
          <Link to="/dashboard/venues">
            <button className="px-5 py-2.5 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-colors flex items-center gap-1.5">
              <MapPin size={16} /> Venues
            </button>
          </Link>
        </div>
      </div>

      {/* Loading or Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Statistics Grid */}
      {(() => {
        const cards = mapOrganizerDashboardCards(overview);
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Total Tournaments</div>
              <div className="text-4xl font-black font-display text-[#171044]">{cards.totalTournaments}</div>
              <div className="text-xs font-bold text-[#FF5A00]">
                {cards.registrationOpen} Registration Open
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Pending Registrations</div>
              <div className="text-4xl font-black font-display text-[#FF5A00]">
                {cards.pendingRegistrations}
              </div>
              <div className="text-xs font-bold text-amber-600">Requires review</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">In Progress Tournaments</div>
              <div className="text-4xl font-black font-display text-[#4B2A9B]">
                {cards.inProgressTournaments}
              </div>
              <div className="text-xs font-bold text-emerald-600">Active competition</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-md space-y-1">
              <div className="text-xs font-bold uppercase text-[#171044]/60">Upcoming Matches</div>
              <div className="text-4xl font-black font-display text-[#171044]">
                {cards.upcomingMatches}
              </div>
              <div className="text-xs font-bold text-emerald-600">Scheduled fixtures</div>
            </div>
          </div>
        );
      })()}

      {/* Main Grid: Tournaments & Next Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tournaments Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                My Tournaments <CrossAccent color="orange" size="sm" />
              </h2>
              <Link
                to="/dashboard/tournaments"
                className="text-xs font-bold text-[#FF5A00] hover:underline flex items-center gap-1"
              >
                View Engine <ArrowRight size={14} />
              </Link>
            </div>

            {tournaments.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
                <Trophy size={36} className="mx-auto text-[#171044]/30" />
                <h3 className="font-display font-bold text-base text-[#171044]">
                  No Tournaments Created Yet
                </h3>
                <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                  Get started by sanctioning your first competitive tournament bracket.
                </p>
                <Link to="/dashboard/tournaments">
                  <button className="px-4 py-2 bg-[#FF5A00] text-white font-display font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#e04f00] transition-colors inline-flex items-center gap-1.5 mt-2">
                    <Plus size={14} /> Create Tournament
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 hover:border-[#FF5A00] transition-colors gap-3"
                  >
                    <div>
                      <div className="font-bold font-display text-[#171044] text-base">{t.name}</div>
                      <div className="text-xs text-[#171044]/70 font-medium">
                        {t.category} • {t.ageGroup} • {t.format}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full">
                        {t.status}
                      </span>
                      <Link
                        to={`/dashboard/tournaments/${t.id}`}
                        className="p-2 rounded-xl bg-white text-[#171044] hover:bg-[#FF5A00] hover:text-white transition-colors"
                        title="View Details"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Next Fixtures */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                Upcoming Fixtures <CrossAccent color="orange" size="sm" />
              </h2>
              <span className="text-xs font-bold text-[#171044]/60">Next 5 Matches</span>
            </div>

            {(!overview?.nextMatches || overview.nextMatches.length === 0) ? (
              <div className="py-12 text-center space-y-3 bg-[#F7F1E8]/50 rounded-2xl border border-dashed border-[#171044]/15">
                <Calendar size={36} className="mx-auto text-[#171044]/30" />
                <h3 className="font-display font-bold text-base text-[#171044]">
                  No Scheduled Fixtures
                </h3>
                <p className="text-xs text-[#171044]/60 max-w-xs mx-auto">
                  Matches scheduled under your sanctioned tournaments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.nextMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-[#F7F1E8] rounded-2xl border border-[#171044]/5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#171044]/60">
                      <span>{m.tournamentName}</span>
                      <span className="text-[#FF5A00]">{m.round}</span>
                    </div>
                    <div className="flex items-center justify-between font-black font-display text-sm text-[#171044]">
                      <span>{m.homeTeamName}</span>
                      <span className="text-xs font-bold text-[#171044]/40">vs</span>
                      <span>{m.awayTeamName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#171044]/70 pt-1 border-t border-[#171044]/5">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {m.venueName}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={12} /> {new Date(m.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
