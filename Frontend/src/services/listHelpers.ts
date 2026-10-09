export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

/**
 * Pure helper to normalize any API list or paginated response into a safe PaginatedResult<T>.
 * Tolerates:
 * - standard paginated response { data: T[], pagination: { ... } }
 * - nested responses { data: { data: T[], pagination: { ... } } }
 * - unpaginated array in data { data: T[] }
 * - raw array T[]
 * - missing or invalid pagination numbers
 * - missing data / non-array data
 * - null / undefined / primitive inputs
 */
export function normalizeListResponse<T>(res: unknown): PaginatedResult<T> {
  if (!res || typeof res !== 'object') {
    return {
      items: [],
      pagination: { ...DEFAULT_PAGINATION },
    };
  }

  // Raw array passed directly
  if (Array.isArray(res)) {
    const arr = res as T[];
    return {
      items: arr,
      pagination: {
        page: 1,
        limit: arr.length > 0 ? arr.length : 20,
        total: arr.length,
        totalPages: arr.length > 0 ? 1 : 0,
      },
    };
  }

  const raw = res as Record<string, unknown>;

  let itemsSource: unknown = raw.data;
  let paginationSource: unknown = raw.pagination;

  // Handle nested wrapper { data: { data: [...], pagination: { ... } } }
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    const nested = raw.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      itemsSource = nested.data;
    }
    if (nested.pagination && typeof nested.pagination === 'object') {
      paginationSource = nested.pagination;
    }
  }

  const items: T[] = Array.isArray(itemsSource) ? (itemsSource as T[]) : [];

  const p = (
    paginationSource && typeof paginationSource === 'object'
      ? paginationSource
      : {}
  ) as Record<string, unknown>;

  const page =
    typeof p.page === 'number' && Number.isFinite(p.page) && p.page >= 1
      ? Math.floor(p.page)
      : 1;

  const limit =
    typeof p.limit === 'number' && Number.isFinite(p.limit) && p.limit >= 1
      ? Math.floor(p.limit)
      : 20;

  const total =
    typeof p.total === 'number' && Number.isFinite(p.total) && p.total >= 0
      ? Math.floor(p.total)
      : items.length;

  const totalPages =
    typeof p.totalPages === 'number' &&
    Number.isFinite(p.totalPages) &&
    p.totalPages >= 0
      ? Math.floor(p.totalPages)
      : limit > 0
      ? Math.ceil(total / limit)
      : 0;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Pure helper to normalize single-item responses into T | null.
 * Tolerates:
 * - { data: T } standard apiClient response
 * - raw item T
 * - null / undefined / missing data
 */
export function normalizeSingleResponse<T>(res: unknown): T | null {
  if (res === null || res === undefined) {
    return null;
  }
  if (typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    if ('data' in obj) {
      return (obj.data ?? null) as T | null;
    }
    // If it was an ApiResponse envelope without a data field
    if ('success' in obj) {
      return null;
    }
  }
  return res as T;
}
