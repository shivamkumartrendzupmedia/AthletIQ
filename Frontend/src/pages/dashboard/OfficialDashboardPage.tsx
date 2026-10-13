import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  academyApi,
  type OfficialDashboardOverview,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import {
  Calendar,
  Clock,
  Radio,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Trophy,
  MapPin,
} from 'lucide-react';
import { formatSessionStartHint } from '../../lib/datetime';
import { mapOfficialDashboardCards } from '../../lib/dashboardMappers';

export const OfficialDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OfficialDashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await academyApi.getDashboardOverview();
      if (data && data.role === 'Official') {
        setOverview(data);
      } else {
        setError('Failed to load official dashboard profile data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const matches = overview?.matches || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Official Portal <CrossAccent color="orange" size="sm" />
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
              Match Official Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Manage live scoring, log match events, and track assigned fixtures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/dashboard/live"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Radio className="h-4 w-4" />
              Live Console
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      {(() => {
        const cards = mapOfficialDashboardCards(overview);
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Assigned</span>
                <Trophy className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-white">{cards.totalAssigned}</p>
              <span className="text-xs text-neutral-500">Active assigned fixtures</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium uppercase tracking-wider">Upcoming</span>
                <Calendar className="h-4 w-4 text-sky-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-white">{cards.upcoming}</p>
              <span className="text-xs text-neutral-500">Scheduled next</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-medium uppercase tracking-wider">Tournaments</span>
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-black text-white">{cards.assignedTournaments}</p>
              <span className="text-xs text-neutral-500">Active tournament events</span>
            </div>
          </div>
        );
      })()}

      {/* Assigned Matches Section */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Assigned Matches</h2>
          </div>
          <Link
            to="/dashboard/live"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            Open Live Console <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-neutral-400">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-neutral-500 mb-2" />
            Loading assigned matches...
          </div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-neutral-950/40 p-8">
            <ShieldCheck className="mx-auto h-10 w-10 text-neutral-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No Assigned Matches</h3>
            <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
              You do not have any matches assigned at the moment. When tournament organizers assign you as referee, they will appear here.
            </p>
            <div className="mt-4">
              <Link
                to="/dashboard/live"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Go to Match Console
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between hover:bg-white/[0.02] px-3 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AthleticBadge variant="dark" size="sm">
                      {m.tournamentName}
                    </AthleticBadge>
                    <span className="text-xs text-neutral-400">Round {m.round}</span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {m.homeTeamName} <span className="text-neutral-500 font-normal">vs</span> {m.awayTeamName}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      {formatSessionStartHint(String(m.scheduledAt))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                      {m.venueName}
                    </span>
                  </div>
                </div>

                <div>
                  <Link
                    to={`/dashboard/live/${m.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    Open Console
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
