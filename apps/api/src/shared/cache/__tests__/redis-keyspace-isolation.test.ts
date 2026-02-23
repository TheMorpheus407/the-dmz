import { describe, expect, it } from 'vitest';

import { KEY_CATEGORIES } from '../redis-key-manifest.js';
import { tenantScopedKey, globalKey, parseKey, validateTenantKey } from '../redis-keys.js';

const TENANT_A = '12345678-1234-5234-8234-123456789012';
const TENANT_B = '87654321-4321-4321-9321-210987654321';

describe('redis-keyspace-isolation', () => {
  describe('cross-tenant cache isolation', () => {
    it('should isolate cache keys between tenant A and tenant B', () => {
      const keyA = tenantScopedKey(KEY_CATEGORIES.CACHE, 'user-profile', TENANT_A);
      const keyB = tenantScopedKey(KEY_CATEGORIES.CACHE, 'user-profile', TENANT_B);

      expect(keyA).not.toBe(keyB);
      expect(keyA).toContain(TENANT_A);
      expect(keyB).toContain(TENANT_B);
    });

    it('should prevent tenant A from validating tenant B keys', () => {
      const keyA = tenantScopedKey(KEY_CATEGORIES.CACHE, 'user-profile', TENANT_A);

      expect(validateTenantKey(keyA, TENANT_B)).toBe(false);
      expect(validateTenantKey(keyA, TENANT_A)).toBe(true);
    });

    it('should parse keys with correct tenant isolation metadata', () => {
      const keyA = tenantScopedKey(KEY_CATEGORIES.CACHE, 'session-data', TENANT_A);
      const parsedA = parseKey(keyA);

      expect(parsedA.tenantId).toBe(TENANT_A);
      expect(parsedA.category).toBe(KEY_CATEGORIES.CACHE);

      const keyB = tenantScopedKey(KEY_CATEGORIES.CACHE, 'session-data', TENANT_B);
      const parsedB = parseKey(keyB);

      expect(parsedB.tenantId).toBe(TENANT_B);
      expect(parsedB.tenantId).not.toBe(parsedA.tenantId);
    });

    it('should isolate session keys between tenants', () => {
      const sessionKeyA = tenantScopedKey(KEY_CATEGORIES.SESSION, 'auth-token', TENANT_A);
      const sessionKeyB = tenantScopedKey(KEY_CATEGORIES.SESSION, 'auth-token', TENANT_B);

      expect(sessionKeyA).not.toBe(sessionKeyB);
      expect(parseKey(sessionKeyA).tenantId).toBe(TENANT_A);
      expect(parseKey(sessionKeyB).tenantId).toBe(TENANT_B);
    });

    it('should isolate rate limit keys between tenants', () => {
      const rateLimitKeyA = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, '10.0.0.1', TENANT_A);
      const rateLimitKeyB = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, '10.0.0.1', TENANT_B);

      expect(rateLimitKeyA).not.toBe(rateLimitKeyB);
      expect(rateLimitKeyA).toContain(TENANT_A);
      expect(rateLimitKeyB).toContain(TENANT_B);
    });
  });

  describe('invalid tenant context failure paths', () => {
    it('should throw when tenantId is missing for tenant-scoped key', () => {
      expect(() => tenantScopedKey(KEY_CATEGORIES.CACHE, 'key', '')).toThrow();
    });

    it('should throw when tenantId is invalid UUID', () => {
      expect(() => tenantScopedKey(KEY_CATEGORIES.CACHE, 'key', 'not-a-uuid')).toThrow();
    });

    it('should throw when tenantId is undefined', () => {
      expect(() =>
        tenantScopedKey(KEY_CATEGORIES.CACHE, 'key', undefined as unknown as string),
      ).toThrow();
    });

    it('should throw when tenantId is null', () => {
      expect(() =>
        tenantScopedKey(KEY_CATEGORIES.CACHE, 'key', null as unknown as string),
      ).toThrow();
    });

    it('should throw when tenantId is an object', () => {
      expect(() =>
        tenantScopedKey(KEY_CATEGORIES.CACHE, 'key', { id: 'test' } as unknown as string),
      ).toThrow();
    });
  });

  describe('global key isolation', () => {
    it('should allow global health check key without tenant', () => {
      const healthKey = globalKey(KEY_CATEGORIES.CACHE, 'health');

      expect(parseKey(healthKey).tenantId).toBeUndefined();
      expect(validateTenantKey(healthKey, TENANT_A)).toBe(false);
    });

    it('should allow global metrics key without tenant', () => {
      const metricsKey = globalKey(KEY_CATEGORIES.CACHE, 'metrics');

      expect(parseKey(metricsKey).tenantId).toBeUndefined();
    });

    it('should reject non-whitelisted global keys', () => {
      expect(() => globalKey(KEY_CATEGORIES.CACHE, 'random-key')).toThrow();
    });

    it('should reject session as global key', () => {
      expect(() => globalKey(KEY_CATEGORIES.SESSION, 'auth-token')).toThrow();
    });
  });

  describe('key format validation', () => {
    it('should reject malformed key formats', () => {
      expect(() => parseKey('invalid')).toThrow();
      expect(() => parseKey('too-short')).toThrow();
      expect(() => parseKey('v1:dmz')).toThrow();
    });

    it('should reject keys with wrong app prefix', () => {
      expect(() => parseKey(`v1:other:rate-limit:${TENANT_A}:key`)).toThrow();
    });

    it('should reject keys with invalid category', () => {
      expect(() => parseKey(`v1:dmz:invalid-category:${TENANT_A}:key`)).toThrow();
    });
  });

  describe('tenant suspension/deactivation isolation', () => {
    it('should generate unique keys for suspended tenant sessions', () => {
      const activeKey = tenantScopedKey(KEY_CATEGORIES.SESSION, 'auth-token', TENANT_A);
      const suspendedKey = tenantScopedKey(KEY_CATEGORIES.SESSION, 'auth-token', TENANT_B);

      expect(activeKey).not.toBe(suspendedKey);
    });

    it('should not allow cross-tenant session validation', () => {
      const tenantASessionKey = tenantScopedKey(KEY_CATEGORIES.SESSION, 'refresh-token', TENANT_A);

      expect(validateTenantKey(tenantASessionKey, TENANT_B)).toBe(false);
    });

    it('should maintain isolation even with identical resource identifiers', () => {
      const resources = ['auth-token', 'refresh-token', 'api-key', 'session-id'];

      for (const resource of resources) {
        const keyA = tenantScopedKey(KEY_CATEGORIES.SESSION, resource, TENANT_A);
        const keyB = tenantScopedKey(KEY_CATEGORIES.SESSION, resource, TENANT_B);

        expect(keyA).not.toBe(keyB);
        expect(validateTenantKey(keyA, TENANT_B)).toBe(false);
        expect(validateTenantKey(keyB, TENANT_A)).toBe(false);
      }
    });
  });

  describe('key collision prevention', () => {
    it('should prevent collision on same IP and path across tenants', () => {
      const ip = '192.168.1.100';
      const path = '/api/v1/users';

      const tenantAKey = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, `${ip}:${path}`, TENANT_A);
      const tenantBKey = tenantScopedKey(KEY_CATEGORIES.RATE_LIMIT, `${ip}:${path}`, TENANT_B);

      expect(tenantAKey).not.toBe(tenantBKey);
      expect(tenantAKey.split(':')[3]).toBe(TENANT_A);
      expect(tenantBKey.split(':')[3]).toBe(TENANT_B);
    });

    it('should prevent collision on same user identifier across tenants', () => {
      const userId = 'user-123';

      const tenantAKey = tenantScopedKey(KEY_CATEGORIES.CACHE, `user:${userId}`, TENANT_A);
      const tenantBKey = tenantScopedKey(KEY_CATEGORIES.CACHE, `user:${userId}`, TENANT_B);

      expect(tenantAKey).not.toBe(tenantBKey);
    });
  });
});
