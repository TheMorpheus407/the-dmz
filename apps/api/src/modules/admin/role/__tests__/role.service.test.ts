import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../../shared/database/connection.js';
import {
  permissions,
  roles,
  rolePermissions,
  tenants,
} from '../../../../shared/database/schema/index.js';
import * as roleService from '../role.service.js';

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

describe('role-service', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('getTenantRoles', () => {
    it('should return roles for a tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-roles',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      await db.insert(roles).values({
        tenantId: tenant!.tenantId,
        name: 'admin_role',
        description: 'Admin role',
        isSystem: true,
      });

      await db.insert(roles).values({
        tenantId: tenant!.tenantId,
        name: 'user_role',
        description: 'User role',
        isSystem: false,
      });

      const result = await roleService.getTenantRoles(tenant!.tenantId, testConfig);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name).sort()).toEqual(['admin_role', 'user_role']);
    });

    it('should return empty array for tenant with no roles', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Empty Tenant',
          slug: 'empty-tenant-roles',
          tier: 'starter',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const result = await roleService.getTenantRoles(tenant!.tenantId, testConfig);

      expect(result).toHaveLength(0);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-perms-role',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [perm1] = await db
        .insert(permissions)
        .values({
          resource: 'users',
          action: 'read',
        })
        .returning();

      const [perm2] = await db
        .insert(permissions)
        .values({
          resource: 'reports',
          action: 'write',
        })
        .returning();

      const [role] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      await db.insert(rolePermissions).values([
        { roleId: role!.id, permissionId: perm1!.id },
        { roleId: role!.id, permissionId: perm2!.id },
      ]);

      const result = await roleService.getRolePermissions(tenant!.tenantId, role!.id, testConfig);

      expect(result).toContain('users:read');
      expect(result).toContain('reports:write');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for role with no permissions', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-no-perms',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [role] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'empty_role',
          description: 'Role with no permissions',
          isSystem: false,
        })
        .returning();

      const result = await roleService.getRolePermissions(tenant!.tenantId, role!.id, testConfig);

      expect(result).toHaveLength(0);
    });

    it('should throw error when role not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-not-found',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const nonExistentRoleId = '00000000-0000-0000-0000-000000000000';

      await expect(
        roleService.getRolePermissions(tenant!.tenantId, nonExistentRoleId, testConfig),
      ).rejects.toThrow('Role not found');
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      const db = getDatabaseClient(testConfig);

      await db.insert(permissions).values({
        resource: 'users',
        action: 'read',
      });

      await db.insert(permissions).values({
        resource: 'users',
        action: 'write',
      });

      const result = await roleService.getAllPermissions(testConfig);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((p) => p.resource === 'users' && p.action === 'read')).toBe(true);
      expect(result.some((p) => p.resource === 'users' && p.action === 'write')).toBe(true);
    });

    it('should return empty array when no permissions exist', async () => {
      const result = await roleService.getAllPermissions(testConfig);

      expect(result).toEqual([]);
    });
  });
});
