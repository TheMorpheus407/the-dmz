import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';

export interface CachedPlayerProfile {
  profile: Record<string, unknown>;
  version: string;
  cachedAt: number;
}

export interface PlayerProfileCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const PROFILE_CACHE_VERSION = '1.0';
const PROFILE_CACHE_TTL = 300;

const PLAYER_PROFILE_CACHE_METRICS: PlayerProfileCacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getPlayerProfileCacheMetrics = (): Readonly<PlayerProfileCacheMetrics> =>
  Object.freeze({ ...PLAYER_PROFILE_CACHE_METRICS });

export const resetPlayerProfileCacheMetrics = (): void => {
  PLAYER_PROFILE_CACHE_METRICS.hits = 0;
  PLAYER_PROFILE_CACHE_METRICS.misses = 0;
  PLAYER_PROFILE_CACHE_METRICS.invalidations = 0;
  PLAYER_PROFILE_CACHE_METRICS.errors = 0;
  PLAYER_PROFILE_CACHE_METRICS.totalLatencyMs = 0;
};

export const buildPlayerProfileCacheKey = (tenantId: string, playerId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.CACHE, `profile:${playerId}`, tenantId, {
    ttlSeconds: PROFILE_CACHE_TTL,
  });
};

export const getCachedPlayerProfile = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedPlayerProfile | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    PLAYER_PROFILE_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildPlayerProfileCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      PLAYER_PROFILE_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedPlayerProfile;
      const latency = performance.now() - startTime;
      PLAYER_PROFILE_CACHE_METRICS.hits++;
      PLAYER_PROFILE_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    PLAYER_PROFILE_CACHE_METRICS.misses++;
    return null;
  } catch {
    PLAYER_PROFILE_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedPlayerProfile = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  profile: Record<string, unknown>,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildPlayerProfileCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      PLAYER_PROFILE_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedPlayerProfile = {
      profile,
      version: PROFILE_CACHE_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), PROFILE_CACHE_TTL);
  } catch {
    PLAYER_PROFILE_CACHE_METRICS.errors++;
  }
};

export const invalidatePlayerProfileCache = async (
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
    const key = buildPlayerProfileCacheKey(tenantId, playerId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      PLAYER_PROFILE_CACHE_METRICS.invalidations++;
    }
  } catch {
    PLAYER_PROFILE_CACHE_METRICS.errors++;
  }
};

export const isPlayerProfileCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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
