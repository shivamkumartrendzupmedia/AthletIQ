import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import {
  Radio,
  ArrowRight,
  Clock,
  MapPin,
  RefreshCw,
  Trophy,
  Activity,
  Flame,
} from 'lucide-react';
import {
  academyApi,
  type PublicLiveMatchItem,
} from '../services/academyApi';
import { useLiveMatchPolling } from '../hooks/useLiveMatchPolling';

export const PublicLiveMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<PublicLiveMatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fetchLiveMatches = useCallback(
    async (_signal?: AbortSignal): Promise<string | undefined> => {
      try {
        const response = await academyApi.getPublicLiveMatches();
        setMatches(response?.matches || []);
        setErrorBanner(null);
        return response?.serverTime || new Date().toISOString();
      } catch (err) {
        setErrorBanner(err instanceof Error ? err.message : 'Failed to fetch live matches');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchLiveMatches();
  }, [fetchLiveMatches]);

  // Polling via shared hook
  const { isReconnecting, lastUpdatedLabel, refresh } = useLiveMatchPolling({
    fetchFn: fetchLiveMatches,
    matchStatus: 'Live',
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-black p-8 md:p-12 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Real-Time Match Center <CrossAccent color="orange" size="sm" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Live Matches
              </h1>
              <p className="text-neutral-400 text-sm md:text-base max-w-xl">
                Real-time scores, active tournament timelines, and live play-by-play updates.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {isReconnecting && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Reconnecting...
                </span>
              )}
              {lastUpdatedLabel && (
                <span className="text-xs text-neutral-400 font-mono">
                  Updated: {lastUpdatedLabel}
                </span>
              )}
              <button
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </button>
            </div>
          </div>
        </div>

        {errorBanner && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-300">
            {errorBanner}
          </div>
        )}

        {/* Live Matches List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500" />
              <h2 className="text-xl font-bold text-white">In Play Now</h2>
              <span className="ml-2 rounded-full bg-rose-500/20 text-rose-400 px-2.5 py-0.5 text-xs font-bold font-mono">
                {matches.length}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-24 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-rose-500 mb-3" />
              <p className="text-sm font-medium text-neutral-400">Scanning for live matches...</p>
            </div>
          ) : matches.length === 0 ? (
            /* Empty State */
            <Card className="py-16 text-center border-dashed border-white/10 bg-neutral-950/50">
              <Activity className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
              <h3 className="text-lg font-bold text-white">No live matches right now</h3>
              <p className="mt-2 text-sm text-neutral-400 max-w-md mx-auto">
                There are no active matches taking place at this moment. Check upcoming tournament schedules and brackets in the tournament directory.
              </p>
              <div className="mt-6">
                <Link
                  to="/tournaments"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Trophy className="h-4 w-4" />
                  Explore Tournaments
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((m) => {
                const isHalfTime = m.status === 'HalfTime';

                return (
                  <Link
                    key={m.id}
                    to={`/matches/${m.id}`}
                    className="group relative flex flex-col justify-between rounded-2xl border border-rose-500/30 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 shadow-xl hover:border-rose-500/60 hover:shadow-rose-950/20 transition-all duration-300"
                  >
                    <div className="space-y-4">
                      {/* Tournament & Status */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-400 truncate max-w-[180px]">
                          {m.tournamentName} • Round {m.round}
                        </span>
                        <AthleticBadge variant={isHalfTime ? 'orange' : 'live'} size="sm">
                          {!isHalfTime && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping mr-1" />
                          )}
                          {isHalfTime ? 'HALF TIME' : 'LIVE'}
                        </AthleticBadge>
                      </div>

                      {/* Teams & Large Score */}
                      <div className="space-y-2 py-1">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-white truncate max-w-[170px] group-hover:text-rose-400 transition-colors">
                            {m.homeTeamName}
                          </span>
                          <span className="text-2xl font-black font-mono text-white">
                            {m.score.home}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-white truncate max-w-[170px] group-hover:text-rose-400 transition-colors">
                            {m.awayTeamName}
                          </span>
                          <span className="text-2xl font-black font-mono text-white">
                            {m.score.away}
                          </span>
                        </div>
                      </div>

                      {/* Minute & Venue Footer */}
                      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold font-mono">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{isHalfTime ? 'HT 45\'' : `${m.minuteEstimate}'`}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          <span className="truncate">{m.venueName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-rose-400 group-hover:text-rose-300">
                      <span>Open Match Center</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
