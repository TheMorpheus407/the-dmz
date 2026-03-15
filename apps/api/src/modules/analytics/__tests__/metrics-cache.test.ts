import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MetricsCache } from '../metrics-cache.js';

describe('MetricsCache', () => {
  let cache: MetricsCache;

  beforeEach(() => {
    cache = new MetricsCache(100);
  });

  describe('get/set', () => {
    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should store and retrieve data', () => {
      cache.set('key1', { foo: 'bar' });
      const result = cache.get<{ foo: string }>('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for expired entries', async () => {
      cache.set('key1', { foo: 'bar' }, 10);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove specific key', () => {
      cache.set('key1', { foo: 'bar' });
      cache.invalidate('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should remove keys matching pattern', () => {
      cache.set('phishing:tenant1:all', { data: 1 });
      cache.set('phishing:tenant1:user1', { data: 2 });
      cache.set('scoring:tenant1:user1', { data: 3 });

      cache.invalidatePattern('^phishing:');

      expect(cache.get('phishing:tenant1:all')).toBeNull();
      expect(cache.get('phishing:tenant1:user1')).toBeNull();
      expect(cache.get('scoring:tenant1:user1')).toEqual({ data: 3 });
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', { foo: 'bar' });
      cache.set('key2', { baz: 'qux' });
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if present', async () => {
      cache.set('key1', { foo: 'bar' });
      const factory = vi.fn().mockResolvedValue({ foo: 'baz' });

      const result = await cache.getOrSet('key1', factory);

      expect(result).toEqual({ foo: 'bar' });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not present', async () => {
      const factory = vi.fn().mockResolvedValue({ foo: 'bar' });

      const result = await cache.getOrSet('key1', factory);

      expect(result).toEqual({ foo: 'bar' });
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});
