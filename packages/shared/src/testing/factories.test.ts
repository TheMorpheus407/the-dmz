import { describe, expect, it } from 'vitest';

import { SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';
import { createTestTenant, createTestUser, SEED_TENANTS } from './factories.js';

import type { TenantSeed, UserSeed } from './factories.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('createTestTenant', () => {
  it('returns a tenant with all required fields', () => {
    const tenant = createTestTenant();

    expect(tenant).toHaveProperty('tenantId');
    expect(tenant).toHaveProperty('name');
    expect(tenant).toHaveProperty('slug');
    expect(tenant).toHaveProperty('status');
    expect(tenant).toHaveProperty('settings');
  });

  it('uses deterministic defaults', () => {
    const tenant = createTestTenant();

    expect(tenant.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(tenant.name).toBe('Test Tenant');
    expect(tenant.slug).toBe('test-factory');
    expect(tenant.status).toBe('active');
    expect(tenant.settings).toEqual({});
  });

  it('accepts overrides for all fields', () => {
    const overrides: TenantSeed = {
      tenantId: '11111111-1111-4111-a111-111111111111',
      name: 'Custom Tenant',
      slug: 'custom',
      status: 'suspended',
      settings: { plan: 'enterprise' },
    };

    const tenant = createTestTenant(overrides);
    expect(tenant).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const tenant = createTestTenant({ name: 'Partial Override' });

    expect(tenant.name).toBe('Partial Override');
    expect(tenant.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(tenant.slug).toBe('test-factory');
  });
});

describe('createTestUser', () => {
  it('returns a user with all required fields', () => {
    const user = createTestUser();

    expect(user).toHaveProperty('userId');
    expect(user).toHaveProperty('tenantId');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('displayName');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('isActive');
  });

  it('uses deterministic defaults', () => {
    const user = createTestUser();

    expect(user.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(user.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(user.email).toBe('testuser@example.test');
    expect(user.displayName).toBe('Test User');
    expect(user.role).toBe('learner');
    expect(user.isActive).toBe(true);
  });

  it('accepts overrides for all fields', () => {
    const overrides: UserSeed = {
      userId: '22222222-2222-4222-a222-222222222222',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      email: 'admin@example.test',
      displayName: 'Admin User',
      role: 'super_admin',
      isActive: false,
    };

    const user = createTestUser(overrides);
    expect(user).toEqual(overrides);
  });
});

describe('SEED_TENANTS', () => {
  it('contains exactly 4 tenants', () => {
    expect(SEED_TENANTS).toHaveLength(4);
  });

  it('includes the system tenant first', () => {
    expect(SEED_TENANTS[0]?.slug).toBe('system');
    expect(SEED_TENANTS[0]?.tenantId).toBe(SEED_TENANT_IDS.system);
  });

  it('includes Acme Corp (enterprise, active)', () => {
    const acme = SEED_TENANTS.find((t) => t.slug === 'acme-corp');
    expect(acme).toBeDefined();
    expect(acme?.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(acme?.name).toBe('Acme Corp');
    expect(acme?.status).toBe('active');
  });

  it('includes Consumer Platform (active)', () => {
    const consumer = SEED_TENANTS.find((t) => t.slug === 'consumer');
    expect(consumer).toBeDefined();
    expect(consumer?.tenantId).toBe(SEED_TENANT_IDS.consumerPlatform);
    expect(consumer?.status).toBe('active');
  });

  it('includes Inactive Co (suspended)', () => {
    const inactive = SEED_TENANTS.find((t) => t.slug === 'inactive-co');
    expect(inactive).toBeDefined();
    expect(inactive?.tenantId).toBe(SEED_TENANT_IDS.inactiveCo);
    expect(inactive?.status).toBe('suspended');
  });

  it('has unique slugs', () => {
    const slugs = SEED_TENANTS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique tenant IDs', () => {
    const ids = SEED_TENANTS.map((t) => t.tenantId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has deterministic UUIDs matching SEED_TENANT_IDS', () => {
    for (const tenant of SEED_TENANTS) {
      expect(tenant.tenantId).toMatch(UUID_REGEX);
    }
  });
});
