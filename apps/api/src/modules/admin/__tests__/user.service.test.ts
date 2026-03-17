import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { tenants, users, roles } from '../../../shared/database/schema/index.js';
import * as userService from '../user.service.js';

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

describe('user-service', () => {
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

  describe('createUser', () => {
    it('should create a new user', async () => {
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
          role: 'tenant_admin',
          isActive: true,
        })
        .returning();

      const result = await userService.createUser(
        tenant!.tenantId,
        {
          email: 'newuser@test.com',
          displayName: 'New User',
          role: 'learner',
        },
        adminUser!.userId,
        testConfig,
      );

      expect(result.email).toBe('newuser@test.com');
      expect(result.displayName).toBe('New User');
      expect(result.role).toBe('learner');
      expect(result.isActive).toBe(true);
    });

    it('should throw error when email already exists', async () => {
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

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'existing@test.com',
        displayName: 'Existing User',
        passwordHash: 'hash',
        role: 'learner',
        isActive: true,
      });

      await expect(
        userService.createUser(
          tenant!.tenantId,
          {
            email: 'existing@test.com',
            displayName: 'Another User',
          },
          '00000000-0000-0000-0000-000000000001',
          testConfig,
        ),
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('updateUser', () => {
    it('should update user details', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-update',
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
          role: 'tenant_admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'target@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .returning();

      const result = await userService.updateUser(
        tenant!.tenantId,
        targetUser!.userId,
        {
          displayName: 'Updated Name',
          email: 'updated@test.com',
        },
        adminUser!.userId,
        testConfig,
      );

      expect(result.displayName).toBe('Updated Name');
      expect(result.email).toBe('updated@test.com');
    });

    it('should deactivate user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-deactivate',
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
          role: 'tenant_admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'target@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .returning();

      const result = await userService.updateUser(
        tenant!.tenantId,
        targetUser!.userId,
        { isActive: false },
        adminUser!.userId,
        testConfig,
      );

      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-delete',
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
          role: 'tenant_admin',
          isActive: true,
        })
        .returning();

      const [targetUser] = await db
        .insert(users)
        .values({
          tenantId: tenant!.tenantId,
          email: 'target@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .returning();

      await userService.deleteUser(
        tenant!.tenantId,
        targetUser!.userId,
        adminUser!.userId,
        testConfig,
      );

      const deleted = await db
        .select()
        .from(users)
        .where(eq(users.userId, targetUser!.userId))
        .limit(1);

      expect(deleted).toHaveLength(0);
    });

    it('should throw error when trying to delete own account', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-self-delete',
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
          role: 'tenant_admin',
          isActive: true,
        })
        .returning();

      await expect(
        userService.deleteUser(tenant!.tenantId, adminUser!.userId, adminUser!.userId, testConfig),
      ).rejects.toThrow('Cannot delete your own account');
    });
  });

  describe('getUserById', () => {
    it('should return user with role assignments', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-get',
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
          email: 'target@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .returning();

      const [_role] = await db
        .insert(roles)
        .values({
          tenantId: tenant!.tenantId,
          name: 'manager',
          description: 'Manager role',
          isSystem: true,
        })
        .returning();

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'admin@test.com',
        displayName: 'Admin User',
        passwordHash: 'hash',
        role: 'tenant_admin',
        isActive: true,
      });

      const result = await userService.getUserById(
        tenant!.tenantId,
        targetUser!.userId,
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result!.email).toBe('target@test.com');
      expect(result!.displayName).toBe('Target User');
    });

    it('should return null for non-existent user', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-notfound',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      const result = await userService.getUserById(
        tenant!.tenantId,
        '00000000-0000-0000-0000-000000000999',
        testConfig,
      );

      expect(result).toBeNull();
    });
  });

  describe('listUsers', () => {
    it('should return paginated list of users', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-list',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      for (let i = 0; i < 25; i++) {
        await db.insert(users).values({
          tenantId: tenant!.tenantId,
          email: `user${i}@test.com`,
          displayName: `User ${i}`,
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        });
      }

      const result = await userService.listUsers(
        tenant!.tenantId,
        { page: 1, limit: 10 },
        testConfig,
      );

      expect(result.users).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it('should filter users by search term', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-search',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'john.doe@test.com',
        displayName: 'John Doe',
        passwordHash: 'hash',
        role: 'learner',
        isActive: true,
      });

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'jane.smith@test.com',
        displayName: 'Jane Smith',
        passwordHash: 'hash',
        role: 'manager',
        isActive: true,
      });

      const result = await userService.listUsers(tenant!.tenantId, { search: 'john' }, testConfig);

      expect(result.users).toHaveLength(1);
      expect(result.users[0]!.displayName).toBe('John Doe');
    });

    it('should filter users by role', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-role-filter',
          tier: 'enterprise',
          status: 'active',
          provisioningStatus: 'ready',
          isActive: true,
        })
        .returning();

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'learner@test.com',
        displayName: 'Learner User',
        passwordHash: 'hash',
        role: 'learner',
        isActive: true,
      });

      await db.insert(users).values({
        tenantId: tenant!.tenantId,
        email: 'manager@test.com',
        displayName: 'Manager User',
        passwordHash: 'hash',
        role: 'manager',
        isActive: true,
      });

      const result = await userService.listUsers(tenant!.tenantId, { role: 'manager' }, testConfig);

      expect(result.users).toHaveLength(1);
      expect(result.users[0]!.role).toBe('manager');
    });
  });
});
