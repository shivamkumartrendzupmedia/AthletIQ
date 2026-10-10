/**
 * Verification script for Tournament payload builders
 * Validates payloads against the REAL Backend Zod schemas:
 * - createTournamentSchema
 * - updateTournamentSchema
 * - createRegistrationSchema
 * - updateSquadSchema
 * - reviewRegistrationSchema
 * - createVenueSchema
 * - updateVenueSchema
 * - createOfficialSchema
 * - updateOfficialSchema
 * - createMatchSchema
 * - updateMatchSchema
 * - enterMatchResultSchema
 * Imported directly from Backend/src/validators/tournament.validator.ts.
 */
import {
  createTournamentSchema,
  updateTournamentSchema,
  createRegistrationSchema,
  updateSquadSchema,
  reviewRegistrationSchema,
  createVenueSchema,
  updateVenueSchema,
  createOfficialSchema,
  updateOfficialSchema,
  createMatchSchema,
  updateMatchSchema,
  enterMatchResultSchema,
} from '../../Backend/src/validators/tournament.validator.ts';
import {
  buildCreateTournamentPayload,
  buildUpdateTournamentPayload,
  buildCreateRegistrationPayload,
  buildUpdateSquadPayload,
  buildReviewRegistrationPayload,
  buildCreateVenuePayload,
  buildUpdateVenuePayload,
  buildCreateOfficialPayload,
  buildUpdateOfficialPayload,
  buildCreateMatchPayload,
  buildUpdateMatchPayload,
  buildEnterMatchResultPayload,
} from '../src/lib/tournamentPayloads.ts';

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

console.log('--- RUNNING TOURNAMENT PAYLOAD BUILDERS VERIFICATION SUITE ---\n');

const validId1 = '507f1f77bcf86cd799439011';
const validId2 = '507f1f77bcf86cd799439012';
const validId3 = '507f1f77bcf86cd799439013';

// 1. buildCreateTournamentPayload
{
  const payload = buildCreateTournamentPayload({
    name: '  Regional Youth Championship  ',
    sport: validId1,
    category: '  Cup  ',
    ageGroup: '  U18  ',
    format: 'Knockout',
    startDate: '2026-11-01T09:00:00Z',
    endDate: '2026-11-05T18:00:00Z',
    rules: '  Fair play rules apply  ',
    maxTeams: '16',
  });
  const res = createTournamentSchema.safeParse(payload);
  assert(res.success && payload.name === 'Regional Youth Championship' && payload.maxTeams === 16, 'buildCreateTournamentPayload valid');
}

// 2. buildUpdateTournamentPayload
{
  const payload = buildUpdateTournamentPayload({
    name: '  Updated Championship Name  ',
    maxTeams: 32,
    rules: '  Updated Rules  ',
  });
  const res = updateTournamentSchema.safeParse(payload);
  assert(res.success && payload.name === 'Updated Championship Name' && payload.maxTeams === 32, 'buildUpdateTournamentPayload valid');
}

// 3. buildCreateRegistrationPayload
{
  const payload = buildCreateRegistrationPayload({
    team: validId1,
    squad: [validId2, validId3],
  });
  const res = createRegistrationSchema.safeParse(payload);
  assert(res.success && payload.squad.length === 2, 'buildCreateRegistrationPayload valid');
}

// 4. buildUpdateSquadPayload
{
  const payload = buildUpdateSquadPayload({
    squad: [validId1, validId2],
  });
  const res = updateSquadSchema.safeParse(payload);
  assert(res.success && payload.squad.length === 2, 'buildUpdateSquadPayload valid');
}

// 5. buildReviewRegistrationPayload - Approved
{
  const payload = buildReviewRegistrationPayload({
    status: 'Approved',
  });
  const res = reviewRegistrationSchema.safeParse(payload);
  assert(res.success && payload.status === 'Approved' && !('reason' in payload), 'buildReviewRegistrationPayload Approved valid');
}

// 6. buildReviewRegistrationPayload - Rejected with reason
{
  const payload = buildReviewRegistrationPayload({
    status: 'Rejected',
    reason: '  Roster documentation missing  ',
  });
  const res = reviewRegistrationSchema.safeParse(payload);
  assert(res.success && payload.reason === 'Roster documentation missing', 'buildReviewRegistrationPayload Rejected valid');
}

// 7. buildCreateVenuePayload
{
  const payload = buildCreateVenuePayload({
    name: '  Olympic Stadium  ',
    address: '  123 Sports Way  ',
    capacity: '5000',
    active: true,
  });
  const res = createVenueSchema.safeParse(payload);
  assert(res.success && payload.capacity === 5000 && payload.name === 'Olympic Stadium', 'buildCreateVenuePayload valid');
}

// 8. buildUpdateVenuePayload
{
  const payload = buildUpdateVenuePayload({
    name: '  Updated Arena  ',
    capacity: 2500,
  });
  const res = updateVenueSchema.safeParse(payload);
  assert(res.success && payload.name === 'Updated Arena' && payload.capacity === 2500, 'buildUpdateVenuePayload valid');
}

// 9. buildCreateOfficialPayload
{
  const payload = buildCreateOfficialPayload({
    name: '  Alex Smith  ',
    type: 'Referee',
    active: true,
  });
  const res = createOfficialSchema.safeParse(payload);
  assert(res.success && payload.name === 'Alex Smith' && payload.type === 'Referee', 'buildCreateOfficialPayload valid');
}

// 10. buildUpdateOfficialPayload
{
  const payload = buildUpdateOfficialPayload({
    type: 'Assistant Referee',
    active: false,
  });
  const res = updateOfficialSchema.safeParse(payload);
  assert(res.success && payload.type === 'Assistant Referee' && payload.active === false, 'buildUpdateOfficialPayload valid');
}

// 11. buildCreateMatchPayload
{
  const payload = buildCreateMatchPayload({
    homeTeam: validId1,
    awayTeam: validId2,
    round: '  Quarter Final  ',
    group: '  Group A  ',
    scheduledAt: '2026-11-02T14:00:00Z',
    durationMinutes: '90',
    venue: validId3,
  });
  const res = createMatchSchema.safeParse(payload);
  assert(res.success && payload.round === 'Quarter Final' && payload.durationMinutes === 90, 'buildCreateMatchPayload valid');
}

// 12. buildUpdateMatchPayload
{
  const payload = buildUpdateMatchPayload({
    round: 'Semi Final',
    scheduledAt: '2026-11-04T16:00:00Z',
    referee: null,
  });
  const res = updateMatchSchema.safeParse(payload);
  assert(res.success && payload.round === 'Semi Final' && payload.referee === null, 'buildUpdateMatchPayload valid');
}

// 13. buildEnterMatchResultPayload
{
  const payload = buildEnterMatchResultPayload({
    homeScore: '3',
    awayScore: 1,
  });
  const res = enterMatchResultSchema.safeParse(payload);
  assert(res.success && payload.homeScore === 3 && payload.awayScore === 1, 'buildEnterMatchResultPayload valid');
}

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
