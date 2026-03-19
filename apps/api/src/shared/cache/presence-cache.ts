import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';
import type { PresenceStatus } from '../../db/schema/social/index.js';

export interface CachedPresence {
  status: PresenceStatus;
  statusData: Record<string, unknown>;
  lastHeartbeat: number;
  tenantId: string;
}

export interface PresenceCacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletions: number;
  errors: number;
  totalLatencyMs: number;
}

const PRESENCE_CACHE_TTL = 90;

const PRESENCE_CACHE_METRICS: PresenceCacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletions: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getPresenceCacheMetrics = (): Readonly<PresenceCacheMetrics> =>
  Object.freeze({ ...PRESENCE_CACHE_METRICS });

export const resetPresenceCacheMetrics = (): void => {
  PRESENCE_CACHE_METRICS.hits = 0;
  PRESENCE_CACHE_METRICS.misses = 0;
  PRESENCE_CACHE_METRICS.sets = 0;
  PRESENCE_CACHE_METRICS.deletions = 0;
  PRESENCE_CACHE_METRICS.errors = 0;
  PRESENCE_CACHE_METRICS.totalLatencyMs = 0;
};

export const buildPresenceCacheKey = (tenantId: string, playerId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.PRESENCE, `presence:${playerId}`, tenantId, {
    ttlSeconds: PRESENCE_CACHE_TTL,
  });
};

export const getCachedPresence = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedPresence | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    PRESENCE_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildPresenceCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      PRESENCE_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedPresence;
      const latency = performance.now() - startTime;
      PRESENCE_CACHE_METRICS.hits++;
      PRESENCE_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    PRESENCE_CACHE_METRICS.misses++;
    return null;
  } catch {
    PRESENCE_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedPresence = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  presence: Omit<CachedPresence, 'tenantId'> & { tenantId?: string },
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildPresenceCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      PRESENCE_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedPresence = {
      status: presence.status,
      statusData: presence.statusData,
      lastHeartbeat: presence.lastHeartbeat,
      tenantId: presence.tenantId ?? tenantId,
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), PRESENCE_CACHE_TTL);
    PRESENCE_CACHE_METRICS.sets++;
  } catch {
    PRESENCE_CACHE_METRICS.errors++;
  }
};

export const deleteCachedPresence = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const key = buildPresenceCacheKey(tenantId, playerId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      PRESENCE_CACHE_METRICS.deletions++;
    }
  } catch {
    PRESENCE_CACHE_METRICS.errors++;
  }
};

export const refreshPresenceTTL = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<boolean> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return false;
  }

  try {
    const key = buildPresenceCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      PRESENCE_CACHE_METRICS.errors++;
      return false;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      await client.setValue(key, cached, PRESENCE_CACHE_TTL);
      return true;
    }

    return false;
  } catch {
    PRESENCE_CACHE_METRICS.errors++;
    return false;
  }
};

export const isPresenceCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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
