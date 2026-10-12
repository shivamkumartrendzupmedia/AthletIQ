import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  academyApi,
  type PublicMatchDetail,
  type MatchReportData,
  type StandingsRow,
  type TopScorerRow,
} from '../services/academyApi';
import { useLiveMatchPolling, type MatchLiveStatus } from '../hooks/useLiveMatchPolling';
import { Card, CrossAccent, AthleticBadge } from '../design-system';
import {
  ArrowLeft,
  Radio,
  Clock,
  MapPin,
  Trophy,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  ArrowRightLeft,
  ListOrdered,
} from 'lucide-react';

export const PublicMatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<PublicMatchDetail | null>(null);
  const [report, setReport] = useState<MatchReportData | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'report' | 'standings'>('timeline');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Fetch Public Match Details
  const fetchMatchDetails = useCallback(
    async (_signal?: AbortSignal): Promise<string | undefined> => {
      if (!id) return;
      try {
        const res = await academyApi.getPublicMatchById(id);
        if (!res || !res.match) {
          setIsNotFound(true);
          return;
        }
        setMatch(res.match);
        setIsNotFound(false);
        setErrorBanner(null);

        // If Completed, also load match report (at most 2 requests on initial load)
        if (res.match.status === 'Completed' && !report) {
          try {
            const reportData = await academyApi.getPublicMatchReport(id);
            if (reportData) setReport(reportData);
          } catch {
            // Optional report load failure does not fail match view
          }
        }
        return res.serverTime || new Date().toISOString();
      } catch (err: unknown) {
        const errorObj = err as { status?: number; message?: string };
        if (errorObj?.status === 404) {
          setIsNotFound(true);
        } else {
          setErrorBanner(errorObj?.message || 'Failed to load match center details');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [id, report]
  );

  useEffect(() => {
    void fetchMatchDetails();
  }, [fetchMatchDetails]);

  // Load standings on tab switch
  const loadTabContent = (tab: 'standings') => {
    setActiveTab(tab);
  };

  const matchStatus = (match?.status as MatchLiveStatus) || 'Scheduled';
  const isLive = matchStatus === 'Live' || matchStatus === 'HalfTime';

  // Shared Polling Hook
  const { isReconnecting, lastUpdatedLabel, refresh } = useLiveMatchPolling({
    fetchFn: fetchMatchDetails,
    matchStatus,
    enabled: Boolean(id && !isNotFound && isLive),
  });

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Match Not Found</h2>
          <p className="text-sm text-neutral-400">
            This fixture may have been moved, deleted, or is not currently open to the public.
          </p>
          <div className="pt-4">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              View All Live Matches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 text-center">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-rose-500 mb-3" />
        <p className="text-sm font-medium text-neutral-400">Loading Live Match Center...</p>
      </div>
    );
  }

  const events = match.events || [];

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Live Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/live')}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Hub
          </button>

          <div className="flex items-center gap-3">
            {isReconnecting && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/10"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>

        {errorBanner && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-300">
            {errorBanner}
          </div>
        )}

        {/* HERO MATCH SCOREBOARD */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 via-neutral-900 to-black p-8 md:p-12 shadow-2xl">
          {/* Tournament Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
              <Trophy className="h-4 w-4 text-emerald-400" />
              <span>
                {match.tournamentName} • Round {match.round}
                {match.group ? ` (${match.group})` : ''} <CrossAccent color="orange" size="sm" />
              </span>
            </div>
            <AthleticBadge
              variant={
                match.status === 'Live'
                  ? 'live'
                  : match.status === 'HalfTime'
                  ? 'orange'
                  : match.status === 'Completed'
                  ? 'lime'
                  : 'dark'
              }
              size="md"
            >
              {match.status === 'Live' && (
                <span className="inline-block h-2 w-2 rounded-full bg-rose-400 animate-ping mr-1.5" />
              )}
              {match.status === 'HalfTime' ? 'HALF TIME' : match.status.toUpperCase()}
            </AthleticBadge>
          </div>

          {/* Score & Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 text-center">
            {/* Home Team */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-white">
                  {match.homeTeamName.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white truncate">
                {match.homeTeamName}
              </h2>
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Home</span>
            </div>

            {/* Big Score & Live Minute */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-neutral-950/80 px-8 py-3.5 shadow-inner">
                <span className="text-5xl md:text-6xl font-black font-mono text-white tracking-tight">
                  {match.score.home}
                </span>
                <span className="text-3xl font-bold text-neutral-600">:</span>
                <span className="text-5xl md:text-6xl font-black font-mono text-white tracking-tight">
                  {match.score.away}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm font-bold text-rose-400 font-mono">
                <Clock className="h-4 w-4" />
                <span>
                  {match.status === 'Completed'
                    ? 'Full Time (FT)'
                    : match.status === 'HalfTime'
                    ? 'Half Time (HT)'
                    : `${match.minuteEstimate}'`}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                <span>{match.venueName}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-white">
                  {match.awayTeamName.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white truncate">
                {match.awayTeamName}
              </h2>
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Away</span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-white/10 gap-8">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'timeline'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Live Timeline ({events.length})
          </button>

          {match.status === 'Completed' && (
            <button
              onClick={() => setActiveTab('report')}
              className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'report'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              Match Summary Report
            </button>
          )}

          <button
            onClick={() => void loadTabContent('standings')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'standings'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Standings & Leaders
          </button>
        </div>

        {/* TAB 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <Card className="p-6 md:p-8 border-white/10 bg-neutral-900/40">
            <h3 className="text-base font-bold text-white mb-6">Play-by-Play Event Timeline</h3>
            {events.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-500">
                <Radio className="mx-auto h-8 w-8 text-neutral-700 mb-2" />
                No match events have been logged yet for this fixture.
              </div>
            ) : (
              <div className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-2 before:w-[2px] before:bg-white/10 space-y-6">
                {events.map((ev) => {
                  const isHome = ev.side === 'home';
                  const teamName = isHome ? match.homeTeamName : match.awayTeamName;

                  return (
                    <div key={ev.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 border border-white/20 text-xs">
                        {ev.type === 'Goal' && '⚽'}
                        {ev.type === 'OwnGoal' && '🔴'}
                        {ev.type === 'YellowCard' && '🟨'}
                        {ev.type === 'RedCard' && '🟥'}
                        {ev.type === 'Substitution' && '🔄'}
                      </span>

                      <div className="flex-1 rounded-xl border border-white/5 bg-neutral-950/60 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-400">
                              {ev.minute}&apos;
                            </span>
                            <span className="text-sm font-bold text-white">{ev.type}</span>
                            <span className="text-xs text-neutral-400">• {teamName}</span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-neutral-300">
                          {ev.type === 'Substitution' ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <User className="h-3 w-3" /> In: {ev.playerName}
                              </span>
                              <ArrowRightLeft className="h-3 w-3 text-neutral-500" />
                              <span className="text-neutral-400">
                                Out: {ev.relatedPlayerName || 'Off'}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium">{ev.playerName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* TAB 2: POST MATCH REPORT */}
        {activeTab === 'report' && (
          <Card className="p-6 md:p-8 border-white/10 bg-neutral-900/40 space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Official Match Summary Report</h3>
            </div>

            {report ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 text-center">
                    <span className="text-xs text-neutral-400 uppercase font-semibold">Result</span>
                    <p className="text-2xl font-black text-white mt-1">
                      {report.score.home} - {report.score.away}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 text-center">
                    <span className="text-xs text-neutral-400 uppercase font-semibold">Yellow Cards</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">
                      {report.cards.yellow}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-950 p-4 text-center">
                    <span className="text-xs text-neutral-400 uppercase font-semibold">Red Cards</span>
                    <p className="text-2xl font-black text-rose-400 mt-1">
                      {report.cards.red}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-3">Scored Events</h4>
                  <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-neutral-950/40">
                    {report.events.map((re, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 text-xs">
                        <span className="font-mono text-rose-400 font-bold">{re.minute}&apos;</span>
                        <span className="font-semibold text-white">{re.type}</span>
                        <span className="text-neutral-400">{re.side === 'home' ? match.homeTeamName : match.awayTeamName}</span>
                        <span className="text-neutral-300 font-medium">{re.player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Match report loading or currently finalizing.</p>
            )}
          </Card>
        )}

        {/* TAB 3: STANDINGS */}
        {activeTab === 'standings' && (
          <Card className="p-6 md:p-8 border-white/10 bg-neutral-900/40">
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered className="h-5 w-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Tournament Overview & Standings</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-6">
              Official standings and statistics are updated dynamically upon match completion.
            </p>
            <div className="text-center py-10 rounded-xl border border-dashed border-white/10 bg-neutral-950/50">
              <Trophy className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
              <p className="text-sm font-semibold text-white">Standings Tracking</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Visit the tournament details page to view comprehensive league tables and top scorer standings.
              </p>
              <div className="mt-4">
                <Link
                  to="/tournaments"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/20"
                >
                  Browse Tournament Tables
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
