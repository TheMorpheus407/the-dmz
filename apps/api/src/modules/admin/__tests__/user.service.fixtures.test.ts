import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { loadConfig, type AppConfig } from '../../../config.js';

import {
  createAdminUser,
  createTestTenant,
  createTestTenantWithAdmin,
  createTestUser,
} from './user.service.fixtures.js';

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

describe('user.service.fixtures', () => {
  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createTestTenant', () => {
    it('should create a tenant with required fields only', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Minimal Tenant',
        slug: 'minimal-tenant',
      });

      expect(tenant).toBeDefined();
      expect(tenant.tenantId).toBeDefined();
      expect(tenant.name).toBe('Minimal Tenant');
      expect(tenant.slug).toBe('minimal-tenant');
      expect(tenant.tier).toBe('enterprise');
      expect(tenant.status).toBe('active');
      expect(tenant.provisioningStatus).toBe('ready');
      expect(tenant.isActive).toBe(true);
    });

    it('should create a tenant with all custom values', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Custom Tenant',
        slug: 'custom-tenant',
        tier: 'government',
        status: 'suspended',
        provisioningStatus: 'pending',
        isActive: false,
      });

      expect(tenant.name).toBe('Custom Tenant');
      expect(tenant.slug).toBe('custom-tenant');
      expect(tenant.tier).toBe('government');
      expect(tenant.status).toBe('suspended');
      expect(tenant.provisioningStatus).toBe('pending');
      expect(tenant.isActive).toBe(false);
    });

    it('should allow partial override of defaults', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Partial Override',
        slug: 'partial-override',
        tier: 'professional',
      });

      expect(tenant.tier).toBe('professional');
      expect(tenant.status).toBe('active');
      expect(tenant.provisioningStatus).toBe('ready');
      expect(tenant.isActive).toBe(true);
    });
  });

  describe('createTestUser', () => {
    it('should create a user with required fields only', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-user-minimal',
      });

      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user@test.com',
        displayName: 'Test User',
      });

      expect(user).toBeDefined();
      expect(user.userId).toBeDefined();
      expect(user.tenantId).toBe(tenant.tenantId);
      expect(user.email).toBe('user@test.com');
      expect(user.displayName).toBe('Test User');
      expect(user.passwordHash).toBe('hash');
      expect(user.role).toBe('learner');
      expect(user.isActive).toBe(true);
    });

    it('should create a user with all custom values', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-user-custom',
      });

      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'custom@test.com',
        displayName: 'Custom User',
        passwordHash: 'custom-hash',
        role: 'manager',
        isActive: false,
      });

      expect(user.email).toBe('custom@test.com');
      expect(user.displayName).toBe('Custom User');
      expect(user.passwordHash).toBe('custom-hash');
      expect(user.role).toBe('manager');
      expect(user.isActive).toBe(false);
    });

    it('should allow partial override of defaults', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-user-partial',
      });

      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'partial@test.com',
        displayName: 'Partial User',
        role: 'tenant_admin',
      });

      expect(user.role).toBe('tenant_admin');
      expect(user.passwordHash).toBe('hash');
      expect(user.isActive).toBe(true);
    });
  });

  describe('createAdminUser', () => {
    it('should create an admin user with default email and displayName', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-admin-default',
      });

      const admin = await createAdminUser(db, tenant.tenantId);

      expect(admin).toBeDefined();
      expect(admin.userId).toBeDefined();
      expect(admin.tenantId).toBe(tenant.tenantId);
      expect(admin.email).toBe('admin@test.com');
      expect(admin.displayName).toBe('Admin User');
      expect(admin.role).toBe('tenant_admin');
      expect(admin.isActive).toBe(true);
    });

    it('should create an admin user with custom email and displayName', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-admin-custom',
      });

      const admin = await createAdminUser(
        db,
        tenant.tenantId,
        'custom-admin@test.com',
        'Custom Admin',
      );

      expect(admin.email).toBe('custom-admin@test.com');
      expect(admin.displayName).toBe('Custom Admin');
      expect(admin.role).toBe('tenant_admin');
      expect(admin.isActive).toBe(true);
    });

    it('should always set role to tenant_admin regardless of other params', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant-admin-role',
      });

      const admin = await createAdminUser(db, tenant.tenantId, 'role-test@test.com', 'Role Test');
      expect(admin.role).toBe('tenant_admin');
    });
  });

  describe('createTestTenantWithAdmin', () => {
    it('should create a tenant and admin user together', async () => {
      const db = getDatabaseClient(testConfig);

      const { tenant, adminUser } = await createTestTenantWithAdmin(db, {
        tenantSlug: 'combined-tenant',
      });

      expect(tenant).toBeDefined();
      expect(tenant.tenantId).toBeDefined();
      expect(tenant.slug).toBe('combined-tenant');
      expect(tenant.tier).toBe('enterprise');
      expect(tenant.status).toBe('active');

      expect(adminUser).toBeDefined();
      expect(adminUser.tenantId).toBe(tenant.tenantId);
      expect(adminUser.role).toBe('tenant_admin');
      expect(adminUser.email).toBe('admin@test.com');
    });

    it('should create tenant with custom admin email', async () => {
      const db = getDatabaseClient(testConfig);

      const { tenant, adminUser } = await createTestTenantWithAdmin(db, {
        tenantSlug: 'custom-admin-tenant',
        adminEmail: 'special-admin@custom.com',
      });

      expect(tenant.slug).toBe('custom-admin-tenant');
      expect(adminUser.email).toBe('special-admin@custom.com');
      expect(adminUser.role).toBe('tenant_admin');
    });

    it('should use default values when no options provided', async () => {
      const db = getDatabaseClient(testConfig);

      const { tenant, adminUser } = await createTestTenantWithAdmin(db);

      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.tier).toBe('enterprise');
      expect(tenant.status).toBe('active');
      expect(tenant.provisioningStatus).toBe('ready');
      expect(tenant.isActive).toBe(true);

      expect(adminUser.role).toBe('tenant_admin');
      expect(adminUser.isActive).toBe(true);
    });

    it('should create tenant with custom name while using defaults for other fields', async () => {
      const db = getDatabaseClient(testConfig);

      const { tenant } = await createTestTenantWithAdmin(db, {
        tenantName: 'My Custom Named Tenant',
      });

      expect(tenant.name).toBe('My Custom Named Tenant');
      expect(tenant.tier).toBe('enterprise');
      expect(tenant.status).toBe('active');
    });
  });
});
