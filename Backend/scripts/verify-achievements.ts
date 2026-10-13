import type { AddressInfo, Server } from 'net';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, AuditLog, Achievement } from '../src/models/index.js';
import { getCounts, findOrphans } from './cleanup-test-orphans.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';

let totalPassed = 0;
let totalFailed = 0;

interface GroupMetrics {
  name: string;
  passed: number;
  failed: number;
  httpRequests: number;
  failedAuthRequests: number;
}

const groups: GroupMetrics[] = [];

function createGroupTracker(name: string) {
  const g: GroupMetrics = {
    name,
    passed: 0,
    failed: 0,
    httpRequests: 0,
    failedAuthRequests: 0,
  };
  groups.push(g);

  function pass(desc: string) {
    console.log(`  ✓ PASS: ${desc}`);
    g.passed++;
    totalPassed++;
  }

  function fail(desc: string) {
    console.error(`  ✗ FAIL: ${desc}`);
    g.failed++;
    totalFailed++;
  }

  function assert(cond: boolean, desc: string) {
    if (cond) pass(desc);
    else fail(desc);
  }

  async function fetchJson(
    url: string,
    options: RequestInit = {}
  ): Promise<{ status: number; body: Record<string, unknown> | null; headers: Headers; text: string }> {
    g.httpRequests++;
    const res = await fetch(url, options);
    if (url.includes('/api/auth') && res.status >= 400) {
      g.failedAuthRequests++;
    }
    const text = await res.text();
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { status: res.status, body, headers: res.headers, text };
  }

  return { g, assert, fetchJson };
}

async function run(): Promise<void> {
  console.log('\n=== VERIFYING ATHLETIQ ACHIEVEMENTS API SUITE ===\n');

  await connectDB();
  const dbName = mongoose.connection.name;
  console.log(`Connected Database: ${dbName}`);

  // Safety: check for existing orphans before starting
  const initialOrphans = await findOrphans();
  if (initialOrphans.length > 0) {
    console.error(`[PRE-CHECK FAILED] Database has ${initialOrphans.length} orphans. Refusing to run.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const initialCounts = await getCounts();
  console.log('Database Initial Counts:\n', JSON.stringify(initialCounts, null, 2));

  const createdUserIds: Types.ObjectId[] = [];
  const createdAchievementIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];

  const runId = Math.random().toString(36).substring(2, 9);
  const passwordHash = await hashPassword('Password123!');

  // Provision test users across all roles
  const roles = ['Admin', 'Coach', 'Athlete', 'Organizer', 'Official'] as const;
  const userMap = new Map<string, { id: Types.ObjectId; token: string }>();

  for (const role of roles) {
    const user = await User.create({
      name: `Achieve Test ${role}`,
      email: `achieve-${runId}-${role.toLowerCase()}@test.athletiq.internal`,
      passwordHash,
      role,
      isActive: true,
      emailVerified: true,
    });
    createdUserIds.push(user._id);
    const token = signAccessToken(user._id.toString(), user.role);
    userMap.set(role, { id: user._id, token });
  }

  const adminToken = userMap.get('Admin')!.token;

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 1: Role x Endpoint Matrix
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 1: Role x Endpoint Authorization Matrix ---');
    const { g, assert, fetchJson } = createGroupTracker('Role x Endpoint Matrix');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Create a dummy achievement for GET/PATCH/DELETE tests
      const dummy = await Achievement.create({
        title: 'Initial Seed Achievement',
        description: 'Seeded for role matrix testing',
        category: 'Tournament Win',
        achievedOn: new Date('2026-05-01'),
        featured: false,
        createdBy: userMap.get('Admin')!.id,
      });
      createdAchievementIds.push(dummy._id);

      const endpoints = [
        { method: 'POST', path: '/api/achievements', body: { title: 'T', description: 'D', category: 'Other', achievedOn: '2026-01-01' } },
        { method: 'GET', path: '/api/achievements', body: undefined },
        { method: 'GET', path: `/api/achievements/${dummy._id}`, body: undefined },
        { method: 'PATCH', path: `/api/achievements/${dummy._id}`, body: { title: 'Updated' } },
        { method: 'DELETE', path: `/api/achievements/${dummy._id}`, body: undefined, testAtEnd: true },
      ];

      // Test all roles on Admin endpoints
      for (const r of roles) {
        const token = userMap.get(r)!.token;
        for (const ep of endpoints) {
          if (ep.testAtEnd && r !== 'Admin') {
            const res = await fetchJson(`${base}${ep.path}`, {
              method: ep.method,
              headers: { Authorization: `Bearer ${token}` },
            });
            assert(res.status === 403, `${r} on ${ep.method} ${ep.path} receives 403 Forbidden`);
            continue;
          }
          if (ep.testAtEnd) continue; // Admin delete tested in CRUD group

          const res = await fetchJson(`${base}${ep.path}`, {
            method: ep.method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: ep.body ? JSON.stringify(ep.body) : undefined,
          });

          if (r === 'Admin') {
            assert(res.status === 200 || res.status === 201, `Admin on ${ep.method} ${ep.path} succeeds (${res.status})`);
            if (ep.method === 'POST' && res.body && (res.body.data as { _id?: string; id?: string })?.id) {
              const newId = ((res.body.data as { id?: string }).id || (res.body.data as { _id?: string })._id)!;
              createdAchievementIds.push(new Types.ObjectId(newId));
            }
          } else {
            assert(res.status === 403, `${r} on ${ep.method} ${ep.path} receives 403 Forbidden`);
          }
        }
      }

      // Test Unauthenticated on Admin endpoints (401)
      for (const ep of endpoints) {
        if (ep.testAtEnd) continue;
        const res = await fetchJson(`${base}${ep.path}`, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        assert(res.status === 401, `Unauthenticated on ${ep.method} ${ep.path} receives 401 Unauthorized`);
      }

      // Test Public endpoints (anyone can access, unauthenticated succeeds)
      const pubList = await fetchJson(`${base}/api/public/achievements`);
      assert(pubList.status === 200, 'GET /api/public/achievements succeeds unauthenticated (200 OK)');
      const pubGet = await fetchJson(`${base}/api/public/achievements/${dummy._id}`);
      assert(pubGet.status === 200, 'GET /api/public/achievements/:id succeeds unauthenticated (200 OK)');
    } finally {
      server.close();
    }

    console.log(`[Group 1 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
    if (g.httpRequests >= 90 || g.failedAuthRequests > 8) {
      throw new Error(`Group 1 exceeded thresholds: reqs=${g.httpRequests}, authFailed=${g.failedAuthRequests}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2: Admin CRUD Happy Path & Audit Logging
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 2: Admin CRUD Happy Path & Audit Logging ---');
    const { g, assert, fetchJson } = createGroupTracker('Admin CRUD Happy Path');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // Create
      const createRes = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'State Champions 2026',
          description: 'U18 boys varsity team won the state championship cup with an undefeated record.',
          category: 'Tournament Win',
          achievedOn: '2026-06-15',
          imageUrl: 'https://images.athletiq.internal/trophy.png',
          featured: true,
        }),
      });
      assert(createRes.status === 201, 'POST /api/achievements returns 201 Created');
      const item = (createRes.body?.data || {}) as Record<string, unknown>;
      const createdId = String(item.id || item._id);
      createdAchievementIds.push(new Types.ObjectId(createdId));
      assert(item.title === 'State Champions 2026', 'Created item title matches');
      assert(item.category === 'Tournament Win', 'Created item category matches');
      assert(item.featured === true, 'Created item featured matches');
      assert(String(item.createdBy) === userMap.get('Admin')!.id.toString(), 'createdBy matches Admin user id');

      // Audit log created
      const createAudit = await AuditLog.findOne({
        action: 'ACHIEVEMENT_CREATED',
        targetId: new Types.ObjectId(createdId),
      });
      assert(createAudit !== null, 'ACHIEVEMENT_CREATED audit log recorded');
      if (createAudit) createdAuditLogIds.push(createAudit._id);

      // Read single
      const getRes = await fetchJson(`${base}/api/achievements/${createdId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(getRes.status === 200, 'GET /api/achievements/:id returns 200 OK');
      assert((getRes.body?.data as Record<string, unknown>)?.title === 'State Champions 2026', 'GET data matches');

      // Update
      const patchRes = await fetchJson(`${base}/api/achievements/${createdId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'State Champions 2026 (Grand Finals)',
          featured: false,
        }),
      });
      assert(patchRes.status === 200, 'PATCH /api/achievements/:id returns 200 OK');
      const updatedItem = (patchRes.body?.data || {}) as Record<string, unknown>;
      assert(updatedItem.title === 'State Champions 2026 (Grand Finals)', 'Title successfully updated');
      assert(updatedItem.featured === false, 'Featured successfully updated to false');

      const updateAudit = await AuditLog.findOne({
        action: 'ACHIEVEMENT_UPDATED',
        targetId: new Types.ObjectId(createdId),
      });
      assert(updateAudit !== null, 'ACHIEVEMENT_UPDATED audit log recorded');
      if (updateAudit) createdAuditLogIds.push(updateAudit._id);

      // Delete
      const delRes = await fetchJson(`${base}/api/achievements/${createdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(delRes.status === 200, 'DELETE /api/achievements/:id returns 200 OK');

      const delAudit = await AuditLog.findOne({
        action: 'ACHIEVEMENT_DELETED',
        targetId: new Types.ObjectId(createdId),
      });
      assert(delAudit !== null, 'ACHIEVEMENT_DELETED audit log recorded');
      if (delAudit) createdAuditLogIds.push(delAudit._id);

      // Verify GET returns 404 after delete
      const getAfterDel = await fetchJson(`${base}/api/achievements/${createdId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(getAfterDel.status === 404, 'GET returns 404 after hard delete');

      // Verify DELETE returns 404 if missing
      const delMissing = await fetchJson(`${base}/api/achievements/${createdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(delMissing.status === 404, 'DELETE returns 404 when item is missing');
    } finally {
      server.close();
    }

    console.log(`[Group 2 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
    if (g.httpRequests >= 90 || g.failedAuthRequests > 8) {
      throw new Error(`Group 2 exceeded thresholds: reqs=${g.httpRequests}, authFailed=${g.failedAuthRequests}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 3: Zod Validation & Edge Cases
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 3: Zod Validation & Edge Cases ---');
    const { g, assert, fetchJson } = createGroupTracker('Zod Validation & Edge Cases');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      const validPayload = {
        title: 'Valid Title',
        description: 'Valid Description',
        category: 'Academy Milestone',
        achievedOn: '2026-01-15',
        imageUrl: 'https://images.athletiq.internal/pic.jpg',
      };

      // 1. Empty title
      const res1 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, title: '' }),
      });
      assert(res1.status === 400, 'Empty title returns 400 Bad Request');

      // 2. Title 121 chars
      const res2 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, title: 'A'.repeat(121) }),
      });
      assert(res2.status === 400, 'Title > 120 chars returns 400 Bad Request');

      // 3. Description 501 chars
      const res3 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, description: 'D'.repeat(501) }),
      });
      assert(res3.status === 400, 'Description > 500 chars returns 400 Bad Request');

      // 4. Future date (e.g. year 2099)
      const res4 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, achievedOn: '2099-01-01' }),
      });
      assert(res4.status === 400, 'Future achievedOn date returns 400 Bad Request');

      // 5. Bad category
      const res5 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, category: 'NotARealCategory' }),
      });
      assert(res5.status === 400, 'Unsupported category returns 400 Bad Request');

      // 6. Insecure http:// image URL
      const res6 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, imageUrl: 'http://insecure.com/pic.png' }),
      });
      assert(res6.status === 400, 'Insecure http:// image URL returns 400 Bad Request');

      // 7. javascript: image URL
      const res7 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, imageUrl: 'javascript:alert(1)' }),
      });
      assert(res7.status === 400, 'javascript: image URL returns 400 Bad Request');

      // 8. Unknown keys rejected (.strict())
      const res8 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, hackerField: true }),
      });
      assert(res8.status === 400, 'Unknown extraneous key in body returns 400 Bad Request (.strict())');

      // 9. Empty PATCH rejected
      const seed = await Achievement.create({
        title: 'Seed For Patch Test',
        description: 'Test seed description',
        category: 'Other',
        achievedOn: new Date('2026-01-01'),
        createdBy: userMap.get('Admin')!.id,
      });
      createdAchievementIds.push(seed._id);

      const res9 = await fetchJson(`${base}/api/achievements/${seed._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert(res9.status === 400, 'Empty PATCH body returns 400 Bad Request');

      // 10. Malformed ID param
      const res10 = await fetchJson(`${base}/api/achievements/not-an-objectid`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res10.status === 400, 'Malformed ObjectId param returns 400 Bad Request');

      // 11. NoSQL operator in body rejected
      const res11 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validPayload, title: { $gt: '' } }),
      });
      assert(res11.status === 400, 'NoSQL operator key in body returns 400 Bad Request');

      // 12. NoSQL operator in query rejected
      const res12 = await fetchJson(`${base}/api/achievements?category[$ne]=Other`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res12.status === 400, 'NoSQL operator in query params returns 400 Bad Request');

      // 13. Plain text preserved (<script> stays text)
      const res13 = await fetchJson(`${base}/api/achievements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          title: 'Award <script>alert("xss")</script>',
          description: 'Description with <script>console.log("safe")</script>',
        }),
      });
      assert(res13.status === 201, 'Item with script tags creates successfully (sanitized/escaped text)');
      const rawTextItem = res13.body?.data as Record<string, unknown>;
      createdAchievementIds.push(new Types.ObjectId(String(rawTextItem.id || rawTextItem._id)));
      assert(
        String(rawTextItem.title).includes('<script>') || String(rawTextItem.title).includes('&lt;script&gt;'),
        'Script tag handled cleanly as text without execution'
      );
    } finally {
      server.close();
    }

    console.log(`[Group 3 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
    if (g.httpRequests >= 90 || g.failedAuthRequests > 8) {
      throw new Error(`Group 3 exceeded thresholds: reqs=${g.httpRequests}, authFailed=${g.failedAuthRequests}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 4: Public Endpoints & Privacy Deep Scan
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 4: Public Endpoints & Privacy Deep Scan ---');
    const { g, assert, fetchJson } = createGroupTracker('Public Endpoints & Privacy');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // Seed 3 known achievements: 1 featured, 2 normal, with specific dates
      const ach1 = await Achievement.create({
        title: 'Achievement Alpha (Old, Not Featured)',
        description: 'Old achievement description',
        category: 'Team Milestone',
        achievedOn: new Date('2025-01-01'),
        featured: false,
        createdBy: userMap.get('Admin')!.id,
      });
      const ach2 = await Achievement.create({
        title: 'Achievement Beta (New, Not Featured)',
        description: 'Newer achievement description',
        category: 'Individual Award',
        achievedOn: new Date('2026-02-01'),
        featured: false,
        createdBy: userMap.get('Admin')!.id,
      });
      const ach3 = await Achievement.create({
        title: 'Achievement Gamma (Oldest, Featured)',
        description: 'Featured achievement description',
        category: 'Tournament Win',
        achievedOn: new Date('2024-05-01'),
        featured: true,
        createdBy: userMap.get('Admin')!.id,
      });
      createdAchievementIds.push(ach1._id, ach2._id, ach3._id);

      // Default public list ordering: newest-first (ach2, ach1, ach3)
      const listRes = await fetchJson(`${base}/api/public/achievements?limit=10`);
      assert(listRes.status === 200, 'GET /api/public/achievements returns 200 OK');
      const items = (listRes.body?.data || []) as Array<Record<string, unknown>>;
      assert(items.length >= 3, 'Public list contains seeded items');

      // Check featured=true ordering: featured first (ach3 should be first)
      const featRes = await fetchJson(`${base}/api/public/achievements?featured=true&limit=10`);
      assert(featRes.status === 200, 'GET /api/public/achievements?featured=true returns 200 OK');
      const featItems = (featRes.body?.data || []) as Array<Record<string, unknown>>;
      assert(featItems[0].featured === true, 'First item in featured=true list has featured: true');

      // Privacy Deep Scan on public response item
      const singleRes = await fetchJson(`${base}/api/public/achievements/${ach1._id}`);
      assert(singleRes.status === 200, 'GET /api/public/achievements/:id returns 200 OK');
      const singleItem = (singleRes.body?.data || {}) as Record<string, unknown>;

      const allowedKeys = new Set(['id', 'title', 'description', 'category', 'achievedOn', 'imageUrl', 'featured']);
      const itemKeys = Object.keys(singleItem);
      const extraneousKeys = itemKeys.filter((k) => !allowedKeys.has(k));
      assert(
        extraneousKeys.length === 0,
        `Public item contains ONLY allowed keys (extraneous found: ${extraneousKeys.join(', ') || 'none'})`
      );

      // Deep string scan for sensitive keywords
      const rawPayload = JSON.stringify(singleRes.body);
      assert(!rawPayload.includes('createdBy'), 'Deep scan: createdBy completely absent from public payload');
      assert(!rawPayload.includes('email'), 'Deep scan: email completely absent from public payload');
      assert(!rawPayload.includes('passwordHash'), 'Deep scan: passwordHash completely absent from public payload');
      assert(!rawPayload.includes('phone'), 'Deep scan: phone completely absent from public payload');
    } finally {
      server.close();
    }

    console.log(`[Group 4 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
    if (g.httpRequests >= 90 || g.failedAuthRequests > 8) {
      throw new Error(`Group 4 exceeded thresholds: reqs=${g.httpRequests}, authFailed=${g.failedAuthRequests}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 5: Concurrency, Cleanup & Integrity
  // ──────────────────────────────────────────────────────────────────────────
  {
    console.log('\n--- GROUP 5: Concurrency, Cleanup & Integrity ---');
    const { g, assert, fetchJson } = createGroupTracker('Concurrency & Integrity');
    const app = createApp();
    const server: Server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 10 simultaneous creates via Promise.all
      const parallelPayloads = Array.from({ length: 10 }, (_, i) => ({
        title: `Concurrent Trophy #${i + 1}`,
        description: `Description for concurrency test #${i + 1}`,
        category: 'Tournament Win',
        achievedOn: '2026-04-10',
        featured: i % 2 === 0,
      }));

      const results = await Promise.all(
        parallelPayloads.map((body) =>
          fetchJson(`${base}/api/achievements`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })
        )
      );

      const allSuccess = results.every((r) => r.status === 201);
      assert(allSuccess, 'All 10 parallel achievement creations returned 201 Created');

      const createdIds = results.map((r) => {
        const d = (r.body?.data || {}) as Record<string, unknown>;
        return String(d.id || d._id);
      });
      const uniqueIds = new Set(createdIds);
      assert(uniqueIds.size === 10, 'All 10 parallel creations received distinct IDs');

      for (const id of createdIds) {
        createdAchievementIds.push(new Types.ObjectId(id));
      }
    } finally {
      server.close();
    }

    console.log(`[Group 5 Metrics] HTTP requests: ${g.httpRequests} (< 90), failed /api/auth: ${g.failedAuthRequests} (<= 8), passed: ${g.passed}`);
    if (g.httpRequests >= 90 || g.failedAuthRequests > 8) {
      throw new Error(`Group 5 exceeded thresholds: reqs=${g.httpRequests}, authFailed=${g.failedAuthRequests}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL CLEANUP & COLLECTION COUNT INTEGRITY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CLEANING UP VERIFICATION RESOURCES ---');

  if (createdAchievementIds.length > 0) {
    const res = await Achievement.deleteMany({ _id: { $in: createdAchievementIds } });
    console.log(`Deleted ${res.deletedCount} test Achievements`);
  }

  const testAuditLogs = await AuditLog.deleteMany({
    $or: [
      { actor: { $in: createdUserIds } },
      { targetId: { $in: createdAchievementIds } },
    ],
  });
  console.log(`Deleted ${testAuditLogs.deletedCount} test AuditLogs`);

  if (createdUserIds.length > 0) {
    const res = await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(`Deleted ${res.deletedCount} test Users`);
  }

  // Check orphans after cleanup
  const remainingOrphans = await findOrphans();
  if (remainingOrphans.length > 0) {
    console.error(`[POST-CHECK FAILED] Found ${remainingOrphans.length} orphans after cleanup!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const finalCounts = await getCounts();
  console.log('Database Final Counts:\n', JSON.stringify(finalCounts, null, 2));

  let countsMatch = true;
  for (const [col, count] of Object.entries(initialCounts)) {
    const finalCount = (finalCounts as Record<string, number>)[col];
    if (count !== finalCount) {
      console.error(`[COUNT MISMATCH] Collection ${col}: initial=${count}, final=${finalCount}`);
      countsMatch = false;
    }
  }

  if (!countsMatch) {
    console.error('[FATAL] Collection before/after counts are not equal!');
    await mongoose.disconnect();
    process.exit(1);
  } else {
    console.log('✓ PASS: All collection counts perfectly restored to initial state.');
    totalPassed++;
  }

  console.log('\n========================================');
  console.log(`Achievements Suite: ${totalPassed} passed, ${totalFailed} failed`);
  for (const grp of groups) {
    console.log(`- ${grp.name}: ${grp.passed} passed, ${grp.failed} failed, ${grp.httpRequests} requests, ${grp.failedAuthRequests} failed auth`);
  }
  console.log('========================================\n');

  await mongoose.disconnect();
  if (totalFailed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
