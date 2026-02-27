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
  isRoleAssignmentValid,
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
          password: 'Valid' + 'Pass123!',
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
          password: 'Valid' + 'Pass123!',
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
          password: 'Valid' + 'Pass123!',
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
          password: 'Valid' + 'Pass123!',
          displayName: 'Tenant 1 User',
        },
      });

      const tenant2Response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant2-user@example.com',
          password: 'Valid' + 'Pass123!',
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
          password: 'Valid' + 'Pass123!',
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

describe('role assignment validity - isRoleAssignmentValid', () => {
  describe('active assignment (no expiry)', () => {
    it('returns valid for assignment with null expiry', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: null });
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns valid for assignment with future expiry', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = isRoleAssignmentValid({ expiresAt: futureDate, scope: null });
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns valid for assignment with matching scope', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: 'admin' }, 'admin');
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns valid for assignment with null scope (any scope allowed)', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: null }, 'admin');
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('expired assignment', () => {
    it('returns invalid for expired assignment', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const result = isRoleAssignmentValid({ expiresAt: pastDate, scope: null });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns invalid at exact boundary time (now)', () => {
      const now = new Date();
      const result = isRoleAssignmentValid({ expiresAt: now, scope: null });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('expired');
    });
  });

  describe('scope mismatch assignment', () => {
    it('returns invalid for scope mismatch', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: 'other-module' }, 'admin');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('scope_mismatch');
    });
  });
});

describe('authorization middleware - role assignment expiry and scope integration', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('expired role assignment', () => {
    it('denies access when role assignment has expired', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'expired-role@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Expired Role User',
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
          name: 'admin-expired',
          tenantId: user.tenantId,
          description: 'Admin role for expired test',
        })
        .returning();

      const permRecord = await db.query.permissions.findFirst({
        where: eq(permissions.resource, 'admin'),
      });

      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: permRecord.id,
        });
      } else {
        await db.insert(permissions).values({
          resource: 'admin',
          action: 'list',
        });
        const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: perm!.id,
        });
      }

      const pastDate = new Date(Date.now() - 86400000);
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
        expiresAt: pastDate,
      });

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

  describe('active role assignment', () => {
    it('allows access when role assignment is active (no expiry)', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'active-role@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Active Role User',
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

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.roles).toContain('manager');
    });
  });

  describe('active role assignment with future expiry', () => {
    it('allows access when role assignment expires in the future', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'future-expiry-role@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Future Expiry Role User',
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
          name: 'trainer-future',
          tenantId: user.tenantId,
          description: 'Trainer role for future expiry test',
        })
        .returning();

      const permRecord = await db.query.permissions.findFirst({
        where: eq(permissions.resource, 'admin'),
      });

      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: permRecord.id,
        });
      } else {
        await db.insert(permissions).values({
          resource: 'admin',
          action: 'list',
        });
        const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: perm!.id,
        });
      }

      const futureDate = new Date(Date.now() + 86400000);
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
        expiresAt: futureDate,
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

  describe('scope mismatch role assignment', () => {
    it('allows access when role assignment has matching scope', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'scope-match@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Scope Match User',
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
          name: 'admin-scope-match',
          tenantId: user.tenantId,
          description: 'Admin role for scope match test',
        })
        .returning();

      const permRecord = await db.query.permissions.findFirst({
        where: eq(permissions.resource, 'admin'),
      });

      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: permRecord.id,
        });
      } else {
        await db.insert(permissions).values({
          resource: 'admin',
          action: 'list',
        });
        const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: perm!.id,
        });
      }

      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
        scope: 'admin',
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

    it('allows access when role assignment has null scope (any scope)', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'scope-null@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Scope Null User',
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
          name: 'admin-scope-null',
          tenantId: user.tenantId,
          description: 'Admin role for scope null test',
        })
        .returning();

      const permRecord = await db.query.permissions.findFirst({
        where: eq(permissions.resource, 'admin'),
      });

      if (permRecord) {
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: permRecord.id,
        });
      } else {
        await db.insert(permissions).values({
          resource: 'admin',
          action: 'list',
        });
        const [perm] = await db.select().from(permissions).where(eq(permissions.resource, 'admin'));
        await db.insert(rolePermissions).values({
          roleId: role!.id,
          permissionId: perm!.id,
        });
      }

      await db.insert(userRoles).values({
        userId: user.id,
        roleId: role!.id,
        tenantId: user.tenantId,
        scope: null,
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
});
