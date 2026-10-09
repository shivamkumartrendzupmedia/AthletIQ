/**
 * Verification script for session payload builder pure functions
 * Tests payloads against the REAL Backend Zod schemas:
 * - createSessionSchema
 * - updateSessionSchema
 * Imported directly from Backend/src/validators/training.validator.ts.
 */
import {
  createSessionSchema,
  updateSessionSchema,
} from '../../Backend/src/validators/training.validator.ts';
import {
  buildCreateSessionPayload,
  buildUpdateSessionPayload,
} from '../src/components/training/sessionPayload.ts';

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

console.log('--- RUNNING SESSION PAYLOAD VERIFICATION SUITE ---\n');

// Case 1: Edit of a normal session (venue set, coach null, notes null/undefined)
{
  const payload = buildUpdateSessionPayload({
    title: 'Session 2',
    type: 'Training',
    venue: 'Main Pitch',
    startsAtUtc: '2026-10-15T14:00:00.000Z',
    endsAtUtc: '2026-10-15T15:30:00.000Z',
    coachId: null,
    notes: null,
  });
  const result = updateSessionSchema.safeParse(payload);
  assert(
    result.success && !('coach' in payload) && !('notes' in payload),
    '1. Edit of a normal session (venue set, coach null, notes null) passes updateSessionSchema'
  );
}

// Case 2: Edit with populated coach id
{
  const validCoachId = '507f1f77bcf86cd799439011';
  const payload = buildUpdateSessionPayload(
    {
      title: 'Session 2',
      type: 'Training',
      venue: 'Main Pitch',
      startsAtUtc: '2026-10-15T14:00:00.000Z',
      endsAtUtc: '2026-10-15T15:30:00.000Z',
      coachId: validCoachId,
      notes: 'Tactical positioning drill',
    },
    { isAdmin: true }
  );
  const result = updateSessionSchema.safeParse(payload);
  assert(
    result.success && payload.coach === validCoachId,
    '2. Edit with populated coach id passes updateSessionSchema'
  );
}

// Case 3: Edit of Completed/Cancelled session (no times sent)
{
  const payload = buildUpdateSessionPayload(
    {
      title: 'Session 2',
      type: 'Match',
      venue: 'Stadium Pitch',
      startsAtUtc: '2026-10-15T14:00:00.000Z',
      endsAtUtc: '2026-10-15T15:30:00.000Z',
    },
    { isCompletedOrCancelled: true }
  );
  const result = updateSessionSchema.safeParse(payload);
  assert(
    result.success && !('startsAt' in payload) && !('endsAt' in payload),
    '3. Edit of Completed/Cancelled session omits times and passes updateSessionSchema'
  );
}

// Case 4: Edit with notes = null from API (must not crash on .trim())
{
  let threw = false;
  let parsed = false;
  try {
    const payload = buildUpdateSessionPayload({
      title: 'Session 2',
      type: 'Recovery',
      venue: 'Poolside',
      startsAtUtc: '2026-10-15T14:00:00.000Z',
      endsAtUtc: '2026-10-15T15:00:00.000Z',
      notes: null,
    });
    const result = updateSessionSchema.safeParse(payload);
    parsed = result.success && !('notes' in payload);
  } catch {
    threw = true;
  }
  assert(
    !threw && parsed,
    '4. Edit with notes = null from API handles null safely without crash and passes schema'
  );
}

// Case 5: Create with coach and notes
{
  const payload = buildCreateSessionPayload({
    teamId: '507f1f77bcf86cd799439012',
    title: 'Morning Practice',
    type: 'Training',
    venue: 'Pitch A',
    startsAtUtc: '2026-10-15T09:00:00.000Z',
    endsAtUtc: '2026-10-15T10:30:00.000Z',
    coachId: '507f1f77bcf86cd799439011',
    notes: 'Endurance warmup',
  });
  const result = createSessionSchema.safeParse(payload);
  assert(
    result.success && payload.team === '507f1f77bcf86cd799439012',
    '5. Create with coach and notes passes createSessionSchema'
  );
}

// Case 6: Create without coach and notes
{
  const payload = buildCreateSessionPayload({
    teamId: '507f1f77bcf86cd799439012',
    title: 'Squad Scrimmage',
    type: 'Match',
    venue: 'Pitch B',
    startsAtUtc: '2026-10-15T16:00:00.000Z',
    endsAtUtc: '2026-10-15T18:00:00.000Z',
    coachId: null,
    notes: undefined,
  });
  const result = createSessionSchema.safeParse(payload);
  assert(
    result.success && !('coach' in payload) && !('notes' in payload),
    '6. Create without coach and notes passes createSessionSchema'
  );
}

// Case 7: Whitespace-only venue correctly rejected by schema
{
  const payload = buildUpdateSessionPayload({
    title: 'Session 2',
    type: 'Training',
    venue: '   ',
    startsAtUtc: '2026-10-15T14:00:00.000Z',
    endsAtUtc: '2026-10-15T15:30:00.000Z',
  });
  const result = updateSessionSchema.safeParse(payload);
  assert(
    !result.success,
    '7. Whitespace-only venue is trimmed to empty and rejected by updateSessionSchema'
  );
}

// Case 8: Team is never present in edit payload and rejected under .strict()
{
  const payload = buildUpdateSessionPayload({
    teamId: '507f1f77bcf86cd799439012',
    title: 'Session 2',
    type: 'Training',
    venue: 'Main Pitch',
    startsAtUtc: '2026-10-15T14:00:00.000Z',
    endsAtUtc: '2026-10-15T15:30:00.000Z',
  });
  const keyAbsent = !('team' in payload);
  const rejectedIfIncluded = !updateSessionSchema.safeParse({
    ...payload,
    team: '507f1f77bcf86cd799439012',
  }).success;
  assert(
    keyAbsent && rejectedIfIncluded,
    '8. Team is never present in edit payload and updateSessionSchema rejects it under .strict()'
  );
}

// Case 9: Unknown key rejected under .strict()
{
  const payload = buildUpdateSessionPayload({
    title: 'Session 2',
    type: 'Training',
    venue: 'Main Pitch',
    startsAtUtc: '2026-10-15T14:00:00.000Z',
    endsAtUtc: '2026-10-15T15:30:00.000Z',
  });
  const result = updateSessionSchema.safeParse({
    ...payload,
    unexpectedKey: 'should-fail',
  });
  assert(
    !result.success,
    '9. Unknown key rejected under updateSessionSchema.strict()'
  );
}

// Case 10: startsAt and endsAt ISO validation
{
  const validPayload = buildUpdateSessionPayload({
    title: 'Session 2',
    type: 'Training',
    venue: 'Pitch',
    startsAtUtc: '2026-10-15T14:00:00.000Z',
    endsAtUtc: '2026-10-15T15:30:00.000Z',
  });
  const validPasses = updateSessionSchema.safeParse(validPayload).success;
  const invalidFails = !updateSessionSchema.safeParse({
    ...validPayload,
    startsAt: 'not-a-valid-iso-date',
  }).success;
  assert(
    validPasses && invalidFails,
    '10. Valid ISO datetimes accepted and invalid datetime strings rejected'
  );
}

// Case 11: End time strictly after start time
{
  const backwardsPayload = buildUpdateSessionPayload({
    title: 'Session 2',
    type: 'Training',
    venue: 'Pitch',
    startsAtUtc: '2026-10-15T16:00:00.000Z',
    endsAtUtc: '2026-10-15T15:00:00.000Z',
  });
  const result = updateSessionSchema.safeParse(backwardsPayload);
  assert(
    !result.success,
    '11. End time before start time rejected by updateSessionSchema refine rule'
  );
}

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
