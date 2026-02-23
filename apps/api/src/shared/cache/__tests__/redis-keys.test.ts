import { describe, it, expect } from 'vitest';

import { KEY_CATEGORIES, REDIS_KEYSPACE_VERSION } from '../redis-key-manifest.js';
import {
  tenantScopedKey,
  globalKey,
  parseKey,
  validateTenantKey,
  getTTL,
  validateTenantId,
  InvalidTenantIdError,
  InvalidKeyCategoryError,
  GlobalKeyNotAllowedError,
} from '../redis-keys.js';

const VALID_TENANT_ID = '12345678-1234-5234-8234-123456789012';
const VALID_TENANT_ID_2 = '87654321-4321-4321-9321-210987654321';

describe('redis-keys', () => {
  describe('tenantScopedKey', () => {
    it('should build a key with tenant_id', () => {
      const key = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, '10.0.0.1', VALID_TENANT_ID);

      expect(key).toBe(`v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1`);
    });

    it('should build a key with groupId', () => {
      const key = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, '10.0.0.1:admin', VALID_TENANT_ID);

      expect(key).toBe(`v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1:admin`);
    });

    it('should throw InvalidTenantIdError for invalid UUID', () => {
      expect(() => tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, 'key', 'invalid')).toThrow(
        InvalidTenantIdError,
      );
    });

    it('should throw InvalidTenantIdError for undefined tenantId', () => {
      expect(() =>
        tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, 'key', undefined as unknown as string),
      ).toThrow(InvalidTenantIdError);
    });

    it('should throw InvalidTenantIdError for empty string', () => {
      expect(() => tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, 'key', '')).toThrow(
        InvalidTenantIdError,
      );
    });

    it('should throw InvalidKeyCategoryError for invalid category', () => {
      expect(() =>
        tenantScopedKey('invalid-category' as keyof typeof KEY_CATEGORIES, 'key', VALID_TENANT_ID),
      ).toThrow(InvalidKeyCategoryError);
    });

    it('should use custom version when provided', () => {
      const key = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, 'key', VALID_TENANT_ID, {
        version: 'v2',
      });

      expect(key).toMatch(/^v2:/);
    });

    it('should include all key segments', () => {
      const key = tenantScopedKey(KEY_CATEGORIES.CACHE, 'profile', VALID_TENANT_ID);

      const segments = key.split(':');
      expect(segments[0]).toBe(REDIS_KEYSPACE_VERSION);
      expect(segments[1]).toBe('dmz');
      expect(segments[2]).toBe('cache');
      expect(segments[3]).toBe(VALID_TENANT_ID);
      expect(segments[4]).toBe('profile');
    });
  });

  describe('globalKey', () => {
    it('should build a global key for allowed keys', () => {
      const key = globalKey(KEY_CATEGORIES.CACHE, 'health');

      expect(key).toBe('v1:dmz:cache:health');
    });

    it('should throw GlobalKeyNotAllowedError for non-allowed keys', () => {
      expect(() => globalKey(KEY_CATEGORIES.CACHE, 'some-random-key')).toThrow(
        GlobalKeyNotAllowedError,
      );
    });

    it('should throw InvalidKeyCategoryError for invalid category', () => {
      expect(() => globalKey('invalid-category' as keyof typeof KEY_CATEGORIES, 'health')).toThrow(
        InvalidKeyCategoryError,
      );
    });

    it('should use custom version when provided', () => {
      const key = globalKey(KEY_CATEGORIES.CACHE, 'health', { version: 'v2' });

      expect(key).toMatch(/^v2:/);
    });
  });

  describe('parseKey', () => {
    it('should parse a tenant-scoped key', () => {
      const key = `v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1`;
      const parsed = parseKey(key);

      expect(parsed.version).toBe('v1');
      expect(parsed.app).toBe('dmz');
      expect(parsed.category).toBe(KEY_CATEGORIES.RATE_LIMIT);
      expect(parsed.tenantId).toBe(VALID_TENANT_ID);
      expect(parsed.resource).toBe('10.0.0.1');
      expect(parsed.raw).toBe(key);
    });

    it('should parse a global key', () => {
      const key = 'v1:dmz:cache:health';
      const parsed = parseKey(key);

      expect(parsed.version).toBe('v1');
      expect(parsed.app).toBe('dmz');
      expect(parsed.category).toBe(KEY_CATEGORIES.CACHE);
      expect(parsed.tenantId).toBeUndefined();
      expect(parsed.resource).toBe('health');
    });

    it('should parse key with multiple resource segments', () => {
      const key = `v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1:admin`;
      const parsed = parseKey(key);

      expect(parsed.resource).toBe('10.0.0.1:admin');
    });

    it('should throw for invalid key format', () => {
      expect(() => parseKey('invalid')).toThrow();
    });

    it('should throw for invalid app prefix', () => {
      expect(() => parseKey(`v1:other:rate-limit:${VALID_TENANT_ID}:key`)).toThrow();
    });
  });

  describe('validateTenantKey', () => {
    it('should return true for matching tenant', () => {
      const key = `v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1`;

      expect(validateTenantKey(key, VALID_TENANT_ID)).toBe(true);
    });

    it('should return false for non-matching tenant', () => {
      const key = `v1:dmz:rate-limit:${VALID_TENANT_ID}:10.0.0.1`;

      expect(validateTenantKey(key, VALID_TENANT_ID_2)).toBe(false);
    });

    it('should return false for global key', () => {
      const key = 'v1:dmz:cache:health';

      expect(validateTenantKey(key, VALID_TENANT_ID)).toBe(false);
    });

    it('should return false for invalid key', () => {
      expect(validateTenantKey('invalid', VALID_TENANT_ID)).toBe(false);
    });
  });

  describe('validateTenantId', () => {
    it('should return true for valid UUID', () => {
      expect(validateTenantId(VALID_TENANT_ID)).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(validateTenantId('invalid')).toBe(false);
      expect(validateTenantId('')).toBe(false);
      expect(validateTenantId('123')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateTenantId(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateTenantId(null as unknown as string)).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('should return default TTL for rate-limit', () => {
      const ttl = getTTL(KEY_CATEGORIES.RATE_LIMIT);

      expect(ttl).toBe(60);
    });

    it('should return default TTL for session', () => {
      const ttl = getTTL(KEY_CATEGORIES.SESSION);

      expect(ttl).toBe(3600);
    });

    it('should return default TTL for cache', () => {
      const ttl = getTTL(KEY_CATEGORIES.CACHE);

      expect(ttl).toBe(300);
    });

    it('should return custom TTL when provided', () => {
      const ttl = getTTL(KEY_CATEGORIES.RATE_LIMIT, { ttlSeconds: 120 });

      expect(ttl).toBe(120);
    });
  });
});
