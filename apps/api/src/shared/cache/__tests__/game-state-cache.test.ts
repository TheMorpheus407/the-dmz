import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  buildGameStateCacheKey,
  getCachedGameState,
  setCachedGameState,
  deleteCachedGameState,
  invalidateUserGameState,
  invalidateTenantGameState,
  getGameStateCacheMetrics,
  resetGameStateCacheMetrics,
  isGameStateCacheHealthy,
  getOrFetchGameState,
  type CachedGameState,
} from '../game-state-cache.js';
import { loadConfig, type AppConfig } from '../../../config.js';

vi.mock('../../database/redis.js', () => ({
  getRedisClient: vi.fn(() => null),
}));

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_SESSION_ID = '770e8400-e29b-41d4-a716-446655440002';

const createTestConfig = (): AppConfig =>
  loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret',
  });

describe('game-state-cache', () => {
  beforeEach(() => {
    resetGameStateCacheMetrics();
  });

  describe('buildGameStateCacheKey', () => {
    it('should build correct cache key for game state', () => {
      const key = buildGameStateCacheKey(TEST_TENANT_ID, TEST_USER_ID, TEST_SESSION_ID);
      expect(key).toContain('v1:dmz:game-state');
      expect(key).toContain(TEST_TENANT_ID);
      expect(key).toContain(TEST_SESSION_ID);
      expect(key).toContain(TEST_USER_ID);
    });
  });

  describe('getGameStateCacheMetrics', () => {
    it('should return initial metrics with zeros', () => {
      const metrics = getGameStateCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.writes).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.invalidations).toBe(0);
    });

    it('should return frozen object', () => {
      const metrics = getGameStateCacheMetrics();
      expect(Object.isFrozen(metrics)).toBe(true);
    });
  });

  describe('resetGameStateCacheMetrics', () => {
    it('should reset all metrics to zero', () => {
      resetGameStateCacheMetrics();
      const metrics = getGameStateCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.writes).toBe(0);
    });
  });

  describe('getCachedGameState', () => {
    it('should return null when redis client is not available (fallback)', async () => {
      const config = createTestConfig();
      const result = await getCachedGameState(
        config,
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_SESSION_ID,
      );

      expect(result).toBeNull();
      const metrics = getGameStateCacheMetrics();
      expect(metrics.misses).toBe(1);
    });
  });

  describe('setCachedGameState', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();
      const state = {
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        day: 1,
        funds: 1000,
        clientCount: 5,
        threatLevel: 'low' as const,
        facilityLoadout: {
          defenseLevel: 1,
          serverLevel: 1,
          networkLevel: 1,
        },
      };

      await expect(
        setCachedGameState(config, TEST_TENANT_ID, TEST_USER_ID, TEST_SESSION_ID, state),
      ).resolves.not.toThrow();

      const metrics = getGameStateCacheMetrics();
      expect(metrics.writes).toBe(0);
    });
  });

  describe('deleteCachedGameState', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(
        deleteCachedGameState(config, TEST_TENANT_ID, TEST_USER_ID, TEST_SESSION_ID),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateUserGameState', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(
        invalidateUserGameState(config, TEST_TENANT_ID, TEST_USER_ID),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateTenantGameState', () => {
    it('should not throw when redis client is not available', async () => {
      const config = createTestConfig();

      await expect(invalidateTenantGameState(config, TEST_TENANT_ID)).resolves.not.toThrow();
    });
  });

  describe('isGameStateCacheHealthy', () => {
    it('should return false when redis client is not available', async () => {
      const config = createTestConfig();
      const result = await isGameStateCacheHealthy(config);
      expect(result).toBe(false);
    });
  });

  describe('getOrFetchGameState', () => {
    it('should fetch from DB when cache miss', async () => {
      const config = createTestConfig();
      const dbState: CachedGameState = {
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        day: 2,
        funds: 1500,
        clientCount: 6,
        threatLevel: 'medium',
        facilityLoadout: {
          defenseLevel: 2,
          serverLevel: 1,
          networkLevel: 1,
        },
        version: 1,
        cachedAt: Date.now(),
      };

      const fetchFromDb = vi.fn().mockResolvedValue(dbState);

      const result = await getOrFetchGameState(
        config,
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_SESSION_ID,
        fetchFromDb,
      );

      expect(fetchFromDb).toHaveBeenCalled();
      expect(result).toEqual(dbState);
      const metrics = getGameStateCacheMetrics();
      expect(metrics.misses).toBe(1);
    });

    it('should return null when cache miss and DB returns null', async () => {
      const config = createTestConfig();

      const fetchFromDb = vi.fn().mockResolvedValue(null);

      const result = await getOrFetchGameState(
        config,
        TEST_TENANT_ID,
        TEST_USER_ID,
        TEST_SESSION_ID,
        fetchFromDb,
      );

      expect(fetchFromDb).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
