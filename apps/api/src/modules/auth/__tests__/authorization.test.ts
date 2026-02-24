import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { permissions, roles, rolePermissions, userRoles } from '../../../db/schema/auth/index.js';
import {
  hasPermission,
  hasRole,
  clearPermissionCache,
} from '../../../shared/middleware/authorization.js';

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

describe('authorization middleware - permission checking', () => {
  describe('hasPermission', () => {
    it('returns true when user has the required permission', () => {
      const userPermissions = ['admin:list', 'users:read', 'users:write'];

      expect(hasPermission(userPermissions, 'admin', 'list')).toBe(true);
      expect(hasPermission(userPermissions, 'users', 'read')).toBe(true);
      expect(hasPermission(userPermissions, 'users', 'write')).toBe(true);
    });

    it('returns false when user lacks the required permission', () => {
      const userPermissions = ['users:read', 'users:write'];

      expect(hasPermission(userPermissions, 'admin', 'list')).toBe(false);
      expect(hasPermission(userPermissions, 'roles', 'write')).toBe(false);
    });

    it('returns false for empty permissions array', () => {
      const userPermissions: string[] = [];

      expect(hasPermission(userPermissions, 'admin', 'list')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true when user has one of the required roles', () => {
      const userRoles = ['admin', 'manager', 'learner'];

      expect(hasRole(userRoles, ['admin'])).toBe(true);
      expect(hasRole(userRoles, ['manager'])).toBe(true);
      expect(hasRole(userRoles, ['learner'])).toBe(true);
    });

    it('returns true when user has any of multiple required roles', () => {
      const userRoles = ['admin', 'learner'];

      expect(hasRole(userRoles, ['admin', 'superadmin'])).toBe(true);
      expect(hasRole(userRoles, ['manager', 'learner'])).toBe(true);
    });

    it('returns false when user lacks all required roles', () => {
      const userRoles = ['learner'];

      expect(hasRole(userRoles, ['admin', 'manager'])).toBe(false);
    });

    it('returns false for empty roles array', () => {
      const userRoles: string[] = [];

      expect(hasRole(userRoles, ['admin'])).toBe(false);
    });

    it('performs case-insensitive role matching', () => {
      const userRoles = ['ADMIN', 'Manager'];

      expect(hasRole(userRoles, ['admin'])).toBe(true);
      expect(hasRole(userRoles, ['MANAGER'])).toBe(true);
    });
  });
});

describe('authorization middleware - integration tests', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('Permission allow path for authorized tenant-scoped user', () => {
    it('allows access when user has the required permission', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'perm-allow@example.com',
          password: 'valid pass 1234',
          displayName: 'Perm Allow',
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
          name: 'admin',
          tenantId: user.tenantId,
          description: 'Admin role',
        })
        .returning();

      await db.insert(permissions).values({
        resource: 'admin',
        action: 'list',
      });

      const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));

      await db.insert(rolePermissions).values({
        roleId: role!.id,
        permissionId: perm!.id,
      });

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

  describe('Permission deny path for authenticated but unauthorized user', () => {
    it('returns 403 AUTH_INSUFFICIENT_PERMS when user lacks permission', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'perm-deny@example.com',
          password: 'valid pass 1234',
          displayName: 'Perm Deny',
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
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('Deny-by-default when no permission assignment exists', () => {
    it('denies access when user has no roles', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'no-roles@example.com',
          password: 'valid pass 1234',
          displayName: 'No Roles',
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

  describe('Cross-tenant isolation check', () => {
    it('does not leak permissions across tenants', async () => {
      const tenant1Response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant1-user@example.com',
          password: 'valid pass 1234',
          displayName: 'Tenant 1 User',
        },
      });

      const tenant2Response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant2-user@example.com',
          password: 'valid pass 1234',
          displayName: 'Tenant 2 User',
        },
      });

      const { accessToken: accessToken1, user: user1 } = tenant1Response.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      const { accessToken: accessToken2, user: user2 } = tenant2Response.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      const db = getDatabaseClient(testConfig);

      const perm = await db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, 'admin'))
        .limit(1);

      let permRecord;
      if (perm.length > 0) {
        permRecord = perm[0];
      } else {
        await db.insert(permissions).values({
          resource: 'admin',
          action: 'list',
        });
        [permRecord] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));
      }

      const [roleTenant1] = await db
        .insert(roles)
        .values({
          name: 'admin-cross-tenant',
          tenantId: user1.tenantId,
          description: 'Admin role for tenant 1',
        })
        .returning();

      await db.insert(rolePermissions).values({
        roleId: roleTenant1!.id,
        permissionId: permRecord!.id,
      });

      await db.insert(userRoles).values({
        userId: user1.id,
        roleId: roleTenant1!.id,
        tenantId: user1.tenantId,
      });

      clearPermissionCache(testConfig, user1.tenantId, user1.id);
      clearPermissionCache(testConfig, user2.tenantId, user2.id);

      const tenant1Access = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${accessToken1}`,
        },
      });

      const tenant2Access = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${accessToken2}`,
        },
      });

      expect(tenant1Access.statusCode).toBe(200);
      expect(tenant2Access.statusCode).toBe(403);
    });
  });

  describe('Caching consistency', () => {
    it('returns both permissions and roles from cache', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'cache-test@example.com',
          password: 'valid pass 1234',
          displayName: 'Cache Test',
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
          name: 'manager',
          tenantId: user.tenantId,
          description: 'Manager role',
        })
        .returning();

      await db.insert(permissions).values({
        resource: 'users',
        action: 'read',
      });

      const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'users'));

      await db.insert(rolePermissions).values({
        roleId: role!.id,
        permissionId: perm!.id,
      });

      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
      });

      clearPermissionCache(testConfig, user.tenantId, user.id);

      const firstResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const secondResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const firstBody = firstResponse.json();
      const secondBody = secondResponse.json();

      expect(firstBody.permissions).toEqual(secondBody.permissions);
      expect(firstBody.roles).toEqual(secondBody.roles);
      expect(secondBody.roles).toContain('manager');
    });
  });
});
