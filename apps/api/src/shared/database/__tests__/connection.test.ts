import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';

const createMockPool = () => ({
  end: vi.fn().mockResolvedValue(undefined),
  unsafe: vi.fn(),
  reserve: vi.fn(),
});

describe('Database Connection Pool Management', () => {
  let mockPoolFactory: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockPoolFactory = createMockPool();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('resetDatabasePools', () => {
    it('is exported from connection module', async () => {
      const connection = await import('../connection.js');
      expect(typeof connection.resetDatabasePools).toBe('function');
    });

    it('clears all cached pools so new pools are created on next call', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { resetDatabasePools, getDatabasePool, closeDatabase } =
        await import('../connection.js');

      const testConfig: AppConfig = {
        ...loadConfig(),
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_db_pool_reset',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      };

      getDatabasePool(testConfig);
      const firstCallCount = mockPg.mock.calls.length;

      resetDatabasePools();

      getDatabasePool(testConfig);
      const secondCallCount = mockPg.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);

      await closeDatabase();
    });

    it('clears both pools and clients Maps', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => ({ execute: vi.fn() }));

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const {
        resetDatabasePools,
        getDatabasePool,
        getDatabaseClient,
        pools,
        clients,
        closeDatabase,
      } = await import('../connection.js');

      const testConfig: AppConfig = {
        ...loadConfig(),
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_db_both_clear',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      };

      getDatabasePool(testConfig);
      getDatabaseClient(testConfig);

      expect(pools.size).toBeGreaterThan(0);
      expect(clients.size).toBeGreaterThan(0);

      resetDatabasePools();

      expect(pools.size).toBe(0);
      expect(clients.size).toBe(0);

      getDatabasePool(testConfig);
      getDatabaseClient(testConfig);

      expect(pools.size).toBeGreaterThan(0);
      expect(clients.size).toBeGreaterThan(0);

      await closeDatabase();
    });

    it('is safe to call when no pools exist', async () => {
      const { resetDatabasePools } = await import('../connection.js');

      expect(() => resetDatabasePools()).not.toThrow();
    });

    it('is safe to call multiple times consecutively', async () => {
      const { resetDatabasePools, getDatabasePool, closeDatabase } =
        await import('../connection.js');

      const testConfig: AppConfig = {
        ...loadConfig(),
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_multi_reset',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      };

      getDatabasePool(testConfig);

      expect(() => resetDatabasePools()).not.toThrow();
      expect(() => resetDatabasePools()).not.toThrow();
      expect(() => resetDatabasePools()).not.toThrow();

      await closeDatabase();
    });

    it('new pools are created for different configs after reset', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { resetDatabasePools, getDatabasePool, closeDatabase } =
        await import('../connection.js');

      const baseConfig = {
        ...loadConfig(),
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/shared_url',
        NODE_ENV: 'test' as const,
        LOG_LEVEL: 'silent',
      };

      const configWithMax5: AppConfig = {
        ...baseConfig,
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const configWithMax10: AppConfig = {
        ...baseConfig,
        DATABASE_POOL_MAX: 10,
        DATABASE_POOL_IDLE_TIMEOUT: 20,
        DATABASE_POOL_CONNECT_TIMEOUT: 10,
        DATABASE_SSL: true,
      };

      getDatabasePool(configWithMax5);
      getDatabasePool(configWithMax10);
      const callsBeforeReset = mockPg.mock.calls.length;

      resetDatabasePools();

      getDatabasePool(configWithMax5);
      getDatabasePool(configWithMax10);
      const callsAfterReset = mockPg.mock.calls.length;

      expect(callsAfterReset).toBeGreaterThan(callsBeforeReset);

      await closeDatabase();
    });
  });
});
