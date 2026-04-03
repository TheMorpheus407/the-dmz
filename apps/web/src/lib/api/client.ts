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
import { HttpExecutor, buildApiUrl } from './http/executor.js';
import { RetryHandler, generateRequestId, isIdempotentMethod, delay } from './http/retry.js';
import { TokenManager } from './http/auth/token-manager.js';

export { defaultApiClientConfig } from './types.js';

export class ApiClient {
  private httpExecutor: HttpExecutor;
  private tokenManager: TokenManager;

  constructor(config: Partial<ApiClientConfig> = {}) {
    const fullConfig = {
      baseUrl: config.baseUrl ?? defaultApiClientConfig.baseUrl,
      defaultHeaders: config.defaultHeaders ?? defaultApiClientConfig.defaultHeaders ?? {},
      credentials: config.credentials ?? defaultApiClientConfig.credentials ?? 'include',
      timeout: config.timeout ?? defaultApiClientConfig.timeout ?? 0,
    };

    this.httpExecutor = new HttpExecutor({
      baseUrl: fullConfig.baseUrl,
      defaultHeaders: fullConfig.defaultHeaders,
      credentials: fullConfig.credentials,
      timeout: fullConfig.timeout,
    });

    this.tokenManager = new TokenManager();
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    return this.httpExecutor.buildUrl(path, params);
  }

  private async request<TResponse, TRequest = unknown>(
    options: RequestOptions<TRequest>,
    retryConfig: RetryConfig,
    attempt: number = 0,
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
    const { method, path = '', body, params, headers = {}, requestId: customRequestId } = options;

    const requestId = customRequestId || generateRequestId();

    const url = this.buildUrl(path, params);

    const tokenHeaders = this.tokenManager.buildAuthHeaders();

    const executorConfig = this.httpExecutor.getConfig();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...tokenHeaders,
      ...executorConfig.defaultHeaders,
      ...headers,
      'X-Request-Id': requestId,
    };

    const requestInit = this.httpExecutor.createRequestInit(
      method,
      requestHeaders,
      body && method !== 'GET' ? JSON.stringify(body) : undefined,
      options.credentials,
    );

    if (executorConfig.timeout) {
      const controller = new AbortController();
      requestInit.signal = controller.signal;
      setTimeout(() => controller.abort(), executorConfig.timeout);
    }

    try {
      const response = await fetch(url, requestInit as RequestInit);

      const contentType = response.headers.get('content-type');
      const responseRequestId = response.headers.get('x-request-id') || requestId;
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      if (retryConfig && attempt < retryConfig.maxAttempts - 1) {
        const errorBody: Record<string, unknown> = await (
          response.clone().json() as Promise<Record<string, unknown>>
        ).catch(() => ({}) as Record<string, unknown>);
        const errorObj =
          typeof errorBody['error'] === 'object' && errorBody['error'] !== null
            ? (errorBody['error'] as { code?: string })
            : ({} as { code?: string });
        const retryHandler = new RetryHandler(retryConfig);
        if (
          retryHandler.shouldRetryByStatus(response.status) ||
          retryHandler.shouldRetryByError(errorObj)
        ) {
          if (isIdempotentMethod(method)) {
            await delay(retryHandler.getBackoffDelay(attempt));
            return this.request<TResponse, TRequest>(options, retryConfig, attempt + 1);
          }
        }
      }

      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          return {
            error: {
              category: 'server',
              code: 'INVALID_RESPONSE',
              message: 'Invalid response from server',
              status: response.status,
              retryable: response.status === 503,
              requestId: responseRequestId,
            },
            requestId: responseRequestId,
          };
        }
        return { data: undefined as TResponse, requestId: responseRequestId };
      }

      const json: unknown = await response.json();

      const errorEnvelope = apiErrorEnvelopeSchema.safeParse(json);
      if (errorEnvelope.success) {
        const mappedError = mapApiError(
          errorEnvelope.data.error,
          response.status,
          responseRequestId,
          retryAfterSeconds,
        );
        return { error: mappedError, requestId: responseRequestId };
      }

      if (!response.ok) {
        const errorObj: CategorizedApiError = {
          category: 'server',
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          status: response.status,
          retryable: response.status === 503,
          requestId: responseRequestId,
        };
        if (retryAfterSeconds !== undefined) {
          errorObj.retryAfterSeconds = retryAfterSeconds;
        }
        return {
          error: errorObj,
          requestId: responseRequestId,
        };
      }

      if (typeof json === 'object' && json !== null && 'data' in json) {
        return { data: json.data as TResponse, requestId: responseRequestId };
      }
      return { data: undefined as TResponse, requestId: responseRequestId };
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
              requestId,
            },
            requestId,
          };
        }
        const networkError = mapNetworkError(err);
        if (retryConfig && attempt < retryConfig.maxAttempts - 1 && networkError.retryable) {
          const retryHandler = new RetryHandler(retryConfig);
          if (isIdempotentMethod(method)) {
            await delay(retryHandler.getBackoffDelay(attempt));
            return this.request<TResponse, TRequest>(options, retryConfig, attempt + 1);
          }
        }
        return { error: networkError, requestId };
      }
      return {
        error: {
          category: 'server',
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          status: 0,
          retryable: false,
          requestId,
        },
        requestId,
      };
    }
  }

  async get<TResponse = unknown>(
    path: string,
    options: Omit<RequestOptions<never>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
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
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
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
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
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
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
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

  async put<TResponse = unknown, TRequest = unknown>(
    path: string,
    body: TRequest,
    options: Omit<RequestOptions<TRequest>, 'method' | 'body'> = {},
  ): Promise<{ data?: TResponse; error?: CategorizedApiError; requestId?: string }> {
    return this.request<TResponse, TRequest>(
      {
        method: 'PUT',
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

  setBaseUrl(baseUrl: string): void {
    this.httpExecutor.setBaseUrl(baseUrl);
  }

  setAuthToken(token: string): void {
    this.tokenManager.setAuthToken(token);
  }

  clearAuthToken(): void {
    this.tokenManager.clearAuthToken();
  }

  setCsrfToken(token: string): void {
    this.tokenManager.setCsrfToken(token);
  }

  getCsrfToken(): string | null {
    return this.tokenManager.getCsrfToken();
  }

  clearCsrfToken(): void {
    this.tokenManager.clearCsrfToken();
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

export { buildApiUrl };

export const apiClient = new ApiClient();
