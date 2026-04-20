import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockSocket = () => {
  let errorCb: ((error: Error) => void) | null = null;
  const socket = {
    status: 'connecting',
    setNoDelay: vi.fn(),
    once: vi.fn((event: string, cb: (arg?: Error) => void) => {
      if (event === 'connect') {
        setTimeout(() => cb(), 0);
      }
      if (event === 'error') {
        errorCb = cb;
      }
      return socket;
    }),
    on: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
    write: vi.fn((data, cb) => {
      if (cb) cb();
    }),
    destroy: vi.fn((error?: Error) => {
      if (errorCb && error) {
        errorCb(error);
      }
    }),
    destroySoon: vi.fn(),
  };
  return socket;
};

describe('RedisTcpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('URL validation in constructor', () => {
    it('throws for invalid protocol (http://)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('http://localhost:6379')).toThrow(
        'Redis URL must use redis:// or rediss:// protocol',
      );
    });

    it('throws for invalid protocol (https://)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('https://localhost:6379')).toThrow(
        'Redis URL must use redis:// or rediss:// protocol',
      );
    });

    it('throws for missing hostname', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://:6379')).toThrow('Redis URL is missing a hostname');
    });

    it('throws for empty hostname', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis:///')).toThrow('Redis URL is missing a hostname');
    });

    it('throws for invalid port (negative)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:-1')).toThrow(
        'Redis URL contains an invalid port',
      );
    });

    it('throws for invalid port (zero)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:0')).toThrow(
        'Redis URL contains an invalid port',
      );
    });

    it('throws for invalid port (too large)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:70000')).toThrow(
        'Redis URL contains an invalid port',
      );
    });

    it('throws for invalid port (non-numeric)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:abc')).toThrow(
        'Redis URL contains an invalid port',
      );
    });

    it('throws for invalid database index (negative)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:6379/-1')).toThrow(
        'Redis URL contains an invalid database index',
      );
    });

    it('throws for invalid database index (non-integer)', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:6379/1.5')).toThrow(
        'Redis URL contains an invalid database index',
      );
    });

    it('accepts valid redis:// URL with minimal config', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost')).not.toThrow();
    });

    it('accepts valid redis:// URL with port', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:6379')).not.toThrow();
    });

    it('accepts valid redis:// URL with database index', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:6379/0')).not.toThrow();
    });

    it('accepts valid redis:// URL with database index 1', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://localhost:6379/1')).not.toThrow();
    });

    it('accepts valid rediss:// URL', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('rediss://localhost:6380')).not.toThrow();
    });

    it('accepts valid rediss:// URL with credentials', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('rediss://user:password@localhost:6380/0')).not.toThrow();
    });

    it('accepts valid redis:// URL with credentials', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      expect(() => new RedisTcpClient('redis://user:password@localhost:6379/0')).not.toThrow();
    });
  });

  describe('sendCommand when not connected', () => {
    it('throws Error when sending command without connecting', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await expect(client.ping()).rejects.toThrow('Redis client is not connected');
    });

    it('client status is "wait" before connection', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      expect(client.status).toBe('wait');
    });
  });

  describe('disconnect without connect', () => {
    it('disconnect sets status to closed without throwing', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      expect(() => client.disconnect()).not.toThrow();
      expect(client.status).toBe('closed');
    });

    it('quit returns without throwing when not connected', async () => {
      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await expect(client.quit()).resolves.toBeUndefined();
      expect(client.status).toBe('closed');
    });
  });

  describe('connection error handling with mocked socket', () => {
    it('rejects connect promise when socket error occurs', async () => {
      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => {
              const socket = mockSocket();
              socket.once = vi.fn((event, cb) => {
                if (event === 'error') {
                  setTimeout(() => cb(new Error('Connection refused')), 0);
                }
                if (event === 'connect') {
                  socket.once = vi.fn((e, c) => {
                    if (e === 'error') setTimeout(() => c(new Error('Connection refused')), 0);
                    if (e === 'connect') setTimeout(() => c(), 0);
                    return socket;
                  });
                }
                return socket;
              });
              return socket;
            }),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => {
              const socket = mockSocket();
              socket.once = vi.fn((event, cb) => {
                if (event === 'error') {
                  setTimeout(() => cb(new Error('TLS connection failed')), 0);
                }
                return socket;
              });
              return socket;
            }),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await expect(client.connect()).rejects.toThrow('Redis connection failed');
    });

    it('throws when socket write fails during command', async () => {
      const writeError = new Error('Write failed');
      const socket = mockSocket();
      socket.write = vi.fn((data, cb) => {
        if (cb) cb(writeError);
      });

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();
      await expect(client.ping()).rejects.toThrow('Failed to write Redis command');
      client.disconnect();

      expect(client.status).toBe('closed');
    });

    it('rejects connect promise on connection timeout', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await expect(client.connect()).rejects.toThrow('Redis connection timed out');
    });
  });

  describe('authentication failure', () => {
    it('throws Redis authentication failed when AUTH command fails', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://user:wrongpassword@localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.reject(new Error('ERR AUTH'));
          }
        }, 0);
      });

      await expect(client.ping()).rejects.toThrow('Redis authentication failed');
    });
  });

  describe('socket close and teardown handling', () => {
    it('rejects pending command when socket closes during command', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      const pendingPromise = client.ping();

      const closeHandler = socket.on.mock.calls.find((call) => call[0] === 'close')?.[1];
      if (closeHandler) {
        closeHandler();
      }

      await expect(pendingPromise).rejects.toThrow('Redis connection closed');
    });

    it('rejects pending commands when disconnect is called', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      const pendingPromise = client.ping();

      client.disconnect();

      await expect(pendingPromise).rejects.toThrow('Redis connection closed');
    });
  });

  describe('health check function', () => {
    it('checkRedisHealth returns ok:false in test environment', async () => {
      const { checkRedisHealth } = await import('../redis.js');

      const result = await checkRedisHealth({
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        LOG_LEVEL: 'silent',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(result).toEqual({
        ok: false,
        message: 'Redis connection not configured',
      });
    });

    it('checkRedisHealth returns ok:false when getRedisClient returns null', async () => {
      vi.doMock(
        '../../../config.js',
        () => ({
          loadConfig: () => ({
            NODE_ENV: 'production',
            REDIS_URL: 'redis://localhost:6379',
            LOG_LEVEL: 'silent',
          }),
        }),
        { virtual: true },
      );

      const mockClient = {
        status: 'wait' as const,
        connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
        ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };

      vi.doMock(
        '../redis.js',
        () => ({
          getRedisClient: () => mockClient,
          redisClient: mockClient,
        }),
        { virtual: true },
      );

      const { checkRedisHealth } = await import('../redis.js');

      const result = await checkRedisHealth({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        LOG_LEVEL: 'silent',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(result.ok).toBe(false);
    });

    it('checkRedisHealth returns ok:true when Redis ping returns PONG', async () => {
      vi.doMock(
        '../../../config.js',
        () => ({
          loadConfig: () => ({
            NODE_ENV: 'production',
            REDIS_URL: 'redis://localhost:6379',
            LOG_LEVEL: 'silent',
          }),
        }),
        { virtual: true },
      );

      const mockClient = {
        status: 'ready' as const,
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
      };

      vi.doMock(
        '../redis.js',
        () => ({
          getRedisClient: () => mockClient,
          redisClient: mockClient,
        }),
        { virtual: true },
      );

      const { checkRedisHealth } = await import('../redis.js');

      const result = await checkRedisHealth({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        LOG_LEVEL: 'silent',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(result).toEqual({
        ok: true,
        message: 'Redis connection ok',
      });
    });
  });

  describe('unexpected response type errors', () => {
    it('ping throws on unexpected response type (array instead of string)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(['unexpected', 'array', 'response']);
          }
        }, 0);
      });

      await expect(client.ping()).rejects.toThrow('Unexpected Redis PING response');
    });

    it('getValue throws on unexpected response type (number instead of string/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(12345);
          }
        }, 0);
      });

      await expect(client.getValue('test-key')).rejects.toThrow('Unexpected Redis GET response');
    });

    it('lpush throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-a-number');
          }
        }, 0);
      });

      await expect(client.lpush('test-key', 'value')).rejects.toThrow(
        'Unexpected Redis LPUSH response',
      );
    });

    it('llen throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('ten');
          }
        }, 0);
      });

      await expect(client.llen('test-key')).rejects.toThrow('Unexpected Redis LLEN response');
    });

    it('zadd throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('zero');
          }
        }, 0);
      });

      await expect(client.zadd('test-key', 1.0, 'member')).rejects.toThrow(
        'Unexpected Redis ZADD response',
      );
    });

    it('zcard throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('five');
          }
        }, 0);
      });

      await expect(client.zcard('test-key')).rejects.toThrow('Unexpected Redis ZCARD response');
    });

    it('sadd throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('one');
          }
        }, 0);
      });

      await expect(client.sadd('test-key', 'member')).rejects.toThrow(
        'Unexpected Redis SADD response',
      );
    });

    it('sismember throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('yes');
          }
        }, 0);
      });

      await expect(client.sismember('test-key', 'member')).rejects.toThrow(
        'Unexpected Redis SISMEMBER response',
      );
    });

    it('zscore throws on unexpected response type (array instead of string/number/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(['unexpected', 'array']);
          }
        }, 0);
      });

      await expect(client.zscore('test-key', 'member')).rejects.toThrow(
        'Unexpected Redis ZSCORE response',
      );
    });
  });

  describe('incrementRateLimitKey response validation', () => {
    it('throws when result is not an array', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-an-array');
          }
        }, 0);
      });

      await expect(
        client.incrementRateLimitKey({
          key: 'test',
          timeWindowMs: 1000,
          max: 10,
          continueExceeding: false,
          exponentialBackoff: false,
        }),
      ).rejects.toThrow('Unexpected Redis rate limit response');
    });

    it('throws when result array has fewer than 2 elements', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve([1]);
          }
        }, 0);
      });

      await expect(
        client.incrementRateLimitKey({
          key: 'test',
          timeWindowMs: 1000,
          max: 10,
          continueExceeding: false,
          exponentialBackoff: false,
        }),
      ).rejects.toThrow('Unexpected Redis rate limit response');
    });
  });

  describe('incrementHourlyQuotaKey response validation', () => {
    it('throws when result is not an array', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve({ current: 5, remaining: 5 });
          }
        }, 0);
      });

      await expect(client.incrementHourlyQuotaKey('test', 10)).rejects.toThrow(
        'Unexpected Redis hourly quota response',
      );
    });

    it('throws when result array has fewer than 2 elements', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve([5]);
          }
        }, 0);
      });

      await expect(client.incrementHourlyQuotaKey('test', 10)).rejects.toThrow(
        'Unexpected Redis hourly quota response',
      );
    });
  });

  describe('zpopmax response validation', () => {
    it('throws when result is not an array or null', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-an-array-or-null');
          }
        }, 0);
      });

      await expect(client.zpopmax('test-key')).rejects.toThrow('Unexpected Redis ZPOPMAX response');
    });

    it('throws when result array has fewer than 2 elements', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(['only-one-element']);
          }
        }, 0);
      });

      await expect(client.zpopmax('test-key')).rejects.toThrow('Unexpected Redis ZPOPMAX response');
    });

    it('throws when result array elements have wrong types', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve([123, 'member-should-be-string']);
          }
        }, 0);
      });

      await expect(client.zpopmax('test-key')).rejects.toThrow('Unexpected Redis ZPOPMAX response');
    });
  });

  describe('getKeys response validation', () => {
    it('throws on unexpected response type (string instead of array/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-an-array');
          }
        }, 0);
      });

      await expect(client.getKeys('pattern:*')).rejects.toThrow('Unexpected Redis KEYS response');
    });
  });

  describe('zrevrange response validation', () => {
    it('throws on unexpected response type (string instead of array/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('unexpected-string');
          }
        }, 0);
      });

      await expect(client.zrevrange('test-key', 0, -1)).rejects.toThrow(
        'Unexpected Redis ZREVRANGE response',
      );
    });
  });

  describe('zrevrank response validation', () => {
    it('throws on unexpected response type (string instead of number/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('rank-string');
          }
        }, 0);
      });

      await expect(client.zrevrank('test-key', 'member')).rejects.toThrow(
        'Unexpected Redis ZREVRANK response',
      );
    });
  });

  describe('zincrby response validation', () => {
    it('throws on unexpected response type (array instead of string/number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(['unexpected', 'array']);
          }
        }, 0);
      });

      await expect(client.zincrby('test-key', 1, 'member')).rejects.toThrow(
        'Unexpected Redis ZINCRBY response',
      );
    });
  });

  describe('rpop response validation', () => {
    it('throws on unexpected response type (number instead of string/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve(12345);
          }
        }, 0);
      });

      await expect(client.rpop('test-key')).rejects.toThrow('Unexpected Redis RPOP response');
    });
  });

  describe('zrange response validation', () => {
    it('throws on unexpected response type (string instead of array/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-an-array');
          }
        }, 0);
      });

      await expect(client.zrange('test-key', 0, -1)).rejects.toThrow(
        'Unexpected Redis ZRANGE response',
      );
    });
  });

  describe('lrange response validation', () => {
    it('throws on unexpected response type (string instead of array/null)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('not-an-array');
          }
        }, 0);
      });

      await expect(client.lrange('test-key', 0, -1)).rejects.toThrow(
        'Unexpected Redis LRANGE response',
      );
    });
  });

  describe('zrem response validation', () => {
    it('throws on unexpected response type (string instead of number)', async () => {
      const socket = mockSocket();

      vi.doMock(
        'node:net',
        () => ({
          default: {
            createConnection: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      vi.doMock(
        'node:tls',
        () => ({
          default: {
            connect: vi.fn(() => socket),
          },
        }),
        { virtual: true },
      );

      const { RedisTcpClient } = await import('../redis.js');
      const client = new RedisTcpClient('redis://localhost:6379');

      await client.connect();

      socket.write = vi.fn((data, cb) => {
        if (cb) cb();
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pending = (client as any).pending[0];
          if (pending) {
            pending.resolve('one');
          }
        }, 0);
      });

      await expect(client.zrem('test-key', 'member')).rejects.toThrow(
        'Unexpected Redis ZREM response',
      );
    });
  });
});
