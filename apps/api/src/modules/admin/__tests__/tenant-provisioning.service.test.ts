import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  userRoles,
  users,
} from '../../../shared/database/schema/index.js';
import { createTestTenant } from '../../../__tests__/helpers/fixtures.js';
import * as tenantProvisioningService from '../tenant-provisioning.service.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL:
      process.env.TEST_DATABASE_URL || 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.role_permissions,
    auth.user_roles,
    auth.roles,
    auth.permissions,
    auth.sessions,
    auth.sso_connections,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('tenant-provisioning-service', () => {
  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createTenant', () => {
    it('should create a tenant with minimal data', async () => {
      const result = await tenantProvisioningService.createTenant(
        {
          name: 'Test Tenant',
          slug: 'test-tenant',
        },
        testConfig,
      );

      expect(result.tenant.name).toBe('Test Tenant');
      expect(result.tenant.slug).toBe('test-tenant');
      expect(result.tenant.tier).toBe('starter');
      expect(result.tenant.planId).toBe('free');
      expect(result.tenant.dataRegion).toBe('eu');
      expect(result.tenant.provisioningStatus).toBe('pending');
      expect(result.tenant.status).toBe('active');
      expect(result.tenant.isActive).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    });

    it('should create a tenant with all optional fields', async () => {
      const result = await tenantProvisioningService.createTenant(
        {
          name: 'Full Tenant',
          slug: 'full-tenant',
          domain: 'fulltenant.com',
          contactEmail: 'admin@fulltenant.com',
          tier: 'enterprise',
          planId: 'enterprise',
          dataRegion: 'us',
        },
        testConfig,
      );

      expect(result.tenant.domain).toBe('fulltenant.com');
      expect(result.tenant.contactEmail).toBe('admin@fulltenant.com');
      expect(result.tenant.tier).toBe('enterprise');
      expect(result.tenant.planId).toBe('enterprise');
      expect(result.tenant.dataRegion).toBe('us');
    });

    it('should set correct feature flags based on tier', async () => {
      const resultEnterprise = await tenantProvisioningService.createTenant(
        {
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant',
          tier: 'enterprise',
        },
        testConfig,
      );

      expect(resultEnterprise.tenant.settings.featureFlags.api_access).toBe(true);
      expect(resultEnterprise.tenant.settings.featureFlags.dedicated_support).toBe(true);
      expect(resultEnterprise.tenant.settings.featureFlags.fedramp_compliance).toBeUndefined();

      const resultGovernment = await tenantProvisioningService.createTenant(
        {
          name: 'Government Tenant',
          slug: 'government-tenant',
          tier: 'government',
        },
        testConfig,
      );

      expect(resultGovernment.tenant.settings.featureFlags.api_access).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.fedramp_compliance).toBe(true);
    });

    it('should set correct quotas based on tier', async () => {
      const resultStarter = await tenantProvisioningService.createTenant(
        {
          name: 'Starter Tenant',
          slug: 'starter-tenant',
          tier: 'starter',
        },
        testConfig,
      );

      expect(resultStarter.tenant.settings.quotas.maxUsers).toBe(500);
      expect(resultStarter.tenant.settings.quotas.maxStorageGB).toBe(10);

      const resultEnterprise = await tenantProvisioningService.createTenant(
        {
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant',
          tier: 'enterprise',
        },
        testConfig,
      );

      expect(resultEnterprise.tenant.settings.quotas.maxUsers).toBe(-1);
      expect(resultEnterprise.tenant.settings.quotas.maxStorageGB).toBe(-1);
    });

    it('should set correct feature flags for professional tier', async () => {
      const resultProfessional = await tenantProvisioningService.createTenant(
        {
          name: 'Professional Tenant',
          slug: 'professional-tenant',
          tier: 'professional',
        },
        testConfig,
      );

      expect(resultProfessional.tenant.settings.featureFlags.lti_integration).toBe(true);
      expect(resultProfessional.tenant.settings.featureFlags.advanced_analytics).toBe(true);
      expect(resultProfessional.tenant.settings.featureFlags.sso_integration).toBe(true);
      expect(resultProfessional.tenant.settings.featureFlags.scim_provisioning).toBe(true);
      expect(resultProfessional.tenant.settings.featureFlags.custom_branding).toBe(true);
      expect(resultProfessional.tenant.settings.featureFlags.api_access).toBe(false);
      expect(resultProfessional.tenant.settings.featureFlags.dedicated_support).toBeUndefined();
      expect(resultProfessional.tenant.settings.featureFlags.fedramp_compliance).toBeUndefined();
    });

    it('should set correct quotas for professional tier', async () => {
      const result = await tenantProvisioningService.createTenant(
        {
          name: 'Professional Tenant',
          slug: 'professional-tenant-quota',
          tier: 'professional',
        },
        testConfig,
      );

      expect(result.tenant.settings.quotas.maxUsers).toBe(5000);
      expect(result.tenant.settings.quotas.maxStorageGB).toBe(100);
    });

    it('should set correct feature flags for government tier', async () => {
      const resultGovernment = await tenantProvisioningService.createTenant(
        {
          name: 'Government Tenant',
          slug: 'government-tenant-flags',
          tier: 'government',
        },
        testConfig,
      );

      expect(resultGovernment.tenant.settings.featureFlags.api_access).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.dedicated_support).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.fedramp_compliance).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.data_residency).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.lti_integration).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.advanced_analytics).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.sso_integration).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.scim_provisioning).toBe(true);
      expect(resultGovernment.tenant.settings.featureFlags.custom_branding).toBe(true);
    });

    it('should set correct quotas for government tier', async () => {
      const result = await tenantProvisioningService.createTenant(
        {
          name: 'Government Tenant',
          slug: 'government-tenant-quota',
          tier: 'government',
        },
        testConfig,
      );

      expect(result.tenant.settings.quotas.maxUsers).toBe(-1);
      expect(result.tenant.settings.quotas.maxStorageGB).toBe(-1);
    });

    it('should throw error for duplicate slug', async () => {
      await tenantProvisioningService.createTenant(
        {
          name: 'First Tenant',
          slug: 'duplicate-slug',
        },
        testConfig,
      );

      await expect(
        tenantProvisioningService.createTenant(
          {
            name: 'Second Tenant',
            slug: 'duplicate-slug',
          },
          testConfig,
        ),
      ).rejects.toThrow("Tenant with slug 'duplicate-slug' already exists");
    });

    it('should throw error for duplicate domain', async () => {
      await tenantProvisioningService.createTenant(
        {
          name: 'First Tenant',
          slug: 'first-tenant',
          domain: 'samedomain.com',
        },
        testConfig,
      );

      await expect(
        tenantProvisioningService.createTenant(
          {
            name: 'Second Tenant',
            slug: 'second-tenant',
            domain: 'samedomain.com',
          },
          testConfig,
        ),
      ).rejects.toThrow("Tenant with domain 'samedomain.com' already exists");
    });

    it('should throw error for duplicate slug regardless of domain', async () => {
      await tenantProvisioningService.createTenant(
        {
          name: 'First Tenant',
          slug: 'unique-slug',
        },
        testConfig,
      );

      await expect(
        tenantProvisioningService.createTenant(
          {
            name: 'Second Tenant',
            slug: 'unique-slug',
            domain: 'different.com',
          },
          testConfig,
        ),
      ).rejects.toThrow("Tenant with slug 'unique-slug' already exists");
    });
  });

  describe('createDefaultRoles', () => {
    it('should create all 5 default roles', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-roles',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);

      const createdRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      expect(createdRoles).toHaveLength(5);

      const roleNames = createdRoles.map((r) => r.name).sort();
      expect(roleNames).toEqual(['learner', 'manager', 'super_admin', 'tenant_admin', 'trainer']);

      for (const role of createdRoles) {
        expect(role.isSystem).toBe(true);
      }
    });

    it('should be idempotent - calling twice does not error', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-roles-idempotent',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);

      const createdRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      expect(createdRoles).toHaveLength(5);
    });

    it('should update existing roles on re-call', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-roles-update',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);

      const [updatedRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenant.tenantId), eq(roles.name, 'tenant_admin')))
        .limit(1);

      expect(updatedRole.description).toBe('Full tenant administrative access');
      expect(updatedRole.isSystem).toBe(true);
    });
  });

  describe('createInitialAdmin', () => {
    it('should create initial admin user with tenant_admin role', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-admin',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);

      const result = await tenantProvisioningService.createInitialAdmin(
        tenant.tenantId,
        'admin@test.com',
        'Test Admin',
        testConfig,
      );

      expect(result.userId).toBeDefined();
      expect(result.roleId).toBeDefined();
      expect(result.temporaryPassword).toBeDefined();

      const createdUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, result.userId))
        .limit(1);

      expect(createdUser[0]!.email).toBe('admin@test.com');
      expect(createdUser[0]!.displayName).toBe('Test Admin');
      expect(createdUser[0]!.role).toBe('tenant_admin');
      expect(createdUser[0]!.isActive).toBe(true);
      expect(createdUser[0]!.passwordHash).not.toBe('');
    });

    it('should create user-role association', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-admin-role-assoc',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);

      const result = await tenantProvisioningService.createInitialAdmin(
        tenant.tenantId,
        'admin@test.com',
        'Test Admin',
        testConfig,
      );

      const [role] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenant.tenantId), eq(roles.name, 'tenant_admin')))
        .limit(1);

      const userRole = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, result.userId), eq(userRoles.roleId, role!.id)))
        .limit(1);

      expect(userRole).toHaveLength(1);
    });

    it('should throw error when tenant_admin role does not exist', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-no-role',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await expect(
        tenantProvisioningService.createInitialAdmin(
          tenant.tenantId,
          'admin@test.com',
          'Test Admin',
          testConfig,
        ),
      ).rejects.toThrow('Tenant admin role not found');
    });
  });

  describe('assignPermissionsToRoles', () => {
    it('should assign permissions to all default roles', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-perms',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.assignPermissionsToRoles(tenant.tenantId, testConfig);

      const roleRows = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      for (const role of roleRows) {
        const rolePerms = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));

        expect(rolePerms.length).toBeGreaterThan(0);
      }
    });

    it('should create base permissions if they do not exist', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-base-perms',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.assignPermissionsToRoles(tenant.tenantId, testConfig);

      const perms = await db.select().from(permissions);
      expect(perms.length).toBeGreaterThan(0);
    });

    it('should be idempotent - calling twice does not error', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-perms-idempotent',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.assignPermissionsToRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.assignPermissionsToRoles(tenant.tenantId, testConfig);

      const roleRows = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      for (const role of roleRows) {
        const rolePerms = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));

        expect(rolePerms.length).toBeGreaterThan(0);
      }
    });

    it('should assign super_admin the most permissions', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-super-admin-perms',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.createDefaultRoles(tenant.tenantId, testConfig);
      await tenantProvisioningService.assignPermissionsToRoles(tenant.tenantId, testConfig);

      const [superAdminRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenant!.tenantId), eq(roles.name, 'super_admin')))
        .limit(1);

      const [tenantAdminRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenant!.tenantId), eq(roles.name, 'tenant_admin')))
        .limit(1);

      const [learnerRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.tenantId, tenant!.tenantId), eq(roles.name, 'learner')))
        .limit(1);

      const superAdminPerms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, superAdminRole!.id));

      const tenantAdminPerms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, tenantAdminRole!.id));

      const learnerPerms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, learnerRole!.id));

      expect(superAdminPerms.length).toBeGreaterThan(tenantAdminPerms.length);
      expect(superAdminPerms.length).toBeGreaterThan(learnerPerms.length);
    });
  });

  describe('initializeTenant', () => {
    it('should complete full tenant initialization flow', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-init',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      const result = await tenantProvisioningService.initializeTenant(
        tenant.tenantId,
        'admin@test.com',
        'Test Admin',
        testConfig,
      );

      expect(result.userId).toBeDefined();
      expect(result.temporaryPassword).toBeDefined();

      const updatedTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenant.tenantId))
        .limit(1);

      expect(updatedTenant[0]!.provisioningStatus).toBe('ready');

      const createdUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, result.userId))
        .limit(1);

      expect(createdUser[0]!.email).toBe('admin@test.com');

      const createdRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      expect(createdRoles).toHaveLength(5);
    });

    it('should throw error when tenant does not exist', async () => {
      await expect(
        tenantProvisioningService.initializeTenant(
          '00000000-0000-0000-0000-000000000999',
          'admin@test.com',
          'Test Admin',
          testConfig,
        ),
      ).rejects.toThrow('Tenant not found');
    });

    it('should throw error when tenant is already provisioned', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-already-provisioned',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'ready',
        isActive: true,
      });

      await expect(
        tenantProvisioningService.initializeTenant(
          tenant.tenantId,
          'admin@test.com',
          'Test Admin',
          testConfig,
        ),
      ).rejects.toThrow('Tenant is already provisioned');
    });

    it('should set provisioning status to ready after successful initialization', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-init-success',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      const result = await tenantProvisioningService.initializeTenant(
        tenant.tenantId,
        'admin@test.com',
        'Test Admin',
        testConfig,
      );

      expect(result.userId).toBeDefined();
      expect(result.temporaryPassword).toBeDefined();

      const updatedTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenant.tenantId))
        .limit(1);

      expect(updatedTenant[0]!.provisioningStatus).toBe('ready');
    });
  });

  describe('getTenantProvisioningStatus', () => {
    it('should return correct provisioning status', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-status',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'provisioning',
        isActive: true,
      });

      const result = await tenantProvisioningService.getTenantProvisioningStatus(
        tenant.tenantId,
        testConfig,
      );

      expect(result.tenantId).toBe(tenant.tenantId);
      expect(result.name).toBe('Test Tenant');
      expect(result.slug).toBe('test-tenant-status');
      expect(result.provisioningStatus).toBe('provisioning');
    });

    it('should throw error when tenant does not exist', async () => {
      await expect(
        tenantProvisioningService.getTenantProvisioningStatus(
          '00000000-0000-0000-0000-000000000999',
          testConfig,
        ),
      ).rejects.toThrow('Tenant not found');
    });

    it('should return ready status for provisioned tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-status-ready',
        tier: 'enterprise',
        status: 'active',
        provisioningStatus: 'ready',
        isActive: true,
      });

      const result = await tenantProvisioningService.getTenantProvisioningStatus(
        tenant.tenantId,
        testConfig,
      );

      expect(result.provisioningStatus).toBe('ready');
      expect(result.tier).toBe('enterprise');
    });
  });

  describe('isTenantReady', () => {
    it('should return true for ready tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-ready',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'ready',
        isActive: true,
      });

      const result = await tenantProvisioningService.isTenantReady(tenant.tenantId, testConfig);

      expect(result).toBe(true);
    });

    it('should return false for pending tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-pending',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      const result = await tenantProvisioningService.isTenantReady(tenant.tenantId, testConfig);

      expect(result).toBe(false);
    });

    it('should return false for provisioning tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-provisioning',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'provisioning',
        isActive: true,
      });

      const result = await tenantProvisioningService.isTenantReady(tenant.tenantId, testConfig);

      expect(result).toBe(false);
    });

    it('should return false for failed tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-failed',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'failed',
        isActive: true,
      });

      const result = await tenantProvisioningService.isTenantReady(tenant.tenantId, testConfig);

      expect(result).toBe(false);
    });

    it('should return false for non-existent tenant', async () => {
      const result = await tenantProvisioningService.isTenantReady(
        '00000000-0000-0000-0000-000000000999',
        testConfig,
      );

      expect(result).toBe(false);
    });
  });

  describe('seedTenantAuthModel', () => {
    it('should create roles and assign permissions', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-seed',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.seedTenantAuthModel(testConfig, tenant.tenantId);

      const createdRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      expect(createdRoles).toHaveLength(5);

      for (const role of createdRoles) {
        const rolePerms = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));

        expect(rolePerms.length).toBeGreaterThan(0);
      }
    });

    it('should be idempotent - calling twice does not error', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-seed-idempotent',
        tier: 'starter',
        status: 'active',
        provisioningStatus: 'pending',
        isActive: true,
      });

      await tenantProvisioningService.seedTenantAuthModel(testConfig, tenant.tenantId);
      await tenantProvisioningService.seedTenantAuthModel(testConfig, tenant.tenantId);

      const createdRoles = await db.select().from(roles).where(eq(roles.tenantId, tenant.tenantId));

      expect(createdRoles).toHaveLength(5);
    });
  });
});
