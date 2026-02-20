import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

import {
  mapApiError,
  mapNetworkError,
  getErrorMessage,
  apiErrorSchema,
  apiErrorEnvelopeSchema,
  apiSuccessEnvelopeSchema,
  ApiClient,
  defaultRetryConfig,
} from './index.js';

describe('Zod schemas', () => {
  describe('apiErrorSchema', () => {
    it('parses valid error object', () => {
      const error = {
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Your session has expired',
        requestId: 'req-123',
      };

      const result = apiErrorSchema.parse(error);
      expect(result.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(result.message).toBe('Your session has expired');
      expect(result.requestId).toBe('req-123');
    });

    it('parses error with optional details', () => {
      const error = {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input',
        details: { field: 'email', reason: 'invalid format' },
      };

      const result = apiErrorSchema.parse(error);
      expect(result.details).toEqual({ field: 'email', reason: 'invalid format' });
    });

    it('fails on missing required fields', () => {
      const error = { message: 'Only message' };
      expect(() => apiErrorSchema.parse(error)).toThrow();
    });
  });

  describe('apiErrorEnvelopeSchema', () => {
    it('parses valid error envelope', () => {
      const envelope = {
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Your session has expired',
        },
      };

      const result = apiErrorEnvelopeSchema.parse(envelope);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('fails when success is true for error envelope', () => {
      const envelope = {
        success: true,
        error: { code: 'TEST', message: 'test' },
      };

      expect(() => apiErrorEnvelopeSchema.parse(envelope)).toThrow();
    });
  });

  describe('apiSuccessEnvelopeSchema', () => {
    it('parses valid success envelope with data', () => {
      const dataSchema = z.object({ id: z.string(), name: z.string() });
      const successSchema = apiSuccessEnvelopeSchema(dataSchema);

      const envelope = {
        success: true,
        data: { id: '1', name: 'Test' },
      };

      const result = successSchema.parse(envelope);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('1');
    });

    it('fails when success is false for success envelope', () => {
      const dataSchema = z.object({ id: z.string() });
      const successSchema = apiSuccessEnvelopeSchema(dataSchema);

      const envelope = {
        success: false,
        data: { id: '1' },
      };

      expect(() => successSchema.parse(envelope)).toThrow();
    });
  });
});

describe('mapApiError', () => {
  it('categorizes 401 as authentication', () => {
    const error = { code: 'AUTH_TOKEN_EXPIRED', message: 'Session expired' };
    const result = mapApiError(error, 401);

    expect(result.category).toBe('authentication');
    expect(result.status).toBe(401);
    expect(result.retryable).toBe(false);
  });

  it('categorizes 403 as authorization', () => {
    const error = { code: 'AUTH_INSUFFICIENT_PERMS', message: 'Forbidden' };
    const result = mapApiError(error, 403);

    expect(result.category).toBe('authorization');
    expect(result.status).toBe(403);
    expect(result.retryable).toBe(false);
  });

  it('categorizes 400 as validation', () => {
    const error = { code: 'VALIDATION_FAILED', message: 'Invalid input' };
    const result = mapApiError(error, 400);

    expect(result.category).toBe('validation');
    expect(result.status).toBe(400);
    expect(result.retryable).toBe(false);
  });

  it('categorizes 429 as rate limiting', () => {
    const error = { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' };
    const result = mapApiError(error, 429);

    expect(result.category).toBe('rate_limiting');
    expect(result.status).toBe(429);
    expect(result.retryable).toBe(true);
  });

  it('categorizes 500 as server error', () => {
    const error = { code: 'INTERNAL_ERROR', message: 'Server error' };
    const result = mapApiError(error, 500);

    expect(result.category).toBe('server');
    expect(result.status).toBe(500);
    expect(result.retryable).toBe(false);
  });

  it('categorizes 503 as server error with retryable', () => {
    const error = { code: 'SERVICE_UNAVAILABLE', message: 'Service down' };
    const result = mapApiError(error, 503);

    expect(result.category).toBe('server');
    expect(result.status).toBe(503);
    expect(result.retryable).toBe(true);
  });

  it('maps unknown codes to server category by default', () => {
    const error = { code: 'UNKNOWN_CODE', message: 'Unknown error' };
    const result = mapApiError(error, 500);

    expect(result.category).toBe('server');
  });

  it('preserves request ID when present', () => {
    const error = { code: 'TEST', message: 'Test', requestId: 'req-abc' };
    const result = mapApiError(error, 400);

    expect(result.requestId).toBe('req-abc');
  });
});

describe('mapNetworkError', () => {
  it('returns network error with retryable true', () => {
    const error = new Error('Failed to fetch');
    const result = mapNetworkError(error);

    expect(result.category).toBe('network');
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.status).toBe(0);
    expect(result.retryable).toBe(true);
  });
});

describe('getErrorMessage', () => {
  it('returns authentication message for auth errors', () => {
    const error = {
      category: 'authentication' as const,
      code: 'AUTH_TOKEN_EXPIRED',
      message: '',
      status: 401,
      retryable: false,
    };
    expect(getErrorMessage(error)).toContain('session');
  });

  it('returns authorization message for auth errors', () => {
    const error = {
      category: 'authorization' as const,
      code: 'AUTH_INSUFFICIENT_PERMS',
      message: '',
      status: 403,
      retryable: false,
    };
    expect(getErrorMessage(error)).toContain('permission');
  });

  it('returns original message for validation errors', () => {
    const error = {
      category: 'validation' as const,
      code: 'VALIDATION_FAILED',
      message: 'Invalid email',
      status: 400,
      retryable: false,
    };
    expect(getErrorMessage(error)).toBe('Invalid email');
  });

  it('returns rate limiting message for rate limit errors', () => {
    const error = {
      category: 'rate_limiting' as const,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '',
      status: 429,
      retryable: true,
    };
    expect(getErrorMessage(error)).toContain('wait');
  });

  it('returns server error message for server errors', () => {
    const error = {
      category: 'server' as const,
      code: 'INTERNAL_ERROR',
      message: '',
      status: 500,
      retryable: false,
    };
    expect(getErrorMessage(error)).toContain('our end');
  });

  it('returns network error message for network errors', () => {
    const error = {
      category: 'network' as const,
      code: 'NETWORK_ERROR',
      message: '',
      status: 0,
      retryable: true,
    };
    expect(getErrorMessage(error)).toContain('connection');
  });
});

describe('ApiClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchSpy = vi.fn();
    originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('creates client with default config', () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    it('creates client with custom base URL', () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      expect(client).toBeDefined();
    });
  });

  describe('get', () => {
    it('makes GET request to correct path', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { id: '1' } }),
      } as Response);

      const client = new ApiClient();
      const result = await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.data).toEqual({ id: '1' });
    });

    it('includes query params in URL', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const client = new ApiClient();
      await client.get('/users', { params: { page: 1, limit: 10 } });

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/users?page=1&limit=10', expect.any(Object));
    });

    it('returns error for 401 response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'AUTH_TOKEN_EXPIRED', message: 'Session expired' },
        }),
      } as Response);

      const client = new ApiClient();
      const result = await client.get('/protected');

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('authentication');
    });

    it('returns error for 403 response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'AUTH_INSUFFICIENT_PERMS', message: 'Forbidden' },
        }),
      } as Response);

      const client = new ApiClient();
      const result = await client.get('/admin');

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('authorization');
    });

    it('returns error for 400 validation error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'Invalid input' },
        }),
        clone: function () {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      };
      fetchSpy.mockResolvedValue(mockResponse as unknown as Response);

      const client = new ApiClient();
      const result = await client.post('/users', { name: '' });

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('validation');
    });

    it('returns error for 429 rate limit', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
        }),
      } as Response);

      const client = new ApiClient();
      const result = await client.get('/users');

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('rate_limiting');
      expect(result.error?.retryable).toBe(true);
    });

    it('returns error for 5xx server errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Server error' },
        }),
      } as Response);

      const client = new ApiClient();
      const result = await client.get('/users');

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('server');
    });
  });

  describe('post', () => {
    it('makes POST request with body', async () => {
      const mockJson = { success: true, data: { id: '1' } };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockJson,
        clone: function (this: typeof mockResponse) {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      } as unknown as Response;
      fetchSpy.mockResolvedValue(mockResponse);

      const client = new ApiClient();
      const result = await client.post('/users', { name: 'John' });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        }),
      );
      expect(result.data).toEqual({ id: '1' });
    });
  });

  describe('patch', () => {
    it('makes PATCH request with body', async () => {
      const mockJson = { success: true, data: { id: '1', name: 'Jane' } };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockJson,
        clone: function (this: typeof mockResponse) {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      } as unknown as Response;
      fetchSpy.mockResolvedValue(mockResponse);

      const client = new ApiClient();
      const result = await client.patch('/users/1', { name: 'Jane' });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Jane' }),
        }),
      );
      expect(result.data).toEqual({ id: '1', name: 'Jane' });
    });
  });

  describe('delete', () => {
    it('makes DELETE request', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { deleted: true } }),
      } as Response);

      const client = new ApiClient();
      const result = await client.delete('/users/1');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/users/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result.data).toEqual({ deleted: true });
    });
  });

  describe('setAuthToken', () => {
    it('sets Authorization header', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient();
      client.setAuthToken('token123');
      await client.get('/protected');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
        }),
      );
    });
  });

  describe('clearAuthToken', () => {
    it('removes Authorization header', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient();
      client.setAuthToken('Bearer token123');
      client.clearAuthToken();
      await client.get('/protected');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/protected',
        expect.objectContaining({
          headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
        }),
      );
    });
  });

  describe('credentials', () => {
    it('uses include credentials by default', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient();
      await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    it('allows custom credentials', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient({ credentials: 'same-origin' });
      await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'same-origin' }),
      );
    });
  });

  describe('retry behavior', () => {
    it('does not retry non-idempotent POST requests', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' },
        }),
        clone: function () {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      };
      fetchSpy.mockResolvedValue(mockResponse as unknown as Response);

      const client = new ApiClient();
      const result = await client.post('/users', { name: 'John' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.error?.category).toBe('server');
    });

    it('retries idempotent GET requests on 503', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clone: function (this: any) {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      };
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { id: '1' } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clone: function (this: any) {
          return {
            ok: this.ok,
            status: this.status,
            headers: this.headers,
            json: this.json,
          };
        },
      };
      fetchSpy
        .mockResolvedValueOnce(mockErrorResponse as unknown as Response)
        .mockResolvedValueOnce(mockSuccessResponse as unknown as Response);

      const client = new ApiClient();
      const result = await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ id: '1' });
    });

    it('respects custom retry config', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true, data: { id: '1' } }),
        } as Response);

      const client = new ApiClient();
      await client.get('/users', {
        retry: { maxAttempts: 1 },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildApiUrl', () => {
    it('combines base URL with path', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient({ baseUrl: '/custom-api' });
      await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith('/custom-api/users', expect.any(Object));
    });

    it('handles paths starting with slash', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const client = new ApiClient();
      await client.get('/users');

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/users', expect.any(Object));
    });
  });
});

describe('defaultRetryConfig', () => {
  it('has sensible defaults', () => {
    expect(defaultRetryConfig.maxAttempts).toBe(3);
    expect(defaultRetryConfig.baseDelayMs).toBe(500);
    expect(defaultRetryConfig.maxDelayMs).toBe(5000);
    expect(defaultRetryConfig.retryableStatuses).toContain(503);
  });
});
