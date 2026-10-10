export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ApiFieldError[];
}

export class ApiClientError extends Error {
  statusCode: number;
  fieldErrors?: ApiFieldError[];

  constructor(
    statusCode: number,
    message: string,
    fieldErrors?: ApiFieldError[]
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

// In-memory access token storage (never written to localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// Session listener callback for clearing state on authorization failure
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler): void => {
  onSessionExpired = handler;
};

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:5000/api';

// Mutex promise to guarantee single-flight refresh across concurrent 401 requests
let refreshPromise: Promise<string | null> | null = null;

const executeRefreshToken = async (): Promise<string | null> => {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      setAccessToken(null);
      localStorage.removeItem('athletiq_has_session');
      if (onSessionExpired) onSessionExpired();
      return null;
    }

    const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
    const newToken = json.data?.accessToken || null;
    setAccessToken(newToken);
    if (newToken) {
      localStorage.setItem('athletiq_has_session', '1');
    }
    return newToken;
  } catch {
    setAccessToken(null);
    localStorage.removeItem('athletiq_has_session');
    if (onSessionExpired) onSessionExpired();
    return null;
  } finally {
    refreshPromise = null;
  }
};

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

/**
 * Universal API fetch wrapper.
 * - In-memory access token injection
 * - Credentials: 'include' for secure httpOnly refresh cookie
 * - Single-flight 401 refresh & retry on non-auth endpoints
 * - Typed ApiClientError throwing standard backend payload
 */
export const apiClient = async <T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/logout') ||
    endpoint.includes('/auth/change-password');

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 token expiry on non-auth endpoints with single-flight refresh
  if (response.status === 401 && !isAuthEndpoint && !options.skipAuthRefresh) {
    if (!refreshPromise) {
      refreshPromise = executeRefreshToken();
    }
    const newAccessToken = await refreshPromise;

    if (newAccessToken) {
      const retryHeaders = new Headers(options.headers || {});
      if (
        !retryHeaders.has('Content-Type') &&
        !(options.body instanceof FormData)
      ) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        const errorData = (await retryResponse.json().catch(() => ({}))) as {
          message?: string;
          errors?: ApiFieldError[];
        };
        throw new ApiClientError(
          retryResponse.status,
          errorData.message || 'Request failed after refresh',
          errorData.errors
        );
      }

      return retryResponse.json() as Promise<ApiResponse<T>>;
    }
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
      errors?: ApiFieldError[];
    };
    throw new ApiClientError(
      response.status,
      errorData.message || `Request failed with status ${response.status}`,
      errorData.errors
    );
  }

  return response.json() as Promise<ApiResponse<T>>;
};

/**
 * Authenticated file download helper.
 * Fetches binary blob with in-memory access token and automatic 401 refresh.
 */
export const apiDownload = async (endpoint: string): Promise<Blob> => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = new Headers();
  if (inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    if (!refreshPromise) {
      refreshPromise = executeRefreshToken();
    }
    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      const retryHeaders = new Headers();
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      const retryResponse = await fetch(url, {
        method: 'GET',
        headers: retryHeaders,
        credentials: 'include',
      });
      if (!retryResponse.ok) {
        throw new ApiClientError(retryResponse.status, 'Failed to download document');
      }
      return retryResponse.blob();
    }
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
      errors?: ApiFieldError[];
    };
    throw new ApiClientError(
      response.status,
      errorData.message || `Download failed with status ${response.status}`,
      errorData.errors
    );
  }

  return response.blob();
};
