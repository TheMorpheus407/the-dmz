import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../../shared/database/connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
} from '../../../../shared/database/schema/index.js';
import * as customRoleService from '../custom-role.service.js';

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

describe('custom-role-service', () => {
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

  describe('checkPlanEntitlement', () => {
    it('should return true for enterprise plan', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const isEntitled = await customRoleService.checkPlanEntitlement(tenant!.tenantId, testConfig);

      expect(isEntitled).toBe(true);
    });

    it('should return true for government plan', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Government Tenant',
          slug: 'government-tenant',
          tier: 'government',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const isEntitled = await customRoleService.checkPlanEntitlement(tenant!.tenantId, testConfig);

      expect(isEntitled).toBe(true);
    });

    it('should return false for starter plan', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Starter Tenant',
          slug: 'starter-tenant',
          tier: 'starter',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const isEntitled = await customRoleService.checkPlanEntitlement(tenant!.tenantId, testConfig);

      expect(isEntitled).toBe(false);
    });
  });

  describe('createCustomRole', () => {
    it('should create a custom role with permissions', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-custom',
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
          action: 'read',
        })
        .returning();

      const result = await customRoleService.createCustomRole(
        tenant!.tenantId,
        'custom_manager',
        'Custom Manager Role',
        [perm1!.id, perm2!.id],
        testConfig,
      );

      expect(result.name).toBe('custom_manager');
      expect(result.description).toBe('Custom Manager Role');
      expect(result.isSystem).toBe(false);
    });

    it('should throw error when role name already exists', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-dup',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      await db.insert(roles).values({
        tenantId: tenant!.tenantId,
        name: 'existing_role',
        description: 'Existing role',
        isSystem: false,
      });

      await expect(
        customRoleService.createCustomRole(
          tenant!.tenantId,
          'existing_role',
          'Another role',
          [],
          testConfig,
        ),
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('updateCustomRole', () => {
    it('should update a custom role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-update',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [perm] = await db
        .insert(permissions)
        .values({
          resource: 'users',
          action: 'read',
        })
        .returning();

      const [role] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'custom_role',
          description: 'Custom Role',
          isSystem: false,
        })
        .returning();

      await db.insert(rolePermissions).values({
        roleId: role!.id,
        permissionId: perm!.id,
      });

      const result = await customRoleService.updateCustomRole(
        tenant!.tenantId,
        role!.id,
        'updated_role',
        'Updated Description',
        [perm!.id],
        testConfig,
      );

      expect(result.name).toBe('updated_role');
      expect(result.description).toBe('Updated Description');
      expect(result.isSystem).toBe(false);
    });

    it('should throw error when role not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-update-not-found',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const nonExistentRoleId = '00000000-0000-0000-0000-000000000000';

      await expect(
        customRoleService.updateCustomRole(
          tenant!.tenantId,
          nonExistentRoleId,
          'updated_role',
          'Updated Description',
          [],
          testConfig,
        ),
      ).rejects.toThrow('Role not found');
    });

    it('should throw error when modifying system role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-update-system',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [systemRole] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'system_role',
          description: 'System Role',
          isSystem: true,
        })
        .returning();

      await expect(
        customRoleService.updateCustomRole(
          tenant!.tenantId,
          systemRole!.id,
          'updated_system_role',
          'Updated Description',
          [],
          testConfig,
        ),
      ).rejects.toThrow('Cannot modify system roles');
    });

    it('should throw error when new name conflicts with existing role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-update-dup',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [existingRole] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'existing_role',
          description: 'Existing Role',
          isSystem: false,
        })
        .returning();

      await db.insert(roles).values({
        tenantId: tenant!.tenantId,
        name: 'another_role',
        description: 'Another Role',
        isSystem: false,
      });

      await expect(
        customRoleService.updateCustomRole(
          tenant!.tenantId,
          existingRole!.id,
          'another_role',
          'Updated Description',
          [],
          testConfig,
        ),
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('deleteCustomRole', () => {
    it('should delete a custom role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-delete',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [customRole] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'custom_role_to_delete',
          description: 'Custom Role to Delete',
          isSystem: false,
        })
        .returning();

      await customRoleService.deleteCustomRole(tenant!.tenantId, customRole!.id, testConfig);

      const deletedRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, customRole!.id))
        .limit(1);

      expect(deletedRole).toHaveLength(0);
    });

    it('should throw error when role not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-delete-not-found',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const nonExistentRoleId = '00000000-0000-0000-0000-000000000000';

      await expect(
        customRoleService.deleteCustomRole(tenant!.tenantId, nonExistentRoleId, testConfig),
      ).rejects.toThrow('Role not found');
    });

    it('should throw error when deleting system role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant-delete-system',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [systemRole] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'system_role_to_delete',
          description: 'System Role to Delete',
          isSystem: true,
        })
        .returning();

      await expect(
        customRoleService.deleteCustomRole(tenant!.tenantId, systemRole!.id, testConfig),
      ).rejects.toThrow('Cannot delete system roles');
    });
  });
});
