/**
 * Verification script for Live Match Polling scheduling logic.
 * Tests pure scheduling function computeNextPollDecision:
 * - Tab visible / hidden behavior
 * - In-flight skip behavior
 * - Consecutive errors backoff to 30s
 * - Terminal statuses (Completed, Cancelled) stopping polling
 * - Normal 8s tick behavior
 */
import { computeNextPollDecision, type PollState } from '../src/hooks/useLiveMatchPolling.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passed++;
  } else {
    console.error(`FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

console.log('--- RUNNING LIVE MATCH POLLING SCHEDULING VERIFICATION SUITE ---\n');

// 1. Normal active tick when visible and idle
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'Live',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === true && decision.delayMs === 8000 && !decision.isReconnecting && decision.reason === 'ok',
    'Normal tick: polls after 8000ms with isReconnecting=false'
  );
}

// 2. Hidden tab pauses polling
{
  const state: PollState = {
    isVisible: false,
    isInFlight: false,
    matchStatus: 'Live',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === false && decision.reason === 'hidden',
    'Hidden tab: skips polling while document.hidden is true'
  );
}

// 3. In-flight request skips tick
{
  const state: PollState = {
    isVisible: true,
    isInFlight: true,
    matchStatus: 'Live',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === false && decision.reason === 'in_flight',
    'In-flight skip: skips tick to prevent overlapping concurrent requests'
  );
}

// 4. Backoff to 30s on consecutive errors
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'Live',
    consecutiveErrors: 2,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === true && decision.delayMs === 30000 && decision.isReconnecting === true && decision.reason === 'ok',
    'Error backoff: backs off to 30000ms with isReconnecting=true on network failure'
  );
}

// 5. Terminal status: Completed stops polling
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'Completed',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === false && decision.reason === 'terminal_status',
    'Stop on Completed: disables polling permanently once match is Completed'
  );
}

// 6. Terminal status: Cancelled stops polling
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'Cancelled',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === false && decision.reason === 'terminal_status',
    'Stop on Cancelled: disables polling permanently once match is Cancelled'
  );
}

// 7. Scheduled status polls as expected before match begins
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'Scheduled',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === true && decision.delayMs === 8000 && decision.reason === 'ok',
    'Scheduled status: continues polling for match start trigger'
  );
}

// 8. HalfTime status polls as expected during break
{
  const state: PollState = {
    isVisible: true,
    isInFlight: false,
    matchStatus: 'HalfTime',
    consecutiveErrors: 0,
  };
  const decision = computeNextPollDecision(state);
  assert(
    decision.shouldPoll === true && decision.delayMs === 8000 && decision.reason === 'ok',
    'HalfTime status: continues polling for second half restart'
  );
}

console.log('\n======================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('======================================');

if (failed > 0) {
  process.exit(1);
}
