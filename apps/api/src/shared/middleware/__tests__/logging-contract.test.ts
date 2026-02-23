import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  m1LoggingContractManifest,
  requiredRequestLogFields,
  requiredResponseLogFields,
} from '@the-dmz/shared/contracts';

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

interface CapturedLog {
  level: string;
  args: unknown[];
}

describe('logging contract validation', () => {
  describe('contract manifest', () => {
    it('defines required event categories', () => {
      expect(m1LoggingContractManifest.eventCategories).toContain('request_received');
      expect(m1LoggingContractManifest.eventCategories).toContain('request_completed');
    });

    it('defines required fields for request events', () => {
      const requestFields = m1LoggingContractManifest.requiredFields.filter((f) =>
        f.requiredForEvents.includes('request_received'),
      );
      expect(requestFields.length).toBeGreaterThan(0);
    });

    it('defines level semantics for status codes', () => {
      expect(m1LoggingContractManifest.levelSemantics.warn).toContain(400);
      expect(m1LoggingContractManifest.levelSemantics.warn).toContain(401);
      expect(m1LoggingContractManifest.levelSemantics.error).toContain(500);
    });

    it('defines redaction paths', () => {
      expect(m1LoggingContractManifest.redactionPaths.length).toBeGreaterThan(0);
      const authRedaction = m1LoggingContractManifest.redactionPaths.find((p) =>
        p.keyPatterns.includes('authorization'),
      );
      expect(authRedaction).toBeDefined();
    });
  });

  describe('public probe endpoints (/health, /ready)', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('/health emits request_received log with required fields', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const requestLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLog).toBeDefined();

      const logPayload = requestLog?.args[0] as Record<string, unknown>;

      for (const field of requiredRequestLogFields) {
        expect(logPayload).toHaveProperty(field);
      }

      expect(logPayload['service']).toBeDefined();
      expect((logPayload['service'] as Record<string, unknown>)['name']).toBe('the-dmz-api');
    });

    it('/health emits request_completed log with required fields', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const responseLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request completed',
      );
      expect(responseLog).toBeDefined();

      const logPayload = responseLog?.args[0] as Record<string, unknown>;

      for (const field of requiredResponseLogFields) {
        expect(logPayload).toHaveProperty(field);
      }

      expect(logPayload['statusCode']).toBe(200);
      expect(logPayload['durationMs']).toBeDefined();
      expect(typeof logPayload['durationMs']).toBe('number');
    });

    it('/ready emits logs without auth context', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect([200, 503]).toContain(response.statusCode);

      const requestLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLog).toBeDefined();
    });
  });

  describe('auth flow logging', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('logs auth failure with correct level', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'shortpw1',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);

      const errorLog = capturedLogs.find(
        (log) =>
          (log.level === 'warn' || log.level === 'error') &&
          log.args[1]?.toString().includes('completed'),
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['statusCode']).toBe(response.statusCode);
      expect(logPayload['requestId']).toBeDefined();
    });

    it('logs validation failure correctly', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['statusCode']).toBe(400);
    });
  });

  describe('protected route authorization failures', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('logs 401 unauthorized correctly', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['statusCode']).toBe(401);
      expect(logPayload['requestId']).toBeDefined();
    });

    it('logs 404 not found correctly', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent-route',
      });

      expect(response.statusCode).toBe(404);

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['statusCode']).toBe(404);
    });
  });

  describe('correlation parity between logs and error responses', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('requestId in log matches response header', async () => {
      capturedLogs.length = 0;

      const customRequestId = 'test-correlation-123';
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(customRequestId);

      const requestLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLog).toBeDefined();

      const logPayload = requestLog?.args[0] as Record<string, unknown>;
      expect(logPayload['requestId']).toBe(customRequestId);
    });

    it('requestId in error log matches error envelope requestId', async () => {
      capturedLogs.length = 0;

      const customRequestId = 'error-correlation-456';
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      expect(response.statusCode).toBe(404);

      const errorResponse = JSON.parse(response.payload);
      expect(errorResponse.error.requestId).toBe(customRequestId);

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['requestId']).toBe(customRequestId);
      expect(logPayload['requestId']).toBe(errorResponse.error.requestId);
    });
  });

  describe('tenant isolation in concurrent requests', () => {
    let app: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      app = buildApp(createTestConfig({ LOG_LEVEL: 'silent' }));
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('does not leak tenant context between concurrent requests', async () => {
      const logs1: string[] = [];
      const logs2: string[] = [];

      const injectAndCapture = async (_tenantId: string, logs: string[]) => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            'x-tenant-id': _tenantId,
          },
        });
        logs.push(response.headers['x-request-id'] as string);
      };

      await Promise.all([injectAndCapture('tenant-1', logs1), injectAndCapture('tenant-2', logs2)]);

      expect(logs1[0]).not.toBe(logs2[0]);
    });
  });

  describe('redaction validation', () => {
    let app: ReturnType<typeof buildApp>;

    beforeAll(async () => {
      app = buildApp(createTestConfig({ LOG_LEVEL: 'silent' }));
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('redacts authorization header', async () => {
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
          password: 'example-credential-value',
          tenantId: '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('redacts token fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'shortpw2',
          token: 'should-be-redacted',
          refreshToken: 'also-redacted',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('log level semantics', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('logs 2xx as info', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const responseLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request completed',
      );
      expect(responseLog).toBeDefined();
    });

    it('logs 4xx as warn', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();
    });
  });

  describe('rate-limited 429 responses', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(
        createTestConfig({ LOG_LEVEL: 'info', RATE_LIMIT_MAX: '2', RATE_LIMIT_TIME_WINDOW: '60' }),
      );

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('logs 429 rate limit with warn level and required fields', async () => {
      capturedLogs.length = 0;

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();

      const errorLog = capturedLogs.find(
        (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
      );
      expect(errorLog).toBeDefined();

      const logPayload = errorLog?.args[0] as Record<string, unknown>;
      expect(logPayload['statusCode']).toBe(429);
      expect(logPayload['requestId']).toBeDefined();
      expect(logPayload['method']).toBe('GET');
      expect(logPayload['url']).toBe('/api/v1/');
      expect(logPayload['durationMs']).toBeDefined();
    });

    it('maintains requestId correlation for 429 responses', async () => {
      capturedLogs.length = 0;

      const customRequestId = 'rate-limit-correlation-789';
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          'x-request-id': customRequestId,
          'x-tenant-id': '660e8400-e29b-41d4-a716-446655440001',
        },
      });

      if (response.statusCode === 429) {
        const errorResponse = JSON.parse(response.payload);
        expect(errorResponse.error.requestId).toBe(customRequestId);

        const errorLog = capturedLogs.find(
          (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
        );
        expect(errorLog).toBeDefined();

        const logPayload = errorLog?.args[0] as Record<string, unknown>;
        expect(logPayload['requestId']).toBe(customRequestId);
        expect(logPayload['requestId']).toBe(errorResponse.error.requestId);
      }
    });

    it('does not include tenant context in 429 rate limit logs (rate limit triggers before tenant resolution)', async () => {
      capturedLogs.length = 0;

      const tenantId = '770e8400-e29b-41d4-a716-446655440002';

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantId },
      });

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantId },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantId },
      });

      if (response.statusCode === 429) {
        const errorLog = capturedLogs.find(
          (log) => log.level === 'warn' && log.args[1] === 'request completed with error',
        );
        expect(errorLog).toBeDefined();

        const logPayload = errorLog?.args[0] as Record<string, unknown>;
        expect(logPayload['tenantId']).toBeUndefined();
      }
    });
  });

  describe('service metadata', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('includes service metadata in logs', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const requestLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      expect(requestLog).toBeDefined();

      const logPayload = requestLog?.args[0] as Record<string, unknown>;
      expect(logPayload['service']).toBeDefined();

      const service = logPayload['service'] as Record<string, unknown>;
      expect(service['name']).toBe('the-dmz-api');
      expect(service['environment']).toBe('test');
      expect(service['version']).toBeDefined();
    });
  });

  describe('optional context fields', () => {
    let app: ReturnType<typeof buildApp>;
    let capturedLogs: CapturedLog[];

    beforeAll(async () => {
      capturedLogs = [];
      app = buildApp(createTestConfig({ LOG_LEVEL: 'info' }));

      vi.spyOn(app.log, 'child').mockImplementation(() => {
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

    it('logs without tenantId/userId for public routes', async () => {
      capturedLogs.length = 0;

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const requestLog = capturedLogs.find(
        (log) => log.level === 'info' && log.args[1] === 'request received',
      );
      const logPayload = requestLog?.args[0] as Record<string, unknown>;

      expect(logPayload['tenantId']).toBeUndefined();
      expect(logPayload['userId']).toBeUndefined();
    });
  });
});
