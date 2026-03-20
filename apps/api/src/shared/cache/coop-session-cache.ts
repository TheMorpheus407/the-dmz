import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';
import type { CoopSessionStatus, CoopRole } from '../../db/schema/multiplayer/index.js';

export interface CachedCoopRoleAssignment {
  assignmentId: string;
  playerId: string;
  role: CoopRole;
  isAuthority: boolean;
}

export interface CachedCoopSession {
  sessionId: string;
  tenantId: string;
  partyId: string;
  seed: string;
  status: CoopSessionStatus;
  authorityPlayerId: string | null;
  dayNumber: number;
  roles: CachedCoopRoleAssignment[];
  updatedAt: number;
}

export interface CoopSessionCacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletions: number;
  errors: number;
  totalLatencyMs: number;
}

const COOP_SESSION_CACHE_TTL = 300;

const COOP_SESSION_CACHE_METRICS: CoopSessionCacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletions: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getCoopSessionCacheMetrics = (): Readonly<CoopSessionCacheMetrics> =>
  Object.freeze({ ...COOP_SESSION_CACHE_METRICS });

export const resetCoopSessionCacheMetrics = (): void => {
  COOP_SESSION_CACHE_METRICS.hits = 0;
  COOP_SESSION_CACHE_METRICS.misses = 0;
  COOP_SESSION_CACHE_METRICS.sets = 0;
  COOP_SESSION_CACHE_METRICS.deletions = 0;
  COOP_SESSION_CACHE_METRICS.errors = 0;
  COOP_SESSION_CACHE_METRICS.totalLatencyMs = 0;
};

export const buildCoopSessionCacheKey = (tenantId: string, sessionId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.COOP_SESSION, `session:${sessionId}`, tenantId, {
    ttlSeconds: COOP_SESSION_CACHE_TTL,
  });
};

export const getCachedCoopSession = async (
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedCoopSession | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    COOP_SESSION_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildCoopSessionCacheKey(tenantId, sessionId);

    if (!validateTenantKey(key, tenantId)) {
      COOP_SESSION_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedCoopSession;
      const latency = performance.now() - startTime;
      COOP_SESSION_CACHE_METRICS.hits++;
      COOP_SESSION_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    COOP_SESSION_CACHE_METRICS.misses++;
    return null;
  } catch {
    COOP_SESSION_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedCoopSession = async (
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  session: CachedCoopSession,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildCoopSessionCacheKey(tenantId, sessionId);

    if (!validateTenantKey(key, tenantId)) {
      COOP_SESSION_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedCoopSession = {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      partyId: session.partyId,
      seed: session.seed,
      status: session.status,
      authorityPlayerId: session.authorityPlayerId,
      dayNumber: session.dayNumber,
      roles: session.roles,
      updatedAt: session.updatedAt,
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), COOP_SESSION_CACHE_TTL);
    COOP_SESSION_CACHE_METRICS.sets++;
  } catch {
    COOP_SESSION_CACHE_METRICS.errors++;
  }
};

export const deleteCachedCoopSession = async (
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const key = buildCoopSessionCacheKey(tenantId, sessionId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      COOP_SESSION_CACHE_METRICS.deletions++;
    }
  } catch {
    COOP_SESSION_CACHE_METRICS.errors++;
  }
};

export const isCoopSessionCacheHealthy = async (config: AppConfig): Promise<boolean> => {
  const client = getRedisClient(config);
  if (!client) {
    return false;
  }

  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  }
};
