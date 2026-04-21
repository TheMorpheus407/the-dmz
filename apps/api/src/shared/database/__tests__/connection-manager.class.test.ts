import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { AppConfig } from '../../../config.js';

const createMockPool = () => ({
  end: vi.fn().mockResolvedValue(undefined),
  unsafe: vi.fn(),
  reserve: vi.fn(),
});

const createMockDrizzleClient = () => ({
  execute: vi.fn(),
});

describe('DatabaseConnectionManager', () => {
  let mockPoolFactory: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockPoolFactory = createMockPool();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('class-based connection manager for test isolation', () => {
    it('should be exported from the connection module', async () => {
      const connection = await import('../connection.js');
      expect(typeof connection.DatabaseConnectionManager).toBe('function');
    });

    it('should create isolated pool instances per manager', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_isolated',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager1 = new DatabaseConnectionManager(config);
      const manager2 = new DatabaseConnectionManager(config);

      const pool1 = manager1.getPool();
      const pool2 = manager2.getPool();

      expect(pool1).not.toBe(pool2);
    });

    it('should cache pools within the same manager instance', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_cache',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      const pool1 = manager.getPool();
      const pool2 = manager.getPool();

      expect(pool1).toBe(pool2);
      expect(mockPg).toHaveBeenCalledTimes(1);
    });

    it('should create isolated clients per manager instance', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => createMockDrizzleClient());

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_clients',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager1 = new DatabaseConnectionManager(config);
      const manager2 = new DatabaseConnectionManager(config);

      const client1 = manager1.getClient();
      const client2 = manager2.getClient();

      expect(client1).not.toBe(client2);
    });

    it('should close only its own pools when close() is called', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config1: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close1',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const config2: AppConfig = {
        ...config1,
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close2',
      };

      const manager1 = new DatabaseConnectionManager(config1);
      const manager2 = new DatabaseConnectionManager(config2);

      const pool1 = manager1.getPool();
      const pool2 = manager2.getPool();

      await manager1.close();

      expect(pool1.end).toHaveBeenCalled();
      expect(pool2.end).not.toHaveBeenCalled();
    });

    it('should clear only its own internal state when reset() is called', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => createMockDrizzleClient());

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config1: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_reset1',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const config2: AppConfig = {
        ...config1,
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_reset2',
      };

      const manager1 = new DatabaseConnectionManager(config1);
      const manager2 = new DatabaseConnectionManager(config2);

      manager1.getPool();
      manager1.getClient();
      manager2.getPool();
      manager2.getClient();

      manager1.reset();

      const pool1AfterReset = manager1.getPool();
      const client1AfterReset = manager1.getClient();

      expect(pool1AfterReset).not.toBeNull();
      expect(client1AfterReset).not.toBeNull();

      const pool2AfterReset = manager2.getPool();
      const client2AfterReset = manager2.getClient();
      expect(pool2AfterReset).not.toBeNull();
      expect(client2AfterReset).not.toBeNull();

      expect(mockPg.mock.calls.length).toBeGreaterThan(2);
    });

    it('should use different pool for different config within same manager', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config1: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_diff1',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const config2: AppConfig = {
        ...config1,
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_diff2',
      };

      const manager = new DatabaseConnectionManager(config1);

      const pool1 = manager.getPool(config1);
      const pool2 = manager.getPool(config2);

      expect(pool1).not.toBe(pool2);
    });

    it('should have getPool method that accepts optional config parameter', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_getpool',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      expect(typeof manager.getPool).toBe('function');

      const pool1 = manager.getPool();
      const pool2 = manager.getPool(config);

      expect(pool1).toBe(pool2);
    });

    it('should have getClient method that accepts optional config parameter', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => createMockDrizzleClient());

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_getclient',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      expect(typeof manager.getClient).toBe('function');

      const client1 = manager.getClient();
      const client2 = manager.getClient(config);

      expect(client1).toBe(client2);
    });

    it('should have close method that returns Promise<void>', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close_method',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);
      manager.getPool();

      const result = manager.close();

      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should have reset method', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_reset_method',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      expect(typeof manager.reset).toBe('function');
      expect(() => manager.reset()).not.toThrow();
    });

    it('should clear internal state when reset() is called', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_reset_state',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);
      manager.getPool();
      manager.getClient();

      expect(mockPg).toHaveBeenCalled();

      manager.reset();

      manager.getPool();
      manager.getClient();

      expect(mockPg).toHaveBeenCalledTimes(2);
    });

    it('should create new pool after reset() even with same config', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_reset_new_pool',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);
      const pool1 = manager.getPool();

      manager.reset();

      const pool2 = manager.getPool();

      expect(pool1).not.toBe(pool2);
      expect(mockPg).toHaveBeenCalledTimes(2);
    });
  });

  describe('createConnectionManager factory function', () => {
    it('should be exported from the connection module', async () => {
      const connection = await import('../connection.js');
      expect(typeof connection.createConnectionManager).toBe('function');
    });

    it('should create a DatabaseConnectionManager instance', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { createConnectionManager, DatabaseConnectionManager } =
        await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_factory',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = createConnectionManager(config);

      expect(manager).toBeInstanceOf(DatabaseConnectionManager);
      expect(typeof manager.getPool).toBe('function');
      expect(typeof manager.getClient).toBe('function');
      expect(typeof manager.close).toBe('function');
      expect(typeof manager.reset).toBe('function');
    });
  });

  describe('test isolation verification', () => {
    it('two managers should not share any state', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => createMockDrizzleClient());

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_isolation',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager1 = new DatabaseConnectionManager(config);
      const manager2 = new DatabaseConnectionManager(config);

      manager1.getPool();
      manager1.getClient();
      manager2.getPool();
      manager2.getClient();

      const initialCallCount = mockPg.mock.calls.length;

      manager1.reset();

      manager1.getPool();
      manager1.getClient();
      manager2.getPool();
      manager2.getClient();

      const finalCallCount = mockPg.mock.calls.length;

      expect(finalCallCount).toBeGreaterThan(initialCallCount);

      const pool1AfterReset = manager1.getPool();
      const pool2AfterReset = manager2.getPool();
      expect(pool1AfterReset).not.toBe(pool2AfterReset);
    });
  });

  describe('edge cases and error handling', () => {
    it('should complete close() without error when no pools exist', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close_empty',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      await expect(manager.close()).resolves.not.toThrow();
    });

    it('should call pool.end() on all managed pools when close() is called', async () => {
      const mockPool1 = createMockPool();
      const mockPool2 = createMockPool();
      const mockPg = vi.fn().mockReturnValueOnce(mockPool1).mockReturnValueOnce(mockPool2);

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config1: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close_multi_1',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const config2: AppConfig = {
        ...config1,
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_close_multi_2',
      };

      const manager = new DatabaseConnectionManager(config1);
      manager.getPool(config1);
      manager.getPool(config2);

      await manager.close();

      expect(mockPool1.end).toHaveBeenCalled();
      expect(mockPool2.end).toHaveBeenCalled();
    });

    it('should create a pool when getClient() is called with no pool existing', async () => {
      const mockPg = vi.fn(() => mockPoolFactory);
      const mockDrizzle = vi.fn(() => createMockDrizzleClient());

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      vi.doMock('drizzle-orm/postgres-js', () => ({
        drizzle: mockDrizzle,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_client_creates_pool',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);
      expect(mockPg).not.toHaveBeenCalled();

      manager.getClient();

      expect(mockPg).toHaveBeenCalled();
    });

    it('should translate DATABASE_SSL=true to ssl require in pool options', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const mockPg = vi.fn((_url: string, options: Record<string, unknown>) => {
        capturedOptions = options;
        return mockPoolFactory;
      });

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_ssl',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: true,
      };

      const manager = new DatabaseConnectionManager(config);
      manager.getPool();

      expect(capturedOptions.ssl).toBe('require');
    });

    it('should handle getPool with invalid DATABASE_URL gracefully', async () => {
      const mockPg = vi.fn(() => {
        throw new Error('Invalid database URL');
      });

      vi.doMock('postgres', () => ({
        default: mockPg,
      }));

      const { DatabaseConnectionManager } = await import('../connection.js');

      const config: AppConfig = {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://invalid:invalid@localhost:5432/test_error',
        DATABASE_POOL_MAX: 5,
        DATABASE_POOL_IDLE_TIMEOUT: 10,
        DATABASE_POOL_CONNECT_TIMEOUT: 5,
        DATABASE_SSL: false,
      };

      const manager = new DatabaseConnectionManager(config);

      expect(() => manager.getPool()).toThrow();
    });
  });
});
