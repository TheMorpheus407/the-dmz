import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  evaluatePermissionRequirements,
  createPermissionKey,
  parsePermissionKey,
  formatPermissionDeclaration,
  formatPermissionRequirements,
} from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { permissions, roles, rolePermissions, userRoles } from '../../../db/schema/auth/index.js';
import { clearPermissionCache } from '../../../shared/middleware/authorization.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('permission declaration middleware - evaluatePermissionRequirements', () => {
  describe('allOf evaluator', () => {
    it('returns true when user has all required permissions', () => {
      const userPermissions = ['admin:list', 'users:read', 'users:write'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'read' },
        ],
        evaluator: 'allOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(true);
    });

    it('returns false when user is missing any required permission', () => {
      const userPermissions = ['admin:list', 'users:read'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'write' },
        ],
        evaluator: 'allOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(false);
    });

    it('returns false when user has none of the required permissions', () => {
      const userPermissions = ['reports:read'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'write' },
        ],
        evaluator: 'allOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(false);
    });
  });

  describe('anyOf evaluator', () => {
    it('returns true when user has any of the required permissions', () => {
      const userPermissions = ['admin:list'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'write' },
        ],
        evaluator: 'anyOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(true);
    });

    it('returns true when user has at least one required permission', () => {
      const userPermissions = ['users:write'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'write' },
        ],
        evaluator: 'anyOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(true);
    });

    it('returns false when user has none of the required permissions', () => {
      const userPermissions = ['reports:read'];
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'write' },
        ],
        evaluator: 'anyOf' as const,
      };

      expect(evaluatePermissionRequirements(userPermissions, requirements)).toBe(false);
    });
  });
});

describe('permission declaration - helper functions', () => {
  describe('createPermissionKey', () => {
    it('creates correct permission key', () => {
      expect(createPermissionKey('admin', 'list')).toBe('admin:list');
      expect(createPermissionKey('users', 'read')).toBe('users:read');
    });
  });

  describe('parsePermissionKey', () => {
    it('parses valid permission key', () => {
      const result = parsePermissionKey('admin:list');
      expect(result).toEqual({ resource: 'admin', action: 'list' });
    });

    it('returns null for invalid permission key', () => {
      expect(parsePermissionKey('invalid')).toBeNull();
    });
  });

  describe('formatPermissionDeclaration', () => {
    it('formats permission declaration correctly', () => {
      expect(formatPermissionDeclaration({ resource: 'admin', action: 'list' })).toBe('admin:list');
    });
  });

  describe('formatPermissionRequirements', () => {
    it('formats all permission requirements', () => {
      const requirements = {
        permissions: [
          { resource: 'admin', action: 'list' },
          { resource: 'users', action: 'read' },
        ],
        evaluator: 'allOf' as const,
      };

      expect(formatPermissionRequirements(requirements)).toEqual(['admin:list', 'users:read']);
    });
  });
});

describe('permission declaration middleware - integration tests', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('allow path for declared permission requirements', () => {
    it('allows access when user has all required permissions (allOf)', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'perm-allow-allof@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Perm Allow AllOf',
        },
      });

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      const db = getDatabaseClient(testConfig);

      const [role] = await db
        .insert(roles)
        .values({
          name: 'admin-allof-test',
          tenantId: user.tenantId,
          description: 'Admin role for allOf test',
        })
        .returning();

      await db.insert(permissions).values({ resource: 'admin', action: 'list' });
      await db.insert(permissions).values({ resource: 'users', action: 'read' });

      const [permAdminList] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, 'admin'));
      const [permUsersRead] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, 'users'));

      await db.insert(rolePermissions).values([
        { roleId: role!.id, permissionId: permAdminList!.id },
        { roleId: role!.id, permissionId: permUsersRead!.id },
      ]);

      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
      });

      clearPermissionCache(testConfig, user.tenantId, user.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('deny path for missing/insufficient permissions', () => {
    it('denies access when user lacks required permissions (allOf)', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'perm-deny-allof@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Perm Deny AllOf',
        },
      });

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      clearPermissionCache(testConfig, user.tenantId, user.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });
  });

  describe('403 response behavior', () => {
    it('returns 403 with AUTH_INSUFFICIENT_PERMS code for insufficient permissions', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'perm-deny-diag@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Perm Deny Diag',
        },
      });

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      clearPermissionCache(testConfig, user.tenantId, user.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });
  });
});
