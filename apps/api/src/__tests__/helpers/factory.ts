import { randomUUID } from 'node:crypto';

import {
  buildTestTenant as sharedBuildTestTenant,
  createTestTenant as sharedCreateTestTenant,
  createTestUser as sharedCreateTestUser,
  createTestId,
  type TenantSeed,
  type TestTenant,
  type UserSeed,
} from '@the-dmz/shared/testing';

export type { TenantSeed, TestTenant, UserSeed };

/**
 * Re-export shared factories so API tests can use them from one import path.
 */
export {
  sharedBuildTestTenant as buildTestTenant,
  sharedCreateTestTenant as createTestTenant,
  sharedCreateTestUser as createTestUser,
};

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
  const uniquePrefix = prefix ?? createTestId();
  const tenantAId = randomUUID();
  const tenantBId = randomUUID();

  return {
    tenantA: buildTestTenant({
      tenantId: tenantAId,
      name: `Tenant A ${uniquePrefix}`,
      slug: `tenant-a-${uniquePrefix}`,
    }),
    tenantB: buildTestTenant({
      tenantId: tenantBId,
      name: `Tenant B ${uniquePrefix}`,
      slug: `tenant-b-${uniquePrefix}`,
    }),
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
