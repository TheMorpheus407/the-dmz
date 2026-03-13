import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES, getDefaultTTL } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';

export interface CachedGameState {
  sessionId: string;
  tenantId: string;
  userId: string;
  day: number;
  funds: number;
  clientCount: number;
  threatLevel: string;
  facilityLoadout: {
    defenseLevel: number;
    serverLevel: number;
    networkLevel: number;
  };
  version: number;
  cachedAt: number;
}

export interface GameStateCacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const GAME_STATE_CACHE_METRICS: GameStateCacheMetrics = {
  hits: 0,
  misses: 0,
  writes: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getGameStateCacheMetrics = (): Readonly<GameStateCacheMetrics> =>
  Object.freeze({ ...GAME_STATE_CACHE_METRICS });

export const resetGameStateCacheMetrics = (): void => {
  GAME_STATE_CACHE_METRICS.hits = 0;
  GAME_STATE_CACHE_METRICS.misses = 0;
  GAME_STATE_CACHE_METRICS.writes = 0;
  GAME_STATE_CACHE_METRICS.invalidations = 0;
  GAME_STATE_CACHE_METRICS.errors = 0;
  GAME_STATE_CACHE_METRICS.totalLatencyMs = 0;
};

const GAME_STATE_VERSION = 1;

export const buildGameStateCacheKey = (
  tenantId: string,
  userId: string,
  sessionId: string,
): string => {
  return tenantScopedKey(
    KEY_CATEGORIES.GAME_STATE,
    `session:${sessionId}:user:${userId}`,
    tenantId,
    {
      ttlSeconds: getDefaultTTL(KEY_CATEGORIES.GAME_STATE),
    },
  );
};

export const getCachedGameState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  sessionId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedGameState | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    GAME_STATE_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildGameStateCacheKey(tenantId, userId, sessionId);

    if (!validateTenantKey(key, tenantId)) {
      GAME_STATE_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedGameState;
      const latency = performance.now() - startTime;
      GAME_STATE_CACHE_METRICS.hits++;
      GAME_STATE_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    GAME_STATE_CACHE_METRICS.misses++;
    return null;
  } catch {
    GAME_STATE_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedGameState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  sessionId: string,
  state: Omit<CachedGameState, 'version' | 'cachedAt'>,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildGameStateCacheKey(tenantId, userId, sessionId);

    if (!validateTenantKey(key, tenantId)) {
      GAME_STATE_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedGameState = {
      ...state,
      version: GAME_STATE_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(
      key,
      JSON.stringify(cachedData),
      getDefaultTTL(KEY_CATEGORIES.GAME_STATE),
    );
    GAME_STATE_CACHE_METRICS.writes++;
  } catch {
    GAME_STATE_CACHE_METRICS.errors++;
  }
};

export const deleteCachedGameState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  sessionId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildGameStateCacheKey(tenantId, userId, sessionId);

    if (validateTenantKey(key, tenantId)) {
      await client.connect();
      await client.deleteKey(key);
      GAME_STATE_CACHE_METRICS.invalidations++;
    }
  } catch {
    GAME_STATE_CACHE_METRICS.errors++;
  }
};

export const invalidateUserGameState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const pattern = tenantScopedKey(
      KEY_CATEGORIES.GAME_STATE,
      `session:*:user:${userId}`,
      tenantId,
      {
        ttlSeconds: 0,
      },
    );
    const keys = await client.getKeys(pattern.replace(/session:\*:user:/, 'session:*:user:'));

    for (const key of keys) {
      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        GAME_STATE_CACHE_METRICS.invalidations++;
      }
    }
  } catch {
    GAME_STATE_CACHE_METRICS.errors++;
  }
};

export const invalidateTenantGameState = async (
  config: AppConfig,
  tenantId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const pattern = tenantScopedKey(KEY_CATEGORIES.GAME_STATE, '*', tenantId, {
      ttlSeconds: 0,
    });
    const keys = await client.getKeys(pattern);

    for (const key of keys) {
      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        GAME_STATE_CACHE_METRICS.invalidations++;
      }
    }
  } catch {
    GAME_STATE_CACHE_METRICS.errors++;
  }
};

export const isGameStateCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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

export const getOrFetchGameState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  sessionId: string,
  fetchFromDb: () => Promise<CachedGameState | null>,
  redisClient?: RedisRateLimitClient,
): Promise<CachedGameState | null> => {
  const cached = await getCachedGameState(config, tenantId, userId, sessionId, redisClient);

  if (cached) {
    return cached;
  }

  const dbState = await fetchFromDb();

  if (dbState) {
    await setCachedGameState(config, tenantId, userId, sessionId, dbState, redisClient);
  }

  return dbState;
};
