import { describe, expect, it } from 'vitest';

import { SEED_TENANT_IDS, SEED_USER_IDS } from '@the-dmz/shared/testing';

import { buildTestTenant, createTestTenant, createTestUser } from './factory.js';

describe('buildTestTenant', () => {
  it('returns a tenant with defaults', () => {
    const tenant = buildTestTenant();

    expect(tenant.name).toBe('Test Tenant');
    expect(tenant.slug).toBe('test-tenant');
    expect(tenant.id).toBeDefined();
  });

  it('accepts overrides', () => {
    const tenant = buildTestTenant({ name: 'Custom' });
    expect(tenant.name).toBe('Custom');
  });
});

describe('createTestTenant (shared factory re-export)', () => {
  it('returns a tenant seed with deterministic ID', () => {
    const tenant = createTestTenant();

    expect(tenant.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(tenant.slug).toBe('test-factory');
    expect(tenant.status).toBe('active');
  });
});

describe('createTestUser (shared factory re-export)', () => {
  it('returns a user seed with deterministic ID', () => {
    const user = createTestUser();

    expect(user.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(user.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(user.role).toBe('learner');
    expect(user.isActive).toBe(true);
  });
});
