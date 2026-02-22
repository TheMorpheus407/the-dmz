import {
  apiErrorEnvelopeSchema,
  defaultRetryConfig,
  defaultApiClientConfig,
  type ApiClientConfig,
  type CategorizedApiError,
  type RequestOptions,
  type RetryConfig,
} from './types.js';
import { mapApiError, mapNetworkError } from './error-mapper.js';

export { defaultApiClientConfig } from './types.js';

function isIdempotentMethod(method: string): boolean {
  return method === 'GET' || method === 'DELETE';
}

function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status);
}

function isRetryableError(error: { code?: string }, retryableErrors: string[]): boolean {
  return error.code ? retryableErrors.includes(error.code) : false;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiClient {
  private config: ApiClientConfig;
  private csrfToken: string | null = null;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      ...defaultApiClientConfig,
      ...config,
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let urlString = `${this.config.baseUrl}${normalizedPath}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      urlString += `?${searchParams.toString()}`;
    }

    return urlString;
  }

  private async request<TResponse, TRequest = unknown>(
    options: RequestOptions<TRequest>,
    retryConfig: RetryConfig,
    attempt: number = 0,
  ): Promise<{ data?: TResponse; error?: CategorizedApiError }> {
    const {
      method,
      path = '',
      body,
      params,
      headers = {},
      credentials = this.config.credentials,
    } = options;

    const url = this.buildUrl(path, params);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...headers,
    };

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: credentials ?? 'same-origin',
    };

    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }

    if (this.config.timeout) {
      const controller = new AbortController();
      requestInit.signal = controller.signal;
      setTimeout(() => controller.abort(), this.config.timeout);
    }

    try {
      const response = await fetch(url, requestInit);

      if (retryConfig && attempt < retryConfig.maxAttempts - 1) {
        const errorBody: Record<string, unknown> = await (
          response.clone().json() as Promise<Record<string, unknown>>
        ).catch(() => ({}) as Record<string, unknown>);
        const errorObj =
          typeof errorBody['error'] === 'object' && errorBody['error'] !== null
            ? (errorBody['error'] as { code?: string })
            : ({} as { code?: string });
        if (
          isRetryableStatus(response.status, retryConfig.retryableStatuses) ||
          isRetryableError(errorObj, retryConfig.retryableErrors)
        ) {
          if (isIdempotentMethod(method)) {
            await delay(calculateBackoff(attempt, retryConfig.baseDelayMs, retryConfig.maxDelayMs));
            return this.request<TResponse, TRequest>(options, retryConfig, attempt + 1);
          }
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          return {
            error: {
              category: 'server',
              code: 'INVALID_RESPONSE',
              message: 'Invalid response from server',
              status: response.status,
              retryable: response.status === 503,
            },
          };
        }
        return { data: undefined as TResponse };
      }

      const json: unknown = await response.json();

      const errorEnvelope = apiErrorEnvelopeSchema.safeParse(json);
      if (errorEnvelope.success) {
        const mappedError = mapApiError(errorEnvelope.data.error, response.status);
        return { error: mappedError };
      }

      if (!response.ok) {
        return {
          error: {
            category: 'server',
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
            status: response.status,
            retryable: response.status === 503,
          },
        };
      }

      if (typeof json === 'object' && json !== null && 'data' in json) {
        return { data: json.data as TResponse };
      }
      return { data: undefined as TResponse };
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return {
            error: {
              category: 'network',
              code: 'TIMEOUT',
              message: 'Request timed out',
              status: 0,
              retryable: true,
            },
          };
        }
        const networkError = mapNetworkError(err);
        if (retryConfig && attempt < retryConfig.maxAttempts - 1 && networkError.retryable) {
          if (isIdempotentMethod(method)) {
            await delay(calculateBackoff(attempt, retryConfig.baseDelayMs, retryConfig.maxDelayMs));
            return this.request<TResponse, TRequest>(options, retryConfig, attempt + 1);
          }
        }
        return { error: networkError };
      }
      return {
        error: {
          category: 'server',
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          status: 0,
          retryable: false,
        },
      };
    }
  }

  async get<TResponse = unknown>(
    path: string,
    options: Omit<RequestOptions<never>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError }> {
    return this.request<TResponse>(
      {
        method: 'GET',
        path,
        ...options,
      },
      {
        ...defaultRetryConfig,
        ...options.retry,
      },
    );
  }

  async post<TResponse = unknown, TRequest = unknown>(
    path: string,
    body: TRequest,
    options: Omit<RequestOptions<TRequest>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError }> {
    return this.request<TResponse, TRequest>(
      {
        method: 'POST',
        path,
        body,
        ...options,
      },
      {
        ...defaultRetryConfig,
        ...options.retry,
      },
    );
  }

  async patch<TResponse = unknown, TRequest = unknown>(
    path: string,
    body: TRequest,
    options: Omit<RequestOptions<TRequest>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError }> {
    return this.request<TResponse, TRequest>(
      {
        method: 'PATCH',
        path,
        body,
        ...options,
      },
      {
        ...defaultRetryConfig,
        ...options.retry,
      },
    );
  }

  async delete<TResponse = unknown>(
    path: string,
    options: Omit<RequestOptions<never>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError }> {
    return this.request<TResponse>(
      {
        method: 'DELETE',
        path,
        ...options,
      },
      {
        ...defaultRetryConfig,
        ...options.retry,
      },
    );
  }

  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.config.defaultHeaders = {
      ...this.config.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  clearAuthToken(): void {
    const { Authorization: _, ...rest } = this.config.defaultHeaders || {};
    this.config.defaultHeaders = rest;
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token;
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  clearCsrfToken(): void {
    this.csrfToken = null;
  }

  async getHealth(): Promise<{ data?: { status: 'ok' }; error?: CategorizedApiError }> {
    return this.get<{ status: 'ok' }>('/health', { retry: { maxAttempts: 1 } });
  }

  async getReadiness(): Promise<{
    data?: {
      status: 'ok' | 'degraded';
      checks: {
        database: { ok: boolean; message: string };
        redis: { ok: boolean; message: string };
      };
    };
    error?: CategorizedApiError;
  }> {
    return this.get<{
      status: 'ok' | 'degraded';
      checks: {
        database: { ok: boolean; message: string };
        redis: { ok: boolean; message: string };
      };
    }>('/ready', { retry: { maxAttempts: 1 } });
  }

  async getAuthenticatedHealth(): Promise<{
    data?: { status: 'ok'; user: { id: string; tenantId: string; role: string } };
    error?: CategorizedApiError;
  }> {
    return this.get<{ status: 'ok'; user: { id: string; tenantId: string; role: string } }>(
      '/api/v1/health/authenticated',
      { retry: { maxAttempts: 1 } },
    );
  }
}

export const buildApiUrl = (
  path: string,
  config: ApiClientConfig = defaultApiClientConfig,
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${normalizedPath}`;
};

export const apiClient = new ApiClient();
