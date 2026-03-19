import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';
import type { RelationshipType, RelationshipStatus } from '../../db/schema/social/index.js';

export interface CachedRelationship {
  relationshipType: RelationshipType;
  status: RelationshipStatus;
  updatedAt: number;
}

export interface CachedRelationshipState {
  relationships: Record<string, CachedRelationship>;
  version: string;
  cachedAt: number;
}

export interface RelationshipCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const RELATIONSHIP_CACHE_VERSION = '1.0';
const RELATIONSHIP_CACHE_TTL = 300;

const RELATIONSHIP_CACHE_METRICS: RelationshipCacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getRelationshipCacheMetrics = (): Readonly<RelationshipCacheMetrics> =>
  Object.freeze({ ...RELATIONSHIP_CACHE_METRICS });

export const resetRelationshipCacheMetrics = (): void => {
  RELATIONSHIP_CACHE_METRICS.hits = 0;
  RELATIONSHIP_CACHE_METRICS.misses = 0;
  RELATIONSHIP_CACHE_METRICS.invalidations = 0;
  RELATIONSHIP_CACHE_METRICS.errors = 0;
  RELATIONSHIP_CACHE_METRICS.totalLatencyMs = 0;
};

export const buildRelationshipCacheKey = (tenantId: string, playerId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.CACHE, `relationships:${playerId}`, tenantId, {
    ttlSeconds: RELATIONSHIP_CACHE_TTL,
  });
};

export const getCachedRelationships = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedRelationshipState | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    RELATIONSHIP_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildRelationshipCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      RELATIONSHIP_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedRelationshipState;
      const latency = performance.now() - startTime;
      RELATIONSHIP_CACHE_METRICS.hits++;
      RELATIONSHIP_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    RELATIONSHIP_CACHE_METRICS.misses++;
    return null;
  } catch {
    RELATIONSHIP_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedRelationships = async (
  config: AppConfig,
  tenantId: string,
  playerId: string,
  relationships: Record<string, CachedRelationship>,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildRelationshipCacheKey(tenantId, playerId);

    if (!validateTenantKey(key, tenantId)) {
      RELATIONSHIP_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedRelationshipState = {
      relationships,
      version: RELATIONSHIP_CACHE_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), RELATIONSHIP_CACHE_TTL);
  } catch {
    RELATIONSHIP_CACHE_METRICS.errors++;
  }
};

export const invalidateRelationshipCache = async (
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
    const key = buildRelationshipCacheKey(tenantId, playerId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      RELATIONSHIP_CACHE_METRICS.invalidations++;
    }
  } catch {
    RELATIONSHIP_CACHE_METRICS.errors++;
  }
};

export const invalidateBothPlayersRelationshipCache = async (
  config: AppConfig,
  tenantId: string,
  playerId1: string,
  playerId2: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  await invalidateRelationshipCache(config, tenantId, playerId1, redisClient);
  await invalidateRelationshipCache(config, tenantId, playerId2, redisClient);
};

export const isRelationshipCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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
