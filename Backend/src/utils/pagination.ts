export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type PaginatedResponse<T> = PaginatedResult<T>;

/**
 * Parses and bounds pagination parameters from request query.
 * - page >= 1 (defaults to 1)
 * - limit 1..100 (defaults to 20)
 */
export const parsePagination = (
  query: Record<string, unknown>
): PaginationParams => {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 100
      ? rawLimit
      : 20;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Formats data and metadata into the standardized ATHLETIQ paginated envelope.
 */
export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};
