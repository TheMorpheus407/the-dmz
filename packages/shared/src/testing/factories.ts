import { SEED_PROFILE_IDS, SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';

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
 * Shape of a user row for seeding. Matches the Drizzle `users` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
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
 * Shape of a user profile row for seeding. Matches the Drizzle `user_profiles` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
 */
export type ProfileSeed = {
  profileId: string;
  userId: string;
  tenantId: string;
  locale: string;
  timezone: string;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
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
 * Build a user profile seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 */
export const createTestProfile = (overrides: Partial<ProfileSeed> = {}): ProfileSeed => ({
  profileId: overrides.profileId ?? SEED_PROFILE_IDS.acmeCorp.learner,
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  locale: overrides.locale ?? 'en',
  timezone: overrides.timezone ?? 'UTC',
  accessibilitySettings: overrides.accessibilitySettings ?? {},
  notificationSettings: overrides.notificationSettings ?? {},
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

/**
 * The canonical set of users used by the seed script.
 * Exported so both the API seed and E2E setup can reference the same data.
 */
export const SEED_USERS: readonly UserSeed[] = [
  {
    userId: SEED_USER_IDS.acmeCorp.superAdmin,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'admin@acme.test',
    displayName: 'Acme Admin',
    role: 'super_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.tenantAdmin,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'tenant-admin@acme.test',
    displayName: 'Acme Tenant Admin',
    role: 'tenant_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.manager,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'manager@acme.test',
    displayName: 'Acme Manager',
    role: 'manager',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.learner,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'learner@acme.test',
    displayName: 'Acme Learner',
    role: 'learner',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.superAdmin,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'admin@consumer.test',
    displayName: 'Consumer Admin',
    role: 'super_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.tenantAdmin,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'tenant-admin@consumer.test',
    displayName: 'Consumer Tenant Admin',
    role: 'tenant_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.manager,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'manager@consumer.test',
    displayName: 'Consumer Manager',
    role: 'manager',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.learner,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'player@consumer.test',
    displayName: 'Consumer Player',
    role: 'learner',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.superAdmin,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'admin@inactive.test',
    displayName: 'Inactive Admin',
    role: 'super_admin',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.tenantAdmin,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'tenant-admin@inactive.test',
    displayName: 'Inactive Tenant Admin',
    role: 'tenant_admin',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.manager,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'manager@inactive.test',
    displayName: 'Inactive Manager',
    role: 'manager',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.learner,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'learner@inactive.test',
    displayName: 'Inactive Learner',
    role: 'learner',
    isActive: false,
  },
] as const;

const DEFAULT_ACCESSIBILITY_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  screenReader: false,
  fontSize: 'normal',
} as const;

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,
  push: false,
  sms: false,
  marketing: false,
} as const;

const buildProfile = (
  tenantKey: keyof typeof SEED_PROFILE_IDS,
  roleKey: keyof (typeof SEED_PROFILE_IDS)[keyof typeof SEED_PROFILE_IDS],
): ProfileSeed => ({
  profileId: SEED_PROFILE_IDS[tenantKey][roleKey],
  userId: SEED_USER_IDS[tenantKey][roleKey],
  tenantId: SEED_TENANT_IDS[tenantKey],
  locale: 'en',
  timezone: 'UTC',
  accessibilitySettings: { ...DEFAULT_ACCESSIBILITY_SETTINGS },
  notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
});

export const SEED_PROFILES: readonly ProfileSeed[] = [
  buildProfile('acmeCorp', 'superAdmin'),
  buildProfile('acmeCorp', 'tenantAdmin'),
  buildProfile('acmeCorp', 'manager'),
  buildProfile('acmeCorp', 'learner'),
  buildProfile('consumerPlatform', 'superAdmin'),
  buildProfile('consumerPlatform', 'tenantAdmin'),
  buildProfile('consumerPlatform', 'manager'),
  buildProfile('consumerPlatform', 'learner'),
  buildProfile('inactiveCo', 'superAdmin'),
  buildProfile('inactiveCo', 'tenantAdmin'),
  buildProfile('inactiveCo', 'manager'),
  buildProfile('inactiveCo', 'learner'),
] as const;
