import {
  createContactMessageSchema,
  updateContactMessageStatusSchema,
} from '../../Backend/src/validators/contact.validator.js';
import {
  buildCreateContactPayload,
  buildUpdateContactStatusPayload,
  type CreateContactInput,
} from '../src/lib/contactPayloads.js';

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

console.log('--- VERIFYING CONTACT PAYLOAD BUILDERS AGAINST REAL ZOD SCHEMA ---');

// 1. Valid minimal contact payload (without optional subject)
const minInput: CreateContactInput = {
  name: '  Alex Turner  ',
  email: '  ALEX@Example.com  ',
  message: '  Inquiry about trial sessions  ',
};
const minPayload = buildCreateContactPayload(minInput);
const parseMin = createContactMessageSchema.safeParse(minPayload);
assert(parseMin.success, 'Minimal valid contact payload passes Zod validation');
if (parseMin.success) {
  assert(parseMin.data.name === 'Alex Turner', 'Name is trimmed correctly');
  assert(parseMin.data.email === 'alex@example.com', 'Email is trimmed and lowercased');
  assert(parseMin.data.message === 'Inquiry about trial sessions', 'Message is trimmed correctly');
  assert(parseMin.data.subject === undefined, 'Optional subject is omitted when not provided');
}

// 2. Valid full contact payload (with optional subject)
const fullInput: CreateContactInput = {
  name: 'Marcus Rashford',
  email: 'marcus@athletiq.test',
  subject: '  Tryout query for U18  ',
  message: 'Can I join the upcoming trial next Monday?',
};
const fullPayload = buildCreateContactPayload(fullInput);
const parseFull = createContactMessageSchema.safeParse(fullPayload);
assert(parseFull.success, 'Full valid contact payload passes Zod validation');
if (parseFull.success) {
  assert(parseFull.data.subject === 'Tryout query for U18', 'Subject is trimmed properly');
}

// 3. Rejects unknown keys due to .strict()
const payloadWithExtra = {
  ...fullPayload,
  role: 'Admin',
};
const parseExtra = createContactMessageSchema.safeParse(payloadWithExtra);
assert(!parseExtra.success, 'Zod schema strictly rejects unknown extraneous fields');

// 4. Update status schema validation
const validStatus = buildUpdateContactStatusPayload({ status: 'Read' });
const parseStatus = updateContactMessageStatusSchema.safeParse(validStatus);
assert(parseStatus.success, 'Update status payload passes Zod validation for Read');

const validArchive = buildUpdateContactStatusPayload({ status: 'Archived' });
const parseArchive = updateContactMessageStatusSchema.safeParse(validArchive);
assert(parseArchive.success, 'Update status payload passes Zod validation for Archived');

// 5. Invalid status rejection
const parseInvalidStatus = updateContactMessageStatusSchema.safeParse({ status: 'Deleted' });
assert(!parseInvalidStatus.success, 'Zod rejects invalid status outside enum');

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
