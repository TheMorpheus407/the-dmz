import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { createRateLimitStore, rateLimiter, type RateLimitStoreState } from '../rate-limiter.js';

import type { RedisRateLimitClient } from '../../database/redis.js';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

const createNonTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({
    ...baseEnv,
    NODE_ENV: 'development',
    ...overrides,
  });

const getHeader = (
  headers: Record<string, number | string | string[] | undefined>,
  name: string,
): string | undefined => {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0] !== undefined ? String(value[0]) : undefined;
  }

  if (value === undefined) {
    return undefined;
  }

  return String(value);
};

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

const createLoggerSpy = (): { logger: FastifyBaseLogger; warn: ReturnType<typeof vi.fn> } => {
  const warn = vi.fn();

  return {
    logger: {
      warn,
    } as unknown as FastifyBaseLogger,
    warn,
  };
};

describe('rate limiter middleware', () => {
  describe('global defaults', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '2',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('enforces global limits and emits required headers', async () => {
      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(first.statusCode).toBe(200);
      expect(getHeader(first.headers, 'x-ratelimit-limit')).toBe('2');
      expect(getHeader(first.headers, 'x-ratelimit-remaining')).toBe('1');
      const resetHeader = getHeader(first.headers, 'x-ratelimit-reset');
      expect(resetHeader).toBeDefined();
      expect(Number(resetHeader)).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000));

      const second = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(second.statusCode).toBe(200);
      expect(getHeader(second.headers, 'x-ratelimit-remaining')).toBe('0');

      const third = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(third.statusCode).toBe(429);
      expect(getHeader(third.headers, 'retry-after')).toBeDefined();
      expect(getHeader(third.headers, 'x-ratelimit-limit')).toBe('2');
      expect(getHeader(third.headers, 'x-ratelimit-remaining')).toBe('0');
      expect(getHeader(third.headers, 'x-ratelimit-reset')).toBeDefined();

      const payload = third.json() as {
        success: boolean;
        error: {
          code: string;
          message: string;
          details: { retryAfterSeconds: number };
          requestId: string;
        };
      };

      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(payload.error.message).toBe('Rate limit exceeded. Retry later.');
      expect(payload.error.details.retryAfterSeconds).toBeGreaterThan(0);
      expect(typeof payload.error.requestId).toBe('string');
    });

    it('includes rate limit headers for not-found responses', async () => {
      const isolatedApp = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '5',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await isolatedApp.ready();

      const response = await isolatedApp.inject({
        method: 'GET',
        url: '/missing-route',
      });

      expect(response.statusCode).toBe(404);
      expect(getHeader(response.headers, 'x-ratelimit-limit')).toBeDefined();
      expect(getHeader(response.headers, 'x-ratelimit-remaining')).toBeDefined();
      expect(getHeader(response.headers, 'x-ratelimit-reset')).toBeDefined();

      await isolatedApp.close();
    });

    it('counts missing-route traffic against the same global quota bucket', async () => {
      const isolatedApp = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '2',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );
      await isolatedApp.ready();

      const first = await isolatedApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });
      const second = await isolatedApp.inject({
        method: 'GET',
        url: '/missing-route',
      });
      const third = await isolatedApp.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(first.statusCode).toBe(200);
      expect(getHeader(first.headers, 'x-ratelimit-remaining')).toBe('1');
      expect(second.statusCode).toBe(404);
      expect(getHeader(second.headers, 'x-ratelimit-remaining')).toBe('0');
      expect(third.statusCode).toBe(429);
      expect(getHeader(third.headers, 'x-ratelimit-limit')).toBe('2');

      await isolatedApp.close();
    });

    it('falls back to in-memory limiting when REDIS_URL is malformed', async () => {
      const app = buildApp(
        createNonTestConfig({
          LOG_LEVEL: 'silent',
          REDIS_URL: 'not-a-url',
          RATE_LIMIT_MAX: '2',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
        { skipHealthCheck: true },
      );
      await app.ready();

      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });
      const second = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });
      const third = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(third.statusCode).toBe(429);

      await app.close();
    });
  });

  describe('health and readiness whitelist', () => {
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

    it('does not throttle /health', async () => {
      for (let index = 0; index < 5; index += 1) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
        });

        expect(response.statusCode).toBe(200);
        expect(getHeader(response.headers, 'x-ratelimit-limit')).toBeUndefined();
      }
    });

    it('does not throttle /ready', async () => {
      for (let index = 0; index < 5; index += 1) {
        const response = await app.inject({
          method: 'GET',
          url: '/ready',
        });

        expect(response.statusCode).toBe(503);
        expect(getHeader(response.headers, 'x-ratelimit-limit')).toBeUndefined();
      }
    });
  });

  describe('per-route override utility', () => {
    const buildOverrideApp = async (): Promise<FastifyInstance> => {
      const app = buildApp(
        createTestConfig({
          RATE_LIMIT_MAX: '100',
          RATE_LIMIT_WINDOW_MS: '60000',
        }),
      );

      app.get(
        '/test/strict',
        {
          config: {
            rateLimit: false,
          },
          preHandler: [
            rateLimiter({
              max: 1,
              timeWindow: 60_000,
            }),
          ],
        },
        async () => ({ ok: true }),
      );

      app.get(
        '/test/read',
        {
          config: {
            rateLimit: false,
          },
          preHandler: [
            rateLimiter({
              max: 3,
              timeWindow: 60_000,
            }),
          ],
        },
        async () => ({ ok: true }),
      );

      await app.ready();

      return app;
    };

    it('applies a stricter route-specific limit', async () => {
      const app = await buildOverrideApp();

      const first = await app.inject({
        method: 'GET',
        url: '/test/strict',
      });
      const second = await app.inject({
        method: 'GET',
        url: '/test/strict',
      });

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(429);
      expect(getHeader(second.headers, 'x-ratelimit-limit')).toBe('1');

      await app.close();
    });

    it('applies a more generous route-specific limit', async () => {
      const app = await buildOverrideApp();

      const first = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const second = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const third = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const fourth = await app.inject({
        method: 'GET',
        url: '/test/read',
      });

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(third.statusCode).toBe(200);
      expect(fourth.statusCode).toBe(429);
      expect(getHeader(fourth.headers, 'x-ratelimit-limit')).toBe('3');

      await app.close();
    });

    it('keeps route-specific buckets isolated across endpoints', async () => {
      const app = await buildOverrideApp();

      const strict = await app.inject({
        method: 'GET',
        url: '/test/strict',
      });

      const readFirst = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const readSecond = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const readThird = await app.inject({
        method: 'GET',
        url: '/test/read',
      });
      const readFourth = await app.inject({
        method: 'GET',
        url: '/test/read',
      });

      expect(strict.statusCode).toBe(200);
      expect(getHeader(strict.headers, 'x-ratelimit-remaining')).toBe('0');
      expect(readFirst.statusCode).toBe(200);
      expect(getHeader(readFirst.headers, 'x-ratelimit-remaining')).toBe('2');
      expect(readSecond.statusCode).toBe(200);
      expect(getHeader(readSecond.headers, 'x-ratelimit-remaining')).toBe('1');
      expect(readThird.statusCode).toBe(200);
      expect(getHeader(readThird.headers, 'x-ratelimit-remaining')).toBe('0');
      expect(readFourth.statusCode).toBe(429);
      expect(getHeader(readFourth.headers, 'x-ratelimit-limit')).toBe('3');

      await app.close();
    });
  });

  describe('store behavior', () => {
    it('uses Redis increments when Redis is available', async () => {
      const connect = vi.fn(async () => undefined);
      const incrementRateLimitKey = vi.fn(async () => ({ current: 1, ttl: 60_000 }));

      const redisClient = {
        status: 'ready',
        connect,
        ping: vi.fn(async () => 'PONG'),
        incrementRateLimitKey,
        quit: vi.fn(async () => undefined),
        disconnect: vi.fn(),
      } satisfies RedisRateLimitClient;

      const { logger, warn } = createLoggerSpy();
      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        redisAvailable: true,
        redisRetryAtMs: 0,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      const result = await callStoreIncr(store, '1.1.1.1');

      expect(result.current).toBe(1);
      expect(result.ttl).toBe(60_000);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(incrementRateLimitKey).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
      expect(state.redisAvailable).toBe(true);
    });

    it('falls back to memory and logs once when Redis errors', async () => {
      const connect = vi.fn(async () => undefined);
      const incrementRateLimitKey = vi
        .fn(async () => ({ current: 99, ttl: 60_000 }))
        .mockRejectedValueOnce(new Error('redis down'));

      const redisClient = {
        status: 'ready',
        connect,
        ping: vi.fn(async () => 'PONG'),
        incrementRateLimitKey,
        quit: vi.fn(async () => undefined),
        disconnect: vi.fn(),
      } satisfies RedisRateLimitClient;

      const { logger, warn } = createLoggerSpy();
      const state: RateLimitStoreState = {
        logger,
        redis: redisClient,
        memoryBuckets: new Map(),
        redisAvailable: true,
        redisRetryAtMs: 0,
        redisFallbackWarningLogged: false,
      };

      const Store = createRateLimitStore(state);
      const store = new Store({});

      const first = await callStoreIncr(store, '2.2.2.2', 60_000, 5);
      const second = await callStoreIncr(store, '2.2.2.2', 60_000, 5);

      expect(first.current).toBe(1);
      expect(second.current).toBe(2);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(incrementRateLimitKey).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(state.redisAvailable).toBe(false);
    });

    it('retries Redis after cooldown and recovers distributed limiting', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-08T00:00:00.000Z'));

      try {
        const connect = vi.fn(async () => undefined);
        const incrementRateLimitKey = vi
          .fn(async () => ({ current: 99, ttl: 60_000 }))
          .mockRejectedValueOnce(new Error('redis down'))
          .mockResolvedValueOnce({ current: 10, ttl: 60_000 });

        const redisClient = {
          status: 'ready',
          connect,
          ping: vi.fn(async () => 'PONG'),
          incrementRateLimitKey,
          quit: vi.fn(async () => undefined),
          disconnect: vi.fn(),
        } satisfies RedisRateLimitClient;

        const { logger, warn } = createLoggerSpy();
        const state: RateLimitStoreState = {
          logger,
          redis: redisClient,
          memoryBuckets: new Map(),
          redisAvailable: true,
          redisRetryAtMs: 0,
          redisFallbackWarningLogged: false,
        };

        const Store = createRateLimitStore(state);
        const store = new Store({});

        const first = await callStoreIncr(store, '3.3.3.3', 60_000, 5);
        expect(first.current).toBe(1);
        expect(state.redisAvailable).toBe(false);
        expect(incrementRateLimitKey).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);

        vi.setSystemTime(new Date('2026-02-08T00:00:02.000Z'));
        const second = await callStoreIncr(store, '3.3.3.3', 60_000, 5);
        expect(second.current).toBe(2);
        expect(incrementRateLimitKey).toHaveBeenCalledTimes(1);
        expect(state.redisAvailable).toBe(false);

        vi.setSystemTime(new Date('2026-02-08T00:00:06.000Z'));
        const third = await callStoreIncr(store, '3.3.3.3', 60_000, 5);
        expect(third.current).toBe(10);
        expect(incrementRateLimitKey).toHaveBeenCalledTimes(2);
        expect(state.redisAvailable).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
