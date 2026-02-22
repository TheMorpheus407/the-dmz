import { describe, expect, it, vi } from 'vitest';

import { getHealth, getReadiness } from '../health.service.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { RedisRateLimitClient } from '../../../shared/database/redis.js';

describe('health service', () => {
  it('returns ok for getHealth', () => {
    expect(getHealth()).toEqual({ status: 'ok' });
  });

  it('returns degraded status when database is not initialized', async () => {
    const db = null;
    const redis = null;

    const readiness = await getReadiness(db, redis);

    expect(readiness.status).toBe('degraded');
    expect(readiness.checks.database).toEqual({
      ok: false,
      message: 'Database not initialized',
    });
    expect(readiness.checks.redis).toEqual({
      ok: false,
      message: 'Redis not available (degraded mode)',
    });
  });

  it('returns ok status when both dependencies are available', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseClient;
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    } as unknown as RedisRateLimitClient;

    const readiness = await getReadiness(mockDb, mockRedis);

    expect(readiness.status).toBe('ok');
    expect(readiness.checks.database).toEqual({
      ok: true,
      message: 'Database connection ok',
    });
    expect(readiness.checks.redis).toEqual({
      ok: true,
      message: 'Redis connection ok',
    });
  });

  it('returns degraded status when redis is unavailable', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseClient;
    const redis = null;

    const readiness = await getReadiness(mockDb, redis);

    expect(readiness.status).toBe('degraded');
    expect(readiness.checks.database).toEqual({
      ok: true,
      message: 'Database connection ok',
    });
    expect(readiness.checks.redis).toEqual({
      ok: false,
      message: 'Redis not available (degraded mode)',
    });
  });

  it('returns degraded status when database check fails', async () => {
    const mockDb = {
      execute: vi.fn().mockRejectedValue(new Error('Connection failed')),
    } as unknown as DatabaseClient;
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    } as unknown as RedisRateLimitClient;

    const readiness = await getReadiness(mockDb, mockRedis);

    expect(readiness.status).toBe('degraded');
    expect(readiness.checks.database.ok).toBe(false);
    expect(readiness.checks.redis).toEqual({
      ok: true,
      message: 'Redis connection ok',
    });
  });
});
