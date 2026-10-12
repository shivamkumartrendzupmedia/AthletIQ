/**
 * Verification script for Live Match payload builders.
 * Validates payloads against the REAL Backend Zod schemas:
 * - matchStatusTransitionSchema
 * - createMatchEventSchema
 * Imported directly from Backend/src/validators/tournament.validator.ts.
 */
import {
  matchStatusTransitionSchema,
  createMatchEventSchema,
} from '../../Backend/src/validators/tournament.validator.ts';
import {
  buildMatchStatusPayload,
  buildMatchEventPayload,
} from '../src/lib/matchPayloads.ts';

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

console.log('--- RUNNING LIVE MATCH PAYLOAD BUILDERS VERIFICATION SUITE ---\n');

// Valid MongoDB ObjectId for player references
const validPlayerId = '507f1f77bcf86cd799439011';
const validRelatedPlayerId = '507f1f77bcf86cd799439012';

// 1. Status Transition: Live status
{
  const payload = buildMatchStatusPayload('Live');
  const result = matchStatusTransitionSchema.safeParse(payload);
  assert(result.success, 'buildMatchStatusPayload generates valid Live status payload');
}

// 2. Status Transition: HalfTime status
{
  const payload = buildMatchStatusPayload({ status: 'HalfTime' });
  const result = matchStatusTransitionSchema.safeParse(payload);
  assert(result.success, 'buildMatchStatusPayload accepts object input for HalfTime');
}

// 3. Status Transition: Completed status
{
  const payload = buildMatchStatusPayload('Completed');
  const result = matchStatusTransitionSchema.safeParse(payload);
  assert(result.success, 'buildMatchStatusPayload generates valid Completed status payload');
}

// 4. Status Transition: Cancelled status
{
  const payload = buildMatchStatusPayload('Cancelled');
  const result = matchStatusTransitionSchema.safeParse(payload);
  assert(result.success, 'buildMatchStatusPayload generates valid Cancelled status payload');
}

// 5. Status Transition: Invalid status rejection
{
  const payload = buildMatchStatusPayload('InProgress');
  const result = matchStatusTransitionSchema.safeParse(payload);
  assert(!result.success, 'matchStatusTransitionSchema strictly rejects invalid status string');
}

// 6. Match Event: Goal event with player and note
{
  const payload = buildMatchEventPayload({
    type: 'Goal',
    side: 'home',
    minute: 23,
    player: validPlayerId,
    note: 'Header from corner kick',
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(result.success, 'buildMatchEventPayload builds valid Goal event with player and note');
}

// 7. Match Event: OwnGoal without player
{
  const payload = buildMatchEventPayload({
    type: 'OwnGoal',
    side: 'away',
    minute: 44,
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(result.success, 'buildMatchEventPayload builds valid OwnGoal without player');
}

// 8. Match Event: YellowCard with minute string parsing and trim
{
  const payload = buildMatchEventPayload({
    type: 'YellowCard',
    side: 'home',
    minute: 65.4,
    player: `  ${validPlayerId}  `,
    note: '  Tactical foul  ',
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(
    result.success &&
      typeof payload.minute === 'number' &&
      payload.minute === 65 &&
      payload.player === validPlayerId &&
      payload.note === 'Tactical foul',
    'buildMatchEventPayload floors minute and trims player ID and note'
  );
}

// 9. Match Event: Substitution with relatedPlayer
{
  const payload = buildMatchEventPayload({
    type: 'Substitution',
    side: 'away',
    minute: 75,
    player: validPlayerId,
    relatedPlayer: validRelatedPlayerId,
    note: 'Tactical replacement',
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(result.success, 'buildMatchEventPayload builds valid Substitution with player and relatedPlayer');
}

// 10. Match Event: RedCard event with null player
{
  const payload = buildMatchEventPayload({
    type: 'RedCard',
    side: 'home',
    minute: 88,
    player: null,
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(result.success, 'buildMatchEventPayload accepts null player for team bench red card');
}

// 11. Match Event: Schema rejects negative minute
{
  const payload = buildMatchEventPayload({
    type: 'Goal',
    side: 'home',
    minute: -5,
  });
  const result = createMatchEventSchema.safeParse(payload);
  assert(!result.success, 'createMatchEventSchema rejects negative minute');
}

// 12. Match Event: Schema rejects invalid side
{
  const payload = {
    type: 'Goal',
    side: 'neutral',
    minute: 10,
  };
  const result = createMatchEventSchema.safeParse(payload);
  assert(!result.success, 'createMatchEventSchema rejects invalid event side');
}

console.log('\n======================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('======================================');

if (failed > 0) {
  process.exit(1);
}
