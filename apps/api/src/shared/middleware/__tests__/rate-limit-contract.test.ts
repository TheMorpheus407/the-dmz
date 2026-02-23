import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  REQUIRED_RATE_LIMIT_HEADERS,
  REQUIRED_429_HEADERS,
  RATE_LIMIT_EXCEEDED_ERROR_CODE,
  REQUIRED_ERROR_DETAILS,
} from '@the-dmz/shared/contracts';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

import type { FastifyInstance } from 'fastify';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

const getHeader = (
  headers: Record<string, number | string | string[] | undefined>,
  name: string,
): string | undefined => {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] !== undefined ? String(value[0]) : undefined;
  }

  if (value === undefined) {
    return undefined;
  }

  return String(value);
};

const hasAllHeaders = (
  headers: Record<string, number | string | string[] | undefined>,
  requiredHeaders: readonly string[],
): boolean => {
  return requiredHeaders.every((h) => getHeader(headers, h) !== undefined);
};

describe('rate-limit contract', () => {
  describe('header contract', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '5',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('emits required rate-limit headers on non-exempt routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(200);
      expect(hasAllHeaders(response.headers, [...REQUIRED_RATE_LIMIT_HEADERS])).toBe(true);
    });

    it('emits all required headers on 429 responses', async () => {
      const app2 = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '2',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app2.ready();

      await app2.inject({
        method: 'GET',
        url: '/api/v1/',
      });
      await app2.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await app2.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(429);
      expect(hasAllHeaders(response.headers, [...REQUIRED_429_HEADERS])).toBe(true);

      await app2.close();
    });
  });

  describe('429 error contract', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '1',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('includes RATE_LIMIT_EXCEEDED error code in 429 response', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(429);

      const payload = response.json() as {
        success: boolean;
        error: {
          code: string;
          message: string;
          details: Record<string, unknown>;
          requestId: string;
        };
      };

      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe(RATE_LIMIT_EXCEEDED_ERROR_CODE);
    });

    it('includes required details fields in 429 error', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const payload = response.json() as {
        success: boolean;
        error: {
          code: string;
          message: string;
          details: Record<string, unknown>;
          requestId: string;
        };
      };

      expect(payload.error.code).toBe(RATE_LIMIT_EXCEEDED_ERROR_CODE);

      for (const requiredField of REQUIRED_ERROR_DETAILS) {
        expect(payload.error.details).toHaveProperty(requiredField);
      }

      expect(typeof payload.error.details['retryAfterSeconds']).toBe('number');
      expect(payload.error.details['retryAfterSeconds']).toBeGreaterThan(0);
    });

    it('includes requestId correlation on 429 responses', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const payload = response.json() as {
        success: boolean;
        error: {
          code: string;
          message: string;
          details: Record<string, unknown>;
          requestId: string;
        };
      };

      expect(typeof payload.error.requestId).toBe('string');
      expect(payload.error.requestId.length).toBeGreaterThan(0);
    });

    it('includes Retry-After header on 429', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(429);
      expect(getHeader(response.headers, 'retry-after')).toBeDefined();

      const retryAfter = getHeader(response.headers, 'retry-after');
      expect(retryAfter).not.toBe('0');
    });
  });

  describe('exempt routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '1',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('/health does not include rate-limit headers', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
        });

        expect(response.statusCode).toBe(200);
        expect(getHeader(response.headers, 'x-ratelimit-limit')).toBeUndefined();
      }
    });

    it('/ready does not include rate-limit headers', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/ready',
        });

        expect(response.statusCode).toBe(503);
        expect(getHeader(response.headers, 'x-ratelimit-limit')).toBeUndefined();
      }
    });
  });

  describe('auth endpoints rate-limit behavior', () => {
    it('protected endpoints respect rate limits', async () => {
      const testApp = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '2',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await testApp.ready();

      await testApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });
      await testApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(429);

      await testApp.close();
    });

    it('different protected routes share the same bucket when using default', async () => {
      const testApp = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '1',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await testApp.ready();

      await testApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/api/v1/missing',
      });

      expect(response.statusCode).toBe(429);

      await testApp.close();
    });
  });

  describe('tenant/IP isolation', () => {
    it('different tenants have separate rate limit buckets', async () => {
      const app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '1',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();

      const tenantA = '550e8400-e29b-41d4-a716-446655440000';
      const tenantB = '550e8400-e29b-41d4-a716-446655440001';

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantA },
      });

      const tenantAResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantA },
      });

      expect(tenantAResponse.statusCode).toBe(429);

      const tenantBResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantB },
      });

      expect(tenantBResponse.statusCode).toBe(200);

      await app.close();
    });

    it('different IPs have separate rate limit buckets', async () => {
      const app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '1',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();

      await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      const ip1Response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(ip1Response.statusCode).toBe(429);

      const ip2Response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        remoteAddress: '192.168.1.100',
      });

      expect(ip2Response.statusCode).toBe(200);

      await app.close();
    });
  });
});
