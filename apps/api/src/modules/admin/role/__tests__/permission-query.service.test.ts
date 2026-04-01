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
  userRoles,
  users,
  tenants,
} from '../../../../shared/database/schema/index.js';
import * as permissionQueryService from '../permission-query.service.js';

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

describe('permission-query-service', () => {
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

      const result = await permissionQueryService.getUserEffectivePermissions(
        tenant!.tenantId,
        targetUser!.userId,
        testConfig,
      );

      expect(result.userId).toBe(targetUser!.userId);
      expect(result.permissions).toContain('users:read');
      expect(result.roles).toHaveLength(1);
    });

    it('should filter out expired role assignments', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: 'test-tenant-expired',
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
          email: 'user-expired@test.com',
          displayName: 'Target User',
          passwordHash: 'hash',
          role: 'user',
          isActive: true,
        })
        .returning();

      const [perm] = await db
        .insert(permissions)
        .values({
          resource: 'reports',
          action: 'read',
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

      await db.insert(rolePermissions).values({
        roleId: role!.id,
        permissionId: perm!.id,
      });

      const expiredDate = new Date('2020-01-01T00:00:00Z');

      await db.insert(userRoles).values({
        tenantId: tenant!.tenantId,
        userId: targetUser!.userId,
        roleId: role!.id,
        expiresAt: expiredDate,
      });

      const result = await permissionQueryService.getUserEffectivePermissions(
        tenant!.tenantId,
        targetUser!.userId,
        testConfig,
      );

      expect(result.permissions).not.toContain('reports:read');
      expect(result.roles).toHaveLength(0);
    });

    it('should throw error when user not found', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(
        permissionQueryService.getUserEffectivePermissions(
          '00000000-0000-0000-0000-000000000001',
          nonExistentUserId,
          testConfig,
        ),
      ).rejects.toThrow('User not found');
    });
  });
});
