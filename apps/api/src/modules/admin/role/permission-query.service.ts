import { eq, and, inArray } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../../shared/database/schema/index.js';

import type { RoleAssignmentResponse } from './assignment.service.js';

export interface EffectivePermissionsResponse {
  userId: string;
  permissions: string[];
  roles: RoleAssignmentResponse[];
}

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
