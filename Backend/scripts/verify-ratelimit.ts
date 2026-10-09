import http from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../src/app.js';

interface TestResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, step: string, details?: string): void {
  if (condition) {
    console.log(`PASS: ${step}`);
    results.push({ step, passed: true });
  } else {
    console.error(`FAIL: ${step}${details ? ` - ${details}` : ''}`);
    results.push({ step, passed: false, details });
  }
}

async function run(): Promise<void> {
  console.log('--- RUNNING RATE LIMIT VERIFICATION SUITE ---\n');

  // Start app in-process with rateLimitMax: 5 on ephemeral port
  const app = createApp({ rateLimitMax: 5 });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`App listening in-process at ${baseUrl} (rateLimitMax = 5)\n`);

  try {
    // 1. Initial OPTIONS preflight request (should not count against quota)
    const preOpt = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS' });
    assert(
      preOpt.status === 204 || preOpt.status === 200,
      'Pre-test OPTIONS request succeeds without error'
    );

    // 2. Sequential GET requests with intermediate OPTIONS requests
    const getResponses: { status: number; body: Record<string, unknown> }[] = [];

    // Request 1
    const res1 = await fetch(`${baseUrl}/api/health`);
    const json1 = await res1.json() as Record<string, unknown>;
    getResponses.push({ status: res1.status, body: json1 });

    // Request 2
    const res2 = await fetch(`${baseUrl}/api/health`);
    const json2 = await res2.json() as Record<string, unknown>;
    getResponses.push({ status: res2.status, body: json2 });

    // Intermediate OPTIONS request 1
    const midOpt1 = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS' });
    assert(
      midOpt1.status === 204 || midOpt1.status === 200,
      'Intermediate OPTIONS preflight succeeds'
    );

    // Request 3
    const res3 = await fetch(`${baseUrl}/api/health`);
    const json3 = await res3.json() as Record<string, unknown>;
    getResponses.push({ status: res3.status, body: json3 });

    // Intermediate OPTIONS request 2
    const midOpt2 = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS' });
    assert(
      midOpt2.status === 204 || midOpt2.status === 200,
      'Intermediate OPTIONS preflight 2 succeeds'
    );

    // Request 4
    const res4 = await fetch(`${baseUrl}/api/health`);
    const json4 = await res4.json() as Record<string, unknown>;
    getResponses.push({ status: res4.status, body: json4 });

    // Request 5 (final allowed quota request)
    const res5 = await fetch(`${baseUrl}/api/health`);
    const json5 = await res5.json() as Record<string, unknown>;
    getResponses.push({ status: res5.status, body: json5 });

    // Verify requests 1-5 returned 200
    const firstFiveOk = getResponses
      .slice(0, 5)
      .every((r) => r.status === 200 && r.body.success === true);
    assert(
      firstFiveOk,
      'Requests 1 through 5 return 200 OK (OPTIONS requests did not consume quota)',
      JSON.stringify(getResponses.slice(0, 5).map((r) => r.status))
    );

    // Request 6 (should be blocked with 429)
    const res6 = await fetch(`${baseUrl}/api/health`);
    const json6 = await res6.json() as Record<string, unknown>;
    getResponses.push({ status: res6.status, body: json6 });

    const req6Blocked =
      res6.status === 429 &&
      json6.success === false &&
      typeof json6.message === 'string' &&
      json6.message.includes('Too many requests');
    assert(
      req6Blocked,
      'Request 6 returns 429 Too Many Requests with standard JSON error shape',
      `Status: ${res6.status}, Body: ${JSON.stringify(json6)}`
    );

    // Request 7 (should also be blocked with 429)
    const res7 = await fetch(`${baseUrl}/api/health`);
    const json7 = await res7.json() as Record<string, unknown>;
    getResponses.push({ status: res7.status, body: json7 });

    const req7Blocked =
      res7.status === 429 &&
      json7.success === false &&
      typeof json7.message === 'string';
    assert(
      req7Blocked,
      'Request 7 returns 429 Too Many Requests with standard JSON error shape',
      `Status: ${res7.status}, Body: ${JSON.stringify(json7)}`
    );
  } finally {
    server.close();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error running verify:ratelimit:', err);
  process.exit(1);
});
