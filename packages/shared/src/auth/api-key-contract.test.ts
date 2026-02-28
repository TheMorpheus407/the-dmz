import { describe, it, expect } from 'vitest';

import {
  CredentialType,
  CredentialOwnerType,
  CredentialStatus,
  ApiKeyScopeResource,
  scopeActions,
  hasScopePermission,
  hasAllScopePermissions,
  validateScopeCombination,
  scopeToPermissions,
  ApiKeyPermission,
  DEFAULT_ROTATION_GRACE_PERIOD_DAYS,
  MAX_ROTATION_GRACE_PERIOD_DAYS,
  MIN_ROTATION_GRACE_PERIOD_DAYS,
  API_KEY_PREFIX,
  PAT_PREFIX,
  MAX_KEYS_PER_TENANT,
  MAX_KEYS_PER_USER,
} from '@the-dmz/shared/auth/api-key-contract';

describe('api-key-contract', () => {
  describe('CredentialType', () => {
    it('should have correct API_KEY value', () => {
      expect(CredentialType.API_KEY).toBe('api_key');
    });

    it('should have correct PAT value', () => {
      expect(CredentialType.PAT).toBe('pat');
    });
  });

  describe('CredentialOwnerType', () => {
    it('should have correct SERVICE value', () => {
      expect(CredentialOwnerType.SERVICE).toBe('service');
    });

    it('should have correct USER value', () => {
      expect(CredentialOwnerType.USER).toBe('user');
    });
  });

  describe('CredentialStatus', () => {
    it('should have all required status values', () => {
      expect(CredentialStatus.ACTIVE).toBe('active');
      expect(CredentialStatus.ROTATING).toBe('rotating');
      expect(CredentialStatus.REVOKED).toBe('revoked');
      expect(CredentialStatus.EXPIRED).toBe('expired');
    });
  });

  describe('ApiKeyScopeResource', () => {
    it('should have all required resource values', () => {
      expect(ApiKeyScopeResource.ANALYTICS).toBe('analytics');
      expect(ApiKeyScopeResource.USERS).toBe('users');
      expect(ApiKeyScopeResource.ADMIN).toBe('admin');
      expect(ApiKeyScopeResource.WEBHOOKS).toBe('webhooks');
      expect(ApiKeyScopeResource.SCIM).toBe('scim');
      expect(ApiKeyScopeResource.INTEGRATIONS).toBe('integrations');
    });
  });

  describe('scopeActions', () => {
    it('should have correct action values', () => {
      expect(scopeActions).toContain('read');
      expect(scopeActions).toContain('write');
      expect(scopeActions).toContain('admin');
    });
  });

  describe('hasScopePermission', () => {
    const scopes = [
      { resource: ApiKeyScopeResource.ANALYTICS, actions: ['read', 'write'] as const },
      { resource: ApiKeyScopeResource.USERS, actions: ['read'] as const },
    ] as const;

    it('should return true when scope has required permission', () => {
      expect(hasScopePermission(scopes, ApiKeyPermission.ANALYTICS_READ)).toBe(true);
      expect(hasScopePermission(scopes, ApiKeyPermission.ANALYTICS_WRITE)).toBe(true);
      expect(hasScopePermission(scopes, ApiKeyPermission.USERS_READ)).toBe(true);
    });

    it('should return false when scope does not have required permission', () => {
      expect(hasScopePermission(scopes, ApiKeyPermission.USERS_WRITE)).toBe(false);
      expect(hasScopePermission(scopes, ApiKeyPermission.ADMIN_READ)).toBe(false);
    });

    it('should return false for unknown resource', () => {
      expect(hasScopePermission(scopes, ApiKeyPermission.WEBHOOKS_READ)).toBe(false);
    });

    it('should return false for empty scopes', () => {
      expect(hasScopePermission([], ApiKeyPermission.ANALYTICS_READ)).toBe(false);
    });

    it('should respect admin action as wildcard', () => {
      const adminScopes = [
        { resource: ApiKeyScopeResource.ADMIN, actions: ['admin'] as const },
      ] as const;
      expect(hasScopePermission(adminScopes, ApiKeyPermission.ADMIN_READ)).toBe(true);
      expect(hasScopePermission(adminScopes, ApiKeyPermission.ADMIN_WRITE)).toBe(true);
    });
  });

  describe('hasAllScopePermissions', () => {
    const scopes = [
      { resource: ApiKeyScopeResource.ANALYTICS, actions: ['read', 'write'] as const },
      { resource: ApiKeyScopeResource.USERS, actions: ['read', 'write'] as const },
    ] as const;

    it('should return true when all permissions are present', () => {
      expect(
        hasAllScopePermissions(scopes, [
          ApiKeyPermission.ANALYTICS_READ,
          ApiKeyPermission.USERS_READ,
        ]),
      ).toBe(true);
    });

    it('should return false when any permission is missing', () => {
      expect(
        hasAllScopePermissions(scopes, [
          ApiKeyPermission.ANALYTICS_READ,
          ApiKeyPermission.ADMIN_WRITE,
        ]),
      ).toBe(false);
    });

    it('should return true for empty required permissions', () => {
      expect(hasAllScopePermissions(scopes, [])).toBe(true);
    });
  });

  describe('validateScopeCombination', () => {
    const allowedScopes = [
      { resource: ApiKeyScopeResource.ANALYTICS, actions: ['read', 'write'] as const },
      { resource: ApiKeyScopeResource.USERS, actions: ['read'] as const },
    ] as const;

    it('should validate correct scope combinations', () => {
      const requested = [
        { resource: ApiKeyScopeResource.ANALYTICS, actions: ['read'] as const },
      ] as const;
      expect(validateScopeCombination(requested, allowedScopes)).toBe(true);
    });

    it('should reject unknown resources', () => {
      const requested = [
        { resource: ApiKeyScopeResource.WEBHOOKS, actions: ['read'] as const },
      ] as const;
      expect(validateScopeCombination(requested, allowedScopes)).toBe(false);
    });

    it('should reject disallowed actions', () => {
      const requested = [
        { resource: ApiKeyScopeResource.USERS, actions: ['write'] as const },
      ] as const;
      expect(validateScopeCombination(requested, allowedScopes)).toBe(false);
    });

    it('should allow admin action for resources', () => {
      const adminAllowed = [
        { resource: ApiKeyScopeResource.ADMIN, actions: ['admin'] as const },
      ] as const;
      const requested = [
        { resource: ApiKeyScopeResource.ADMIN, actions: ['read'] as const },
      ] as const;
      expect(validateScopeCombination(requested, adminAllowed)).toBe(true);
    });
  });

  describe('scopeToPermissions', () => {
    it('should convert analytics read/write scope to permissions', () => {
      const scope = {
        resource: ApiKeyScopeResource.ANALYTICS,
        actions: ['read', 'write'] as const,
      };
      const permissions = scopeToPermissions(scope);
      expect(permissions).toContain(ApiKeyPermission.ANALYTICS_READ);
      expect(permissions).toContain(ApiKeyPermission.ANALYTICS_WRITE);
    });

    it('should convert admin scope with admin action', () => {
      const scope = {
        resource: ApiKeyScopeResource.ADMIN,
        actions: ['admin'] as const,
      };
      const permissions = scopeToPermissions(scope);
      expect(permissions).toContain(ApiKeyPermission.ADMIN_READ);
      expect(permissions).toContain(ApiKeyPermission.ADMIN_WRITE);
    });
  });

  describe('constants', () => {
    it('should have correct DEFAULT_ROTATION_GRACE_PERIOD_DAYS', () => {
      expect(DEFAULT_ROTATION_GRACE_PERIOD_DAYS).toBe(7);
    });

    it('should have correct MAX_ROTATION_GRACE_PERIOD_DAYS', () => {
      expect(MAX_ROTATION_GRACE_PERIOD_DAYS).toBe(30);
    });

    it('should have correct MIN_ROTATION_GRACE_PERIOD_DAYS', () => {
      expect(MIN_ROTATION_GRACE_PERIOD_DAYS).toBe(1);
    });

    it('should have correct API_KEY_PREFIX', () => {
      expect(API_KEY_PREFIX).toBe('dmz_ak_');
    });

    it('should have correct PAT_PREFIX', () => {
      expect(PAT_PREFIX).toBe('dmz_pat_');
    });

    it('should have correct MAX_KEYS_PER_TENANT', () => {
      expect(MAX_KEYS_PER_TENANT).toBe(100);
    });

    it('should have correct MAX_KEYS_PER_USER', () => {
      expect(MAX_KEYS_PER_USER).toBe(10);
    });
  });
});
