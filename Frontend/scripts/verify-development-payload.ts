/**
 * Verification script for Athlete Development payload builder pure functions
 * Tests payloads against the REAL Backend Zod schemas:
 * - createAssessmentSchema
 * - createFeedbackSchema
 * - createGoalSchema
 * - updateGoalStaffSchema
 * - updateGoalSelfSchema
 * Imported directly from Backend/src/validators/development.validator.ts.
 */
import {
  createAssessmentSchema,
  createFeedbackSchema,
  createGoalSchema,
  updateGoalStaffSchema,
  updateGoalSelfSchema,
} from '../../Backend/src/validators/development.validator.ts';
import {
  buildCreateAssessmentPayload,
  buildCreateFeedbackPayload,
  buildCreateGoalPayload,
  buildUpdateGoalPayload,
} from '../src/components/development/developmentPayload.ts';

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

console.log('--- RUNNING ATHLETE DEVELOPMENT PAYLOAD VERIFICATION SUITE ---\n');

const validAthleteId = '507f1f77bcf86cd799439011';

// Case 1: Build valid skill assessment payload
{
  const payload = buildCreateAssessmentPayload({
    pace: '8',
    shooting: 7,
    passing: '9',
    dribbling: 8,
    defending: 6,
    stamina: '8',
    agility: 7,
    decisionMaking: 8,
    leadership: '7',
    workRate: 9,
    note: '  Consistent performance throughout drills.  ',
  });
  const result = createAssessmentSchema.safeParse(payload);
  assert(
    result.success &&
      typeof payload.pace === 'number' &&
      payload.pace === 8 &&
      payload.note === 'Consistent performance throughout drills.',
    '1. Valid assessment payload with string conversions and trimmed note passes schema'
  );
}

// Case 2: Assessment with optional date
{
  const today = new Date().toISOString();
  const payload = buildCreateAssessmentPayload({
    pace: 5,
    shooting: 5,
    passing: 5,
    dribbling: 5,
    defending: 5,
    stamina: 5,
    agility: 5,
    decisionMaking: 5,
    leadership: 5,
    workRate: 5,
    date: today,
  });
  const result = createAssessmentSchema.safeParse(payload);
  assert(
    result.success && payload.date === today,
    '2. Assessment with valid current ISO date passes schema'
  );
}

// Case 3: Assessment with out-of-range score fails backend schema
{
  const payload = buildCreateAssessmentPayload({
    pace: 12, // > 10
    shooting: 5,
    passing: 5,
    dribbling: 5,
    defending: 5,
    stamina: 5,
    agility: 5,
    decisionMaking: 5,
    leadership: 5,
    workRate: 5,
  });
  const result = createAssessmentSchema.safeParse(payload);
  assert(
    !result.success,
    '3. Assessment with score > 10 is correctly rejected by backend schema'
  );
}

// Case 4: Assessment with 0 score fails backend schema (min is 1)
{
  const payload = buildCreateAssessmentPayload({
    pace: 0, // < 1
    shooting: 5,
    passing: 5,
    dribbling: 5,
    defending: 5,
    stamina: 5,
    agility: 5,
    decisionMaking: 5,
    leadership: 5,
    workRate: 5,
  });
  const result = createAssessmentSchema.safeParse(payload);
  assert(
    !result.success,
    '4. Assessment with score < 1 is correctly rejected by backend schema'
  );
}

// Case 5: Valid feedback payload
{
  const payload = buildCreateFeedbackPayload({
    athlete: `  ${validAthleteId}  `,
    text: '  Focus on recovery runs when losing possession.  ',
    type: 'Improvement',
  });
  const result = createFeedbackSchema.safeParse(payload);
  assert(
    result.success &&
      payload.athlete === validAthleteId &&
      payload.text === 'Focus on recovery runs when losing possession.' &&
      payload.type === 'Improvement',
    '5. Valid coach feedback payload passes createFeedbackSchema'
  );
}

// Case 6: Feedback payload default type
{
  const payload = buildCreateFeedbackPayload({
    athlete: validAthleteId,
    text: 'Great work in training today!',
  });
  const result = createFeedbackSchema.safeParse(payload);
  assert(
    result.success && payload.type === 'General',
    '6. Feedback payload defaults to General type'
  );
}

// Case 7: Valid goal creation payload
{
  const targetDate = new Date(Date.now() + 86400000 * 14).toISOString();
  const payload = buildCreateGoalPayload({
    title: '  Improve 5km stamina time  ',
    description: '  Target sub-22 minutes by end of month.  ',
    targetDate,
    status: 'Active',
    progress: '20',
  });
  const result = createGoalSchema.safeParse(payload);
  assert(
    result.success &&
      payload.title === 'Improve 5km stamina time' &&
      payload.progress === 20 &&
      payload.description === 'Target sub-22 minutes by end of month.',
    '7. Valid goal payload passes createGoalSchema with progress integer'
  );
}

// Case 8: Goal creation with default progress (0) and default status (Active)
{
  const targetDate = new Date(Date.now() + 86400000 * 30).toISOString();
  const payload = buildCreateGoalPayload({
    title: 'Bench Press 80kg',
    targetDate,
  });
  const result = createGoalSchema.safeParse(payload);
  assert(
    result.success && result.data.status === 'Active' && result.data.progress === 0,
    '8. Goal payload defaults to status Active and progress 0'
  );
}

// Case 9: Staff goal update payload
{
  const payload = buildUpdateGoalPayload({
    title: '  Updated Goal Title  ',
    status: 'Achieved',
    progress: 100,
  });
  const result = updateGoalStaffSchema.safeParse(payload);
  assert(
    result.success &&
      payload.title === 'Updated Goal Title' &&
      payload.status === 'Achieved' &&
      payload.progress === 100,
    '9. Staff goal update passes updateGoalStaffSchema'
  );
}

// Case 10: Athlete goal update payload (progress ONLY)
{
  const athleteUpdate = { progress: 85 };
  const result = updateGoalSelfSchema.safeParse(athleteUpdate);
  assert(
    result.success && result.data.progress === 85,
    '10. Athlete self-update payload passes updateGoalSelfSchema with progress only'
  );
}

// Case 11: Athlete goal update payload with extra key rejected by strict schema
{
  const athleteUpdateWithHacks = {
    progress: 85,
    status: 'Achieved', // forbidden for athlete self update
  };
  const result = updateGoalSelfSchema.safeParse(athleteUpdateWithHacks);
  assert(
    !result.success,
    '11. Athlete self-update payload with extra keys is rejected by strict schema'
  );
}

// Case 12: Goal progress negative or > 100 rejected
{
  const invalidNegative = { progress: -5 };
  const invalidOver = { progress: 105 };
  const res1 = updateGoalSelfSchema.safeParse(invalidNegative);
  const res2 = updateGoalSelfSchema.safeParse(invalidOver);
  assert(
    !res1.success && !res2.success,
    '12. Negative progress and progress > 100 correctly rejected by Zod schema'
  );
}

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
