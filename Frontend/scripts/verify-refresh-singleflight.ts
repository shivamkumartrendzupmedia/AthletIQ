/**
 * Verification script for single-flight refresh mechanism in apiClient.ts
 * Tests the REAL refreshAccessToken and apiClient exported from apiClient.ts
 * with mocked fetch and global shims.
 */

// 1. Setup in-memory localStorage stub before importing apiClient
const storageMap = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string): string | null => storageMap.get(k) ?? null,
  setItem: (k: string, v: string): void => {
    storageMap.set(k, String(v));
  },
  removeItem: (k: string): void => {
    storageMap.delete(k);
  },
  clear: (): void => {
    storageMap.clear();
  },
  key: (i: number): string | null => Array.from(storageMap.keys())[i] ?? null,
  get length(): number {
    return storageMap.size;
  },
} as Storage;

import {
  apiClient,
  refreshAccessToken,
  setAccessToken,
  getAccessToken,
  setSessionExpiredHandler,
  ApiClientError,
} from '../src/lib/apiClient.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passed++;
  } else {
    console.error(`FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

console.log('--- RUNNING SINGLE-FLIGHT REFRESH VERIFICATION SUITE ---\n');

async function runTests(): Promise<void> {
  // Case (a): Two concurrent refreshAccessToken calls => exactly 1 fetch to /auth/refresh
  {
    storageMap.clear();
    setAccessToken(null);
    let refreshCallCount = 0;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshCallCount++;
        // Small artificial delay to simulate async network roundtrip
        await new Promise((r) => setTimeout(r, 20));
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'token-alpha',
              user: { id: 'u1', name: 'User 1', email: 'u1@test.com', role: 'Athlete' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const [res1, res2] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    assert(
      refreshCallCount === 1 &&
        res1?.accessToken === 'token-alpha' &&
        res2?.accessToken === 'token-alpha' &&
        getAccessToken() === 'token-alpha',
      'Case (a): Two concurrent refreshAccessToken calls cause exactly 1 fetch to /auth/refresh'
    );
  }

  // Case (b): Startup restore + concurrent 401 on a normal request => exactly 1 refresh and retry carries NEW token
  {
    storageMap.clear();
    setAccessToken(null);
    let refreshCallCount = 0;
    let normalCallCount = 0;
    let retryHeaderAuthorization: string | null = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshCallCount++;
        await new Promise((r) => setTimeout(r, 25));
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'token-beta-rotated',
              user: { id: 'u2', name: 'User 2', email: 'u2@test.com', role: 'Coach' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/athletes/ath-123/development')) {
        normalCallCount++;
        const authHeader = (init?.headers as Headers | undefined)?.get?.('Authorization') ??
          (init?.headers as Record<string, string> | undefined)?.['Authorization'];
        
        if (normalCallCount === 1) {
          // First attempt before token restored returns 401
          return new Response(
            JSON.stringify({ message: 'Token required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          // Retry attempt
          retryHeaderAuthorization = authHeader ?? null;
          return new Response(
            JSON.stringify({ success: true, data: { status: 'ok' } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    // Concurrently trigger startup restore and an unauthenticated development view call
    const [startupResult, apiResult] = await Promise.all([
      refreshAccessToken(),
      apiClient('/athletes/ath-123/development'),
    ]);

    assert(
      refreshCallCount === 1 &&
        startupResult?.accessToken === 'token-beta-rotated' &&
        apiResult.data !== undefined &&
        retryHeaderAuthorization === 'Bearer token-beta-rotated',
      'Case (b): Startup restore + concurrent 401 causes exactly 1 refresh and retry carries NEW token'
    );
  }

  // Case (c): After (a) resolves, a later 401 starts a NEW refresh (promise cleared in finally)
  {
    let refreshCallCount = 0;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshCallCount++;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: `token-gamma-${refreshCallCount}`,
              user: { id: 'u3', name: 'User 3', email: 'u3@test.com', role: 'Admin' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const first = await refreshAccessToken();
    const second = await refreshAccessToken();

    assert(
      refreshCallCount === 2 &&
        first?.accessToken === 'token-gamma-1' &&
        second?.accessToken === 'token-gamma-2',
      'Case (c): A later refresh starts a NEW refresh call (in-flight promise cleared in finally)'
    );
  }

  // Case (d): Refresh returns 401 => all waiters get null/reject, onSessionExpired called once, token cleared
  {
    storageMap.set('athletiq_has_session', '1');
    setAccessToken('old-token');
    let sessionExpiredCount = 0;
    setSessionExpiredHandler(() => {
      sessionExpiredCount++;
    });

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        await new Promise((r) => setTimeout(r, 15));
        return new Response(
          JSON.stringify({ message: 'Refresh token expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 401 });
    }) as typeof fetch;

    const [w1, w2] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    assert(
      w1 === null &&
        w2 === null &&
        sessionExpiredCount === 1 &&
        getAccessToken() === null &&
        storageMap.get('athletiq_has_session') === undefined,
      'Case (d): Refresh 401 clears token & flag, calls onSessionExpired once, and rejects all waiters'
    );
  }

  // Case (e): A 401 on an /auth/* endpoint triggers NO refresh
  {
    let refreshTriggered = false;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshTriggered = true;
        return new Response('{}', { status: 200 });
      }
      if (urlStr.includes('/auth/login')) {
        return new Response(
          JSON.stringify({ message: 'Invalid credentials' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    let loginErrorStatusCode: number | null = null;
    try {
      await apiClient('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'bad@bad.com' }) });
    } catch (err) {
      if (err instanceof ApiClientError) {
        loginErrorStatusCode = err.statusCode;
      }
    }

    assert(
      loginErrorStatusCode === 401 && !refreshTriggered,
      'Case (e): A 401 on an /auth/* endpoint triggers NO refresh'
    );
  }

  // Case (f): A request with a valid token and a 200 triggers no refresh
  {
    setAccessToken('valid-active-token');
    let refreshTriggered = false;
    let authHeaderSent: string | null = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshTriggered = true;
        return new Response('{}', { status: 200 });
      }
      if (urlStr.includes('/sports')) {
        const h = (init?.headers as Headers | undefined)?.get?.('Authorization') ??
          (init?.headers as Record<string, string> | undefined)?.['Authorization'];
        authHeaderSent = h ?? null;
        return new Response(
          JSON.stringify({ success: true, data: [{ id: 's1', name: 'Football' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const res = await apiClient('/sports');

    assert(
      res.success &&
        !refreshTriggered &&
        authHeaderSent === 'Bearer valid-active-token',
      'Case (f): Request with valid token and 200 OK triggers no refresh'
    );
  }

  // Case (g): 3 parallel API calls hitting 401 simultaneously trigger exactly 1 refresh and all retry successfully
  {
    storageMap.set('athletiq_has_session', '1');
    setAccessToken(null);
    let refreshCount = 0;
    let sportsCalls = 0;
    let teamsCalls = 0;
    let meCalls = 0;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'token-batch-test',
              user: { id: 'u4', name: 'User 4', email: 'u4@test.com', role: 'Athlete' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const authHeader = (init?.headers as Headers | undefined)?.get?.('Authorization') ??
        (init?.headers as Record<string, string> | undefined)?.['Authorization'];

      if (!authHeader || authHeader === 'Bearer null') {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/sports')) sportsCalls++;
      if (urlStr.includes('/teams')) teamsCalls++;
      if (urlStr.includes('/auth/me')) meCalls++;

      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const [rSports, rTeams, rMe] = await Promise.all([
      apiClient('/sports'),
      apiClient('/teams'),
      apiClient('/auth/me'),
    ]);

    assert(
      refreshCount === 1 &&
        rSports.success &&
        rTeams.success &&
        rMe.success &&
        sportsCalls === 1 &&
        teamsCalls === 1 &&
        meCalls === 1 &&
        getAccessToken() === 'token-batch-test',
      'Case (g): 3 concurrent 401 requests trigger exactly 1 refresh call and all retry successfully'
    );
  }

  // Case (h): Network throw during refresh returns null safely without unhandled crash
  {
    storageMap.set('athletiq_has_session', '1');
    setAccessToken(null);
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/auth/refresh')) {
        throw new Error('Network failure: DNS offline');
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const result = await refreshAccessToken();
    assert(
      result === null && getAccessToken() === null,
      'Case (h): Network throw during refresh returns null safely without crash'
    );
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
