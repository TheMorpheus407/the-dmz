import { eq, and, inArray, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../shared/database/schema/index.js';
import { clearPermissionCache } from '../../shared/middleware/authorization.js';

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  expiresAt?: Date;
  scope?: string;
  assignedBy: string;
}

export interface UpdateRoleAssignmentInput {
  expiresAt?: Date;
  scope?: string;
  assignedBy: string;
}

export interface RoleAssignmentResponse {
  id: string;
  userId: string;
  roleId: string;
  tenantId: string;
  expiresAt: Date | null;
  scope: string | null;
  assignedBy: string;
  assignedAt: Date;
}

export interface EffectivePermissionsResponse {
  userId: string;
  permissions: string[];
  roles: RoleAssignmentResponse[];
}

export const assignRole = async (
  tenantId: string,
  input: AssignRoleInput,
  config: AppConfig = loadConfig(),
): Promise<RoleAssignmentResponse> => {
  const db = getDatabaseClient(config);

  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, input.userId)))
    .limit(1);

  if (!targetUser) {
    throw new Error('Target user not found');
  }

  const [targetRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, input.roleId)))
    .limit(1);

  if (!targetRole) {
    throw new Error('Target role not found');
  }

  const existingAssignment = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(userRoles.userId, input.userId),
        eq(userRoles.roleId, input.roleId),
      ),
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    throw new Error('User already has this role');
  }

  const [assignment] = await db
    .insert(userRoles)
    .values({
      tenantId,
      userId: input.userId,
      roleId: input.roleId,
      expiresAt: input.expiresAt ?? null,
      scope: input.scope ?? null,
      assignedBy: input.assignedBy,
      assignedAt: new Date(),
    })
    .returning();

  if (!assignment) {
    throw new Error('Failed to create role assignment');
  }

  await clearPermissionCache(config, tenantId, input.userId);

  return {
    id: assignment.id,
    userId: assignment.userId,
    roleId: assignment.roleId,
    tenantId: assignment.tenantId,
    expiresAt: assignment.expiresAt,
    scope: assignment.scope,
    assignedBy: assignment.assignedBy ?? '',
    assignedAt: assignment.assignedAt,
  };
};

export const revokeRole = async (
  tenantId: string,
  userId: string,
  roleId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [assignment] = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new Error('Role assignment not found');
  }

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.id, assignment.id), eq(userRoles.tenantId, tenantId)));

  await clearPermissionCache(config, tenantId, userId);
};

export const updateRoleAssignment = async (
  tenantId: string,
  userId: string,
  roleId: string,
  input: UpdateRoleAssignmentInput,
  config: AppConfig = loadConfig(),
): Promise<RoleAssignmentResponse> => {
  const db = getDatabaseClient(config);

  const [assignment] = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new Error('Role assignment not found');
  }

  const updateData: {
    assignedBy: string;
    expiresAt?: Date | null;
    scope?: string | null;
  } = {
    assignedBy: input.assignedBy,
  };

  if (input.expiresAt !== undefined) {
    updateData.expiresAt = input.expiresAt;
  }

  if (input.scope !== undefined) {
    updateData.scope = input.scope;
  }

  const [updated] = await db
    .update(userRoles)
    .set(updateData)
    .where(and(eq(userRoles.id, assignment.id), eq(userRoles.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw new Error('Failed to update role assignment');
  }

  await clearPermissionCache(config, tenantId, userId);

  return {
    id: updated.id,
    userId: updated.userId,
    roleId: updated.roleId,
    tenantId: updated.tenantId,
    expiresAt: updated.expiresAt,
    scope: updated.scope,
    assignedBy: updated.assignedBy ?? '',
    assignedAt: updated.assignedAt,
  };
};

export const getUserEffectivePermissions = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<EffectivePermissionsResponse> => {
  const db = getDatabaseClient(config);

  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.userId, userId)))
    .limit(1);

  if (!targetUser) {
    throw new Error('User not found');
  }

  const userRoleAssignments = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
      expiresAt: userRoles.expiresAt,
      scope: userRoles.scope,
      assignedBy: userRoles.assignedBy,
      assignedAt: userRoles.assignedAt,
    })
    .from(userRoles)
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.tenantId, tenantId)))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

  const now = new Date();
  const validAssignments = userRoleAssignments.filter(
    (a) => !a.expiresAt || new Date(a.expiresAt) > now,
  );

  const roleIds = validAssignments.map((a) => a.roleId).filter(Boolean);

  let permissionIds: string[] = [];

  if (roleIds.length > 0) {
    const rolePerms = await db
      .select({
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));

    permissionIds = rolePerms.map((rp) => rp.permissionId).filter(Boolean);
  }

  let permissionKeys: string[] = [];

  if (permissionIds.length > 0) {
    const permRecords = await db
      .select({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    permissionKeys = permRecords.map((p) => `${p.resource}:${p.action}`);
  }

  const roleAssignments: RoleAssignmentResponse[] = validAssignments.map((a) => ({
    id: a.id,
    userId: a.userId,
    roleId: a.roleId,
    tenantId,
    expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
    scope: a.scope,
    assignedBy: a.assignedBy ?? '',
    assignedAt: new Date(a.assignedAt),
  }));

  return {
    userId,
    permissions: permissionKeys,
    roles: roleAssignments,
  };
};

export const getTenantRoles = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<Array<{ id: string; name: string; description: string | null; isSystem: boolean }>> => {
  const db = getDatabaseClient(config);

  const tenantRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .where(eq(roles.tenantId, tenantId));

  return tenantRoles;
};

export const getRolePermissions = async (
  tenantId: string,
  roleId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> => {
  const db = getDatabaseClient(config);

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, roleId)))
    .limit(1);

  if (!role) {
    throw new Error('Role not found');
  }

  const rolePerms = await db
    .select({
      permissionId: rolePermissions.permissionId,
    })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  const permissionIds = rolePerms.map((rp) => rp.permissionId).filter(Boolean);

  if (permissionIds.length === 0) {
    return [];
  }

  const permRecords = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(permissions)
    .where(inArray(permissions.id, permissionIds));

  return permRecords.map((p) => `${p.resource}:${p.action}`);
};

export const getAllPermissions = async (
  config: AppConfig = loadConfig(),
): Promise<Array<{ id: string; resource: string; action: string; description: string | null }>> => {
  const db = getDatabaseClient(config);

  const allPerms = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
    })
    .from(permissions);

  return allPerms;
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

export const checkPlanEntitlement = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const { tenants } = await import('../../shared/database/schema/index.js');

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
