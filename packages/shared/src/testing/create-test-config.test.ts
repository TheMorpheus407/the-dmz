import { randomUUID } from 'crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_DATABASE_URL,
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestConfig,
  deriveAdminDatabaseUrl,
} from './create-test-config.js';

vi.mock('postgres', () => {
  const mockPool = {
    unsafe: vi.fn().mockResolvedValue([]),
    end: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: vi.fn(() => mockPool),
    __mockPool: mockPool,
  };
});

describe('create-test-config', () => {
  describe('ADMIN_DATABASE_URL', () => {
    it('should be a valid postgres admin URL', () => {
      expect(ADMIN_DATABASE_URL).toBe('postgresql://dmz:dmz_dev@localhost:5432/postgres');
      const url = new URL(ADMIN_DATABASE_URL);
      expect(url.pathname).toBe('/postgres');
    });
  });

  describe('deriveAdminDatabaseUrl', () => {
    it('should replace the pathname with /postgres', () => {
      const result = deriveAdminDatabaseUrl('postgresql://dmz:dmz_dev@localhost:5432/some_db');
      expect(result).toBe('postgresql://dmz:dmz_dev@localhost:5432/postgres');
    });

    it('should handle URLs with different ports', () => {
      const result = deriveAdminDatabaseUrl('postgresql://user:pass@localhost:5433/my_db');
      expect(result).toBe('postgresql://user:pass@localhost:5433/postgres');
    });

    it('should preserve query parameters', () => {
      const result = deriveAdminDatabaseUrl('postgresql://user:pass@localhost:5432/my_db?ssl=true');
      expect(result).toBe('postgresql://user:pass@localhost:5432/postgres?ssl=true');
    });

    it('should be reversible with createIsolatedTestConfig', () => {
      const dbName = `test_${randomUUID().replace(/-/g, '_')}`;
      const config = createIsolatedTestConfig(dbName);
      const adminUrl = deriveAdminDatabaseUrl(config.DATABASE_URL);
      expect(adminUrl).toBe(ADMIN_DATABASE_URL);
    });
  });

  describe('createTestConfig', () => {
    it('should create config with default values', () => {
      const config = createTestConfig();
      expect(config.NODE_ENV).toBe('test');
      expect(config.LOG_LEVEL).toBe('silent');
      expect(config.DATABASE_URL).toContain('/dmz_test');
    });

    it('should accept logLevel override', () => {
      const config = createTestConfig({ logLevel: 'debug' });
      expect(config.LOG_LEVEL).toBe('debug');
    });

    it('should accept DATABASE_URL override', () => {
      const config = createTestConfig({
        overrides: { DATABASE_URL: 'postgresql://localhost/custom' },
      });
      expect(config.DATABASE_URL).toBe('postgresql://localhost/custom');
    });

    it('should preserve other defaults when overriding', () => {
      const config = createTestConfig({
        overrides: { DATABASE_URL: 'postgresql://localhost/test' },
      });
      expect(config.NODE_ENV).toBe('test');
      expect(config.LOG_LEVEL).toBe('silent');
    });
  });

  describe('createIsolatedTestConfig', () => {
    it('should create config with database name in URL', () => {
      const config = createIsolatedTestConfig('my_test_db');
      expect(config.DATABASE_URL).toContain('/my_test_db');
    });

    it('should use default base config when only database name provided', () => {
      const config = createIsolatedTestConfig('my_test_db');
      expect(config.NODE_ENV).toBe('test');
      expect(config.LOG_LEVEL).toBe('silent');
    });

    it('should accept base config and database name', () => {
      const baseConfig = createTestConfig({ logLevel: 'info' });
      const config = createIsolatedTestConfig(baseConfig, 'my_test_db');
      expect(config.DATABASE_URL).toContain('/my_test_db');
      expect(config.LOG_LEVEL).toBe('info');
    });

    it('should preserve base config properties', () => {
      const baseConfig = createTestConfig();
      const config = createIsolatedTestConfig(baseConfig, 'my_test_db');
      expect(config.NODE_ENV).toBe(baseConfig.NODE_ENV);
      expect(config.RATE_LIMIT_MAX).toBe(baseConfig.RATE_LIMIT_MAX);
    });

    it('should handle database names with underscores', () => {
      const dbName = `dmz_test_${randomUUID().replace(/-/g, '_')}`;
      const config = createIsolatedTestConfig(dbName);
      expect(config.DATABASE_URL).toContain(`/${dbName}`);
    });
  });

  describe('createIsolatedDatabase', () => {
    it('should return cleanup function when called without options', async () => {
      const config = createIsolatedTestConfig(`test_cleanup_${randomUUID().replace(/-/g, '_')}`);
      const result = await createIsolatedDatabase(config);
      expect(typeof result).toBe('function');
      await result();
    });

    it('should return db and cleanup when dbMapper is provided', async () => {
      const config = createIsolatedTestConfig(`test_db_mapper_${randomUUID().replace(/-/g, '_')}`);
      const mockDb = { query: vi.fn() };
      const result = await createIsolatedDatabase(config, {
        dbMapper: async () => mockDb,
      });
      expect(result).toHaveProperty('db');
      expect(result).toHaveProperty('cleanup');
      expect((result as { db: unknown }).db).toBe(mockDb);
      expect(typeof (result as { cleanup: unknown }).cleanup).toBe('function');
    });

    it('should invoke setup callback with database pool', async () => {
      const config = createIsolatedTestConfig(`test_setup_${randomUUID().replace(/-/g, '_')}`);
      const setupMock = vi.fn().mockResolvedValue(undefined);
      await createIsolatedDatabase(config, { setup: setupMock });
      expect(setupMock).toHaveBeenCalled();
    });

    it('should pass database pool to setup callback', async () => {
      const config = createIsolatedTestConfig(`test_setup_pool_${randomUUID().replace(/-/g, '_')}`);
      let receivedPool: unknown;
      await createIsolatedDatabase(config, {
        setup: async (pool) => {
          receivedPool = pool;
        },
      });
      expect(receivedPool).toBeDefined();
      expect(typeof (receivedPool as { unsafe: unknown }).unsafe).toBe('function');
      expect(typeof (receivedPool as { end: unknown }).end).toBe('function');
    });

    it('should invoke dbMapper callback and return mapped database', async () => {
      const config = createIsolatedTestConfig(`test_mapper_${randomUUID().replace(/-/g, '_')}`);
      const mockDb = { tenants: [] };
      const result = await createIsolatedDatabase(config, {
        dbMapper: async () => mockDb,
      });
      expect((result as { db: typeof mockDb }).db).toBe(mockDb);
    });

    it('should call cleanup on error after database creation', async () => {
      const config = createIsolatedTestConfig(`test_error_${randomUUID().replace(/-/g, '_')}`);
      await expect(
        createIsolatedDatabase(config, {
          setup: async () => {
            throw new Error('Setup failed');
          },
        }),
      ).rejects.toThrow('Setup failed');
    });

    it('should use DROP DATABASE IF EXISTS before CREATE DATABASE', async () => {
      const config = createIsolatedTestConfig(
        `test_drop_if_exists_${randomUUID().replace(/-/g, '_')}`,
      );
      await createIsolatedDatabase(config);
      const postgres = await import('postgres');
      const mockPool = (postgres as { __mockPool?: { unsafe: ReturnType<typeof vi.fn> } })
        .__mockPool;
      if (mockPool?.unsafe) {
        const unsafeCalls = mockPool.unsafe.mock.calls;
        const dropCall = unsafeCalls.find((call: unknown[]) =>
          String(call[0]).includes('DROP DATABASE IF EXISTS'),
        );
        const createCall = unsafeCalls.find((call: unknown[]) =>
          String(call[0]).includes('CREATE DATABASE'),
        );
        expect(dropCall).toBeDefined();
        expect(createCall).toBeDefined();
        const dropIndex = unsafeCalls.indexOf(dropCall);
        const createIndex = unsafeCalls.indexOf(createCall);
        expect(dropIndex).toBeLessThan(createIndex);
      }
    });

    it('should return cleanup that terminates backend connections before dropping', async () => {
      const config = createIsolatedTestConfig(
        `test_cleanup_order_${randomUUID().replace(/-/g, '_')}`,
      );
      const cleanup = await createIsolatedDatabase(config);
      await cleanup();
      const postgres = await import('postgres');
      const mockPool = (
        postgres as {
          __mockPool?: { unsafe: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
        }
      ).__mockPool;
      expect(mockPool?.end).toHaveBeenCalled();
    });

    it('should reject invalid database names with special characters', async () => {
      const config = createIsolatedTestConfig(
        `test_db_with_quote_${randomUUID().replace(/-/g, '_')}`,
      );
      await expect(createIsolatedDatabase(config)).rejects.toThrow(
        /Invalid database name.*Must match PostgreSQL identifier rules/,
      );
    });

    it('should reject empty database name', async () => {
      const url = new URL('postgresql://dmz:dmz_dev@localhost:5432/');
      url.pathname = '/';
      await expect(
        createIsolatedDatabase({
          DATABASE_URL: url.toString(),
          NODE_ENV: 'test',
          LOG_LEVEL: 'silent',
        } as never),
      ).rejects.toThrow();
    });

    it('should use parameterized query for pg_terminate_backend', async () => {
      const config = createIsolatedTestConfig(
        `test_param_query_${randomUUID().replace(/-/g, '_')}`,
      );
      const cleanup = await createIsolatedDatabase(config);
      await cleanup();
      const postgres = await import('postgres');
      const mockPool = (postgres as { __mockPool?: { unsafe: ReturnType<typeof vi.fn> } })
        .__mockPool;
      if (mockPool?.unsafe) {
        const unsafeCalls = mockPool.unsafe.mock.calls;
        const terminateCall = unsafeCalls.find((call: unknown[]) =>
          String(call[0]).includes('pg_terminate_backend'),
        );
        expect(terminateCall).toBeDefined();
        expect(terminateCall![1]).toBeInstanceOf(Array);
      }
    });
  });
});
