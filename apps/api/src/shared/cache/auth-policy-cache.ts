import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES, getDefaultTTL } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';

export interface CachedAuthPolicy {
  policy: Record<string, unknown>;
  version: string;
  cachedAt: number;
}

export interface CachedUserPermissions {
  permissions: string[];
  roles: string[];
  version: string;
  cachedAt: number;
}

export interface CachedFeatureFlags {
  flags: Record<string, boolean>;
  version: string;
  cachedAt: number;
}

export interface AuthPolicyCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const AUTH_POLICY_CACHE_METRICS: AuthPolicyCacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getAuthPolicyCacheMetrics = (): Readonly<AuthPolicyCacheMetrics> =>
  Object.freeze({ ...AUTH_POLICY_CACHE_METRICS });

export const resetAuthPolicyCacheMetrics = (): void => {
  AUTH_POLICY_CACHE_METRICS.hits = 0;
  AUTH_POLICY_CACHE_METRICS.misses = 0;
  AUTH_POLICY_CACHE_METRICS.invalidations = 0;
  AUTH_POLICY_CACHE_METRICS.errors = 0;
  AUTH_POLICY_CACHE_METRICS.totalLatencyMs = 0;
};

const AUTH_POLICY_VERSION = '1.0';
const PERMISSIONS_VERSION = '1.0';
const FEATURE_FLAGS_VERSION = '1.0';

export const buildTenantPolicyCacheKey = (tenantId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.AUTH_POLICY, 'tenant-policy', tenantId, {
    ttlSeconds: 300,
  });
};

export const buildUserPermissionsCacheKey = (tenantId: string, userId: string): string => {
  return tenantScopedKey(KEY_CATEGORIES.AUTH_POLICY, `user:${userId}:perms`, tenantId, {
    ttlSeconds: 30,
  });
};

export const buildFeatureFlagsCacheKey = (tenantId: string, userId?: string): string => {
  const resource = userId ? `user:${userId}:flags` : 'tenant-flags';
  return tenantScopedKey(KEY_CATEGORIES.AUTH_POLICY, resource, tenantId, {
    ttlSeconds: 300,
  });
};

export const getCachedTenantPolicy = async (
  config: AppConfig,
  tenantId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedAuthPolicy | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildTenantPolicyCacheKey(tenantId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedAuthPolicy;
      const latency = performance.now() - startTime;
      AUTH_POLICY_CACHE_METRICS.hits++;
      AUTH_POLICY_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedTenantPolicy = async (
  config: AppConfig,
  tenantId: string,
  policy: Record<string, unknown>,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildTenantPolicyCacheKey(tenantId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedAuthPolicy = {
      policy,
      version: AUTH_POLICY_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(
      key,
      JSON.stringify(cachedData),
      getDefaultTTL(KEY_CATEGORIES.AUTH_POLICY),
    );
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const getCachedUserPermissions = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedUserPermissions | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildUserPermissionsCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedUserPermissions;
      const latency = performance.now() - startTime;
      AUTH_POLICY_CACHE_METRICS.hits++;
      AUTH_POLICY_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedUserPermissions = async (
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
    const key = buildUserPermissionsCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedUserPermissions = {
      permissions,
      roles,
      version: PERMISSIONS_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), 30);
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const getCachedFeatureFlags = async (
  config: AppConfig,
  tenantId: string,
  userId?: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedFeatureFlags | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildFeatureFlagsCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedFeatureFlags;
      const latency = performance.now() - startTime;
      AUTH_POLICY_CACHE_METRICS.hits++;
      AUTH_POLICY_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    AUTH_POLICY_CACHE_METRICS.misses++;
    return null;
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedFeatureFlags = async (
  config: AppConfig,
  tenantId: string,
  flags: Record<string, boolean>,
  userId?: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildFeatureFlagsCacheKey(tenantId, userId);

    if (!validateTenantKey(key, tenantId)) {
      AUTH_POLICY_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedFeatureFlags = {
      flags,
      version: FEATURE_FLAGS_VERSION,
      cachedAt: Date.now(),
    };

    await client.connect();
    await client.setValue(
      key,
      JSON.stringify(cachedData),
      getDefaultTTL(KEY_CATEGORIES.AUTH_POLICY),
    );
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const invalidateTenantPolicyCache = async (
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
    const key = buildTenantPolicyCacheKey(tenantId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      AUTH_POLICY_CACHE_METRICS.invalidations++;
    }
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const invalidateUserPermissionsCache = async (
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
    const key = buildUserPermissionsCacheKey(tenantId, userId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      AUTH_POLICY_CACHE_METRICS.invalidations++;
    }
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const invalidateAllUserPermissionsCache = async (
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
    const pattern = tenantScopedKey(KEY_CATEGORIES.AUTH_POLICY, 'user:*:perms', tenantId, {
      ttlSeconds: 0,
    });
    const keys = await client.getKeys(pattern.replace(/:perms$/, ':*'));

    for (const key of keys) {
      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        AUTH_POLICY_CACHE_METRICS.invalidations++;
      }
    }
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const invalidateFeatureFlagsCache = async (
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
    const key = buildFeatureFlagsCacheKey(tenantId, userId);

    if (validateTenantKey(key, tenantId)) {
      await client.deleteKey(key);
      AUTH_POLICY_CACHE_METRICS.invalidations++;
    }
  } catch {
    AUTH_POLICY_CACHE_METRICS.errors++;
  }
};

export const isAuthPolicyCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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
