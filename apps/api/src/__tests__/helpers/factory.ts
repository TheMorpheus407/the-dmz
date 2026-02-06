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
