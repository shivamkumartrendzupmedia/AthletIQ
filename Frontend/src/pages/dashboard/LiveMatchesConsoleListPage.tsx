import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type MatchItem,
  type TournamentItem,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import {
  Radio,
  Clock,
  MapPin,
  ArrowRight,
  RefreshCw,
  Trophy,
  Filter,
} from 'lucide-react';
import { formatSessionStartHint } from '../../lib/datetime';

export const LiveMatchesConsoleListPage: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isOfficial = user?.role === 'Official';

  const loadData = async (tourneyId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isOfficial) {
        // Official uses GET /api/matches/assigned
        const assigned = await academyApi.getAssignedMatches();
        setMatches(assigned || []);
      } else {
        // Admin and Organizer load active tournaments via GET /api/tournaments
        // and matches via GET /api/tournaments/:id/matches
        const tourneyRes = await academyApi.listTournaments({ limit: 20 });
        const tourneyList = tourneyRes.items || [];
        setTournaments(tourneyList);

        const targetId = tourneyId || selectedTournamentId || (tourneyList.length > 0 ? tourneyList[0].id : '');
        if (targetId) {
          setSelectedTournamentId(targetId);
          const matchRes = await academyApi.listMatches(targetId, { limit: 50 });
          setMatches(matchRes.items || []);
        } else {
          setMatches([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading matches for console');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleTournamentChange = (newTourneyId: string) => {
    setSelectedTournamentId(newTourneyId);
    void loadData(newTourneyId);
  };

  const getStatusVariant = (status: string): 'live' | 'orange' | 'lime' | 'white' | 'dark' => {
    switch (status) {
      case 'Live':
        return 'live';
      case 'HalfTime':
        return 'orange';
      case 'Completed':
        return 'lime';
      case 'Scheduled':
        return 'white';
      default:
        return 'dark';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Scorer Console Hub <CrossAccent color="orange" size="sm" />
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
              Live Matches & Dispatch
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {isOfficial
                ? 'Select an assigned fixture to begin scoring, record match events, and submit results.'
                : 'Manage live scoring and match events for active tournament fixtures.'}
            </p>
            <div className="mt-2 text-xs text-neutral-500 font-mono">
              Endpoint:{' '}
              {isOfficial
                ? 'GET /api/matches/assigned'
                : 'GET /api/tournaments & GET /api/tournaments/:id/matches'}
            </div>
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
              to="/live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Public Live Center <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Admin/Organizer Tournament Filter */}
      {!isOfficial && tournaments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/50 p-4">
          <Filter className="h-4 w-4 text-neutral-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Tournament:
          </span>
          <select
            value={selectedTournamentId}
            onChange={(e) => handleTournamentChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Matches Grid / List */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {isOfficial ? 'Your Assigned Fixtures' : 'Tournament Matches'}
            </h2>
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-neutral-300">
              {matches.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-neutral-400">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-neutral-500 mb-3" />
            Loading match fixtures...
          </div>
        ) : matches.length === 0 ? (
          <div className="py-16 text-center rounded-xl border border-dashed border-white/10 bg-neutral-950/40 p-8">
            <Radio className="mx-auto h-10 w-10 text-neutral-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No Matches Available</h3>
            <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
              {isOfficial
                ? 'You do not have any matches assigned to your referee account.'
                : 'No matches found in the selected tournament.'}
            </p>
            <div className="mt-4">
              <button
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Reload Fixtures
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => {
              const homeName = m.homeTeam?.team?.name || 'Home Team';
              const awayName = m.awayTeam?.team?.name || 'Away Team';
              const tourneyName =
                typeof m.tournament === 'object' && m.tournament !== null
                  ? m.tournament.name
                  : 'Tournament';
              const isLive = m.status === 'Live' || m.status === 'HalfTime';

              return (
                <div
                  key={m.id}
                  className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                    isLive
                      ? 'border-rose-500/40 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                      : 'border-white/10 bg-neutral-950/50 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-400 truncate max-w-[180px]">
                        {tourneyName}
                      </span>
                      <AthleticBadge variant={getStatusVariant(m.status)} size="sm">
                        {m.status === 'Live' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping mr-1" />}
                        {m.status}
                      </AthleticBadge>
                    </div>

                    {/* Teams and Live Score */}
                    <div className="py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-base truncate max-w-[160px]">
                          {homeName}
                        </span>
                        <span className="text-xl font-black text-white font-mono">
                          {m.liveScore ? m.liveScore.home : m.result ? m.result.homeScore : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-white text-base truncate max-w-[160px]">
                          {awayName}
                        </span>
                        <span className="text-xl font-black text-white font-mono">
                          {m.liveScore ? m.liveScore.away : m.result ? m.result.awayScore : 0}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Round {m.round} • {formatSessionStartHint(m.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{m.venue?.name || 'Pitch Venue'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/10">
                    <Link
                      to={`/dashboard/live/${m.id}`}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-colors ${
                        isLive
                          ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-md shadow-rose-500/20'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {isLive ? 'Open Live Scorer Console' : 'Open Match Console'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
