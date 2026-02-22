import { describe, expect, it } from 'vitest';

import { SEED_PROFILE_IDS, SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';
import {
  createTestProfile,
  createTestTenant,
  createTestUser,
  SEED_PROFILES,
  SEED_TENANTS,
  SEED_USERS,
} from './factories.js';

import type { ProfileSeed, TenantSeed, UserSeed } from './factories.js';

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

describe('SEED_USERS', () => {
  it('has at least 4 users per non-system tenant', () => {
    const nonSystemTenantIds = [
      SEED_TENANT_IDS.acmeCorp,
      SEED_TENANT_IDS.consumerPlatform,
      SEED_TENANT_IDS.inactiveCo,
    ];

    for (const tenantId of nonSystemTenantIds) {
      const tenantUsers = SEED_USERS.filter((u) => u.tenantId === tenantId);
      expect(
        tenantUsers.length,
        `tenant ${tenantId} should have at least 4 users`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('includes all 4 roles for each tenant', () => {
    const expectedRoles = ['super_admin', 'tenant_admin', 'manager', 'learner'];
    const nonSystemTenantIds = [
      SEED_TENANT_IDS.acmeCorp,
      SEED_TENANT_IDS.consumerPlatform,
      SEED_TENANT_IDS.inactiveCo,
    ];

    for (const tenantId of nonSystemTenantIds) {
      const tenantRoles = SEED_USERS.filter((u) => u.tenantId === tenantId).map((u) => u.role);
      for (const role of expectedRoles) {
        expect(tenantRoles, `tenant ${tenantId} should include role ${role}`).toContain(role);
      }
    }
  });

  it('has valid UUID format for all user IDs', () => {
    for (const user of SEED_USERS) {
      expect(user.userId, `${user.email} should have valid UUID`).toMatch(UUID_REGEX);
    }
  });

  it('has unique user IDs', () => {
    const ids = SEED_USERS.map((u) => u.userId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique emails', () => {
    const emails = SEED_USERS.map((u) => u.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it('references only tenant IDs from SEED_TENANT_IDS', () => {
    const validTenantIds = new Set(Object.values(SEED_TENANT_IDS));
    for (const user of SEED_USERS) {
      expect(
        validTenantIds.has(user.tenantId),
        `${user.email} should reference a known tenant`,
      ).toBe(true);
    }
  });

  it('has all required fields on every user', () => {
    for (const user of SEED_USERS) {
      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('tenantId');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('displayName');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isActive');
    }
  });

  it('sets inactive users for the suspended tenant', () => {
    const inactiveUsers = SEED_USERS.filter((u) => u.tenantId === SEED_TENANT_IDS.inactiveCo);
    for (const user of inactiveUsers) {
      expect(user.isActive, `${user.email} in inactive tenant should be inactive`).toBe(false);
    }
  });
});

describe('createTestProfile', () => {
  it('returns a profile with all required fields', () => {
    const profile = createTestProfile();

    expect(profile).toHaveProperty('profileId');
    expect(profile).toHaveProperty('userId');
    expect(profile).toHaveProperty('tenantId');
    expect(profile).toHaveProperty('locale');
    expect(profile).toHaveProperty('timezone');
    expect(profile).toHaveProperty('accessibilitySettings');
    expect(profile).toHaveProperty('notificationSettings');
  });

  it('uses deterministic defaults', () => {
    const profile = createTestProfile();

    expect(profile.profileId).toBe(SEED_PROFILE_IDS.acmeCorp.learner);
    expect(profile.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(profile.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(profile.locale).toBe('en');
    expect(profile.timezone).toBe('UTC');
    expect(profile.accessibilitySettings).toEqual({});
    expect(profile.notificationSettings).toEqual({});
  });

  it('accepts overrides for all fields', () => {
    const overrides: ProfileSeed = {
      profileId: '33333333-3333-4333-a333-333333333333',
      userId: SEED_USER_IDS.acmeCorp.superAdmin,
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      locale: 'de',
      timezone: 'Europe/Berlin',
      accessibilitySettings: { reducedMotion: true },
      notificationSettings: { email: false },
    };

    const profile = createTestProfile(overrides);
    expect(profile).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const profile = createTestProfile({ locale: 'fr' });

    expect(profile.locale).toBe('fr');
    expect(profile.profileId).toBe(SEED_PROFILE_IDS.acmeCorp.learner);
    expect(profile.timezone).toBe('UTC');
  });
});

describe('SEED_PROFILES', () => {
  it('contains exactly 12 profiles (4 per tenant)', () => {
    expect(SEED_PROFILES).toHaveLength(12);
  });

  it('has exactly 4 profiles per non-system tenant', () => {
    const nonSystemTenantIds = [
      SEED_TENANT_IDS.acmeCorp,
      SEED_TENANT_IDS.consumerPlatform,
      SEED_TENANT_IDS.inactiveCo,
    ];

    for (const tenantId of nonSystemTenantIds) {
      const tenantProfiles = SEED_PROFILES.filter((p) => p.tenantId === tenantId);
      expect(tenantProfiles, `tenant ${tenantId} should have 4 profiles`).toHaveLength(4);
    }
  });

  it('has valid UUID format for all profile IDs', () => {
    for (const profile of SEED_PROFILES) {
      expect(profile.profileId, `${profile.profileId} should have valid UUID`).toMatch(UUID_REGEX);
    }
  });

  it('has unique profile IDs', () => {
    const ids = SEED_PROFILES.map((p) => p.profileId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only tenant IDs from SEED_TENANT_IDS', () => {
    const validTenantIds = new Set(Object.values(SEED_TENANT_IDS));
    for (const profile of SEED_PROFILES) {
      expect(
        validTenantIds.has(profile.tenantId),
        `${profile.profileId} should reference a known tenant`,
      ).toBe(true);
    }
  });

  it('references only user IDs from SEED_USERS', () => {
    const validUserIds = new Set(SEED_USERS.map((u) => u.userId));
    for (const profile of SEED_PROFILES) {
      expect(
        validUserIds.has(profile.userId),
        `${profile.profileId} should reference a known user`,
      ).toBe(true);
    }
  });

  it('has all required fields on every profile', () => {
    for (const profile of SEED_PROFILES) {
      expect(profile).toHaveProperty('profileId');
      expect(profile).toHaveProperty('userId');
      expect(profile).toHaveProperty('tenantId');
      expect(profile).toHaveProperty('locale');
      expect(profile).toHaveProperty('timezone');
      expect(profile).toHaveProperty('accessibilitySettings');
      expect(profile).toHaveProperty('notificationSettings');
    }
  });

  it('has deterministic locale and timezone defaults', () => {
    for (const profile of SEED_PROFILES) {
      expect(profile.locale).toBe('en');
      expect(profile.timezone).toBe('UTC');
    }
  });

  it('each profile matches its corresponding user', () => {
    for (const profile of SEED_PROFILES) {
      const matchingUser = SEED_USERS.find((u) => u.userId === profile.userId);
      expect(matchingUser).toBeDefined();
      expect(matchingUser?.tenantId).toBe(profile.tenantId);
    }
  });
});
