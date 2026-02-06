import { SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';

/**
 * Shape of a tenant row for seeding. Matches the Drizzle `tenants` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
 */
export type TenantSeed = {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  settings: Record<string, unknown>;
};

/**
 * Shape of a user row for seeding. Placeholder until the users table
 * is created by issue #18.
 */
export type UserSeed = {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
};

/**
 * Build a tenant seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 */
export const createTestTenant = (overrides: Partial<TenantSeed> = {}): TenantSeed => ({
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Tenant',
  slug: overrides.slug ?? 'test-factory',
  status: overrides.status ?? 'active',
  settings: overrides.settings ?? {},
});

/**
 * Build a user seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 *
 * Note: The users table does not exist yet (blocked by issue #18).
 * This factory is ready for use once the migration lands.
 */
export const createTestUser = (overrides: Partial<UserSeed> = {}): UserSeed => ({
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  email: overrides.email ?? 'testuser@example.test',
  displayName: overrides.displayName ?? 'Test User',
  role: overrides.role ?? 'learner',
  isActive: overrides.isActive ?? true,
});

/**
 * The canonical set of tenants used by the seed script.
 * Exported so both the API seed and E2E setup can reference the same data.
 */
export const SEED_TENANTS: readonly TenantSeed[] = [
  {
    tenantId: SEED_TENANT_IDS.system,
    name: 'The DMZ',
    slug: 'system',
    status: 'active',
    settings: {},
  },
  {
    tenantId: SEED_TENANT_IDS.acmeCorp,
    name: 'Acme Corp',
    slug: 'acme-corp',
    status: 'active',
    settings: { plan: 'enterprise' },
  },
  {
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    name: 'Consumer Platform',
    slug: 'consumer',
    status: 'active',
    settings: { plan: 'consumer' },
  },
  {
    tenantId: SEED_TENANT_IDS.inactiveCo,
    name: 'Inactive Co',
    slug: 'inactive-co',
    status: 'suspended',
    settings: {},
  },
] as const;
