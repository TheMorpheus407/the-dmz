/**
 * Deterministic UUIDs for seed data.
 *
 * Using fixed UUIDs ensures predictable test assertions and allows
 * referencing seed entities by known IDs across the test suite.
 *
 * The system tenant UUID matches the initial migration
 * (`0000_rich_fantastic_four.sql`). All other UUIDs follow
 * the same zero-padded format for consistency.
 *
 * Format:
 * - Tenants: 00000000-0000-0000-0000-0000000000xx
 * - Users:   00000000-0000-0000-0000-00tttt00uurr
 *   (tttt = tenant index, uu = user index, rr = role index)
 */

export const SEED_TENANT_IDS = {
  /** System tenant — "The DMZ" platform tenant (matches migration) */
  system: '00000000-0000-0000-0000-000000000001',
  /** Acme Corp — enterprise tenant, active */
  acmeCorp: '00000000-0000-0000-0000-000000000010',
  /** Consumer Platform — default consumer tenant, active */
  consumerPlatform: '00000000-0000-0000-0000-000000000020',
  /** Inactive Co — deactivated tenant for testing */
  inactiveCo: '00000000-0000-0000-0000-000000000030',
} as const;

export type SeedTenantKey = keyof typeof SEED_TENANT_IDS;

/**
 * Deterministic user UUIDs per tenant.
 * Added as a placeholder — will be populated once the users table
 * is created by issue #18.
 */
export const SEED_USER_IDS = {
  acmeCorp: {
    superAdmin: '00000000-0000-0000-0000-000010000101',
    tenantAdmin: '00000000-0000-0000-0000-000010000102',
    manager: '00000000-0000-0000-0000-000010000103',
    learner: '00000000-0000-0000-0000-000010000104',
  },
  consumerPlatform: {
    superAdmin: '00000000-0000-0000-0000-000020000201',
    tenantAdmin: '00000000-0000-0000-0000-000020000202',
    manager: '00000000-0000-0000-0000-000020000203',
    learner: '00000000-0000-0000-0000-000020000204',
  },
  inactiveCo: {
    superAdmin: '00000000-0000-0000-0000-000030000301',
    tenantAdmin: '00000000-0000-0000-0000-000030000302',
    manager: '00000000-0000-0000-0000-000030000303',
    learner: '00000000-0000-0000-0000-000030000304',
  },
} as const;

export type SeedUserKey = keyof typeof SEED_USER_IDS;
