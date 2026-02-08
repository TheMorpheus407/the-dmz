import { pathToFileURL } from 'node:url';

import { eq, sql } from 'drizzle-orm';

import { SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS } from '@the-dmz/shared/testing';

import { closeDatabase, getDatabaseClient } from './connection.js';
import { permissions, rolePermissions, roles, tenants, userRoles, users } from './schema/index.js';

export { SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS };

const BASE_PERMISSIONS = [
  { resource: 'users', action: 'read', description: 'View user profiles' },
  { resource: 'users', action: 'write', description: 'Create and update users' },
  { resource: 'users', action: 'delete', description: 'Deactivate or remove users' },
  { resource: 'roles', action: 'read', description: 'View role definitions' },
  { resource: 'roles', action: 'write', description: 'Create and modify roles' },
  { resource: 'reports', action: 'read', description: 'View reports and analytics' },
  { resource: 'reports', action: 'export', description: 'Export report data' },
  { resource: 'settings', action: 'read', description: 'View tenant settings' },
  { resource: 'settings', action: 'write', description: 'Modify tenant settings' },
  { resource: 'campaigns', action: 'read', description: 'View training campaigns' },
  { resource: 'campaigns', action: 'write', description: 'Create and manage campaigns' },
] as const;

const DEFAULT_ROLES = [
  { name: 'admin', description: 'Full tenant administration' },
  { name: 'manager', description: 'Team and reporting management' },
  { name: 'learner', description: 'Standard learner access' },
] as const;

const PRIMARY_ROLE_TO_DEFAULT_ROLE = {
  admin: 'admin',
  super_admin: 'admin',
  tenant_admin: 'admin',
  manager: 'manager',
  learner: 'learner',
} as const satisfies Record<
  'admin' | 'super_admin' | 'tenant_admin' | 'manager' | 'learner',
  (typeof DEFAULT_ROLES)[number]['name']
>;

const MANAGER_PERMISSION_KEYS = [
  'users:read',
  'users:write',
  'roles:read',
  'reports:read',
  'reports:export',
  'campaigns:read',
  'campaigns:write',
] as const;

const resolveDefaultRoleName = (role: string): (typeof DEFAULT_ROLES)[number]['name'] => {
  if (role in PRIMARY_ROLE_TO_DEFAULT_ROLE) {
    return PRIMARY_ROLE_TO_DEFAULT_ROLE[role as keyof typeof PRIMARY_ROLE_TO_DEFAULT_ROLE];
  }

  return 'learner';
};

/**
 * Seed the database with deterministic tenant and user data.
 *
 * Idempotent: uses `ON CONFLICT ... DO UPDATE` so running the seed
 * multiple times always converges to the canonical seed state.
 */
export const seedDatabase = async (): Promise<void> => {
  const db = getDatabaseClient();

  for (const tenant of SEED_TENANTS) {
    await db
      .insert(tenants)
      .values({
        tenantId: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        settings: tenant.settings,
      })
      .onConflictDoUpdate({
        target: [tenants.slug],
        set: {
          name: sql`excluded.name`,
          status: sql`excluded.status`,
          settings: sql`excluded.settings`,
          updatedAt: sql`now()`,
        },
      });
  }

  for (const permission of BASE_PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      })
      .onConflictDoUpdate({
        target: [permissions.resource, permissions.action],
        set: {
          description: sql`excluded.description`,
        },
      });
  }

  const tenantRows = await db.select({ tenantId: tenants.tenantId }).from(tenants);
  const seedUsersByTenant = new Map<string, (typeof SEED_USERS)[number][]>();

  for (const seedUser of SEED_USERS) {
    const tenantUsers = seedUsersByTenant.get(seedUser.tenantId) ?? [];
    tenantUsers.push(seedUser);
    seedUsersByTenant.set(seedUser.tenantId, tenantUsers);
  }

  const permissionRows = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(permissions);

  const permissionByKey = new Map(
    permissionRows.map((permission) => [
      `${permission.resource}:${permission.action}`,
      permission.id,
    ]),
  );

  // Verify the system tenant exists
  const tenantResult = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, 'system'))
    .limit(1);

  if (tenantResult.length === 0) {
    throw new Error('System tenant seeding failed');
  }

  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      })
      .onConflictDoUpdate({
        target: [users.userId],
        set: {
          email: sql`excluded.email`,
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }

  for (const tenant of tenantRows) {
    await db.transaction(async (transaction) => {
      // Keep both keys in sync while the codebase transitions to a single tenant context variable.
      await transaction.execute(
        sql`select set_config('app.current_tenant_id', ${tenant.tenantId}, true)`,
      );
      await transaction.execute(sql`select set_config('app.tenant_id', ${tenant.tenantId}, true)`);

      for (const role of DEFAULT_ROLES) {
        await transaction
          .insert(roles)
          .values({
            tenantId: tenant.tenantId,
            name: role.name,
            description: role.description,
            isSystem: true,
          })
          .onConflictDoUpdate({
            target: [roles.tenantId, roles.name],
            set: {
              description: sql`excluded.description`,
              isSystem: true,
              updatedAt: sql`now()`,
            },
          });
      }

      const tenantRoleRows = await transaction
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.tenantId, tenant.tenantId));

      const roleIdByName = new Map(tenantRoleRows.map((role) => [role.name, role.id]));
      const adminRoleId = roleIdByName.get('admin');
      const managerRoleId = roleIdByName.get('manager');

      if (adminRoleId) {
        for (const permission of permissionRows) {
          await transaction
            .insert(rolePermissions)
            .values({
              roleId: adminRoleId,
              permissionId: permission.id,
            })
            .onConflictDoNothing();
        }
      }

      if (managerRoleId) {
        for (const permissionKey of MANAGER_PERMISSION_KEYS) {
          const permissionId = permissionByKey.get(permissionKey);

          if (!permissionId) {
            continue;
          }

          await transaction
            .insert(rolePermissions)
            .values({
              roleId: managerRoleId,
              permissionId,
            })
            .onConflictDoNothing();
        }
      }

      const tenantSeedUsers = seedUsersByTenant.get(tenant.tenantId) ?? [];

      for (const user of tenantSeedUsers) {
        const roleName = resolveDefaultRoleName(user.role);
        const roleId = roleIdByName.get(roleName);

        if (!roleId) {
          continue;
        }

        await transaction
          .insert(userRoles)
          .values({
            tenantId: tenant.tenantId,
            userId: user.userId,
            roleId,
          })
          .onConflictDoNothing();
      }
    });
  }

  console.warn(
    `Seeded ${SEED_TENANTS.length} tenants, ${SEED_USERS.length} users, ` +
      `${BASE_PERMISSIONS.length} permissions, and ${DEFAULT_ROLES.length} default roles.`,
  );
};

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  seedDatabase()
    .then(() => closeDatabase())
    .catch((error) => {
      console.error('Database seed failed', error);
      process.exit(1);
    });
}
