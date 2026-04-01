import { eq, and, ne, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { rolePermissions, roles, userRoles } from '../../../shared/database/schema/index.js';

export const checkPlanEntitlement = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const { tenants } = await import('../../../shared/database/schema/index.js');

  const [tenant] = await db
    .select({ tier: tenants.tier })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant || !tenant.tier) {
    return false;
  }

  const enterpriseTiers = ['enterprise', 'government'];
  return enterpriseTiers.includes(tenant.tier);
};

export const createCustomRole = async (
  tenantId: string,
  name: string,
  description: string,
  permissionIds: string[],
  config: AppConfig = loadConfig(),
): Promise<{ id: string; name: string; description: string; isSystem: boolean }> => {
  const db = getDatabaseClient(config);

  const [existingRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, name)))
    .limit(1);

  if (existingRole) {
    throw new Error('Role with this name already exists');
  }

  const [role] = await db
    .insert(roles)
    .values({
      tenantId,
      name,
      description,
      isSystem: false,
    })
    .returning();

  if (!role) {
    throw new Error('Failed to create role');
  }

  for (const permissionId of permissionIds) {
    await db
      .insert(rolePermissions)
      .values({
        roleId: role.id,
        permissionId,
      })
      .onConflictDoNothing();
  }

  return {
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    isSystem: role.isSystem,
  };
};

export const updateCustomRole = async (
  tenantId: string,
  roleId: string,
  name: string,
  description: string,
  permissionIds: string[],
  config: AppConfig = loadConfig(),
): Promise<{ id: string; name: string; description: string; isSystem: boolean }> => {
  const db = getDatabaseClient(config);

  const [existingRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  if (!existingRole) {
    throw new Error('Role not found');
  }

  if (existingRole.isSystem) {
    throw new Error('Cannot modify system roles');
  }

  const [conflictingRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, name), ne(roles.id, roleId)))
    .limit(1);

  if (conflictingRole) {
    throw new Error('Role with this name already exists');
  }

  await db
    .update(roles)
    .set({
      name,
      description,
      updatedAt: sql`now()`,
    })
    .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  for (const permissionId of permissionIds) {
    await db
      .insert(rolePermissions)
      .values({
        roleId,
        permissionId,
      })
      .onConflictDoNothing();
  }

  const [updatedRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  return {
    id: updatedRole!.id,
    name: updatedRole!.name,
    description: updatedRole!.description ?? '',
    isSystem: updatedRole!.isSystem,
  };
};

export const deleteCustomRole = async (
  tenantId: string,
  roleId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existingRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  if (!existingRole) {
    throw new Error('Role not found');
  }

  if (existingRole.isSystem) {
    throw new Error('Cannot delete system roles');
  }

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  await db.delete(userRoles).where(eq(userRoles.roleId, roleId));

  await db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));
};
