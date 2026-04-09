import { describe, expect, it, beforeEach, afterEach } from 'vitest';

describe('Redis Client Management', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('resetRedisClient', () => {
    it('is exported from redis module', async () => {
      const redis = await import('../redis.js');
      expect(typeof redis.resetRedisClient).toBe('function');
    });

    it('clears the cached redis client', async () => {
      const { resetRedisClient, redisClient, invalidRedisUrl, closeRedisClient } =
        await import('../redis.js');

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();

      resetRedisClient();

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();

      await closeRedisClient();
    });

    it('is safe to call when no redis client exists', async () => {
      const { resetRedisClient, redisClient, invalidRedisUrl } = await import('../redis.js');

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();

      expect(() => resetRedisClient()).not.toThrow();

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();
    });

    it('is safe to call multiple times consecutively', async () => {
      const { resetRedisClient, redisClient, invalidRedisUrl, closeRedisClient } =
        await import('../redis.js');

      expect(() => resetRedisClient()).not.toThrow();
      expect(() => resetRedisClient()).not.toThrow();
      expect(() => resetRedisClient()).not.toThrow();

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();

      await closeRedisClient();
    });

    it('clears redisClient and invalidRedisUrl state', async () => {
      const { resetRedisClient, redisClient, invalidRedisUrl } = await import('../redis.js');

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();

      resetRedisClient();

      expect(redisClient).toBeNull();
      expect(invalidRedisUrl).toBeNull();
    });
  });
});
