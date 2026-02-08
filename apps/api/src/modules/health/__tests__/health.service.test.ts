import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkDatabaseHealthMock, checkRedisHealthMock } = vi.hoisted(() => ({
  checkDatabaseHealthMock: vi.fn(),
  checkRedisHealthMock: vi.fn(),
}));

vi.mock('../../../shared/database/connection.js', () => ({
  checkDatabaseHealth: checkDatabaseHealthMock,
}));

vi.mock('../../../shared/database/redis.js', () => ({
  checkRedisHealth: checkRedisHealthMock,
}));

import { loadConfig, type AppConfig } from '../../../config.js';
import { getHealth, getReadiness } from '../health.service.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('health service', () => {
  beforeEach(() => {
    checkDatabaseHealthMock.mockReset();
    checkRedisHealthMock.mockReset();
  });

  it('returns ok for getHealth', () => {
    expect(getHealth()).toEqual({ status: 'ok' });
  });

  it('passes the provided config to both dependency health checks', async () => {
    const config = createTestConfig({
      REDIS_URL: 'redis://127.0.0.1:6399',
    });

    checkDatabaseHealthMock.mockResolvedValueOnce({
      ok: true,
      message: 'Database connection ok',
    });
    checkRedisHealthMock.mockResolvedValueOnce({
      ok: false,
      message: 'Redis connection failed',
    });

    const readiness = await getReadiness(config);

    expect(checkDatabaseHealthMock).toHaveBeenCalledTimes(1);
    expect(checkDatabaseHealthMock).toHaveBeenCalledWith(config);
    expect(checkRedisHealthMock).toHaveBeenCalledTimes(1);
    expect(checkRedisHealthMock).toHaveBeenCalledWith(config);
    expect(readiness).toEqual({
      status: 'degraded',
      checks: {
        database: {
          ok: true,
          message: 'Database connection ok',
        },
        redis: {
          ok: false,
          message: 'Redis connection failed',
        },
      },
    });
  });
});
