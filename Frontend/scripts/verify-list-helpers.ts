import {
  normalizeListResponse,
  normalizeSingleResponse,
} from '../src/services/listHelpers';

interface TestSport {
  id: string;
  name: string;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passed++;
  } else {
    console.error(`FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

console.log('--- RUNNING LIST HELPERS TEST SUITE ---\n');

// 1. Normal paginated response
{
  const input = {
    success: true,
    data: [
      { id: 's1', name: 'Soccer' },
      { id: 's2', name: 'Basketball' },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
  const result = normalizeListResponse<TestSport>(input);
  assert(
    result.items.length === 2 &&
      result.items[0].name === 'Soccer' &&
      result.pagination.total === 2 &&
      result.pagination.page === 1 &&
      result.pagination.limit === 20 &&
      result.pagination.totalPages === 1,
    '1. Normal paginated response'
  );
}

// 2. Empty array response (e.g. 0 records in database)
{
  const input = {
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
  const result = normalizeListResponse<TestSport>(input);
  assert(
    Array.isArray(result.items) &&
      result.items.length === 0 &&
      result.pagination.total === 0 &&
      result.pagination.totalPages === 0 &&
      result.pagination.page === 1,
    '2. Empty array response (0 records in database)'
  );
}

// 3. Missing pagination in API response
{
  const input = {
    success: true,
    data: [{ id: 's1', name: 'Soccer' }],
  };
  const result = normalizeListResponse<TestSport>(input);
  assert(
    result.items.length === 1 &&
      result.items[0].id === 's1' &&
      result.pagination.page === 1 &&
      result.pagination.limit === 20 &&
      result.pagination.total === 1 &&
      result.pagination.totalPages === 1,
    '3. Missing pagination object defaults gracefully'
  );
}

// 4. `data` field missing
{
  const input = {
    success: true,
  };
  const result = normalizeListResponse<TestSport>(input);
  assert(
    Array.isArray(result.items) &&
      result.items.length === 0 &&
      result.pagination.total === 0 &&
      result.pagination.page === 1,
    '4. Missing data field returns safe empty items array'
  );
}

// 5. `data` is not an array (e.g. string or object error)
{
  const input = {
    success: true,
    data: 'invalid_data_shape',
  };
  const result = normalizeListResponse<TestSport>(input);
  assert(
    Array.isArray(result.items) &&
      result.items.length === 0 &&
      result.pagination.total === 0,
    '5. Non-array data field returns safe empty items array'
  );
}

// 6. null / undefined input
{
  const rNull = normalizeListResponse<TestSport>(null);
  const rUndefined = normalizeListResponse<TestSport>(undefined);
  assert(
    Array.isArray(rNull.items) &&
      rNull.items.length === 0 &&
      rNull.pagination.page === 1 &&
      Array.isArray(rUndefined.items) &&
      rUndefined.items.length === 0 &&
      rUndefined.pagination.total === 0,
    '6. null / undefined input returns valid PaginatedResult with empty items'
  );
}

// 7. Single-item response
{
  const input = {
    success: true,
    data: { id: 's1', name: 'Tennis' },
  };
  const single = normalizeSingleResponse<TestSport>(input);
  const singleNull = normalizeSingleResponse<TestSport>(null);
  const singleRaw = normalizeSingleResponse<TestSport>({ id: 's2', name: 'Golf' });
  const singleEmpty = normalizeSingleResponse<TestSport>({ success: true });
  assert(
    single !== null &&
      single.id === 's1' &&
      single.name === 'Tennis' &&
      singleNull === null &&
      singleRaw?.name === 'Golf' &&
      singleEmpty === null,
    '7. normalizeSingleResponse handles standard wrapped, raw, null, and empty objects'
  );
}

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
