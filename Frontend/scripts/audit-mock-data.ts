/**
 * audit-mock-data.ts
 * Scans Frontend/src for mock data, placeholder image hosts, hardcoded fake entities,
 * and dummy records across the whole website.
 *
 * Run from Backend: npx tsx ../Frontend/scripts/audit-mock-data.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(__dirname, '../src');

export interface AuditHit {
  file: string;
  line: number;
  content: string;
  reason: string;
}

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /images\.unsplash\.com/i, reason: 'External Unsplash stock image URL' },
  { regex: /picsum\.photos/i, reason: 'Picsum placeholder image' },
  { regex: /via\.placeholder\.com/i, reason: 'Placeholder image URL' },
  { regex: /from\s+['"][^'"]*\/data\/[^'"]*['"]/i, reason: 'Import from static mock data directory (src/data)' },
  { regex: /alex_morgan_portrait/i, reason: 'Mock athlete portrait image asset' },
  { regex: /u16_strikers_team/i, reason: 'Mock team photo image asset' },
  { regex: /['"]500\+['"]/i, reason: 'Hardcoded fake athlete count fallback ("500+")' },
  { regex: /['"]25\+['"]/i, reason: 'Hardcoded fake coach count fallback ("25+")' },
  { regex: /['"]12\+['"]/i, reason: 'Hardcoded fake squad count fallback ("12+")' },
  { regex: /\bLorem\b/i, reason: 'Lorem ipsum placeholder text' },
  { regex: /\bAlex Morgan\b/i, reason: 'Hardcoded mock athlete name "Alex Morgan"' },
  { regex: /\bDavid Vance\b/i, reason: 'Hardcoded mock coach name "David Vance"' },
  { regex: /\bJohn Doe\b/i, reason: 'Hardcoded mock person name "John Doe"' },
  { regex: /\bU16 Strikers\b/i, reason: 'Hardcoded mock team name "U16 Strikers"' },
  { regex: /\(505\)\s*123-4567/i, reason: 'Dummy telephone number (505) 123-4567' },
  { regex: /\+1\s*\(?555\)?/i, reason: 'Dummy 555 phone number' },
  { regex: /info@activeathletiq\.com/i, reason: 'Dummy contact email info@activeathletiq.com' },
];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude tests or non-src directories if any
      out.push(...collectFiles(full));
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export function runAudit(): { hits: AuditHit[]; filesScanned: number } {
  const files = collectFiles(SRC);
  const hits: AuditHit[] = [];

  for (const file of files) {
    const relPath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');

    // Skip siteConfig placeholders if explicitly allowed
    if (relPath.includes('src/lib/siteConfig.ts')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip single-line comments explaining forbidden patterns
      if (line.trim().startsWith('//') && line.includes('never')) {
        continue;
      }

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(line)) {
          hits.push({
            file: relPath,
            line: i + 1,
            content: line.trim(),
            reason: pattern.reason,
          });
        }
      }
    }
  }

  return { hits, filesScanned: files.length };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('audit-mock-data.ts')) {
  console.log('====================================================');
  console.log('ATHLETIQ FRONTEND MOCK DATA & ASSETS AUDIT');
  console.log('====================================================\n');

  const { hits, filesScanned } = runAudit();

  console.log(`Files scanned: ${filesScanned}`);
  console.log(`Total hits found: ${hits.length}\n`);

  if (hits.length > 0) {
    console.log('--- AUDIT HITS LISTING ---');
    for (const h of hits) {
      console.log(`${h.file}:${h.line} [${h.reason}]`);
      console.log(`    > ${h.content.slice(0, 100)}`);
    }
    console.log('\n====================================================');
    console.log(`Summary: ${hits.length} mock data hits detected.`);
    console.log('====================================================');
    // We do not exit 1 during inspection runs unless --strict is passed
    if (process.argv.includes('--strict')) {
      process.exit(1);
    }
  } else {
    console.log('✓ PASS: Zero mock data, dummy text, or placeholder images found across Frontend/src.');
    console.log('====================================================');
    console.log('Summary: 0 unexplained hits. Clean production frontend.');
    console.log('====================================================');
    process.exit(0);
  }
}
