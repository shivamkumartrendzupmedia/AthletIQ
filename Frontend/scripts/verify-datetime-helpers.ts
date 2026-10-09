/**
 * Verification script for Frontend/src/lib/datetime.ts
 * Tests local <-> UTC conversion across multiple IANA timezones,
 * specifically testing:
 *  1. America/New_York standard vs daylight (DST) time handling
 *  2. Midnight local crossover (Asia/Kolkata -> previous day UTC and back)
 *  3. Europe/London DST transition handling
 *  4. Round-trip idempotence and session formatting across timezones
 *  5. formatSessionTimeRange with explicit timezone
 *  6. formatSessionStartHint across UTC and America/New_York
 *  7. formatSessionStartHint across Asia/Kolkata and Europe/London
 */
import {
  toDatetimeLocalString,
  fromDatetimeLocalString,
  formatSessionTimeRange,
  formatSessionStartHint,
} from '../src/lib/datetime.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    failed++;
    process.exit(1);
  }
}

console.log('--- Testing datetime.ts pure helpers ---');

// Case 1: Standard America/New_York (EDT UTC-4 during summer)
{
  const localInput = '2026-06-15T14:30';
  const tz = 'America/New_York';
  const utcOutput = fromDatetimeLocalString(localInput, tz);
  console.log(`[Case 1] NY Summer: ${localInput} (${tz}) -> ${utcOutput}`);
  assert(utcOutput === '2026-06-15T18:30:00.000Z', `Expected 18:30 UTC for 14:30 EDT, got ${utcOutput}`);

  const roundTrip = toDatetimeLocalString(utcOutput, tz);
  assert(roundTrip === localInput, `Roundtrip failed: expected ${localInput}, got ${roundTrip}`);
  passed++;
  console.log('  ✓ Summer round-trip passed');
}

// Case 2: Midnight local in Asia/Kolkata (+05:30) - crossing date boundary in UTC
{
  const localInput = '2026-10-15T00:00';
  const tz = 'Asia/Kolkata';
  const utcOutput = fromDatetimeLocalString(localInput, tz);
  console.log(`[Case 2] Midnight Asia/Kolkata: ${localInput} (${tz}) -> ${utcOutput}`);
  assert(utcOutput === '2026-10-14T18:30:00.000Z', `Expected previous day 18:30 UTC, got ${utcOutput}`);

  const roundTrip = toDatetimeLocalString(utcOutput, tz);
  assert(roundTrip === localInput, `Roundtrip failed: expected ${localInput}, got ${roundTrip}`);
  passed++;
  console.log('  ✓ Midnight date boundary crossover passed');
}

// Case 3: DST transition in America/New_York (Winter EST UTC-5 vs Summer EDT UTC-4)
{
  const tz = 'America/New_York';
  // Winter date: Jan 15 (EST, UTC-5)
  const winterLocal = '2026-01-15T10:00';
  const winterUtc = fromDatetimeLocalString(winterLocal, tz);
  console.log(`[Case 3] NY Winter (EST): ${winterLocal} -> ${winterUtc}`);
  assert(winterUtc === '2026-01-15T15:00:00.000Z', `Expected 15:00 UTC (UTC-5), got ${winterUtc}`);
  assert(toDatetimeLocalString(winterUtc, tz) === winterLocal, 'Winter roundtrip failed');

  // Summer date: July 15 (EDT, UTC-4)
  const summerLocal = '2026-07-15T10:00';
  const summerUtc = fromDatetimeLocalString(summerLocal, tz);
  console.log(`[Case 3] NY Summer (EDT): ${summerLocal} -> ${summerUtc}`);
  assert(summerUtc === '2026-07-15T14:00:00.000Z', `Expected 14:00 UTC (UTC-4), got ${summerUtc}`);
  assert(toDatetimeLocalString(summerUtc, tz) === summerLocal, 'Summer roundtrip failed');
  passed++;
  console.log('  ✓ US DST transition offset variation verified');
}

// Case 4: Europe/London DST transition (Fall transition day: Oct 25, 2026)
{
  const tz = 'Europe/London';
  // Summer time (BST, UTC+1) in July
  const bstLocal = '2026-07-01T12:00';
  const bstUtc = fromDatetimeLocalString(bstLocal, tz);
  console.log(`[Case 4] London BST (UTC+1): ${bstLocal} -> ${bstUtc}`);
  assert(bstUtc === '2026-07-01T11:00:00.000Z', `Expected 11:00 UTC, got ${bstUtc}`);

  // Winter time (GMT, UTC+0) in December
  const gmtLocal = '2026-12-01T12:00';
  const gmtUtc = fromDatetimeLocalString(gmtLocal, tz);
  console.log(`[Case 4] London GMT (UTC+0): ${gmtLocal} -> ${gmtUtc}`);
  assert(gmtUtc === '2026-12-01T12:00:00.000Z', `Expected 12:00 UTC, got ${gmtUtc}`);
  passed++;
  console.log('  ✓ Europe/London BST/GMT verified');
}

// Case 5: formatSessionTimeRange with explicit timezone
{
  const startUtc = '2026-10-15T14:00:00.000Z';
  const endUtc = '2026-10-15T15:30:00.000Z';
  const formatted = formatSessionTimeRange(startUtc, endUtc, 'UTC');
  console.log(`[Case 5] Formatted in UTC:`, formatted);
  assert(formatted.durationStr === '1h 30m', `Expected duration '1h 30m', got ${formatted.durationStr}`);
  assert(formatted.timeRangeStr.includes('2:00') && formatted.timeRangeStr.includes('3:30'), 'Time range mismatch');
  passed++;
  console.log('  ✓ Time range and duration formatting verified');
}

// Case 6: formatSessionStartHint across UTC and America/New_York
{
  const utcInput = '2026-10-15T14:00:00.000Z';
  const hintUtc = formatSessionStartHint(utcInput, 'UTC');
  console.log(`[Case 6] UTC hint: ${hintUtc}`);
  assert(hintUtc === 'Oct 15, 2:00 PM', `Expected 'Oct 15, 2:00 PM', got '${hintUtc}'`);

  const hintNy = formatSessionStartHint(utcInput, 'America/New_York');
  console.log(`[Case 6] NY hint (EDT): ${hintNy}`);
  assert(hintNy === 'Oct 15, 10:00 AM', `Expected 'Oct 15, 10:00 AM', got '${hintNy}'`);
  passed++;
  console.log('  ✓ formatSessionStartHint UTC and NY passed');
}

// Case 7: formatSessionStartHint across Asia/Kolkata and Europe/London
{
  const utcInput = '2026-10-15T14:00:00.000Z';
  const hintKol = formatSessionStartHint(utcInput, 'Asia/Kolkata');
  console.log(`[Case 7] Kolkata hint (IST): ${hintKol}`);
  assert(hintKol === 'Oct 15, 7:30 PM', `Expected 'Oct 15, 7:30 PM', got '${hintKol}'`);

  const hintLondon = formatSessionStartHint(utcInput, 'Europe/London');
  console.log(`[Case 7] London hint (BST): ${hintLondon}`);
  assert(hintLondon === 'Oct 15, 3:00 PM', `Expected 'Oct 15, 3:00 PM', got '${hintLondon}'`);
  passed++;
  console.log('  ✓ formatSessionStartHint Asia/Kolkata and Europe/London passed');
}

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
