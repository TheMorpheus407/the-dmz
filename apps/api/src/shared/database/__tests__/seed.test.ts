import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  SEED_PROFILE_IDS,
  SEED_TENANT_IDS,
  SEED_USER_IDS,
  createIsolatedDatabase,
  createIsolatedTestConfig,
} from '@the-dmz/shared/testing';

import { closeDatabase, getDatabaseClient } from '../connection.js';
import { permissions, rolePermissions, roles, tenants, users } from '../schema/index.js';
import { userProfiles } from '../schema/auth/user-profiles.js';
import { seedDatabase } from '../seed.js';

const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

let testConfig: AppConfig;
let cleanupDatabase: (() => Promise<void>) | undefined;

beforeEach(async () => {
  const databaseName = `dmz_t_seed_${randomUUID().replace(/-/g, '_')}`;
  testConfig = createIsolatedTestConfig(databaseName);
  cleanupDatabase = await createIsolatedDatabase(testConfig);

  const db = getDatabaseClient(testConfig);
  await migrate(db, { migrationsFolder });
});

afterEach(async () => {
  await closeDatabase();
  if (cleanupDatabase) {
    await cleanupDatabase();
  }
  cleanupDatabase = undefined;
});

describe('seedDatabase', () => {
  it('seeds tenants, users, and profiles with correct counts', async () => {
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

    const tenantCount = await db.select({ id: tenants.tenantId }).from(tenants);
    expect(tenantCount).toHaveLength(4);

    const userCount = await db.select({ id: users.userId }).from(users);
    expect(userCount).toHaveLength(12);

    const profileCount = await db.select({ id: userProfiles.profileId }).from(userProfiles);
    expect(profileCount).toHaveLength(12);
  });

  it('seeds the system tenant with correct properties', async () => {
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);
    await seedDatabase(testConfig);

    const tenantCount = await db.select({ id: tenants.tenantId }).from(tenants);
    const userCount = await db.select({ id: users.userId }).from(users);
    const profileCount = await db.select({ id: userProfiles.profileId }).from(userProfiles);

    expect(tenantCount).toHaveLength(4);
    expect(userCount).toHaveLength(12);
    expect(profileCount).toHaveLength(12);
  });

  it('seeds inactive tenant users as inactive', async () => {
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

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

  it('seeds admin read/write permissions and grants them to seeded admin roles', async () => {
    const db = getDatabaseClient(testConfig);

    await seedDatabase(testConfig);

    const adminPermissionRows = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .where(eq(permissions.resource, 'admin'));

    expect(adminPermissionRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'admin', action: 'read' }),
        expect.objectContaining({ resource: 'admin', action: 'write' }),
      ]),
    );

    const adminRolePermissions = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(eq(roles.tenantId, SEED_TENANT_IDS.acmeCorp), eq(roles.name, 'admin')));

    expect(adminRolePermissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'admin', action: 'read' }),
        expect.objectContaining({ resource: 'admin', action: 'write' }),
      ]),
    );
  });
});
