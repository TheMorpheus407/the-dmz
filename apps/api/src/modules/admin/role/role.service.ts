import { eq, and, inArray } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { permissions, rolePermissions, roles } from '../../../shared/database/schema/index.js';

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
