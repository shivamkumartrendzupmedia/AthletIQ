import {
  buildNotificationQueryParams,
  formatNotificationTime,
} from '../src/lib/notificationPayloads.js';

let passed = 0;
let failed = 0;

function assert(cond: boolean, desc: string): void {
  if (cond) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

console.log('\n--- VERIFYING NOTIFICATION PAYLOADS & HELPERS ---');

// Test Query Params Builder
const q1 = buildNotificationQueryParams({});
assert(Object.keys(q1).length === 0, 'Empty params produce empty query object');

const q2 = buildNotificationQueryParams({ page: 2, limit: 15, unreadOnly: true });
assert(q2.page === '2', 'Page number serialized to string');
assert(q2.limit === '15', 'Limit serialized to string');
assert(q2.unreadOnly === 'true', 'unreadOnly flag mapped to "true"');

const q3 = buildNotificationQueryParams({ page: -1, limit: 200 });
assert(q3.page === undefined, 'Negative page ignored');
assert(q3.limit === '100', 'Limit capped at 100 max');

// Test Notification Time Formatting
const now = new Date();
assert(formatNotificationTime(now.toISOString()) === 'Just now', 'Immediate timestamp formats as "Just now"');

const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
assert(formatNotificationTime(tenMinsAgo.toISOString()) === '10m ago', '10 minutes ago formats as "10m ago"');

const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
assert(formatNotificationTime(twoHoursAgo.toISOString()) === '2h ago', '2 hours ago formats as "2h ago"');

const invalidDate = formatNotificationTime('not-a-valid-date');
assert(invalidDate === '', 'Invalid date string returns empty string safely');

console.log(`\nNotification Payloads: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
