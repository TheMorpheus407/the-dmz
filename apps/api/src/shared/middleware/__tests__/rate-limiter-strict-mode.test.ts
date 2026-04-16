import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  createRateLimitStore,
  rateLimiter,
  setLastRedisUnavailableErrorMsForTest,
  type RateLimitStoreState,
} from '../rate-limiter.js';

import type { RedisRateLimitClient } from '../../database/redis.js';
import type { FastifyBaseLogger, FastifyInstance, FastifyRequest } from 'fastify';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
} as const;

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

type StoreIncrResult = {
  current: number;
  ttl: number;
};

type StoreLike = {
  incr(
    key: string,
    callback: (error: Error | null, result?: StoreIncrResult) => void,
    timeWindow?: number,
    max?: number,
  ): void;
};

const callStoreIncr = async (
  store: StoreLike,
  key: string,
  timeWindow = 60_000,
  max = 10,
): Promise<StoreIncrResult> =>
  new Promise<StoreIncrResult>((resolve, reject) => {
    store.incr(
      key,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Missing store increment result'));
          return;
        }

        resolve(result);
      },
      timeWindow,
      max,
    );
  });

const createMockRedisClient = (
  overrides: Partial<RedisRateLimitClient> = {},
): RedisRateLimitClient =>
  ({
    status: 'ready',
    connect: vi.fn(async () => undefined),
    ping: vi.fn(async () => 'PONG'),
    incrementRateLimitKey: vi.fn(async () => ({ current: 1, ttl: 60_000 })),
    incrementHourlyQuotaKey: vi.fn(async () => ({ current: 1, remaining: 99 })),
    getValue: vi.fn(async () => null),
    setValue: vi.fn(async () => undefined),
    deleteKey: vi.fn(async () => undefined),
    getKeys: vi.fn(async () => []),
    lpush: vi.fn(async () => 0),
    rpop: vi.fn(async () => null),
    lrange: vi.fn(async () => []),
    llen: vi.fn(async () => 0),
    zadd: vi.fn(async () => 0),
    zpopmax: vi.fn(async () => null),
    zrange: vi.fn(async () => []),
    zscore: vi.fn(async () => null),
    zcard: vi.fn(async () => 0),
    zrem: vi.fn(async () => 0),
    zrevrange: vi.fn(async () => []),
    zrevrank: vi.fn(async () => null),
    zincrby: vi.fn(async () => 0),
    sadd: vi.fn(async () => 0),
    sismember: vi.fn(async () => 0),
    quit: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    ...overrides,
  }) satisfies RedisRateLimitClient;

describe('rate limiter strict mode error paths', () => {
  beforeEach(() => {
    setLastRedisUnavailableErrorMsForTest(0);
  });

  describe('store strict mode rejection when Redis unavailable', () => {
    it('throws RATE_LIMIT_REDIS_UNAVAILABLE_ERROR when Redis call fails and strictMode is true', async () => {
      const redisClient = createMockRedisClient({
        incrementRateLimitKey: vi
          .fn(async () => ({ current: 99, ttl: 60_000 }))
          .mockRejectedValueOnce(new Error('redis connection refused')),
      });

      const logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      } as unknown as FastifyBaseLogger;

      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        strictMode: true,
        redisAvailable: true,
        redisRetryAtMs: 0,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      await expect(callStoreIncr(store, 'strict-test-1', 60_000, 5)).rejects.toThrow(
        'RATE_LIMIT_REDIS_UNAVAILABLE',
      );
      expect(redisClient.incrementRateLimitKey).toHaveBeenCalledWith({
        key: expect.stringContaining('strict-test-1'),
        timeWindowMs: 60_000,
        max: 5,
        continueExceeding: false,
        exponentialBackoff: false,
      });
      expect(state.redisAvailable).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Redis unavailable in strict mode - rejecting request',
      );
    });

    it('throws RATE_LIMIT_REDIS_UNAVAILABLE_ERROR when Redis was previously marked unavailable and strictMode is true', async () => {
      const redisClient = createMockRedisClient();

      const logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      } as unknown as FastifyBaseLogger;

      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        strictMode: true,
        redisAvailable: false,
        redisRetryAtMs: Date.now() + 60_000,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      await expect(callStoreIncr(store, 'strict-test-2', 60_000, 5)).rejects.toThrow(
        'RATE_LIMIT_REDIS_UNAVAILABLE',
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('falls back to memory when strictMode is false and Redis is unavailable', async () => {
      const redisClient = createMockRedisClient({
        incrementRateLimitKey: vi
          .fn(async () => ({ current: 99, ttl: 60_000 }))
          .mockRejectedValueOnce(new Error('redis down')),
      });

      const logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      } as unknown as FastifyBaseLogger;

      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        strictMode: false,
        redisAvailable: true,
        redisRetryAtMs: 0,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      const first = await callStoreIncr(store, 'non-strict-test', 60_000, 5);
      expect(first.current).toBe(1);
      expect(state.redisAvailable).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('throws RATE_LIMIT_REDIS_UNAVAILABLE_ERROR when redisAvailable is false and strictMode is true', async () => {
      const redisClient = createMockRedisClient();

      const logger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      } as unknown as FastifyBaseLogger;

      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        strictMode: true,
        redisAvailable: false,
        redisRetryAtMs: Date.now() + 60_000,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      await expect(callStoreIncr(store, 'strict-retry-test', 60_000, 5)).rejects.toThrow(
        'RATE_LIMIT_REDIS_UNAVAILABLE',
      );
      expect(redisClient.connect).not.toHaveBeenCalled();
      expect(redisClient.incrementRateLimitKey).not.toHaveBeenCalled();
    });
  });

  describe('rateLimitErrorResponse 503 path', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '100',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 503 when Redis was recently unavailable', async () => {
      setLastRedisUnavailableErrorMsForTest(Date.now() - 1_000);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': TEST_TENANT_ID },
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: expect.stringContaining('Rate limiting service temporarily unavailable'),
        details: { retryAfterSeconds: expect.any(Number) },
      });
    });
  });

  describe('end-to-end strict mode behavior', () => {
    beforeEach(() => {
      setLastRedisUnavailableErrorMsForTest(0);
    });

    it('rejects requests with 503 when Redis unavailable and strict mode enabled via route', async () => {
      setLastRedisUnavailableErrorMsForTest(Date.now() - 1_000);

      const setTestTenantContext = async (request: FastifyRequest): Promise<void> => {
        const tenantId = request.headers['x-tenant-id'] as string | undefined;
        if (tenantId) {
          request.preAuthTenantContext = {
            tenantId,
            tenantSlug: 'test-tenant',
            source: 'header',
          };
        }
      };

      const testApp = await buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '100',
          RATE_LIMIT_WINDOW_MS: '60000',
          RATE_LIMIT_STRICT_MODE: 'true',
        }),
      );

      testApp.get(
        '/test/strict-endpoint',
        {
          config: {
            rateLimit: false,
          },
          preHandler: [
            setTestTenantContext,
            rateLimiter({
              max: 1,
              timeWindow: 60_000,
            }),
          ],
        },
        async () => ({ ok: true }),
      );

      await testApp.ready();

      const response = await testApp.inject({
        method: 'GET',
        url: '/test/strict-endpoint',
        headers: { 'x-tenant-id': TEST_TENANT_ID },
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: expect.stringContaining('Rate limiting service temporarily unavailable'),
        details: { retryAfterSeconds: expect.any(Number) },
      });

      await testApp.close();
    });
  });
});
