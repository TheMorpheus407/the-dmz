import { getRedisClient, type RedisRateLimitClient } from '../database/redis.js';

import { KEY_CATEGORIES, getDefaultTTL } from './redis-key-manifest.js';
import { tenantScopedKey, validateTenantKey } from './redis-keys.js';

import type { AppConfig } from '../../config.js';

export type CacheContentType = 'email-template' | 'scenario' | 'document-template';

export interface CachedContent<T> {
  data: T;
  version: number;
  cachedAt: number;
  ttlSeconds: number;
}

export interface ContentCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
  totalLatencyMs: number;
}

const CONTENT_CACHE_METRICS: ContentCacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  totalLatencyMs: 0,
};

export const getContentCacheMetrics = (): Readonly<ContentCacheMetrics> =>
  Object.freeze({ ...CONTENT_CACHE_METRICS });

export const resetContentCacheMetrics = (): void => {
  CONTENT_CACHE_METRICS.hits = 0;
  CONTENT_CACHE_METRICS.misses = 0;
  CONTENT_CACHE_METRICS.invalidations = 0;
  CONTENT_CACHE_METRICS.errors = 0;
  CONTENT_CACHE_METRICS.totalLatencyMs = 0;
};

const CONTENT_VERSION = 1;

export const buildContentCacheKey = (
  tenantId: string,
  contentType: CacheContentType,
  contentId: string,
): string => {
  return tenantScopedKey(
    KEY_CATEGORIES.CONTENT,
    `${contentType}:${contentId}:v${CONTENT_VERSION}`,
    tenantId,
    {
      ttlSeconds: getDefaultTTL(KEY_CATEGORIES.CONTENT),
    },
  );
};

export const getCachedContent = async <T>(
  config: AppConfig,
  tenantId: string,
  contentType: CacheContentType,
  contentId: string,
  redisClient?: RedisRateLimitClient,
): Promise<CachedContent<T> | null> => {
  const startTime = performance.now();
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    CONTENT_CACHE_METRICS.misses++;
    return null;
  }

  try {
    const key = buildContentCacheKey(tenantId, contentType, contentId);

    if (!validateTenantKey(key, tenantId)) {
      CONTENT_CACHE_METRICS.errors++;
      return null;
    }

    await client.connect();
    const cached = await client.getValue(key);

    if (cached) {
      const data = JSON.parse(cached) as CachedContent<T>;
      const latency = performance.now() - startTime;
      CONTENT_CACHE_METRICS.hits++;
      CONTENT_CACHE_METRICS.totalLatencyMs += latency;
      return data;
    }

    CONTENT_CACHE_METRICS.misses++;
    return null;
  } catch {
    CONTENT_CACHE_METRICS.errors++;
    return null;
  }
};

export const setCachedContent = async <T>(
  config: AppConfig,
  tenantId: string,
  contentType: CacheContentType,
  contentId: string,
  data: T,
  ttlSeconds?: number,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    const key = buildContentCacheKey(tenantId, contentType, contentId);

    if (!validateTenantKey(key, tenantId)) {
      CONTENT_CACHE_METRICS.errors++;
      return;
    }

    const cachedData: CachedContent<T> = {
      data,
      version: CONTENT_VERSION,
      cachedAt: Date.now(),
      ttlSeconds: ttlSeconds ?? getDefaultTTL(KEY_CATEGORIES.CONTENT),
    };

    await client.connect();
    await client.setValue(key, JSON.stringify(cachedData), cachedData.ttlSeconds);
  } catch {
    CONTENT_CACHE_METRICS.errors++;
  }
};

export const invalidateContentCache = async (
  config: AppConfig,
  tenantId: string,
  contentType?: CacheContentType,
  contentId?: string,
  redisClient?: RedisRateLimitClient,
): Promise<void> => {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return;
  }

  try {
    await client.connect();

    if (contentType && contentId) {
      const key = buildContentCacheKey(tenantId, contentType, contentId);

      if (validateTenantKey(key, tenantId)) {
        await client.deleteKey(key);
        CONTENT_CACHE_METRICS.invalidations++;
      }
    } else if (contentType) {
      const pattern = tenantScopedKey(KEY_CATEGORIES.CONTENT, `${contentType}:*`, tenantId, {
        ttlSeconds: 0,
      });
      const keys = await client.getKeys(pattern.replace(/:v\d+$/, ':*'));

      for (const key of keys) {
        if (validateTenantKey(key, tenantId)) {
          await client.deleteKey(key);
          CONTENT_CACHE_METRICS.invalidations++;
        }
      }
    } else {
      const pattern = tenantScopedKey(KEY_CATEGORIES.CONTENT, '*', tenantId, {
        ttlSeconds: 0,
      });
      const keys = await client.getKeys(pattern.replace(/:v\d+$/, ':*'));

      for (const key of keys) {
        if (validateTenantKey(key, tenantId)) {
          await client.deleteKey(key);
          CONTENT_CACHE_METRICS.invalidations++;
        }
      }
    }
  } catch {
    CONTENT_CACHE_METRICS.errors++;
  }
};

export const isContentCacheHealthy = async (config: AppConfig): Promise<boolean> => {
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

export const getContentCacheTTL = (contentType: CacheContentType): number => {
  switch (contentType) {
    case 'email-template':
    case 'scenario':
    case 'document-template':
      return getDefaultTTL(KEY_CATEGORIES.CONTENT);
    default:
      return getDefaultTTL(KEY_CATEGORIES.CONTENT);
  }
};
