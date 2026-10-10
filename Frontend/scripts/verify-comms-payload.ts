/**
 * Verification script for comms payload builder pure functions
 * Tests payloads against the REAL Backend Zod schemas:
 * - createAnnouncementSchema
 * - updateAnnouncementSchema
 * - createDocumentSchema
 * Imported directly from Backend/src/validators/comms.validator.ts.
 */
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  createDocumentSchema,
} from '../../Backend/src/validators/comms.validator.ts';
import {
  buildCreateAnnouncementPayload,
  buildUpdateAnnouncementPayload,
  buildCreateDocumentPayload,
} from '../src/components/comms/commsPayload.ts';

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

console.log('--- RUNNING COMMS PAYLOAD VERIFICATION SUITE ---\n');

const validTeamId = '507f1f77bcf86cd799439011';

// Case 1: Build create announcement payload for All audience
{
  const payload = buildCreateAnnouncementPayload({
    title: '  Spring Championship Registration Open  ',
    body: '  Please submit consent forms by Friday.  ',
    audience: 'All',
    pinned: true,
  });
  const result = createAnnouncementSchema.safeParse(payload);
  assert(
    result.success && payload.title === 'Spring Championship Registration Open' && payload.pinned === true,
    '1. Valid All audience announcement passes createAnnouncementSchema with trimmed whitespace'
  );
}

// Case 2: Build create announcement payload for Team audience with valid team
{
  const payload = buildCreateAnnouncementPayload({
    title: 'Team Tactical Briefing',
    body: 'Review playbook video ahead of tomorrow game',
    audience: 'Team',
    team: `  ${validTeamId}  `,
  });
  const result = createAnnouncementSchema.safeParse(payload);
  assert(
    result.success && payload.team === validTeamId,
    '2. Valid Team audience announcement passes createAnnouncementSchema with trimmed team ID'
  );
}

// Case 3: Create announcement for Team audience without team is rejected by schema
{
  const payload = buildCreateAnnouncementPayload({
    title: 'Team Briefing Missing Team',
    body: 'Missing target team',
    audience: 'Team',
  });
  const result = createAnnouncementSchema.safeParse(payload);
  assert(
    !result.success,
    '3. Announcement with audience Team without team is rejected by createAnnouncementSchema'
  );
}

// Case 4: Build update announcement payload with partial fields
{
  const payload = buildUpdateAnnouncementPayload({
    title: '  Updated Championship Title  ',
    pinned: false,
  });
  const result = updateAnnouncementSchema.safeParse(payload);
  assert(
    result.success && payload.title === 'Updated Championship Title' && payload.pinned === false && !('body' in payload),
    '4. Partial update passes updateAnnouncementSchema without sending omitted fields'
  );
}

// Case 5: Build update announcement payload switching audience to Team with team ID
{
  const payload = buildUpdateAnnouncementPayload({
    audience: 'Team',
    team: validTeamId,
  });
  const result = updateAnnouncementSchema.safeParse(payload);
  assert(
    result.success && payload.audience === 'Team' && payload.team === validTeamId,
    '5. Update switching audience to Team with valid team ID passes updateAnnouncementSchema'
  );
}

// Case 6: Build update announcement payload switching audience to Team without team ID fails
{
  const payload = buildUpdateAnnouncementPayload({
    audience: 'Team',
  });
  const result = updateAnnouncementSchema.safeParse(payload);
  assert(
    !result.success,
    '6. Update switching audience to Team without team ID is rejected by updateAnnouncementSchema'
  );
}

// Case 7: Build create document payload for Public Policy
{
  const payload = buildCreateDocumentPayload({
    title: '  Academy Code of Conduct 2026  ',
    category: 'Policy',
    visibility: 'Public',
  });
  const result = createDocumentSchema.safeParse(payload);
  assert(
    result.success && payload.title === 'Academy Code of Conduct 2026' && !('team' in payload),
    '7. Valid Public Policy document passes createDocumentSchema with trimmed title'
  );
}

// Case 8: Build create document payload for Team Playbook
{
  const payload = buildCreateDocumentPayload({
    title: 'Playbook Diagram Q4',
    category: 'Other',
    visibility: 'Team',
    team: validTeamId,
  });
  const result = createDocumentSchema.safeParse(payload);
  assert(
    result.success && payload.team === validTeamId,
    '8. Valid Team visibility document passes createDocumentSchema'
  );
}

// Case 9: Build create document payload for Team visibility without team fails
{
  const payload = buildCreateDocumentPayload({
    title: 'Orphan Playbook',
    category: 'Other',
    visibility: 'Team',
  });
  const result = createDocumentSchema.safeParse(payload);
  assert(
    !result.success,
    '9. Document with visibility Team without team is rejected by createDocumentSchema'
  );
}

// Case 10: Extra unknown properties are rejected by .strict() schema
{
  const dirtyPayload = {
    ...buildCreateAnnouncementPayload({
      title: 'Valid Title',
      body: 'Valid Body',
      audience: 'Public',
    }),
    injectedKey: 'malicious',
  };
  const result = createAnnouncementSchema.safeParse(dirtyPayload);
  assert(
    !result.success,
    '10. Extra unknown properties are strictly rejected by createAnnouncementSchema (.strict())'
  );
}

// Case 11: Document schema strictly rejects unknown properties
{
  const dirtyDocPayload = {
    ...buildCreateDocumentPayload({
      title: 'Valid Doc',
      category: 'Form',
      visibility: 'All',
    }),
    fakeField: true,
  };
  const result = createDocumentSchema.safeParse(dirtyDocPayload);
  assert(
    !result.success,
    '11. Extra unknown properties are strictly rejected by createDocumentSchema (.strict())'
  );
}

// Case 12: Empty title is rejected
{
  const emptyTitlePayload = buildCreateAnnouncementPayload({
    title: '   ',
    body: 'Valid Body',
    audience: 'Public',
  });
  const result = createAnnouncementSchema.safeParse(emptyTitlePayload);
  assert(
    !result.success,
    '12. Whitespace-only title is rejected by createAnnouncementSchema'
  );
}

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
