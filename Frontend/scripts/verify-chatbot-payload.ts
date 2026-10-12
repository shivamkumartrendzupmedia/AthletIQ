import { chatbotMessageSchema } from '../../Backend/src/validators/chatbot.validator.js';
import {
  buildChatbotMessagePayload,
  ROLE_SUGGESTION_CHIPS,
  getSuggestionChipsForRole,
  type Role,
} from '../src/lib/chatbotPayloads.js';

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

console.log('--- VERIFYING CHATBOT PAYLOAD BUILDER & SUGGESTION CHIPS AGAINST REAL ZOD SCHEMA ---');

// 1. Valid normal message
const input1 = { message: '  What is my attendance rate?  ' };
const payload1 = buildChatbotMessagePayload(input1);
const parse1 = chatbotMessageSchema.safeParse(payload1);
assert(parse1.success, 'Valid message passes REAL Backend Zod schema');
if (parse1.success) {
  assert(parse1.data.message === 'What is my attendance rate?', 'Message is trimmed correctly');
}

// 2. Exact 500-char boundary message
const char500 = 'a'.repeat(500);
const payload500 = buildChatbotMessagePayload({ message: char500 });
const parse500 = chatbotMessageSchema.safeParse(payload500);
assert(parse500.success && parse500.data.message.length === 500, 'Exact 500-character message passes validation');

// 3. 501-char message rejected
const char501 = 'a'.repeat(501);
const payload501 = buildChatbotMessagePayload({ message: char501 });
const parse501 = chatbotMessageSchema.safeParse(payload501);
assert(!parse501.success, '501-character message is rejected by REAL Zod schema');

// 4. Empty string rejected
const payloadEmpty = buildChatbotMessagePayload({ message: '' });
const parseEmpty = chatbotMessageSchema.safeParse(payloadEmpty);
assert(!parseEmpty.success, 'Empty message is rejected by REAL Zod schema');

// 5. Whitespace-only string rejected
const payloadWhitespace = buildChatbotMessagePayload({ message: '     ' });
const parseWhitespace = chatbotMessageSchema.safeParse(payloadWhitespace);
assert(!parseWhitespace.success, 'Whitespace-only message is rejected by REAL Zod schema');

// 6. Unknown key rejected by .strict()
const payloadExtra = { ...payload1, extraProperty: 'malicious' };
const parseExtra = chatbotMessageSchema.safeParse(payloadExtra);
assert(!parseExtra.success, 'Unknown properties are strictly rejected by Backend schema');

// 7. Exactly 6 suggestion chips per role across all 5 roles
const roles: Role[] = ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'];
let allHave6Chips = true;
for (const r of roles) {
  const chips = ROLE_SUGGESTION_CHIPS[r];
  if (!chips || chips.length !== 6) {
    allHave6Chips = false;
  }
}
assert(allHave6Chips, 'All 5 roles have exactly 6 distinct prompt suggestion chips');

// 8. Every single prompt chip across all roles passes the REAL Zod schema
let allPromptsPassZod = true;
for (const r of roles) {
  const chips = ROLE_SUGGESTION_CHIPS[r];
  for (const chip of chips) {
    const parseChip = chatbotMessageSchema.safeParse({ message: chip.prompt });
    if (!parseChip.success || !chip.id || !chip.label) {
      allPromptsPassZod = false;
    }
  }
}
assert(allPromptsPassZod, 'Every suggested prompt across all roles satisfies the REAL Zod schema');

// 9. Role fallback returns valid chips
const fallbackChips = getSuggestionChipsForRole('UnknownRole');
assert(fallbackChips.length === 6, 'Unrecognized role falls back gracefully to valid 6 chips');

// 10. Hindi/Hinglish phrase passes schema
const hinglishInput = { message: 'meri hajri kitni hai?' };
const hinglishPayload = buildChatbotMessagePayload(hinglishInput);
const parseHinglish = chatbotMessageSchema.safeParse(hinglishPayload);
assert(parseHinglish.success, 'Hinglish prompt message builds and validates successfully');

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
