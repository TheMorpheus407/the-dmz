import { describe, expect, it } from 'vitest';

import { buildABACCacheKey } from '../abac-cache.js';
import { KEY_CATEGORIES } from '../redis-key-manifest.js';

describe('ABAC cache key scoping', () => {
  const tenantId = '12345678-1234-4234-8234-123456789012';
  const userId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

  describe('buildABACCacheKey', () => {
    it('creates tenant-scoped cache key', () => {
      const key = buildABACCacheKey(tenantId, userId);

      expect(key).toContain(tenantId);
      expect(key).toContain(userId);
      expect(key).toContain(KEY_CATEGORIES.ABAC_POLICY);
    });

    it('includes resource and action in key when provided', () => {
      const key = buildABACCacheKey(tenantId, userId, 'admin', 'list');

      expect(key).toContain('admin:list');
    });

    it('uses default permissions resource when no action provided', () => {
      const key = buildABACCacheKey(tenantId, userId);

      expect(key).toContain('permissions');
    });

    it('produces different keys for different users', () => {
      const userId2 = 'bbbbbbbb-cccc-4ccc-dddd-ffffffffffff';
      const key1 = buildABACCacheKey(tenantId, userId);
      const key2 = buildABACCacheKey(tenantId, userId2);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different tenants', () => {
      const tenantId2 = 'cccccccc-dddd-4eee-8fff-111111111111';
      const key1 = buildABACCacheKey(tenantId, userId);
      const key2 = buildABACCacheKey(tenantId2, userId);

      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different resources', () => {
      const key1 = buildABACCacheKey(tenantId, userId, 'admin', 'list');
      const key2 = buildABACCacheKey(tenantId, userId, 'users', 'read');

      expect(key1).not.toBe(key2);
    });
  });
});
