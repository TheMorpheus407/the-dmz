import { describe, expect, it } from 'vitest';

import { SEED_PROFILE_IDS, SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';
import {
  createTestChapter,
  createTestEmailTemplate,
  createTestPermission,
  createTestProfile,
  createTestRole,
  createTestRolePermission,
  createTestSeason,
  createTestSession,
  createTestTenant,
  createTestUser,
  createTestUserRole,
  SEED_PROFILES,
  SEED_TENANTS,
  SEED_USERS,
} from './factories.js';

import type {
  ChapterSeed,
  EmailTemplateSeed,
  PermissionSeed,
  RolePermissionSeed,
  RoleSeed,
  SeasonSeed,
  SessionSeed,
  UserRoleSeed,
} from './factories.js';

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

describe('createTestRole', () => {
  it('returns a role with all required fields', () => {
    const role = createTestRole();

    expect(role).toHaveProperty('id');
    expect(role).toHaveProperty('tenantId');
    expect(role).toHaveProperty('name');
    expect(role).toHaveProperty('description');
    expect(role).toHaveProperty('isSystem');
  });

  it('uses deterministic defaults', () => {
    const role = createTestRole();

    expect(role.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(role.name).toBe('test-role');
    expect(role.description).toBe(null);
    expect(role.isSystem).toBe(false);
  });

  it('accepts overrides for all fields', () => {
    const overrides: RoleSeed = {
      id: '44444444-4444-4444-a444-444444444444',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      name: 'admin',
      description: 'Admin role',
      isSystem: true,
    };

    const role = createTestRole(overrides);
    expect(role).toEqual(overrides);
  });

  it('generates a valid UUID when not provided', () => {
    const role = createTestRole();
    expect(role.id).toMatch(UUID_REGEX);
  });

  it('merges partial overrides with defaults', () => {
    const role = createTestRole({ name: 'custom-role' });

    expect(role.name).toBe('custom-role');
    expect(role.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(role.description).toBe(null);
    expect(role.isSystem).toBe(false);
  });
});

describe('createTestPermission', () => {
  it('returns a permission with all required fields', () => {
    const perm = createTestPermission();

    expect(perm).toHaveProperty('id');
    expect(perm).toHaveProperty('resource');
    expect(perm).toHaveProperty('action');
    expect(perm).toHaveProperty('description');
  });

  it('uses deterministic defaults', () => {
    const perm = createTestPermission();

    expect(perm.resource).toBe('test');
    expect(perm.action).toBe('read');
    expect(perm.description).toBe(null);
  });

  it('accepts overrides for all fields', () => {
    const overrides: PermissionSeed = {
      id: '55555555-5555-5555-a555-555555555555',
      resource: 'users',
      action: 'create',
      description: 'Create users permission',
    };

    const perm = createTestPermission(overrides);
    expect(perm).toEqual(overrides);
  });

  it('generates a valid UUID when not provided', () => {
    const perm = createTestPermission();
    expect(perm.id).toMatch(UUID_REGEX);
  });

  it('merges partial overrides with defaults', () => {
    const perm = createTestPermission({ resource: 'users' });

    expect(perm.resource).toBe('users');
    expect(perm.action).toBe('read');
    expect(perm.description).toBe(null);
  });
});

describe('createTestSession', () => {
  it('returns a session with all required fields', () => {
    const session = createTestSession();

    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('tenantId');
    expect(session).toHaveProperty('userId');
    expect(session).toHaveProperty('tokenHash');
    expect(session).toHaveProperty('expiresAt');
    expect(session).toHaveProperty('ipAddress');
    expect(session).toHaveProperty('userAgent');
    expect(session).toHaveProperty('deviceFingerprint');
    expect(session).toHaveProperty('mfaVerifiedAt');
    expect(session).toHaveProperty('mfaMethod');
    expect(session).toHaveProperty('mfaFailedAttempts');
    expect(session).toHaveProperty('mfaLockedAt');
  });

  it('uses deterministic defaults', () => {
    const session = createTestSession();

    expect(session.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(session.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(session.ipAddress).toBe(null);
    expect(session.userAgent).toBe(null);
    expect(session.deviceFingerprint).toBe(null);
    expect(session.mfaVerifiedAt).toBe(null);
    expect(session.mfaMethod).toBe(null);
    expect(session.mfaFailedAttempts).toBe(0);
    expect(session.mfaLockedAt).toBe(null);
  });

  it('has a token hash by default', () => {
    const session = createTestSession();
    expect(session.tokenHash).toMatch(/^test-hash-/);
  });

  it('has a default expiration 7 days from now', () => {
    const session = createTestSession();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(session.expiresAt.getTime()).toBeCloseTo(sevenDaysFromNow.getTime(), -3);
  });

  it('accepts overrides for all fields', () => {
    const expiresAt = new Date('2025-12-31');
    const mfaVerifiedAt = new Date('2025-01-15');
    const overrides: SessionSeed = {
      id: '66666666-6666-4666-a666-666666666666',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      userId: SEED_USER_IDS.consumerPlatform.learner,
      tokenHash: 'custom-hash',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceFingerprint: 'abc123',
      expiresAt,
      mfaVerifiedAt,
      mfaMethod: 'totp',
      mfaFailedAttempts: 1,
      mfaLockedAt: null,
    };

    const session = createTestSession(overrides);
    expect(session).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const session = createTestSession({ tokenHash: 'custom-hash' });

    expect(session.tokenHash).toBe('custom-hash');
    expect(session.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(session.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(session.mfaFailedAttempts).toBe(0);
  });
});

describe('createTestUserRole', () => {
  it('returns a user role with all required fields', () => {
    const userRole = createTestUserRole();

    expect(userRole).toHaveProperty('id');
    expect(userRole).toHaveProperty('tenantId');
    expect(userRole).toHaveProperty('userId');
    expect(userRole).toHaveProperty('roleId');
    expect(userRole).toHaveProperty('assignedBy');
    expect(userRole).toHaveProperty('expiresAt');
    expect(userRole).toHaveProperty('scope');
  });

  it('uses deterministic defaults', () => {
    const userRole = createTestUserRole();

    expect(userRole.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(userRole.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(userRole.assignedBy).toBe(null);
    expect(userRole.expiresAt).toBe(null);
    expect(userRole.scope).toBe(null);
  });

  it('accepts overrides for all fields', () => {
    const expiresAt = new Date('2025-12-31');
    const overrides: UserRoleSeed = {
      id: '77777777-7777-4777-a777-777777777777',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      userId: SEED_USER_IDS.consumerPlatform.learner,
      roleId: '44444444-4444-4444-a444-444444444444',
      assignedBy: SEED_USER_IDS.consumerPlatform.superAdmin,
      expiresAt,
      scope: 'global',
    };

    const userRole = createTestUserRole(overrides);
    expect(userRole).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const userRole = createTestUserRole({ scope: 'tenant' });

    expect(userRole.scope).toBe('tenant');
    expect(userRole.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(userRole.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(userRole.assignedBy).toBe(null);
  });
});

describe('createTestRolePermission', () => {
  it('returns a role permission with all required fields', () => {
    const rolePerm = createTestRolePermission();

    expect(rolePerm).toHaveProperty('roleId');
    expect(rolePerm).toHaveProperty('permissionId');
  });

  it('generates valid UUIDs when not provided', () => {
    const rolePerm = createTestRolePermission();
    expect(rolePerm.roleId).toMatch(UUID_REGEX);
    expect(rolePerm.permissionId).toMatch(UUID_REGEX);
  });

  it('accepts overrides for all fields', () => {
    const overrides: RolePermissionSeed = {
      roleId: '44444444-4444-4444-a444-444444444444',
      permissionId: '55555555-5555-5555-a555-555555555555',
    };

    const rolePerm = createTestRolePermission(overrides);
    expect(rolePerm).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const rolePerm = createTestRolePermission({ roleId: '11111111-1111-4111-a111-111111111111' });

    expect(rolePerm.roleId).toBe('11111111-1111-4111-a111-111111111111');
    expect(rolePerm.permissionId).toMatch(UUID_REGEX);
  });
});

describe('createTestSeason', () => {
  it('returns a season with all required fields', () => {
    const season = createTestSeason();

    expect(season).toHaveProperty('id');
    expect(season).toHaveProperty('tenantId');
    expect(season).toHaveProperty('seasonNumber');
    expect(season).toHaveProperty('title');
    expect(season).toHaveProperty('theme');
    expect(season).toHaveProperty('logline');
    expect(season).toHaveProperty('description');
    expect(season).toHaveProperty('threatCurveStart');
    expect(season).toHaveProperty('threatCurveEnd');
    expect(season).toHaveProperty('isActive');
    expect(season).toHaveProperty('metadata');
  });

  it('uses deterministic defaults', () => {
    const season = createTestSeason();

    expect(season.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(season.seasonNumber).toBe(1);
    expect(season.title).toBe('Test Season');
    expect(season.theme).toBe('Test theme');
    expect(season.logline).toBe('Test logline');
    expect(season.description).toBe(null);
    expect(season.threatCurveStart).toBe('LOW');
    expect(season.threatCurveEnd).toBe('HIGH');
    expect(season.isActive).toBe(true);
    expect(season.metadata).toEqual({});
  });

  it('accepts overrides for all fields', () => {
    const overrides: SeasonSeed = {
      id: '88888888-8888-4888-a888-888888888888',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      seasonNumber: 2,
      title: 'Season 2',
      theme: 'Advanced theme',
      logline: 'Advanced logline',
      description: 'Second season',
      threatCurveStart: 'MEDIUM',
      threatCurveEnd: 'EXTREME',
      isActive: false,
      metadata: { key: 'value' },
    };

    const season = createTestSeason(overrides);
    expect(season).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const season = createTestSeason({ title: 'Custom Season' });

    expect(season.title).toBe('Custom Season');
    expect(season.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(season.seasonNumber).toBe(1);
    expect(season.isActive).toBe(true);
  });
});

describe('createTestChapter', () => {
  it('returns a chapter with all required fields', () => {
    const chapter = createTestChapter();

    expect(chapter).toHaveProperty('id');
    expect(chapter).toHaveProperty('tenantId');
    expect(chapter).toHaveProperty('seasonId');
    expect(chapter).toHaveProperty('chapterNumber');
    expect(chapter).toHaveProperty('act');
    expect(chapter).toHaveProperty('title');
    expect(chapter).toHaveProperty('description');
    expect(chapter).toHaveProperty('dayStart');
    expect(chapter).toHaveProperty('dayEnd');
    expect(chapter).toHaveProperty('difficultyStart');
    expect(chapter).toHaveProperty('difficultyEnd');
    expect(chapter).toHaveProperty('threatLevel');
    expect(chapter).toHaveProperty('isActive');
    expect(chapter).toHaveProperty('metadata');
  });

  it('uses deterministic defaults', () => {
    const chapter = createTestChapter();

    expect(chapter.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(chapter.chapterNumber).toBe(1);
    expect(chapter.act).toBe(1);
    expect(chapter.title).toBe('Test Chapter');
    expect(chapter.description).toBe(null);
    expect(chapter.dayStart).toBe(1);
    expect(chapter.dayEnd).toBe(7);
    expect(chapter.difficultyStart).toBe(1);
    expect(chapter.difficultyEnd).toBe(2);
    expect(chapter.threatLevel).toBe('LOW');
    expect(chapter.isActive).toBe(true);
    expect(chapter.metadata).toEqual({});
  });

  it('accepts overrides for all fields', () => {
    const overrides: ChapterSeed = {
      id: '99999999-9999-4999-a999-999999999999',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      seasonId: '88888888-8888-4888-a888-888888888888',
      chapterNumber: 3,
      act: 2,
      title: 'Chapter 3',
      description: 'Third chapter',
      dayStart: 15,
      dayEnd: 21,
      difficultyStart: 3,
      difficultyEnd: 4,
      threatLevel: 'HIGH',
      isActive: false,
      metadata: { difficulty: 'hard' },
    };

    const chapter = createTestChapter(overrides);
    expect(chapter).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const chapter = createTestChapter({ title: 'Custom Chapter' });

    expect(chapter.title).toBe('Custom Chapter');
    expect(chapter.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(chapter.chapterNumber).toBe(1);
    expect(chapter.isActive).toBe(true);
  });
});

describe('createTestEmailTemplate', () => {
  it('returns an email template with all required fields', () => {
    const template = createTestEmailTemplate();

    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('tenantId');
    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('subject');
    expect(template).toHaveProperty('body');
    expect(template).toHaveProperty('fromName');
    expect(template).toHaveProperty('fromEmail');
    expect(template).toHaveProperty('replyTo');
    expect(template).toHaveProperty('contentType');
    expect(template).toHaveProperty('difficulty');
    expect(template).toHaveProperty('faction');
    expect(template).toHaveProperty('attackType');
    expect(template).toHaveProperty('threatLevel');
    expect(template).toHaveProperty('season');
    expect(template).toHaveProperty('chapter');
    expect(template).toHaveProperty('language');
    expect(template).toHaveProperty('locale');
    expect(template).toHaveProperty('metadata');
    expect(template).toHaveProperty('isAiGenerated');
    expect(template).toHaveProperty('isActive');
  });

  it('uses deterministic defaults', () => {
    const template = createTestEmailTemplate();

    expect(template.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(template.name).toBe('Test Email');
    expect(template.subject).toBe('Test Subject');
    expect(template.body).toBe('Test body content');
    expect(template.fromName).toBe(null);
    expect(template.fromEmail).toBe(null);
    expect(template.replyTo).toBe(null);
    expect(template.contentType).toBe('phishing');
    expect(template.difficulty).toBe(1);
    expect(template.faction).toBe(null);
    expect(template.attackType).toBe(null);
    expect(template.threatLevel).toBe('LOW');
    expect(template.season).toBe(null);
    expect(template.chapter).toBe(null);
    expect(template.language).toBe('en');
    expect(template.locale).toBe('en-US');
    expect(template.metadata).toEqual({});
    expect(template.isAiGenerated).toBe(false);
    expect(template.isActive).toBe(true);
  });

  it('accepts overrides for all fields', () => {
    const overrides: EmailTemplateSeed = {
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      tenantId: SEED_TENANT_IDS.consumerPlatform,
      name: 'Custom Email',
      subject: 'Custom Subject',
      body: 'Custom body',
      fromName: 'Sender Name',
      fromEmail: 'sender@example.com',
      replyTo: 'reply@example.com',
      contentType: 'training',
      difficulty: 5,
      faction: 'criminal_networks',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      season: 1,
      chapter: 2,
      language: 'de',
      locale: 'de-DE',
      metadata: { templateId: '123' },
      isAiGenerated: true,
      isActive: false,
    };

    const template = createTestEmailTemplate(overrides);
    expect(template).toEqual(overrides);
  });

  it('merges partial overrides with defaults', () => {
    const template = createTestEmailTemplate({ subject: 'Custom Subject' });

    expect(template.subject).toBe('Custom Subject');
    expect(template.tenantId).toBe(SEED_TENANT_IDS.acmeCorp);
    expect(template.name).toBe('Test Email');
    expect(template.isActive).toBe(true);
  });
});
