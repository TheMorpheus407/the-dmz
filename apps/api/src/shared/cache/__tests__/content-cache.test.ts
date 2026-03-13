import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  buildContentCacheKey,
  getCachedContent,
  setCachedContent,
  invalidateContentCache,
  getContentCacheMetrics,
  resetContentCacheMetrics,
  isContentCacheHealthy,
} from '../content-cache.js';
import { loadConfig, type AppConfig } from '../../../config.js';

vi.mock('../../database/redis.js', () => ({
  getRedisClient: vi.fn(() => null),
}));

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_CONTENT_ID = 'email-123';

const createTestConfig = (): AppConfig =>
  loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret',
  });

describe('content-cache', () => {
  beforeEach(() => {
    resetContentCacheMetrics();
  });

  describe('buildContentCacheKey', () => {
    it('should build correct cache key for email template', () => {
      const key = buildContentCacheKey(TEST_TENANT_ID, 'email-template', TEST_CONTENT_ID);
      expect(key).toContain('v1:dmz:content');
      expect(key).toContain(TEST_TENANT_ID);
      expect(key).toContain('email-template');
      expect(key).toContain(TEST_CONTENT_ID);
    });

    it('should build correct cache key for scenario', () => {
      const key = buildContentCacheKey(TEST_TENANT_ID, 'scenario', 'scenario-456');
      expect(key).toContain('scenario');
    });

    it('should build correct cache key for document template', () => {
      const key = buildContentCacheKey(TEST_TENANT_ID, 'document-template', 'doc-789');
      expect(key).toContain('document-template');
    });
  });

  describe('getContentCacheMetrics', () => {
    it('should return initial metrics with zeros', () => {
      const metrics = getContentCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.invalidations).toBe(0);
    });

    it('should return frozen object', () => {
      const metrics = getContentCacheMetrics();
      expect(Object.isFrozen(metrics)).toBe(true);
    });
  });

  describe('resetContentCacheMetrics', () => {
    it('should reset all metrics to zero', () => {
      const metricsBefore = getContentCacheMetrics();
      expect(metricsBefore.hits).toBe(0);

      resetContentCacheMetrics();
      const metricsAfter = getContentCacheMetrics();
      expect(metricsAfter.hits).toBe(0);
    });
  });

  describe('getCachedContent', () => {
    it('should return null when redis client is not available (fallback)', async () => {
      const config = createTestConfig();
      const result = await getCachedContent(
        config,
        TEST_TENANT_ID,
        'email-template',
        TEST_CONTENT_ID,
      );

      expect(result).toBeNull();
      const metrics = getContentCacheMetrics();
      expect(metrics.misses).toBe(1);
    });
  });

  describe('setCachedContent', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();
      const testData = { id: TEST_CONTENT_ID, name: 'Test Template', subject: 'Test Subject' };

      await expect(
        setCachedContent(config, TEST_TENANT_ID, 'email-template', TEST_CONTENT_ID, testData),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateContentCache', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(
        invalidateContentCache(config, TEST_TENANT_ID, 'email-template', TEST_CONTENT_ID),
      ).resolves.not.toThrow();
    });
  });

  describe('isContentCacheHealthy', () => {
    it('should return false when redis client is not available', async () => {
      const config = createTestConfig();
      const result = await isContentCacheHealthy(config);
      expect(result).toBe(false);
    });
  });
});
