import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import {
  permissions,
  roles,
  rolePermissions,
  userRoles,
  users,
  tenants,
} from '../../../shared/database/schema/index.js';
import * as roleAssignmentService from '../role-assignment.service.js';

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

describe('role-assignment-service', () => {
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

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'admin@test.com',
          displayName: 'Admin User',
          passwordHash: 'hash',
          role: 'admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
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

      const result = await roleAssignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      expect(result.userId).toBe(targetUser!.userId);
      expect(result.roleId).toBe(role!.id);
      expect(result.tenantId).toBe(tenant!.tenantId);
      expect(result.assignedBy).toBe(adminUser!.userId);
    });

    it('should assign a role with expiration date', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-exp',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'admin2@test.com',
          displayName: 'Admin User',
          passwordHash: 'hash',
          role: 'admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user2@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
        })
        .returning();

      const [role] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'trainer',
          description: 'Trainer role',
          isSystem: true,
        })
        .returning();

      const expiresAt = new Date('2025-12-31T23:59:59Z');

      const result = await roleAssignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          expiresAt,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('should assign a role with scope', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-scope',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'admin3@test.com',
          displayName: 'Admin User',
          passwordHash: 'hash',
          role: 'admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user3@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
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

      const result = await roleAssignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          scope: 'engineering',
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      expect(result.scope).toBe('engineering');
    });

    it('should throw error when user already has role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-dup',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'admin4@test.com',
          displayName: 'Admin User',
          passwordHash: 'hash',
          role: 'admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user4@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
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

      await roleAssignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      await expect(
        roleAssignmentService.assignRole(
          tenant!.tenantId,
          {
            userId: targetUser!.userId,
            roleId: role!.id,
            assignedBy: adminUser!.userId,
          },
          testConfig,
        ),
      ).rejects.toThrow('User already has this role');
    });
  });

  describe('revokeRole', () => {
    it('should revoke a role from a user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-revoke',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'admin5@test.com',
          displayName: 'Admin User',
          passwordHash: 'hash',
          role: 'admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user5@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
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

      await roleAssignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      await roleAssignmentService.revokeRole(
        tenant!.tenantId,
        targetUser!.userId,
        role!.id,
        testConfig,
      );

      const assignments = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, targetUser!.userId));

      expect(assignments).toHaveLength(0);
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return effective permissions for a user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-perms',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'user6@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
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
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      await db.insert(rolePermissions).values({
        roleId: role!.id,
        permissionId: perm!.id,
      });

      await db.insert(userRoles).values({
        tenantId: tenant!.tenantId,
        userId: targetUser!.userId,
        roleId: role!.id,
      });

      const result = await roleAssignmentService.getUserEffectivePermissions(
        tenant!.tenantId,
        targetUser!.userId,
        testConfig,
      );

      expect(result.userId).toBe(targetUser!.userId);
      expect(result.permissions).toContain('users:read');
      expect(result.roles).toHaveLength(1);
    });
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

      const isEntitled = await roleAssignmentService.checkPlanEntitlement(
        tenant!.tenantId,
        testConfig,
      );

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

      const isEntitled = await roleAssignmentService.checkPlanEntitlement(
        tenant!.tenantId,
        testConfig,
      );

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

      const isEntitled = await roleAssignmentService.checkPlanEntitlement(
        tenant!.tenantId,
        testConfig,
      );

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

      const result = await roleAssignmentService.createCustomRole(
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
        roleAssignmentService.createCustomRole(
          tenant!.tenantId,
          'existing_role',
          'Another role',
          [],
          testConfig,
        ),
      ).rejects.toThrow('Role with this name already exists');
    });
  });
});
