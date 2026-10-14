import {
  createAchievementSchema,
  updateAchievementSchema,
} from '../../Backend/src/validators/achievement.validator.js';
import {
  buildCreateAchievementPayload,
  buildUpdateAchievementPayload,
  type CreateAchievementInput,
  type UpdateAchievementInput,
} from '../src/lib/achievementPayloads.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

console.log('--- VERIFYING ACHIEVEMENT PAYLOAD BUILDERS AGAINST REAL ZOD SCHEMA ---');

// 1. Valid minimal create payload (without imageUrl, default featured false)
const minInput: CreateAchievementInput = {
  title: '  State Cup Championship  ',
  description: '  Won the regional youth cup final with a clean sheet.  ',
  category: 'Tournament Win',
  achievedOn: '2026-05-15T00:00:00.000Z',
};
const minPayload = buildCreateAchievementPayload(minInput);
const parseMin = createAchievementSchema.safeParse(minPayload);
assert(parseMin.success, 'Minimal valid achievement payload passes Zod validation');
if (parseMin.success) {
  assert(parseMin.data.title === 'State Cup Championship', 'Title is trimmed correctly');
  assert(
    parseMin.data.description === 'Won the regional youth cup final with a clean sheet.',
    'Description is trimmed correctly'
  );
  assert(parseMin.data.category === 'Tournament Win', 'Category is preserved');
  assert(parseMin.data.imageUrl === undefined, 'Optional imageUrl is omitted when empty');
  assert(parseMin.data.featured === false, 'Featured defaults to false when omitted');
}

// 2. Valid full create payload with https image URL and featured=true
const fullInput: CreateAchievementInput = {
  title: 'National Academy of the Year',
  description: 'Top youth development academy award for progressive performance.',
  category: 'Academy Milestone',
  achievedOn: '2026-01-10T12:00:00.000Z',
  imageUrl: 'https://athletiq.internal/cdn/trophy.png',
  featured: true,
};
const fullPayload = buildCreateAchievementPayload(fullInput);
const parseFull = createAchievementSchema.safeParse(fullPayload);
assert(parseFull.success, 'Full valid achievement payload with image passes Zod validation');
if (parseFull.success) {
  assert(parseFull.data.featured === true, 'Featured flag set to true');
  assert(parseFull.data.imageUrl === 'https://athletiq.internal/cdn/trophy.png', 'HTTPS image URL preserved');
}

// 3. Strict rejection of unknown extraneous keys
const payloadWithExtra = {
  ...fullPayload,
  extraField: 'MaliciousInjection',
};
const parseExtra = createAchievementSchema.safeParse(payloadWithExtra);
assert(!parseExtra.success, 'Create schema strictly rejects unknown extraneous fields');

// 4. Update achievement payload with partial fields
const updateInput: UpdateAchievementInput = {
  title: '  Updated Trophy Title  ',
  featured: false,
};
const updatePayload = buildUpdateAchievementPayload(updateInput);
const parseUpdate = updateAchievementSchema.safeParse(updatePayload);
assert(parseUpdate.success, 'Partial update payload passes Zod validation');
if (parseUpdate.success) {
  assert(parseUpdate.data.title === 'Updated Trophy Title', 'Updated title trimmed');
  assert(parseUpdate.data.featured === false, 'Updated featured flag set to false');
}

// 5. Update payload empty body rejection
const emptyUpdate = buildUpdateAchievementPayload({});
const parseEmptyUpdate = updateAchievementSchema.safeParse(emptyUpdate);
assert(!parseEmptyUpdate.success, 'Update schema requires at least one field to be provided');

// 6. Update schema rejects unknown extraneous fields
const updateWithExtra = {
  ...updatePayload,
  adminOnlyFlag: true,
};
const parseUpdateExtra = updateAchievementSchema.safeParse(updateWithExtra);
assert(!parseUpdateExtra.success, 'Update schema strictly rejects unknown extraneous fields');

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
