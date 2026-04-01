import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../../shared/database/connection.js';
import { roles, userRoles, users, tenants } from '../../../../shared/database/schema/index.js';
import * as assignmentService from '../assignment.service.js';

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

describe('assignment-service', () => {
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

      const result = await assignmentService.assignRole(
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

      const result = await assignmentService.assignRole(
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

      const result = await assignmentService.assignRole(
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

      await assignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      await expect(
        assignmentService.assignRole(
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

    it('should throw error when user not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-user-not-found',
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
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(
        assignmentService.assignRole(
          tenant!.tenantId,
          {
            userId: nonExistentUserId,
            roleId: role!.id,
            assignedBy: '00000000-0000-0000-0000-000000000001',
          },
          testConfig,
        ),
      ).rejects.toThrow('Target user not found');
    });

    it('should throw error when role not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-role-not-found',
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
          email: 'user-role-not-found@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
        })
        .returning();

      const nonExistentRoleId = '00000000-0000-0000-0000-000000000000';

      await expect(
        assignmentService.assignRole(
          tenant!.tenantId,
          {
            userId: targetUser!.userId,
            roleId: nonExistentRoleId,
            assignedBy: '00000000-0000-0000-0000-000000000001',
          },
          testConfig,
        ),
      ).rejects.toThrow('Target role not found');
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

      await assignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      await assignmentService.revokeRole(
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

    it('should throw error when assignment not found', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-revoke-not-found',
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
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(
        assignmentService.revokeRole(tenant!.tenantId, nonExistentUserId, role!.id, testConfig),
      ).rejects.toThrow('Role assignment not found');
    });
  });

  describe('updateRoleAssignment', () => {
    it('should update role assignment with new expiration', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-update-exp',
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
          email: 'admin-update-exp@test.com',
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
          email: 'user-update-exp@test.com',
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

      await assignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      const newExpiresAt = new Date('2026-12-31T23:59:59Z');

      const result = await assignmentService.updateRoleAssignment(
        tenant!.tenantId,
        targetUser!.userId,
        role!.id,
        {
          expiresAt: newExpiresAt,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      expect(result.expiresAt).toEqual(newExpiresAt);
      expect(result.scope).toBeNull();
    });

    it('should update role assignment with new scope', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-update-scope',
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
          email: 'admin-update-scope@test.com',
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
          email: 'user-update-scope@test.com',
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

      await assignmentService.assignRole(
        tenant!.tenantId,
        {
          userId: targetUser!.userId,
          roleId: role!.id,
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      const result = await assignmentService.updateRoleAssignment(
        tenant!.tenantId,
        targetUser!.userId,
        role!.id,
        {
          scope: 'engineering',
          assignedBy: adminUser!.userId,
        },
        testConfig,
      );

      expect(result.scope).toBe('engineering');
    });

    it('should throw error when assignment not found', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const nonExistentRoleId = '00000000-0000-0000-0000-000000000001';

      await expect(
        assignmentService.updateRoleAssignment(
          '00000000-0000-0000-0000-000000000002',
          nonExistentUserId,
          nonExistentRoleId,
          {
            assignedBy: '00000000-0000-0000-0000-000000000003',
          },
          testConfig,
        ),
      ).rejects.toThrow('Role assignment not found');
    });

    it('should throw error when user does not exist', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-update-user-not-found',
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
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      await expect(
        assignmentService.updateRoleAssignment(
          tenant!.tenantId,
          '00000000-0000-0000-0000-000000000000',
          role!.id,
          {
            assignedBy: '00000000-0000-0000-0000-000000000001',
          },
          testConfig,
        ),
      ).rejects.toThrow('Role assignment not found');
    });
  });
});
