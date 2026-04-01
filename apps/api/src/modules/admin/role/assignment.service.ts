import { eq, and } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { roles, userRoles, users } from '../../../shared/database/schema/index.js';
import { clearPermissionCache } from '../../../shared/middleware/authorization.js';

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
