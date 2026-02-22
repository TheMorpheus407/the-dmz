import { sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../shared/database/connection.js';
import type { RedisRateLimitClient } from '../../shared/database/redis.js';

export type HealthResponse = {
  status: 'ok';
};

export type ReadinessResponse = {
  status: 'ok' | 'degraded';
  checks: {
    database: { ok: boolean; message: string };
    redis: { ok: boolean; message: string };
  };
};

export const getHealth = (): HealthResponse => ({ status: 'ok' });

export const getReadiness = async (
  db: DatabaseClient | null,
  redis: RedisRateLimitClient | null,
): Promise<ReadinessResponse> => {
  const database = await checkDatabaseHealth(db);
  const redisHealth = await checkRedisHealth(redis);
  const status = database.ok && redisHealth.ok ? 'ok' : 'degraded';

  return {
    status,
    checks: {
      database,
      redis: redisHealth,
    },
  };
};

async function checkDatabaseHealth(
  db: DatabaseClient | null,
): Promise<{ ok: boolean; message: string }> {
  if (!db) {
    return { ok: false, message: 'Database not initialized' };
  }

  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, message: 'Database connection ok' };
  } catch {
    return { ok: false, message: 'Database connection failed' };
  }
}

async function checkRedisHealth(
  redis: RedisRateLimitClient | null,
): Promise<{ ok: boolean; message: string }> {
  if (!redis) {
    return { ok: false, message: 'Redis not available (degraded mode)' };
  }

  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      return { ok: false, message: 'Redis ping failed' };
    }
    return { ok: true, message: 'Redis connection ok' };
  } catch (error) {
    return {
      ok: false,
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
