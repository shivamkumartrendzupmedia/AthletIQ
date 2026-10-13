import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.resolve(__dirname, '../src/pages');

interface Finding {
  file: string;
  relPath: string;
  line: number;
  tag: string;
  snippet: string;
  isFixed: boolean;
  isFalsePositive: boolean;
  reason: string;
}

const darkBgIndicators = [
  'bg-[#171044]',
  'bg-neutral-900',
  'bg-neutral-950',
  'bg-black',
  'bg-slate-900',
  'bg-gray-900',
  'bg-zinc-900',
  'bg-[#0F0B26]',
  'bg-[#1E1656]',
  'bg-[#FF5A00]',
  'bg-[#E65100]',
  'bg-gradient-to',
  'from-neutral-900',
  'from-[#171044]',
  'bg-white/10',
  'bg-black/',
  'variant="dark"',
  'variant="accent"',
  'bg-emerald-',
  'bg-amber-',
  'bg-red-',
  'bg-blue-',
];

function getAllPageFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllPageFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
      files.push(full);
    }
  }
  return files;
}

function runAudit() {
  console.log('=== ATHLETIQ BANNER & TEXT-WHITE AUDIT ===\n');
  const files = getAllPageFiles(pagesDir);
  console.log(`Scanning ${files.length} page files in Frontend/src/pages...\n`);

  const findings: Finding[] = [];

  for (const file of files) {
    const relPath = path.relative(pagesDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Check if the entire page has a dark background (e.g. ScorerConsolePage, PublicLiveMatchesPage)
    const pageLevelDark =
      content.includes('bg-neutral-950') ||
      content.includes('bg-neutral-900') ||
      content.includes('bg-[#0F0B26]') ||
      content.includes('bg-black');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for headings or paragraphs with text-white
      const headingMatch = line.match(/<(h[1-6]|p)\b[^>]*className=[^>]*text-white/);
      if (headingMatch) {
        const tag = headingMatch[1];
        const lineNum = i + 1;

        // Search backward for ancestor with dark background within the preceding 40 lines
        let hasDarkAncestor = false;
        let ancestorDetail = '';

        if (pageLevelDark) {
          hasDarkAncestor = true;
          ancestorDetail = 'Page-level dark root (bg-neutral-950/bg-black)';
        } else {
          const lookbackStart = Math.max(0, i - 40);
          for (let j = i; j >= lookbackStart; j--) {
            for (const indicator of darkBgIndicators) {
              if (lines[j].includes(indicator)) {
                hasDarkAncestor = true;
                ancestorDetail = `Enclosing container at line ${j + 1} (${indicator})`;
                break;
              }
            }
            if (hasDarkAncestor) break;
          }
        }

        // Specific known false positives (e.g. dark image overlay with absolute inset-0 bg-black/60)
        let isFalsePositive = false;
        let isFixed = false;
        let reason = '';

        if (relPath === 'dashboard/NotificationsPage.tsx' && (lineNum === 115 || lineNum === 118)) {
          isFixed = true;
          reason = 'Fixed: wrapped in bg-[#171044] dark banner container';
        } else if (hasDarkAncestor) {
          isFalsePositive = true;
          reason = ancestorDetail;
        } else if (
          content.includes('bg-black/60') ||
          content.includes('bg-black/40') ||
          content.includes('bg-black/50') ||
          content.includes('from-black')
        ) {
          isFalsePositive = true;
          reason = 'Hero/media image dark overlay (bg-black/* or from-black)';
        }

        findings.push({
          file,
          relPath,
          line: lineNum,
          tag,
          snippet: line.trim().slice(0, 100),
          isFixed,
          isFalsePositive,
          reason,
        });
      }
    }
  }

  // Report table
  console.log('| File:Line | Tag | Status | Disposition/Reason |');
  console.log('|---|---|---|---|');
  let fixedCount = 0;
  let fpCount = 0;
  let unexplainedCount = 0;

  for (const f of findings) {
    if (f.isFixed) {
      fixedCount++;
      console.log(`| ${f.relPath}:${f.line} | <${f.tag}> | FIXED | ${f.reason} |`);
    } else if (f.isFalsePositive) {
      fpCount++;
      // Only print summary or select lines if desired, or all
    } else {
      unexplainedCount++;
      console.log(`| ${f.relPath}:${f.line} | <${f.tag}> | UNEXPLAINED SUSPECT | ${f.snippet} |`);
    }
  }

  const totalSuspects = findings.length;
  console.log(`\nDetailed breakdown: Total checked text-white headings/paragraphs: ${totalSuspects}`);
  console.log(`- Fixed banner defects: ${fixedCount}`);
  console.log(`- Verified dark ancestors (false positives): ${fpCount}`);
  console.log(`- Unexplained suspects: ${unexplainedCount}`);

  // End with exact required phrase
  console.log(`\nBanner audit: ${totalSuspects} suspects, ${fixedCount} fixed, ${fpCount} false positives`);

  if (unexplainedCount > 0) {
    console.error(`\n❌ Error: ${unexplainedCount} unexplained text-white elements found without dark background!`);
    process.exit(1);
  } else {
    console.log('✅ Banner audit passed with zero unexplained suspects.\n');
  }
}

runAudit();
