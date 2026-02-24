import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES, getDefaultTTL } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';

export interface ABACCachedEvaluation {
  permissions: string[];
  roles: string[];
  evaluatedAt: number;
  policyVersion: string;
}

export interface ABACCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const ABAC_CACHE_METRICS: ABACCacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getABACCacheMetrics = (): Readonly<ABACCacheMetrics> =>
  Object.freeze({ ...ABAC_CACHE_METRICS });

export const resetABACCacheMetrics = (): void => {
  ABAC_CACHE_METRICS.hits = 0;
  ABAC_CACHE_METRICS.misses = 0;
  ABAC_CACHE_METRICS.invalidations = 0;
  ABAC_CACHE_METRICS.errors = 0;
  ABAC_CACHE_METRICS.totalLatencyMs = 0;
};

const ABAC_POLICY_VERSION = '1.0';

export const buildABACCacheKey = (
  tenantId: string,
  userId: string,
  resource?: string,
  action?: string,
): string => {
  const resourceKey = resource && action ? `${resource}:${action}` : 'permissions';
  return tenantScopedKey(KEY_CATEGORIES.ABAC_POLICY, `${userId}:${resourceKey}`, tenantId, {
    ttlSeconds: 30,
  });
};

export const getABACCachedPermissions = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  redisClient?: RedisRateLimitClient,
): Promise<ABACCachedEvaluation | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    ABAC_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildABACCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      ABAC_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as ABACCachedEvaluation;
      const latency = performance.now() - startTime;
      ABAC_CACHE_METRICS.hits++;
      ABAC_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    ABAC_CACHE_METRICS.misses++;
    return null;
  } catch {
    ABAC_CACHE_METRICS.errors++;
    return null;
  }
};

export const setABACCachedPermissions = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  permissions: string[],
  roles: string[],
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildABACCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      ABAC_CACHE_METRICS.errors++;
      return;
    }

    const data: ABACCachedEvaluation = {
      permissions,
      roles,
      evaluatedAt: Date.now(),
      policyVersion: ABAC_POLICY_VERSION,
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(data), getDefaultTTL(KEY_CATEGORIES.ABAC_POLICY));
  } catch {
    ABAC_CACHE_METRICS.errors++;
  }
};

export const invalidateABACCache = async (
  config: AppConfig,
  tenantId: string,
  userId?: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();

    if (userId) {
      const key = buildABACCacheKey(tenantId, userId);

      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        ABAC_CACHE_METRICS.invalidations++;
      }
    } else {
      const pattern = buildABACCacheKey(tenantId, '*').replace(/\*$/, '*');
      const keys = await client.getKeys(pattern);

      for (const key of keys) {
        if (validateTenantKey(key, tenantId)) {
          await client.deleteKey(key);
          ABAC_CACHE_METRICS.invalidations++;
        }
      }
    }
  } catch {
    ABAC_CACHE_METRICS.errors++;
  }
};

export const invalidateABACCacheForRole = async (
  config: AppConfig,
  tenantId: string,
  _roleId: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();
    const pattern = buildABACCacheKey(tenantId, '*').replace(/\*$/, '*');
    const keys = await client.getKeys(pattern);

    for (const key of keys) {
      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        ABAC_CACHE_METRICS.invalidations++;
      }
    }
  } catch {
    ABAC_CACHE_METRICS.errors++;
  }
};

export const isABACCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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
