import React, { useEffect, useState, useCallback, useId } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  academyApi,
  type MatchItem,
  type MatchEventItem,
} from '../../services/academyApi';
import {
  useLiveMatchPolling,
  type MatchLiveStatus,
} from '../../hooks/useLiveMatchPolling';
import { CrossAccent, AthleticBadge } from '../../design-system';
import {
  ArrowLeft,
  Radio,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Clock,
  Plus,
  RefreshCw,
  Trophy,
  Shield,
  User,
  ArrowRightLeft,
} from 'lucide-react';
import { buildMatchStatusPayload, buildMatchEventPayload } from '../../lib/matchPayloads';

type EventType = 'Goal' | 'OwnGoal' | 'YellowCard' | 'RedCard' | 'Substitution';
type EventSide = 'home' | 'away';

export const ScorerConsolePage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchItem | null>(null);
  const [events, setEvents] = useState<MatchEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form State
  const [eventType, setEventType] = useState<EventType>('Goal');
  const [eventSide, setEventSide] = useState<EventSide>('home');
  const [eventMinute, setEventMinute] = useState<number>(1);
  const [playerInput, setPlayerInput] = useState<string>('');
  const [relatedPlayerInput, setRelatedPlayerInput] = useState<string>('');
  const [eventNote, setEventNote] = useState<string>('');

  // Confirmation Modals State
  const [confirmTransition, setConfirmTransition] = useState<'Completed' | 'Cancelled' | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const eventTypeSelectId = useId();
  const eventSideSelectId = useId();
  const eventMinuteInputId = useId();
  const eventPlayerInputId = useId();
  const eventRelatedPlayerInputId = useId();
  const eventNoteInputId = useId();

  // Load Match Data
  const loadMatchAndEvents = useCallback(
    async (_signal?: AbortSignal): Promise<string | undefined> => {
      if (!matchId) return;
      try {
        const [matchData, eventsData] = await Promise.all([
          academyApi.getMatch(matchId),
          academyApi.getMatchEvents(matchId),
        ]);
        if (!matchData) {
          setIsNotFound(true);
          return;
        }
        setMatch(matchData);
        setEvents(eventsData || []);
        setIsNotFound(false);
        setErrorBanner(null);
        return matchData.updatedAt || new Date().toISOString();
      } catch (err: unknown) {
        const errorObj = err as { status?: number; message?: string };
        if (errorObj?.status === 404) {
          setIsNotFound(true);
        } else {
          setErrorBanner(errorObj?.message || 'Failed to sync match console data');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [matchId]
  );

  // Initial load
  useEffect(() => {
    void loadMatchAndEvents();
  }, [loadMatchAndEvents]);

  // Polling Hook
  const matchStatus = (match?.status as MatchLiveStatus) || 'Scheduled';
  const { isReconnecting, lastUpdatedLabel, refresh } = useLiveMatchPolling({
    fetchFn: loadMatchAndEvents,
    matchStatus,
    enabled: Boolean(matchId && !isNotFound && match?.status !== 'Completed' && match?.status !== 'Cancelled'),
  });

  // Calculate live minute estimate
  const computeMinuteDisplay = (m: MatchItem | null): string => {
    if (!m) return '0\'';
    if (m.status === 'Completed') return 'FT (90\')';
    if (m.status === 'Cancelled') return 'Cancelled';
    if (m.status === 'HalfTime') return 'HT (45\')';
    if (m.status === 'Scheduled') return 'Not started';

    if (m.status === 'Live' && m.startedAt) {
      const startMs = new Date(m.startedAt).getTime();
      const elapsedMin = Math.max(1, Math.floor((Date.now() - startMs) / 60000));
      return `${Math.min(elapsedMin, 120)}'`;
    }
    return 'Live';
  };

  // Status transitions
  const handleTransition = async (targetStatus: 'Live' | 'HalfTime' | 'Completed' | 'Cancelled') => {
    if (!matchId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      const payload = buildMatchStatusPayload(targetStatus);
      const updated = await academyApi.updateMatchStatus(matchId, payload);
      if (updated) {
        setMatch(updated);
        await refresh();
      }
      setConfirmTransition(null);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; fieldErrors?: Record<string, string[]> };
      if (errorObj.fieldErrors) {
        const details = Object.entries(errorObj.fieldErrors)
          .map(([f, msgs]) => `${f}: ${msgs.join(', ')}`)
          .join('; ');
        setErrorBanner(`${errorObj.message || 'Validation error'}: ${details}`);
      } else {
        setErrorBanner(errorObj.message || 'Status transition failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Add Match Event
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId) return;
    setActionLoading(true);
    setErrorBanner(null);

    try {
      const payload = buildMatchEventPayload({
        type: eventType,
        side: eventSide,
        minute: Number(eventMinute),
        player: playerInput.trim() || undefined,
        relatedPlayer: relatedPlayerInput.trim() || undefined,
        note: eventNote.trim() || undefined,
      });

      const newEvent = await academyApi.createMatchEvent(matchId, payload);
      if (newEvent) {
        // Reset non-essential inputs
        setPlayerInput('');
        setRelatedPlayerInput('');
        setEventNote('');
        await refresh();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; fieldErrors?: Record<string, string[]> };
      if (errorObj.fieldErrors) {
        const details = Object.entries(errorObj.fieldErrors)
          .map(([f, msgs]) => `${f}: ${msgs.join(', ')}`)
          .join('; ');
        setErrorBanner(`${errorObj.message || 'Validation error'}: ${details}`);
      } else {
        setErrorBanner(errorObj.message || 'Failed to record event');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Match Event (Correction)
  const handleDeleteEvent = async (eventId: string) => {
    if (!matchId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await academyApi.deleteMatchEvent(matchId, eventId);
      setEventToDelete(null);
      await refresh();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorBanner(errorObj.message || 'Failed to delete event');
    } finally {
      setActionLoading(false);
    }
  };

  // Render 404 state cleanly
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Match Not Found</h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-md mx-auto">
            The requested fixture does not exist or you are not authorized to score this match.
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard/live"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Match Console Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center py-24 text-center">
        <div>
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-neutral-400">Loading Scorer Console...</p>
        </div>
      </div>
    );
  }

  const homeName = match.homeTeam?.team?.name || 'Home Team';
  const awayName = match.awayTeam?.team?.name || 'Away Team';
  const tourneyName =
    typeof match.tournament === 'object' && match.tournament !== null
      ? match.tournament.name
      : 'Tournament';
  const currentHomeScore = match.liveScore ? match.liveScore.home : match.result ? match.result.homeScore : 0;
  const currentAwayScore = match.liveScore ? match.liveScore.away : match.result ? match.result.awayScore : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 space-y-6">
      {/* Navigation & Status Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/dashboard/live')}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live Matches
        </button>

        <div className="flex items-center gap-3">
          {isReconnecting && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Reconnecting...
            </span>
          )}
          {lastUpdatedLabel && (
            <span className="text-xs text-neutral-500 font-mono">
              Last updated: {lastUpdatedLabel}
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold text-rose-200">Action Alert: </span>
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-rose-400 hover:text-rose-200 text-xs uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MATCH SCORER HEADER (BIG SCORE & MINUTE) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 via-neutral-900 to-black p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {tourneyName} • Round {match.round} <CrossAccent color="orange" size="sm" />
            </span>
          </div>
          <div className="flex items-center gap-2">
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
              {match.status.toUpperCase()}
            </AthleticBadge>
          </div>
        </div>

        {/* Score Board Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center">
          {/* Home Team */}
          <div className="space-y-1">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-black text-white">
                {homeName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white mt-2 truncate">
              {homeName}
            </h2>
            <span className="text-xs text-neutral-400">Home Side</span>
          </div>

          {/* Central Big Score & Clock */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-neutral-950/80 px-8 py-3 shadow-inner">
              <span className="text-5xl md:text-6xl font-black font-mono text-white tracking-tighter">
                {currentHomeScore}
              </span>
              <span className="text-3xl font-bold text-neutral-600">:</span>
              <span className="text-5xl md:text-6xl font-black font-mono text-white tracking-tighter">
                {currentAwayScore}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-rose-400">
              <Clock className="h-4 w-4" />
              <span>{computeMinuteDisplay(match)}</span>
            </div>
            <div className="text-xs text-neutral-500">
              Venue: {match.venue?.name || 'Pitch Venue'}
            </div>
          </div>

          {/* Away Team */}
          <div className="space-y-1">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-black text-white">
                {awayName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white mt-2 truncate">
              {awayName}
            </h2>
            <span className="text-xs text-neutral-400">Away Side</span>
          </div>
        </div>

        {/* VALID STATE TRANSITIONS BUTTON BAR */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
          {match.status === 'Scheduled' && (
            <>
              <button
                onClick={() => void handleTransition('Live')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Match
              </button>
              <button
                onClick={() => setConfirmTransition('Cancelled')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel Match
              </button>
            </>
          )}

          {match.status === 'Live' && (
            <>
              <button
                onClick={() => void handleTransition('HalfTime')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Pause className="h-4 w-4 fill-current" />
                Half Time
              </button>
              <button
                onClick={() => setConfirmTransition('Completed')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Full Time (Complete)
              </button>
            </>
          )}

          {match.status === 'HalfTime' && (
            <button
              onClick={() => void handleTransition('Live')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              Start Second Half
            </button>
          )}

          {match.status === 'Completed' && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2">
              <CheckCircle className="h-4 w-4" />
              Match Completed • Final Score Recorded
            </div>
          )}

          {match.status === 'Cancelled' && (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2">
              <XCircle className="h-4 w-4" />
              Match Cancelled
            </div>
          )}
        </div>
      </div>

      {/* CONSOLE CONTROLS & TIMELINE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ADD EVENT PANEL (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Record Match Event</h3>
          </div>

          {match.status !== 'Live' && match.status !== 'HalfTime' ? (
            <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-6 text-center text-xs text-neutral-400">
              <Clock className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
              Events can only be added while the match is in <strong>Live</strong> or <strong>HalfTime</strong> status.
            </div>
          ) : (
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label htmlFor={eventTypeSelectId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Event Type
                </label>
                <select
                  id={eventTypeSelectId}
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Goal">⚽ Goal</option>
                  <option value="OwnGoal">🔴 Own Goal</option>
                  <option value="YellowCard">🟨 Yellow Card</option>
                  <option value="RedCard">🟥 Red Card</option>
                  <option value="Substitution">🔄 Substitution</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={eventSideSelectId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Team Side
                  </label>
                  <select
                    id={eventSideSelectId}
                    value={eventSide}
                    onChange={(e) => setEventSide(e.target.value as EventSide)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="home">{homeName} (Home)</option>
                    <option value="away">{awayName} (Away)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={eventMinuteInputId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Minute (0-130)
                  </label>
                  <input
                    id={eventMinuteInputId}
                    type="number"
                    min={0}
                    max={130}
                    value={eventMinute}
                    onChange={(e) => setEventMinute(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={eventPlayerInputId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Player (Select Athlete)
                </label>
                {(eventSide === 'home' ? match?.homeSquad : match?.awaySquad)?.length ? (
                  <select
                    id={eventPlayerInputId}
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select player (optional)</option>
                    {(eventSide === 'home' ? match?.homeSquad : match?.awaySquad)?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={eventPlayerInputId}
                    type="text"
                    placeholder="24-char ObjectId (optional for OwnGoal/cards)"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>

              {eventType === 'Substitution' && (
                <div>
                  <label htmlFor={eventRelatedPlayerInputId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Substituted Player (Select Athlete)
                  </label>
                  {(eventSide === 'home' ? match?.homeSquad : match?.awaySquad)?.length ? (
                    <select
                      id={eventRelatedPlayerInputId}
                      value={relatedPlayerInput}
                      onChange={(e) => setRelatedPlayerInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Select replaced player (optional)</option>
                      {(eventSide === 'home' ? match?.homeSquad : match?.awaySquad)?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={eventRelatedPlayerInputId}
                      type="text"
                      placeholder="24-char ObjectId"
                      value={relatedPlayerInput}
                      onChange={(e) => setRelatedPlayerInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </div>
              )}

              <div>
                <label htmlFor={eventNoteInputId} className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Notes (Optional, max 200)
                </label>
                <input
                  id={eventNoteInputId}
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Free kick, tactical foul"
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Submit Event to Scoreboard
              </button>
            </form>
          )}
        </div>

        {/* EVENTS TIMELINE (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Events Timeline & Corrections</h3>
            </div>
            <span className="text-xs text-neutral-400">{events.length} events logged</span>
          </div>

          {events.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-white/10 bg-neutral-950/40 p-6">
              <Shield className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
              <p className="text-sm font-medium text-neutral-300">No events recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                Goals, cards, and substitutions will display chronologically here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {events.map((ev) => {
                const isHome = ev.side === 'home';
                const teamLabel = isHome ? homeName : awayName;
                const playerLabel = ev.playerName || 'Player';

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-950/60 p-3 hover:bg-neutral-950 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-mono text-xs font-bold text-emerald-400">
                        {ev.minute}&apos;
                      </span>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <span>
                            {ev.type === 'Goal' && '⚽'}
                            {ev.type === 'OwnGoal' && '🔴'}
                            {ev.type === 'YellowCard' && '🟨'}
                            {ev.type === 'RedCard' && '🟥'}
                            {ev.type === 'Substitution' && '🔄'}
                          </span>
                          <span>{ev.type}</span>
                          <span className="text-xs font-normal text-neutral-400">
                            • {teamLabel}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-300">
                          {ev.type === 'Substitution' ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-emerald-400" /> {playerLabel}
                              <ArrowRightLeft className="h-3 w-3 text-neutral-500" />
                              {ev.relatedPlayerName || 'Off'}
                            </span>
                          ) : (
                            <span>{playerLabel}</span>
                          )}
                          {ev.note && <span className="text-neutral-500 italic ml-2">({ev.note})</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => setEventToDelete(ev.id)}
                        disabled={actionLoading}
                        title="Delete (Correction)"
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: TRANSITION */}
      {confirmTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-white">
              Confirm {confirmTransition === 'Completed' ? 'Full Time' : 'Cancellation'}
            </h4>
            <p className="mt-2 text-sm text-neutral-400">
              {confirmTransition === 'Completed'
                ? 'Are you sure you want to mark this match as Completed? Final score will be locked based on match events.'
                : 'Are you sure you want to cancel this match? This action cannot be undone.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmTransition(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10"
              >
                Dismiss
              </button>
              <button
                onClick={() => void handleTransition(confirmTransition)}
                disabled={actionLoading}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 shadow-md shadow-rose-500/20"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE EVENT */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Confirm Event Deletion</h4>
            <p className="mt-2 text-sm text-neutral-400">
              Are you sure you want to delete this recorded event? Live score will automatically recompute.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEventToDelete(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteEvent(eventToDelete)}
                disabled={actionLoading}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 shadow-md shadow-rose-500/20"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
