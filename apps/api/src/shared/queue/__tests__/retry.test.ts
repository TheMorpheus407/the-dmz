import { describe, expect, it } from 'vitest';

import { EXPONENTIAL_BACKOFF_DELAYS, RETRY_STRATEGY, getQueueConfig } from '../retry.js';

describe('retry', () => {
  describe('EXPONENTIAL_BACKOFF_DELAYS', () => {
    it('should have exactly 5 delay intervals', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS).toHaveLength(5);
    });

    it('should have delays in strictly increasing order', () => {
      for (let i = 1; i < EXPONENTIAL_BACKOFF_DELAYS.length; i++) {
        expect(EXPONENTIAL_BACKOFF_DELAYS[i]!).toBeGreaterThan(EXPONENTIAL_BACKOFF_DELAYS[i - 1]!);
      }
    });

    it('should have correct first delay of 30 seconds', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[0]).toBe(30 * 1000);
    });

    it('should have correct second delay of 2 minutes', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[1]).toBe(2 * 60 * 1000);
    });

    it('should have correct third delay of 10 minutes', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[2]).toBe(10 * 60 * 1000);
    });

    it('should have correct fourth delay of 30 minutes', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[3]).toBe(30 * 60 * 1000);
    });

    it('should have correct fifth delay of 2 hours', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[4]).toBe(2 * 60 * 60 * 1000);
    });

    it('should be a readonly tuple', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS).toBeReadonly();
    });
  });

  describe('RETRY_STRATEGY', () => {
    it('should return first delay for attempt 1', () => {
      expect(RETRY_STRATEGY(1)).toBe(30 * 1000);
    });

    it('should return second delay for attempt 2', () => {
      expect(RETRY_STRATEGY(2)).toBe(2 * 60 * 1000);
    });

    it('should return third delay for attempt 3', () => {
      expect(RETRY_STRATEGY(3)).toBe(10 * 60 * 1000);
    });

    it('should return fourth delay for attempt 4', () => {
      expect(RETRY_STRATEGY(4)).toBe(30 * 60 * 1000);
    });

    it('should return fifth delay for attempt 5', () => {
      expect(RETRY_STRATEGY(5)).toBe(2 * 60 * 60 * 1000);
    });

    it('should return max delay for attempt 6 (beyond defined delays)', () => {
      expect(RETRY_STRATEGY(6)).toBe(2 * 60 * 60 * 1000);
    });

    it('should return max delay for attempt 10', () => {
      expect(RETRY_STRATEGY(10)).toBe(2 * 60 * 60 * 1000);
    });

    it('should return max delay for attempt 100', () => {
      expect(RETRY_STRATEGY(100)).toBe(2 * 60 * 60 * 1000);
    });

    it('should handle attempt 0 (edge case - returns first delay)', () => {
      expect(RETRY_STRATEGY(0)).toBe(30 * 1000);
    });

    it('should handle negative attempt (edge case - returns first delay)', () => {
      expect(RETRY_STRATEGY(-1)).toBe(30 * 1000);
    });
  });

  describe('getQueueConfig', () => {
    it('should parse redis URL with default port', () => {
      const config = getQueueConfig('redis://localhost:6379');

      expect(config).toEqual({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      });
    });

    it('should parse redis URL with custom port', () => {
      const config = getQueueConfig('redis://redis.example.com:6380');

      expect(config).toEqual({
        connection: {
          host: 'redis.example.com',
          port: 6380,
        },
      });
    });

    it('should parse redis URL with no port (defaults to 6379)', () => {
      const config = getQueueConfig('redis://localhost');

      expect(config).toEqual({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      });
    });

    it('should parse redis URL with password', () => {
      const config = getQueueConfig('redis://:password@redis.example.com:6379');

      expect(config).toEqual({
        connection: {
          host: 'redis.example.com',
          port: 6379,
        },
      });
    });

    it('should parse redis URL with username and password', () => {
      const config = getQueueConfig('redis://user:password@redis.example.com:6379');

      expect(config).toEqual({
        connection: {
          host: 'redis.example.com',
          port: 6379,
        },
      });
    });

    it('should parse redis URL with path', () => {
      const config = getQueueConfig('redis://localhost:6379/0');

      expect(config).toEqual({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      });
    });

    it('should parse IPv4 address', () => {
      const config = getQueueConfig('redis://127.0.0.1:6379');

      expect(config).toEqual({
        connection: {
          host: '127.0.0.1',
          port: 6379,
        },
      });
    });

    it('should return object with connection property', () => {
      const config = getQueueConfig('redis://localhost:6379');

      expect(config).toHaveProperty('connection');
      expect(config.connection).toHaveProperty('host');
      expect(config.connection).toHaveProperty('port');
    });
  });
});
