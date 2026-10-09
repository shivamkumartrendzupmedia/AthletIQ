import { isValidImageUrl, getInitials } from '../src/components/SafeImage.js';

interface TestCase {
  name: string;
  fn: () => boolean;
}

const tests: TestCase[] = [
  {
    name: '1. Valid https:// URL returns true',
    fn: () => isValidImageUrl('https://images.example.com/team-photo.jpg') === true,
  },
  {
    name: '2. Insecure http:// URL returns false',
    fn: () => isValidImageUrl('http://images.example.com/team-photo.jpg') === false,
  },
  {
    name: '3. Data URL returns false',
    fn: () => isValidImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE') === false,
  },
  {
    name: '4. Javascript protocol returns false',
    fn: () => isValidImageUrl('javascript:alert(1)') === false,
  },
  {
    name: '5. Relative path returns false',
    fn: () => isValidImageUrl('/assets/team.jpg') === false,
  },
  {
    name: '6. Empty and whitespace strings return false',
    fn: () => isValidImageUrl('') === false && isValidImageUrl('   ') === false,
  },
  {
    name: '7. Non-string types (null, undefined, numbers) return false',
    fn: () => isValidImageUrl(null) === false && isValidImageUrl(undefined) === false && isValidImageUrl(123) === false,
  },
  {
    name: '8. URL with leading/trailing whitespace but valid https:// returns true',
    fn: () => isValidImageUrl('   https://athletiq.com/logo.png  ') === true,
  },
  {
    name: '9. getInitials extracts single-word and multi-word initials accurately',
    fn: () =>
      getInitials('Strikers FC') === 'SF' &&
      getInitials('Alex Morgan') === 'AM' &&
      getInitials('Football') === 'FO' &&
      getInitials('', 'D') === 'D',
  },
];

console.log('--- RUNNING SAFEIMAGE RULE VERIFICATION SUITE ---\n');
let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    if (t.fn()) {
      console.log(`PASS: ${t.name}`);
      passed++;
    } else {
      console.error(`FAIL: ${t.name}`);
      failed++;
    }
  } catch (err) {
    console.error(`FAIL: ${t.name} (threw error: ${err})`);
    failed++;
  }
}

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
