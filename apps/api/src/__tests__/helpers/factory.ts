import { randomUUID } from 'node:crypto';

import {
  createTestTenant as sharedCreateTestTenant,
  createTestUser as sharedCreateTestUser,
  type TenantSeed,
  type UserSeed,
} from '@the-dmz/shared/testing';

export type { TenantSeed, UserSeed };

/** Lightweight tenant builder for tests that don't need full seed data. */
export type TestTenant = {
  id: string;
  name: string;
  slug: string;
};

export const buildTestTenant = (overrides: Partial<TestTenant> = {}): TestTenant => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Test Tenant',
  slug: overrides.slug ?? 'test-tenant',
});

/**
 * Re-export shared factories so API tests can use them from one import path.
 */
export { sharedCreateTestTenant as createTestTenant, sharedCreateTestUser as createTestUser };

/**
 * Dual-tenant fixture for cross-tenant isolation testing.
 * Creates two completely isolated tenants with standard and admin users.
 */
export interface DualTenantFixture {
  tenantA: TestTenant;
  tenantB: TestTenant;
  userAStandard: UserSeed;
  userAAdmin: UserSeed;
  userBStandard: UserSeed;
  userBAdmin: UserSeed;
}

export const createDualTenantFixture = (prefix?: string): DualTenantFixture => {
  const uniquePrefix = prefix ?? `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tenantAId = randomUUID();
  const tenantBId = randomUUID();

  return {
    tenantA: {
      id: tenantAId,
      name: `Tenant A ${uniquePrefix}`,
      slug: `tenant-a-${uniquePrefix}`,
    },
    tenantB: {
      id: tenantBId,
      name: `Tenant B ${uniquePrefix}`,
      slug: `tenant-b-${uniquePrefix}`,
    },
    userAStandard: {
      userId: randomUUID(),
      tenantId: tenantAId,
      email: `user-a-standard@${uniquePrefix}.test`,
      displayName: 'Tenant A Standard User',
      role: 'learner',
      isActive: true,
    },
    userAAdmin: {
      userId: randomUUID(),
      tenantId: tenantAId,
      email: `user-a-admin@${uniquePrefix}.test`,
      displayName: 'Tenant A Admin User',
      role: 'super_admin',
      isActive: true,
    },
    userBStandard: {
      userId: randomUUID(),
      tenantId: tenantBId,
      email: `user-b-standard@${uniquePrefix}.test`,
      displayName: 'Tenant B Standard User',
      role: 'learner',
      isActive: true,
    },
    userBAdmin: {
      userId: randomUUID(),
      tenantId: tenantBId,
      email: `user-b-admin@${uniquePrefix}.test`,
      displayName: 'Tenant B Admin User',
      role: 'super_admin',
      isActive: true,
    },
  };
};
