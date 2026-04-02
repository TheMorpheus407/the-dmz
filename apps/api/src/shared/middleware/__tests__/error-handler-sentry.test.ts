import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import { ErrorCodes } from '../error-handler.js';

const { mockSentryCaptureException } = vi.hoisted(() => {
  return {
    mockSentryCaptureException: vi.fn(),
  };
});

vi.mock('@sentry/node', () => ({
  default: {
    init: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    captureException: mockSentryCaptureException,
  },
  init: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  captureException: mockSentryCaptureException,
}));

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

describe('error-handler Sentry Integration', () => {
  let app: ReturnType<typeof buildApp> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (app) {
      await closeDatabase();
      await app.close();
      app = null;
    }
  });

  describe('Sentry capture for 5xx errors', () => {
    it('captures Sentry error for 5xx internal errors', async () => {
      app = buildApp(testConfig);

      app.get('/test-5xx-error', async () => {
        throw new Error('Internal server error');
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/test-5xx-error',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedCall = mockSentryCaptureException.mock.calls[0];
      expect(capturedCall).toBeDefined();
      expect(capturedCall![0]).toBeInstanceOf(Error);
      expect((capturedCall![0] as Error).message).toBe('Internal server error');
    });

    it('passes sanitized context to Sentry for 5xx errors', async () => {
      app = buildApp(testConfig);

      app.get('/test-5xx-with-context', async (request) => {
        request.tenantContext = {
          tenantId: 'tenant-123',
          userId: 'user-456',
        };
        throw new Error('Server error with context');
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/test-5xx-with-context',
        headers: {
          'x-request-id': 'test-request-789',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedCall = mockSentryCaptureException.mock.calls[0];
      const extra = capturedCall![1] as { extra: Record<string, unknown> };

      expect(extra.extra.requestId).toBe('test-request-789');
      expect(extra.extra.tenantId).toBe('tenant-123');
      expect(extra.extra.userId).toBe('user-456');
      expect(extra.extra.method).toBe('GET');
      expect(extra.extra.url).toBe('/test-5xx-with-context');
    });

    it('does not capture Sentry for 4xx client errors', async () => {
      app = buildApp(testConfig);

      app.get('/test-4xx-error', async () => {
        throw Object.assign(new Error('Bad Request'), { statusCode: 400 });
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/test-4xx-error',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('does not block error response when Sentry capture fails', async () => {
      mockSentryCaptureException.mockImplementationOnce(() => {
        throw new Error('Sentry network error');
      });

      app = buildApp(testConfig);

      app.get('/test-error-with-sentry-failure', async () => {
        throw new Error('Some internal error');
      });

      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-error-with-sentry-failure',
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
    });

    it('handles missing tenantContext gracefully in Sentry capture', async () => {
      app = buildApp(testConfig);

      app.get('/test-5xx-no-tenant', async () => {
        throw new Error('Error without tenant context');
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/test-5xx-no-tenant',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedCall = mockSentryCaptureException.mock.calls[0];
      const extra = capturedCall![1] as { extra: Record<string, unknown> };

      expect(extra.extra.tenantId).toBeUndefined();
      expect(extra.extra.userId).toBeUndefined();
    });

    it('sanitizes sensitive fields in context before sending to Sentry', async () => {
      app = buildApp(testConfig);

      app.get('/test-5xx-with-sensitive-data', async () => {
        throw Object.assign(new Error('Error with sensitive data'), {
          sensitiveField: 'secret-password',
          apiKey: 'sk-123456789',
        });
      });

      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/test-5xx-with-sensitive-data',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedCall = mockSentryCaptureException.mock.calls[0];
      const extra = capturedCall![1] as { extra: Record<string, unknown> };

      expect(extra.extra.sensitiveField).toBeUndefined();
      expect(extra.extra.apiKey).toBeUndefined();
    });
  });
});
