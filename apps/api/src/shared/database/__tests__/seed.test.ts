import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { SEED_PROFILE_IDS, SEED_TENANT_IDS, SEED_USER_IDS } from '@the-dmz/shared/testing';

import { getDatabaseClient, getDatabasePool } from '../connection.js';
import { tenants, users } from '../schema/index.js';
import { userProfiles } from '../schema/auth/user-profiles.js';
import { seedDatabase } from '../seed.js';

const originalNodeEnv = process.env['NODE_ENV'];
const originalDatabaseUrl = process.env['DATABASE_URL'];

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool();
  await pool`TRUNCATE TABLE
    auth.user_profiles,
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

beforeEach(async () => {
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] = 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test';
  await resetTestData();
});

afterEach(() => {
  process.env['NODE_ENV'] = originalNodeEnv ?? '';
  process.env['DATABASE_URL'] = originalDatabaseUrl ?? '';
});

describe('seedDatabase', () => {
  it('seeds tenants, users, and profiles with correct counts', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const tenantCount = await db.select({ id: tenants.tenantId }).from(tenants);
    expect(tenantCount).toHaveLength(4);

    const userCount = await db.select({ id: users.userId }).from(users);
    expect(userCount).toHaveLength(12);

    const profileCount = await db.select({ id: userProfiles.profileId }).from(userProfiles);
    expect(profileCount).toHaveLength(12);
  });

  it('seeds the system tenant with correct properties', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const [systemTenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.slug, 'system'));

    expect(systemTenant).toBeDefined();
    expect(systemTenant?.tenantId).toBe(SEED_TENANT_IDS.system);
    expect(systemTenant?.name).toBe('The DMZ');
    expect(systemTenant?.status).toBe('active');
  });

  it('seeds users with correct tenant relationships', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const acmeUsers = await db
      .select({
        userId: users.userId,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.tenantId, SEED_TENANT_IDS.acmeCorp));

    expect(acmeUsers).toHaveLength(4);
    expect(acmeUsers.map((u) => u.role).sort()).toEqual([
      'learner',
      'manager',
      'super_admin',
      'tenant_admin',
    ]);
  });

  it('seeds profiles with correct user relationships', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const learnerProfile = await db
      .select({
        profileId: userProfiles.profileId,
        userId: userProfiles.userId,
        locale: userProfiles.locale,
        timezone: userProfiles.timezone,
      })
      .from(userProfiles)
      .where(eq(userProfiles.profileId, SEED_PROFILE_IDS.acmeCorp.learner));

    expect(learnerProfile).toHaveLength(1);
    expect(learnerProfile[0]?.userId).toBe(SEED_USER_IDS.acmeCorp.learner);
    expect(learnerProfile[0]?.locale).toBe('en');
    expect(learnerProfile[0]?.timezone).toBe('UTC');
  });

  it('seeds profiles with correct tenant relationships', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const consumerProfiles = await db
      .select({
        profileId: userProfiles.profileId,
        tenantId: userProfiles.tenantId,
      })
      .from(userProfiles)
      .where(eq(userProfiles.tenantId, SEED_TENANT_IDS.consumerPlatform));

    expect(consumerProfiles).toHaveLength(4);
    expect(consumerProfiles.every((p) => p.tenantId === SEED_TENANT_IDS.consumerPlatform)).toBe(
      true,
    );
  });

  it('is idempotent - running seed twice produces same results', async () => {
    const db = getDatabaseClient();

    await seedDatabase();
    await seedDatabase();

    const tenantCount = await db.select({ id: tenants.tenantId }).from(tenants);
    const userCount = await db.select({ id: users.userId }).from(users);
    const profileCount = await db.select({ id: userProfiles.profileId }).from(userProfiles);

    expect(tenantCount).toHaveLength(4);
    expect(userCount).toHaveLength(12);
    expect(profileCount).toHaveLength(12);
  });

  it('seeds inactive tenant users as inactive', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const inactiveUsers = await db
      .select({
        userId: users.userId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.tenantId, SEED_TENANT_IDS.inactiveCo));

    expect(inactiveUsers).toHaveLength(4);
    expect(inactiveUsers.every((u) => u.isActive === false)).toBe(true);
  });

  it('seeds profiles with default accessibility and notification settings', async () => {
    const db = getDatabaseClient();

    await seedDatabase();

    const [profile] = await db
      .select({
        accessibilitySettings: userProfiles.accessibilitySettings,
        notificationSettings: userProfiles.notificationSettings,
      })
      .from(userProfiles)
      .where(eq(userProfiles.profileId, SEED_PROFILE_IDS.acmeCorp.learner));

    expect(profile).toBeDefined();
    expect(profile?.accessibilitySettings).toEqual({
      reducedMotion: false,
      highContrast: false,
      screenReader: false,
      fontSize: 'normal',
    });
    expect(profile?.notificationSettings).toEqual({
      email: true,
      push: false,
      sms: false,
      marketing: false,
    });
  });
});
