/**
 * verify-routes.ts
 * Route coverage verification for the ATHLETIQ frontend.
 * Run: npx tsx ../Frontend/scripts/verify-routes.ts (from Backend/)
 * Exit 0 = all pass, Exit 1 = any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(__dirname, '../src');
const APP_TSX = path.resolve(SRC, 'App.tsx');

let passed = 0;
let failed = 0;

function pass(msg: string): void {
  console.log(`  PASS: ${msg}`);
  passed++;
}

function fail(msg: string): void {
  console.log(`  FAIL: ${msg}`);
  failed++;
}

function assertPass(condition: boolean, msg: string): void {
  if (condition) pass(msg);
  else fail(msg);
}

/** Collect all .tsx/.jsx/.ts files under a directory recursively. */
function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (entry.isFile() && /\.(tsx|jsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ─── (a) Collect declared routes from App.tsx ────────────────────────────────

const appSrc = fs.readFileSync(APP_TSX, 'utf-8');

const declaredPaths: string[] = [];
const pathAttrRegex = /path="([^"]+)"/g;
let m: RegExpExecArray | null;
while ((m = pathAttrRegex.exec(appSrc)) !== null) {
  declaredPaths.push(m[1]);
}

// ─── (b) Collect internal paths used in Frontend/src ────────────────────────

const allSrcFiles = collectFiles(SRC);
const usedPathsRaw: string[] = [];

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf-8');

  // to="..." — React Router Link
  const toRe = /\bto=["']([^"']+)["']/g;
  while ((m = toRe.exec(content)) !== null) usedPathsRaw.push(m[1]);

  // href="/..." — plain anchor with absolute path
  const hrefRe = /href=["'](\/[^"']+)["']/g;
  while ((m = hrefRe.exec(content)) !== null) usedPathsRaw.push(m[1]);

  // navigate('...') or navigate("...")
  const navRe = /navigate\(["']([^"']+)["']/g;
  while ((m = navRe.exec(content)) !== null) usedPathsRaw.push(m[1]);

  // path: '...' (sidebar menu entries in DashboardLayout)
  const pathPropRe = /path:\s*["']([^"']+)["']/g;
  while ((m = pathPropRe.exec(content)) !== null) usedPathsRaw.push(m[1]);

  // getRoleDashboard return values (string literals after 'return ')
  const returnRe = /return\s+["'](\/[^"']+)["']/g;
  while ((m = returnRe.exec(content)) !== null) usedPathsRaw.push(m[1]);
}

// Normalise: replace ${id} with :param, strip query/hash, strip trailing slash
function normalise(p: string): string {
  const noTemplate = p.replace(/\$\{[^}]+\}/g, ':param');
  const noQuery = noTemplate.split('?')[0].split('#')[0];
  return noQuery.length > 1 ? noQuery.replace(/\/$/, '') : noQuery;
}

const usedPaths = [...new Set(usedPathsRaw.map(normalise))].filter(
  (p) => p.startsWith('/') && p !== '#' && !p.startsWith('//'),
);

// ─── Route matching helper ───────────────────────────────────────────────────

function matchesRoute(usedPath: string, declared: string[]): boolean {
  const segments = usedPath.split('/').filter(Boolean);

  for (const route of declared) {
    if (route === '*') return true; // catch-all
    const routeSegs = route.split('/').filter(Boolean);
    if (routeSegs.length !== segments.length) continue;
    const match = routeSegs.every(
      (rs, i) => rs === segments[i] || rs.startsWith(':'),
    );
    if (match) return true;
  }
  return false;
}

// ─── (c) Assert every used path matches a declared route ────────────────────

console.log('\n--- SECTION C: Used paths vs declared routes ---');
const SKIP_PREFIXES = ['http', 'mailto', 'tel'];
const filteredUsed = usedPaths.filter(
  (p) => !SKIP_PREFIXES.some((s) => p.startsWith(s)),
);

for (const usedPath of filteredUsed.sort()) {
  const matched = matchesRoute(usedPath, declaredPaths);
  assertPass(matched, `Used path "${usedPath}" matches a declared route`);
}

// ─── (d) Assert no path declared twice; static before parameterised ──────────

console.log('\n--- SECTION D: Duplicate routes and ordering ---');
const seen = new Map<string, number>();
for (const p of declaredPaths) {
  seen.set(p, (seen.get(p) ?? 0) + 1);
}
for (const [p, count] of seen.entries()) {
  // Catch-all '*' is allowed twice (top-level router for public shell + inside public nested router)
  if (p === '*') continue;
  assertPass(count === 1, `Route "${p}" declared exactly once (found ${count})`);
}

// Check /dashboard/tournaments before /dashboard/tournaments/:id
const tourIdx = declaredPaths.indexOf('/dashboard/tournaments');
const tourParamIdx = declaredPaths.indexOf('/dashboard/tournaments/:id');
assertPass(
  tourIdx !== -1 && tourParamIdx !== -1 && tourIdx < tourParamIdx,
  'Static /dashboard/tournaments declared before /dashboard/tournaments/:id',
);

// Check /dashboard/live before /dashboard/live/:matchId
const liveIdx = declaredPaths.indexOf('/dashboard/live');
const liveParamIdx = declaredPaths.indexOf('/dashboard/live/:matchId');
assertPass(
  liveIdx !== -1 && liveParamIdx !== -1 && liveIdx < liveParamIdx,
  'Static /dashboard/live declared before /dashboard/live/:matchId',
);

// ─── (e) Assert protection rules ────────────────────────────────────────────

console.log('\n--- SECTION E: Protection rules ---');

const mustBeProtected = [
  '/dashboard/admin',
  '/dashboard/coach',
  '/dashboard/athlete',
  '/dashboard/organizer',
  '/dashboard/official',
  '/dashboard/live',
  '/dashboard/live/:matchId',
  '/dashboard/messages',
  '/dashboard/notifications',
  '/dashboard/athletes',
  '/dashboard/coaches',
  '/dashboard/teams',
  '/dashboard/sports',
  '/dashboard/rosters',
  '/dashboard/documents',
  '/dashboard/announcements',
  '/dashboard/training',
  '/dashboard/tournaments',
  '/dashboard/venues',
  '/dashboard/officials',
  '/dashboard/users',
  '/dashboard/analytics',
  '/athlete/:id',
];

const mustBePublic = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/code-of-conduct',
  '/tournaments',
  '/live',
];

function routeHasProtection(routePath: string): boolean {
  // Find all <Route ... path="routePath" ...> occurrences
  const escaped = routePath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Match the specific Route tag for this path up to its closing tag or next Route tag
  const routeRegex = new RegExp(`<Route[^>]*?path=["']${escaped}["'][\\s\\S]*?(?:<\\/Route>|\\/>)`, 'g');
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(appSrc)) !== null) {
    if (match[0].includes('<ProtectedRoute')) return true;
  }
  return false;
}

function routeHasNoProtection(routePath: string): boolean {
  return !routeHasProtection(routePath);
}

for (const p of mustBeProtected) {
  assertPass(
    routeHasProtection(p),
    `Route "${p}" is inside ProtectedRoute`,
  );
}

for (const p of mustBePublic) {
  assertPass(
    routeHasNoProtection(p),
    `Route "${p}" is NOT inside ProtectedRoute (public)`,
  );
}

// ─── (f) Assert getRoleDashboard targets exist and allow correct role ─────────

console.log('\n--- SECTION F: getRoleDashboard targets ---');

interface RoleTarget {
  role: string;
  target: string;
  requiredRole: string;
}

const roleTargets: RoleTarget[] = [
  { role: 'Admin', target: '/dashboard/admin', requiredRole: 'Admin' },
  { role: 'Coach', target: '/dashboard/coach', requiredRole: 'Coach' },
  { role: 'Athlete', target: '/dashboard/athlete', requiredRole: 'Athlete' },
  { role: 'Organizer', target: '/dashboard/organizer', requiredRole: 'Organizer' },
  { role: 'Official', target: '/dashboard/official', requiredRole: 'Official' },
];

for (const { role, target, requiredRole } of roleTargets) {
  assertPass(
    declaredPaths.includes(target),
    `getRoleDashboard(${role}) target "${target}" is declared`,
  );
  const targetLineIdx = appSrc.split('\n').findIndex((l) => l.includes(`path="${target}"`));
  if (targetLineIdx >= 0) {
    const block = appSrc.split('\n').slice(targetLineIdx, targetLineIdx + 10).join('\n');
    assertPass(
      block.includes(requiredRole),
      `Route "${target}" allowedRoles includes "${requiredRole}"`,
    );
  } else {
    fail(`Could not find route block for "${target}"`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`Route coverage summary: ${passed} passed, ${failed} failed (total: ${passed + failed})`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
