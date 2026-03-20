import { eq, and, isNull } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient, type RedisRateLimitClient } from '../../shared/database/redis.js';
import {
  rateLimitConfig,
  DEFAULT_RATE_LIMITS,
  type RateLimitAction,
  type RateLimitConfig,
} from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  retryAfterMs?: number;
}

const RATE_LIMIT_KEY_PREFIX = 'mod-ratelimit';

function getRateLimitKey(tenantId: string, playerId: string, action: RateLimitAction): string {
  return `${RATE_LIMIT_KEY_PREFIX}:${tenantId}:${playerId}:${action}`;
}

async function getConfiguredLimit(
  config: AppConfig,
  tenantId: string,
  action: RateLimitAction,
): Promise<{ windowSeconds: number; maxCount: number }> {
  const db = getDatabaseClient(config);

  const tenantLimit = await db.query.rateLimitConfig.findFirst({
    where: and(eq(rateLimitConfig.tenantId, tenantId), eq(rateLimitConfig.action, action)),
  });

  if (tenantLimit) {
    return {
      windowSeconds: parseInt(tenantLimit.windowSeconds, 10),
      maxCount: parseInt(tenantLimit.maxCount, 10),
    };
  }

  const globalLimit = await db.query.rateLimitConfig.findFirst({
    where: and(isNull(rateLimitConfig.tenantId), eq(rateLimitConfig.action, action)),
  });

  if (globalLimit) {
    return {
      windowSeconds: parseInt(globalLimit.windowSeconds, 10),
      maxCount: parseInt(globalLimit.maxCount, 10),
    };
  }

  return DEFAULT_RATE_LIMITS[action];
}

export async function checkRateLimit(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  action: RateLimitAction,
  redisClient?: RedisRateLimitClient,
): Promise<RateLimitResult> {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return {
      allowed: true,
      current: 0,
      limit: DEFAULT_RATE_LIMITS[action].maxCount,
    };
  }

  const { windowSeconds, maxCount } = await getConfiguredLimit(config, tenantId, action);

  const key = getRateLimitKey(tenantId, playerId, action);

  try {
    const result = await client.incrementRateLimitKey({
      key,
      timeWindowMs: windowSeconds * 1000,
      max: maxCount,
      continueExceeding: false,
      exponentialBackoff: false,
    });

    if (result.current > maxCount) {
      return {
        allowed: false,
        current: result.current,
        limit: maxCount,
        retryAfterMs: result.ttl,
      };
    }

    return {
      allowed: true,
      current: result.current,
      limit: maxCount,
    };
  } catch {
    return {
      allowed: true,
      current: 0,
      limit: maxCount,
    };
  }
}

export async function getRateLimitStatus(
  config: AppConfig,
  tenantId: string,
  _playerId: string,
  action: RateLimitAction,
): Promise<{ current: number; limit: number; remaining: number }> {
  const { maxCount } = await getConfiguredLimit(config, tenantId, action);

  return {
    current: 0,
    limit: maxCount,
    remaining: maxCount,
  };
}

export async function setRateLimitConfig(
  config: AppConfig,
  tenantId: string | null,
  action: RateLimitAction,
  windowSeconds: number,
  maxCount: number,
): Promise<RateLimitConfig> {
  const db = getDatabaseClient(config);

  const [result] = await db
    .insert(rateLimitConfig)
    .values({
      tenantId: tenantId ?? null,
      action,
      windowSeconds: String(windowSeconds),
      maxCount: String(maxCount),
    })
    .onConflictDoUpdate({
      target: [rateLimitConfig.tenantId, rateLimitConfig.action],
      set: {
        windowSeconds: String(windowSeconds),
        maxCount: String(maxCount),
      },
    })
    .returning();

  return result!;
}

export async function getRateLimitConfigs(
  config: AppConfig,
  tenantId: string | null,
): Promise<RateLimitConfig[]> {
  const db = getDatabaseClient(config);

  if (tenantId === null) {
    return db.query.rateLimitConfig.findMany({
      where: isNull(rateLimitConfig.tenantId),
    });
  }

  return db.query.rateLimitConfig.findMany({
    where: eq(rateLimitConfig.tenantId, tenantId),
  });
}
