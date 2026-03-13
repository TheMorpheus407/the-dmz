import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  buildTenantPolicyCacheKey,
  buildUserPermissionsCacheKey,
  buildFeatureFlagsCacheKey,
  getCachedTenantPolicy,
  setCachedTenantPolicy,
  getCachedUserPermissions,
  setCachedUserPermissions,
  getCachedFeatureFlags,
  setCachedFeatureFlags,
  invalidateTenantPolicyCache,
  invalidateUserPermissionsCache,
  invalidateFeatureFlagsCache,
  getAuthPolicyCacheMetrics,
  resetAuthPolicyCacheMetrics,
  isAuthPolicyCacheHealthy,
} from '../auth-policy-cache.js';
import { loadConfig, type AppConfig } from '../../../config.js';

vi.mock('../../database/redis.js', () => ({
  getRedisClient: vi.fn(() => null),
}));

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';

const createTestConfig = (): AppConfig =>
  loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret',
  });

describe('auth-policy-cache', () => {
  beforeEach(() => {
    resetAuthPolicyCacheMetrics();
  });

  describe('buildTenantPolicyCacheKey', () => {
    it('should build correct cache key for tenant policy', () => {
      const key = buildTenantPolicyCacheKey(TEST_TENANT_ID);
      expect(key).toContain('v1:dmz:auth-policy');
      expect(key).toContain(TEST_TENANT_ID);
      expect(key).toContain('tenant-policy');
    });
  });

  describe('buildUserPermissionsCacheKey', () => {
    it('should build correct cache key for user permissions', () => {
      const key = buildUserPermissionsCacheKey(TEST_TENANT_ID, TEST_USER_ID);
      expect(key).toContain('v1:dmz:auth-policy');
      expect(key).toContain(TEST_TENANT_ID);
      expect(key).toContain(TEST_USER_ID);
      expect(key).toContain('perms');
    });
  });

  describe('buildFeatureFlagsCacheKey', () => {
    it('should build correct cache key for tenant feature flags', () => {
      const key = buildFeatureFlagsCacheKey(TEST_TENANT_ID);
      expect(key).toContain('v1:dmz:auth-policy');
      expect(key).toContain(TEST_TENANT_ID);
      expect(key).toContain('tenant-flags');
    });

    it('should build correct cache key for user feature flags', () => {
      const key = buildFeatureFlagsCacheKey(TEST_TENANT_ID, TEST_USER_ID);
      expect(key).toContain(TEST_USER_ID);
      expect(key).toContain('flags');
    });
  });

  describe('getAuthPolicyCacheMetrics', () => {
    it('should return initial metrics with zeros', () => {
      const metrics = getAuthPolicyCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.invalidations).toBe(0);
    });

    it('should return frozen object', () => {
      const metrics = getAuthPolicyCacheMetrics();
      expect(Object.isFrozen(metrics)).toBe(true);
    });
  });

  describe('resetAuthPolicyCacheMetrics', () => {
    it('should reset all metrics to zero', () => {
      resetAuthPolicyCacheMetrics();
      const metrics = getAuthPolicyCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe('getCachedTenantPolicy', () => {
    it('should return null when redis client is not available (fallback)', async () => {
      const config = createTestConfig();
      const result = await getCachedTenantPolicy(config, TEST_TENANT_ID);

      expect(result).toBeNull();
      const metrics = getAuthPolicyCacheMetrics();
      expect(metrics.misses).toBe(1);
    });
  });

  describe('setCachedTenantPolicy', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();
      const policy = { maxSessions: 5, sessionTimeout: 3600 };

      await expect(setCachedTenantPolicy(config, TEST_TENANT_ID, policy)).resolves.not.toThrow();
    });
  });

  describe('getCachedUserPermissions', () => {
    it('should return null when redis client is not available', async () => {
      const config = createTestConfig();
      const result = await getCachedUserPermissions(config, TEST_TENANT_ID, TEST_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('setCachedUserPermissions', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(
        setCachedUserPermissions(config, TEST_TENANT_ID, TEST_USER_ID, ['read', 'write'], ['user']),
      ).resolves.not.toThrow();
    });
  });

  describe('getCachedFeatureFlags', () => {
    it('should return null when redis client is not available', async () => {
      const config = createTestConfig();
      const result = await getCachedFeatureFlags(config, TEST_TENANT_ID);

      expect(result).toBeNull();
    });
  });

  describe('setCachedFeatureFlags', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();
      const flags = { darkMode: true, notifications: false };

      await expect(setCachedFeatureFlags(config, TEST_TENANT_ID, flags)).resolves.not.toThrow();
    });
  });

  describe('invalidateTenantPolicyCache', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(invalidateTenantPolicyCache(config, TEST_TENANT_ID)).resolves.not.toThrow();
    });
  });

  describe('invalidateUserPermissionsCache', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(
        invalidateUserPermissionsCache(config, TEST_TENANT_ID, TEST_USER_ID),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateFeatureFlagsCache', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(invalidateFeatureFlagsCache(config, TEST_TENANT_ID)).resolves.not.toThrow();
    });
  });

  describe('isAuthPolicyCacheHealthy', () => {
    it('should return false when redis client is not available', async () => {
      const config = createTestConfig();
      const result = await isAuthPolicyCacheHealthy(config);
      expect(result).toBe(false);
    });
  });
});
