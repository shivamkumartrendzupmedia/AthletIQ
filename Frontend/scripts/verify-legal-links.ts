import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL_LINKS } from '../src/lib/legalLinks';
import { SITE_CONFIG } from '../src/lib/siteConfig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('========================================');
console.log('--- VERIFYING LEGAL LINKS & POLICIES ---');
console.log('========================================\n');

// 1. Check LEGAL_LINKS configuration
assert(
  Array.isArray(LEGAL_LINKS) && LEGAL_LINKS.length >= 3,
  `LEGAL_LINKS defines at least 3 entries (found: ${LEGAL_LINKS.length})`
);

const expectedPaths = ['/privacy', '/terms', '/code-of-conduct'];
for (const p of expectedPaths) {
  assert(
    LEGAL_LINKS.some((l) => l.path === p),
    `LEGAL_LINKS includes path "${p}"`
  );
}

// 2. Read App.tsx to verify public routing and absence of ProtectedRoute wrapping
const appContent = fs.readFileSync(path.join(frontendDir, 'src/App.tsx'), 'utf-8');

for (const link of LEGAL_LINKS) {
  const routeRegex = new RegExp(`<Route[^>]*path=["']${link.path}["']`, 'g');
  assert(routeRegex.test(appContent), `App.tsx contains a Route for "${link.path}"`);

  // Ensure this legal route is NOT wrapped inside ProtectedRoute
  // Extract the element block for this route
  const routeBlockMatch = appContent.match(
    new RegExp(`<Route[^>]*path=["']${link.path}["'][\\s\\S]*?\\/>`, 'm')
  );
  if (routeBlockMatch) {
    const isProtected = routeBlockMatch[0].includes('ProtectedRoute');
    assert(!isProtected, `Route "${link.path}" sits outside ProtectedRoute (is strictly public)`);
  } else {
    assert(false, `Could not parse Route block for "${link.path}"`);
  }
}

// 3. Check PrivacyPolicyPage.tsx
const privacyContent = fs.readFileSync(path.join(frontendDir, 'src/pages/PrivacyPolicyPage.tsx'), 'utf-8');
assert(
  privacyContent.includes('export default PrivacyPolicyPage'),
  'PrivacyPolicyPage.tsx contains a default export'
);
assert(
  /<h1[^>]*>[\s\S]*?Privacy Policy/i.test(privacyContent),
  'PrivacyPolicyPage.tsx contains main heading <h1>Privacy Policy'
);

// 4. Check TermsPage.tsx
const termsContent = fs.readFileSync(path.join(frontendDir, 'src/pages/TermsPage.tsx'), 'utf-8');
assert(
  termsContent.includes('export default TermsPage'),
  'TermsPage.tsx contains a default export'
);
assert(
  /<h1[^>]*>[\s\S]*?Terms of Service/i.test(termsContent),
  'TermsPage.tsx contains main heading <h1>Terms of Service'
);

// 5. Check CodeOfConductPage.tsx
const cocContent = fs.readFileSync(path.join(frontendDir, 'src/pages/CodeOfConductPage.tsx'), 'utf-8');
assert(
  cocContent.includes('export default CodeOfConductPage'),
  'CodeOfConductPage.tsx contains a default export'
);
assert(
  /<h1[^>]*>[\s\S]*?Code of Conduct/i.test(cocContent),
  'CodeOfConductPage.tsx contains main heading <h1>Code of Conduct'
);

// 6. Check SITE_CONFIG and bracket placeholders
const requiredPlaceholders: (keyof typeof SITE_CONFIG)[] = [
  'ACADEMY_NAME',
  'LEGAL_ENTITY_NAME',
  'CONTACT_EMAIL',
  'CONTACT_ADDRESS',
];

for (const key of requiredPlaceholders) {
  const val = SITE_CONFIG[key];
  assert(
    typeof val === 'string' && val.trim().length > 0,
    `Placeholder "${key}" is non-empty (value: "${val}")`
  );
}

// 6b. Assert none of GOVERNING_LAW, EFFECTIVE_DATE, LAST_UPDATED appear anywhere in Frontend/src
function scanDirForPatterns(dir: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...scanDirForPatterns(fullPath, patterns));
    } else if (entry.isFile() && /\.(tsx?|jsx?|html|css|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          hits.push(`${path.relative(frontendDir, fullPath)} matched ${pattern}`);
        }
      }
    }
  }
  return hits;
}

const forbiddenHits = scanDirForPatterns(path.join(frontendDir, 'src'), [
  /\bGOVERNING_LAW\b/,
  /\bEFFECTIVE_DATE\b/,
  /\bLAST_UPDATED\b/,
]);
assert(
  forbiddenHits.length === 0,
  `None of GOVERNING_LAW, EFFECTIVE_DATE, LAST_UPDATED appear anywhere in Frontend/src (found: ${forbiddenHits.length})`
);

// 6c. Assert Terms has no "Governing law" heading
assert(
  !/<h\d[^>]*>[\s\S]*?Governing\s+Law/i.test(termsContent),
  'Terms of Service page has no "Governing Law" heading'
);

// 6d. Assert every table-of-contents anchor of Terms, Privacy, CodeOfConduct resolves to a heading id
function verifyAnchorsResolveToIds(pageName: string, content: string): boolean {
  const hrefMatches = [...content.matchAll(/<a\s+[^>]*href=["']#([^"']+)["']/g)];
  for (const m of hrefMatches) {
    const targetId = m[1];
    // Check if element with id="targetId" or id={targetId} exists
    const idRegex = new RegExp(`id=["']${targetId}["']`, 'i');
    if (!idRegex.test(content)) {
      console.error(`Anchor #${targetId} in ${pageName} does not resolve to an element id`);
      return false;
    }
  }
  return true;
}

const allAnchorsResolve =
  verifyAnchorsResolveToIds('TermsPage.tsx', termsContent) &&
  verifyAnchorsResolveToIds('PrivacyPolicyPage.tsx', privacyContent) &&
  verifyAnchorsResolveToIds('CodeOfConductPage.tsx', cocContent);

assert(
  allAnchorsResolve,
  'Every table-of-contents anchor of Terms, Privacy, and Code of Conduct resolves to a heading id'
);

// 7. Check Footer references LEGAL_LINKS
const footerContent = fs.readFileSync(path.join(frontendDir, 'src/components/Footer.tsx'), 'utf-8');
assert(
  footerContent.includes('LEGAL_LINKS'),
  'Footer.tsx imports and renders LEGAL_LINKS'
);

// 8. Check consent links on Auth & Contact forms
const registerContent = fs.readFileSync(path.join(frontendDir, 'src/pages/RegisterPage.tsx'), 'utf-8');
assert(
  registerContent.includes('/terms') && registerContent.includes('/privacy'),
  'RegisterPage.tsx includes plain consent lines linking to /terms and /privacy'
);

const loginContent = fs.readFileSync(path.join(frontendDir, 'src/pages/LoginPage.tsx'), 'utf-8');
assert(
  loginContent.includes('/terms') && loginContent.includes('/privacy'),
  'LoginPage.tsx includes plain consent lines linking to /terms and /privacy'
);

const contactContent = fs.readFileSync(path.join(frontendDir, 'src/pages/ContactPage.tsx'), 'utf-8');
assert(
  contactContent.includes('/privacy') && contactContent.includes('/terms'),
  'ContactPage.tsx includes plain consent lines linking to /privacy and /terms'
);

console.log('\n--- PLACEHOLDER INVENTORY TO FILL IN ---');
for (const [key, val] of Object.entries(SITE_CONFIG)) {
  console.log(`- ${key}: ${val}`);
}

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed (total: ${passed + failed})`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
