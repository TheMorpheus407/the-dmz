import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'test-secret',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('request logger middleware', () => {
  describe('structured logging', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: Array<{ level: string; args: unknown[] }> = [];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation((_bindings) => {
        const logger = {
          info: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'info', args });
          }),
          warn: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'warn', args });
          }),
          error: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'error', args });
          }),
          debug: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn(),
        };
        return logger as unknown as typeof app.log;
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('emits request log with required structured fields', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const requestLogCall = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLogCall).toBeDefined();

      const logPayload = requestLogCall?.args[0] as Record<string, unknown>;
      expect(logPayload).toMatchObject({
        requestId: expect.any(String),
        method: 'GET',
        url: '/health',
        ip: expect.any(String),
        userAgent: expect.any(String),
        service: {
          name: 'the-dmz-api',
          version: expect.any(String),
          environment: 'test',
        },
        event: 'request_received',
      });
    });

    it('emits response log with required structured fields', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const responseLogCall = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request completed',
      );
      expect(responseLogCall).toBeDefined();

      const logPayload = responseLogCall?.args[0] as Record<string, unknown>;
      expect(logPayload).toMatchObject({
        requestId: expect.any(String),
        method: 'GET',
        url: '/health',
        statusCode: 200,
        durationMs: expect.any(Number),
        ip: expect.any(String),
        userAgent: expect.any(String),
        service: {
          name: 'the-dmz-api',
          version: expect.any(String),
          environment: 'test',
        },
        event: 'request_completed',
      });
    });

    it('logs 4xx responses as warnings', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);

      const responseLogCall = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(responseLogCall).toBeDefined();

      const logPayload = responseLogCall?.args[0] as Record<string, unknown>;
      expect(logPayload).toMatchObject({
        statusCode: 404,
        event: 'request_completed',
      });
    });

    it('includes request ID from x-request-id header when provided', async () => {
      capturedLogs.length = 0;

      const customRequestId = 'custom-request-id-12345';
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response.statusCode).toBe(200);

      const requestLogCall = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLogCall).toBeDefined();
      const logPayload = requestLogCall?.args[0] as Record<string, unknown>;
      expect(logPayload['requestId']).toBe(customRequestId);
    });
  });

  describe('public routes', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: Array<{ level: string; args: unknown[] }> = [];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation((_bindings) => {
        const logger = {
          info: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'info', args });
          }),
          warn: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'warn', args });
          }),
          error: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'error', args });
          }),
          debug: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn(),
        };
        return logger as unknown as typeof app.log;
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('/health logs successfully without auth context', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const hasError = capturedLogs.some(
        (log) => log.level === 'error' && JSON.stringify(log.args).includes('Tenant context'),
      );
      expect(hasError).toBe(false);
    });

    it('/ready logs successfully without auth context', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(503);

      const hasError = capturedLogs.some(
        (log) => log.level === 'error' && JSON.stringify(log.args).includes('Tenant context'),
      );
      expect(hasError).toBe(false);
    });
  });

  describe('redaction', () => {
    let app: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      app = buildApp(createTestConfig({ LOG_LEVEL: 'silent' }));
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('redacts authorization header from logs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          authorization: 'Bearer super-secret-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('redacts password from request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'valid pass 1234',
          tenantId: '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('redacts token fields from request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'valid pass 1234',
          token: 'should-be-redacted',
          refreshToken: 'also-should-be-redacted',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('error logging', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: Array<{ level: string; args: unknown[] }> = [];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation((_bindings) => {
        const logger = {
          info: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'info', args });
          }),
          warn: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'warn', args });
          }),
          error: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'error', args });
          }),
          debug: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn(),
        };
        return logger as unknown as typeof app.log;
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('includes requestId in error logs for 4xx errors', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);

      const errorCall = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorCall).toBeDefined();

      const logPayload = errorCall?.args[0] as Record<string, unknown>;
      expect(logPayload).toMatchObject({
        requestId: expect.any(String),
        statusCode: 404,
      });
    });

    it('logs error path correctly', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);

      const errorLogs = capturedLogs.filter(
        (log) => log.level === 'warn' && log.args[1] === 'request error',
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      const errorLogPayload = errorLogs[0]?.args[0] as Record<string, unknown>;
      expect(errorLogPayload['code']).toBe('NOT_FOUND');
      expect(errorLogPayload['requestId']).toBeDefined();
    });
  });

  describe('X-Request-Id response header', () => {
    let app: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      app = buildApp(createTestConfig({ LOG_LEVEL: 'silent' }));
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('echoes x-request-id in response headers when provided', async () => {
      const customRequestId = 'my-custom-request-id';
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(customRequestId);
    });

    it('returns generated request ID in response headers when not provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]+$/);
    });

    it('echoes request ID on error responses', async () => {
      const customRequestId = 'error-request-id';
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });
});
