import { useState, useEffect, useRef, useCallback } from 'react';

export type MatchLiveStatus = 'Scheduled' | 'Live' | 'HalfTime' | 'Completed' | 'Cancelled';

export interface PollState {
  isVisible: boolean;
  isInFlight: boolean;
  matchStatus: MatchLiveStatus;
  consecutiveErrors: number;
}

export interface PollDecision {
  shouldPoll: boolean;
  delayMs: number;
  isReconnecting: boolean;
  reason: 'terminal_status' | 'hidden' | 'in_flight' | 'ok';
}

/**
 * Pure scheduling engine for live match polling.
 * Extracted as a pure function for isolated unit testing.
 */
export function computeNextPollDecision(state: PollState): PollDecision {
  if (state.matchStatus === 'Completed' || state.matchStatus === 'Cancelled') {
    return {
      shouldPoll: false,
      delayMs: 0,
      isReconnecting: false,
      reason: 'terminal_status',
    };
  }
  if (!state.isVisible) {
    return {
      shouldPoll: false,
      delayMs: 0,
      isReconnecting: state.consecutiveErrors > 0,
      reason: 'hidden',
    };
  }
  if (state.isInFlight) {
    return {
      shouldPoll: false,
      delayMs: 0,
      isReconnecting: state.consecutiveErrors > 0,
      reason: 'in_flight',
    };
  }
  const isReconnecting = state.consecutiveErrors > 0;
  const delayMs = isReconnecting ? 30000 : 8000;
  return {
    shouldPoll: true,
    delayMs,
    isReconnecting,
    reason: 'ok',
  };
}

export interface UseLiveMatchPollingOptions {
  fetchFn: (signal: AbortSignal) => Promise<string | undefined | null | void>;
  matchStatus: MatchLiveStatus;
  enabled?: boolean;
}

export interface UseLiveMatchPollingReturn {
  isReconnecting: boolean;
  lastUpdatedLabel: string | null;
  serverTime: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLiveMatchPolling({
  fetchFn,
  matchStatus,
  enabled = true,
}: UseLiveMatchPollingOptions): UseLiveMatchPollingReturn {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isInFlightRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const formatServerTime = (isoTime: string | null | undefined): string | null => {
    if (!isoTime) return null;
    try {
      const d = new Date(isoTime);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return null;
    }
  };

  const scheduleNext = useCallback(
    (delayMs: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = setTimeout(() => {
        void executePoll();
      }, delayMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchStatus, enabled]
  );

  const executePoll = useCallback(async () => {
    if (!enabled) return;

    const isVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const decision = computeNextPollDecision({
      isVisible,
      isInFlight: isInFlightRef.current,
      matchStatus,
      consecutiveErrors: consecutiveErrorsRef.current,
    });

    if (!decision.shouldPoll) {
      if (decision.reason === 'in_flight') {
        // Skip this tick, schedule retry in 2 seconds
        scheduleNext(2000);
      }
      return;
    }

    // Cancel any previous in-flight request if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isInFlightRef.current = true;

    try {
      const returnedServerTime = await fetchFnRef.current(controller.signal);
      consecutiveErrorsRef.current = 0;
      setIsReconnecting(false);
      setError(null);
      if (returnedServerTime) {
        setServerTime(returnedServerTime);
      } else {
        setServerTime(new Date().toISOString());
      }
      scheduleNext(8000);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      consecutiveErrorsRef.current += 1;
      setIsReconnecting(true);
      setError(err instanceof Error ? err.message : 'Connection interrupted');
      scheduleNext(30000); // 30s backoff on error
    } finally {
      isInFlightRef.current = false;
    }
  }, [enabled, matchStatus, scheduleNext]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled) {
        // Tab became visible again: execute immediate fetch if not in flight
        if (!isInFlightRef.current && matchStatus !== 'Completed' && matchStatus !== 'Cancelled') {
          void executePoll();
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, matchStatus, executePoll]);

  // Initial and reactive trigger
  useEffect(() => {
    if (!enabled || matchStatus === 'Completed' || matchStatus === 'Cancelled') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    void executePoll();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, matchStatus, executePoll]);

  return {
    isReconnecting,
    serverTime,
    lastUpdatedLabel: formatServerTime(serverTime),
    error,
    refresh: executePoll,
  };
}
