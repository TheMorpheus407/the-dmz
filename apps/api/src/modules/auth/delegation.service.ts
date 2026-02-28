import { eq, and, inArray } from 'drizzle-orm';

import {
  GrantDecisionOutcome,
  type PermissionCeilingInput,
  type PermissionCeilingOutput,
  type RoleGrantInput,
  type RoleGrantOutput,
  type RoleCreateInput,
  type RoleCreateOutput,
  type RoleUpdateInput,
  type RoleUpdateOutput,
} from '@the-dmz/shared/auth';
import { Role } from '@the-dmz/shared/auth';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { roles, permissions, rolePermissions, userRoles } from '../../db/schema/auth/index.js';
import { users } from '../../shared/database/schema/users.js';
import {
  resolvePermissions,
  isRoleAssignmentValid,
} from '../../shared/middleware/authorization.js';

import type { AppConfig } from '../../config.js';
import type { FastifyBaseLogger } from 'fastify';

interface DelegationLogContext {
  actorId: string;
  actorTenantId: string;
  targetUserId?: string | undefined;
  targetRoleId?: string | undefined;
  targetRoleName?: string | undefined;
  permissions?: string[] | undefined;
  correlationId?: string | undefined;
  reason?: string | undefined;
}

const logDelegationDecision = (
  logger: FastifyBaseLogger | undefined,
  outcome: string,
  context: DelegationLogContext,
): void => {
  if (!logger) return;

  const logEntry = {
    domain: 'delegation',
    outcome,
    actorId: context.actorId,
    actorTenantId: context.actorTenantId,
    targetUserId: context.targetUserId,
    targetRoleId: context.targetRoleId,
    targetRoleName: context.targetRoleName,
    permissions: context.permissions,
    correlationId: context.correlationId,
    reason: context.reason,
  };

  if (outcome === GrantDecisionOutcome.ALLOWED) {
    logger.info(logEntry, 'Delegation allowed');
  } else {
    logger.warn(logEntry, 'Delegation denied');
  }
};

export const evaluatePermissionCeiling = async (
  config: AppConfig,
  input: PermissionCeilingInput,
): Promise<PermissionCeilingOutput> => {
  const { actorId, actorTenantId, targetPermissions } = input;

  if (targetPermissions.length === 0) {
    return {
      outcome: GrantDecisionOutcome.ALLOWED,
      allowedPermissions: [],
      deniedPermissions: [],
    };
  }

  const actorPermissions = await resolvePermissions(config, actorTenantId, actorId);

  const allowedPermissions: string[] = [];
  const deniedPermissions: string[] = [];

  for (const targetPerm of targetPermissions) {
    if (actorPermissions.permissions.includes(targetPerm)) {
      allowedPermissions.push(targetPerm);
    } else {
      deniedPermissions.push(targetPerm);
    }
  }

  if (deniedPermissions.length > 0) {
    return {
      outcome: GrantDecisionOutcome.DENIED_PERMISSION_CEILING,
      allowedPermissions,
      deniedPermissions,
      reason: `Actor lacks permissions: ${deniedPermissions.join(', ')}`,
    };
  }

  return {
    outcome: GrantDecisionOutcome.ALLOWED,
    allowedPermissions,
    deniedPermissions: [],
  };
};

export const canGrantPermissions = async (
  config: AppConfig,
  actorId: string,
  actorTenantId: string,
  targetPermissions: string[],
): Promise<{ allowed: boolean; deniedPermissions: string[] }> => {
  const result = await evaluatePermissionCeiling(config, {
    actorId,
    actorTenantId,
    targetPermissions,
  });

  return {
    allowed: result.outcome === GrantDecisionOutcome.ALLOWED,
    deniedPermissions: result.deniedPermissions,
  };
};

export const checkRoleAssignmentValidity = async (
  config: AppConfig,
  actorId: string,
  actorTenantId: string,
  targetUserId: string,
  targetRoleId: string,
): Promise<{
  isValid: boolean;
  reason?: string;
  outcome: GrantDecisionOutcome;
}> => {
  const db = getDatabaseClient(config);

  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.userId, targetUserId), eq(users.tenantId, actorTenantId)),
  });

  if (!targetUser) {
    return {
      isValid: false,
      reason: 'Target user not found',
      outcome: GrantDecisionOutcome.DENIED_TENANT_ISOLATION,
    };
  }

  if (actorId === targetUserId) {
    return {
      isValid: false,
      reason: 'Self-assignment is not allowed',
      outcome: GrantDecisionOutcome.DENIED_SELF_ESCALATION,
    };
  }

  const targetRole = await db.query.roles.findFirst({
    where: and(eq(roles.id, targetRoleId), eq(roles.tenantId, actorTenantId)),
  });

  if (!targetRole) {
    return {
      isValid: false,
      reason: 'Target role not found',
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
    };
  }

  if (targetRole.isSystem) {
    const actorPermissions = await resolvePermissions(config, actorTenantId, actorId);
    if (!actorPermissions.roles.includes(Role.SUPER_ADMIN)) {
      return {
        isValid: false,
        reason: 'Cannot assign system role without super_admin privileges',
        outcome: GrantDecisionOutcome.DENIED_SYSTEM_ROLE_MUTATION,
      };
    }
  }

  const actorRoles = await db
    .select({
      roleId: userRoles.roleId,
      expiresAt: userRoles.expiresAt,
      scope: userRoles.scope,
    })
    .from(userRoles)
    .where(and(eq(userRoles.userId, actorId), eq(userRoles.tenantId, actorTenantId)));

  const validActorRoles = actorRoles.filter((ar) => {
    const validity = isRoleAssignmentValid({
      expiresAt: ar.expiresAt,
      scope: ar.scope,
    });
    return validity.isValid;
  });

  const actorRoleIds = validActorRoles.map((ar) => ar.roleId).filter(Boolean);

  if (actorRoleIds.length === 0) {
    return {
      isValid: false,
      reason: 'Actor has no valid role assignments',
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
    };
  }

  return {
    isValid: true,
    outcome: GrantDecisionOutcome.ALLOWED,
  };
};

export const assignRoleToUser = async (
  config: AppConfig,
  input: RoleGrantInput,
  options?: { logger?: FastifyBaseLogger; correlationId?: string },
): Promise<RoleGrantOutput> => {
  const { actorId, actorTenantId, targetUserId, targetRoleId, scope, expiresAt } = input;

  const validityCheck = await checkRoleAssignmentValidity(
    config,
    actorId,
    actorTenantId,
    targetUserId,
    targetRoleId,
  );

  if (!validityCheck.isValid) {
    logDelegationDecision(options?.logger, validityCheck.outcome, {
      actorId,
      actorTenantId,
      targetUserId,
      targetRoleId,
      correlationId: options?.correlationId,
      reason: validityCheck.reason,
    });

    const result: RoleGrantOutput = {
      outcome: validityCheck.outcome,
    };
    if (validityCheck.reason) {
      result.reason = validityCheck.reason;
    }
    return result;
  }

  const db = getDatabaseClient(config);

  const existingAssignment = await db.query.userRoles.findFirst({
    where: and(
      eq(userRoles.userId, targetUserId),
      eq(userRoles.roleId, targetRoleId),
      eq(userRoles.tenantId, actorTenantId),
    ),
  });

  if (existingAssignment) {
    const validity = isRoleAssignmentValid({
      expiresAt: existingAssignment.expiresAt,
      scope: existingAssignment.scope,
    });

    if (!validity.isValid) {
      await db
        .update(userRoles)
        .set({
          assignedBy: actorId,
          assignedAt: new Date(),
          expiresAt: expiresAt ?? null,
          scope: scope ?? null,
        })
        .where(eq(userRoles.id, existingAssignment.id));

      logDelegationDecision(options?.logger, GrantDecisionOutcome.ALLOWED, {
        actorId,
        actorTenantId,
        targetUserId,
        targetRoleId,
        correlationId: options?.correlationId,
        reason: 'Reassigned expired role',
      });

      return {
        outcome: GrantDecisionOutcome.ALLOWED,
        reason: 'Reassigned expired role',
      };
    }

    logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE, {
      actorId,
      actorTenantId,
      targetUserId,
      targetRoleId,
      correlationId: options?.correlationId,
      reason: 'User already has this role',
    });

    return {
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
      reason: 'User already has this role',
    };
  }

  await db.insert(userRoles).values({
    tenantId: actorTenantId,
    userId: targetUserId,
    roleId: targetRoleId,
    assignedBy: actorId,
    expiresAt: expiresAt ?? null,
    scope: scope ?? null,
  });

  logDelegationDecision(options?.logger, GrantDecisionOutcome.ALLOWED, {
    actorId,
    actorTenantId,
    targetUserId,
    targetRoleId,
    correlationId: options?.correlationId,
  });

  return {
    outcome: GrantDecisionOutcome.ALLOWED,
  };
};

export const createCustomRole = async (
  config: AppConfig,
  input: RoleCreateInput,
  options?: { logger?: FastifyBaseLogger; correlationId?: string },
): Promise<RoleCreateOutput> => {
  const { actorId, actorTenantId, name, description, permissions: proposedPermissions } = input;

  const permissionCheck = await canGrantPermissions(
    config,
    actorId,
    actorTenantId,
    proposedPermissions,
  );

  if (!permissionCheck.allowed) {
    logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_PERMISSION_CEILING, {
      actorId,
      actorTenantId,
      targetRoleName: name,
      permissions: proposedPermissions,
      correlationId: options?.correlationId,
      reason: `Cannot create role with permissions not in actor's scope: ${permissionCheck.deniedPermissions.join(', ')}`,
    });

    return {
      outcome: GrantDecisionOutcome.DENIED_PERMISSION_CEILING,
      reason: `Cannot create role with permissions not in actor's scope: ${permissionCheck.deniedPermissions.join(', ')}`,
    };
  }

  const db = getDatabaseClient(config);

  const existingRole = await db.query.roles.findFirst({
    where: and(eq(roles.name, name), eq(roles.tenantId, actorTenantId)),
  });

  if (existingRole) {
    logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE, {
      actorId,
      actorTenantId,
      targetRoleName: name,
      permissions: proposedPermissions,
      correlationId: options?.correlationId,
      reason: 'Role with this name already exists',
    });

    return {
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
      reason: 'Role with this name already exists',
    };
  }

  const [createdRole] = await db
    .insert(roles)
    .values({
      tenantId: actorTenantId,
      name,
      description: description ?? null,
      isSystem: false,
    })
    .returning({ id: roles.id });

  if (!createdRole) {
    logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE, {
      actorId,
      actorTenantId,
      targetRoleName: name,
      permissions: proposedPermissions,
      correlationId: options?.correlationId,
      reason: 'Failed to create role',
    });

    return {
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
      reason: 'Failed to create role',
    };
  }

  const permRecords = await db.query.permissions.findMany();

  const permissionKeyToIdMap = new Map<string, string>();
  for (const p of permRecords) {
    permissionKeyToIdMap.set(`${p.resource}:${p.action}`, p.id);
  }

  const rolePermValues: { roleId: string; permissionId: string }[] = [];
  for (const perm of proposedPermissions) {
    const permId = permissionKeyToIdMap.get(perm);
    if (permId) {
      rolePermValues.push({
        roleId: createdRole.id,
        permissionId: permId,
      });
    }
  }

  if (rolePermValues.length > 0) {
    await db.insert(rolePermissions).values(rolePermValues);
  }

  logDelegationDecision(options?.logger, GrantDecisionOutcome.ALLOWED, {
    actorId,
    actorTenantId,
    targetRoleId: createdRole.id,
    targetRoleName: name,
    permissions: proposedPermissions,
    correlationId: options?.correlationId,
  });

  return {
    outcome: GrantDecisionOutcome.ALLOWED,
    roleId: createdRole.id,
  };
};

export const updateCustomRole = async (
  config: AppConfig,
  input: RoleUpdateInput,
  options?: { logger?: FastifyBaseLogger; correlationId?: string },
): Promise<RoleUpdateOutput> => {
  const {
    actorId,
    actorTenantId,
    roleId,
    name,
    description,
    permissions: proposedPermissions,
  } = input;

  const db = getDatabaseClient(config);

  const existingRole = await db.query.roles.findFirst({
    where: and(eq(roles.id, roleId), eq(roles.tenantId, actorTenantId)),
  });

  if (!existingRole) {
    logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE, {
      actorId,
      actorTenantId,
      targetRoleId: roleId,
      targetRoleName: name,
      correlationId: options?.correlationId,
      reason: 'Role not found',
    });

    return {
      outcome: GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
      reason: 'Role not found',
    };
  }

  if (existingRole.isSystem) {
    const actorPermissions = await resolvePermissions(config, actorTenantId, actorId);
    if (!actorPermissions.roles.includes(Role.SUPER_ADMIN)) {
      logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_SYSTEM_ROLE_MUTATION, {
        actorId,
        actorTenantId,
        targetRoleId: roleId,
        targetRoleName: existingRole.name,
        correlationId: options?.correlationId,
        reason: 'Cannot modify system role without super_admin privileges',
      });

      return {
        outcome: GrantDecisionOutcome.DENIED_SYSTEM_ROLE_MUTATION,
        reason: 'Cannot modify system role without super_admin privileges',
      };
    }
  }

  if (proposedPermissions && proposedPermissions.length > 0) {
    const permissionCheck = await canGrantPermissions(
      config,
      actorId,
      actorTenantId,
      proposedPermissions,
    );

    if (!permissionCheck.allowed) {
      logDelegationDecision(options?.logger, GrantDecisionOutcome.DENIED_PERMISSION_CEILING, {
        actorId,
        actorTenantId,
        targetRoleId: roleId,
        targetRoleName: existingRole.name,
        permissions: proposedPermissions,
        correlationId: options?.correlationId,
        reason: `Cannot assign permissions not in actor's scope: ${permissionCheck.deniedPermissions.join(', ')}`,
      });

      return {
        outcome: GrantDecisionOutcome.DENIED_PERMISSION_CEILING,
        reason: `Cannot assign permissions not in actor's scope: ${permissionCheck.deniedPermissions.join(', ')}`,
      };
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    const permRecords = await db.query.permissions.findMany();

    const permissionIdMap = new Map(permRecords.map((p) => [`${p.resource}:${p.action}`, p.id]));

    const rolePermValues = proposedPermissions
      .map((perm: string) => {
        const permId = permissionIdMap.get(perm);
        if (!permId) {
          return null;
        }
        return {
          roleId: roleId,
          permissionId: permId,
        };
      })
      .filter(
        (
          v: { roleId: string; permissionId: string } | null,
        ): v is { roleId: string; permissionId: string } => v !== null,
      );

    if (rolePermValues.length > 0) {
      await db.insert(rolePermissions).values(rolePermValues);
    }
  }

  const updateData: { name?: string; description?: string | null } = {};
  if (name) {
    updateData.name = name;
  }
  if (description !== undefined) {
    updateData.description = description;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(roles).set(updateData).where(eq(roles.id, roleId));
  }

  logDelegationDecision(options?.logger, GrantDecisionOutcome.ALLOWED, {
    actorId,
    actorTenantId,
    targetRoleId: roleId,
    targetRoleName: existingRole.name,
    permissions: proposedPermissions,
    correlationId: options?.correlationId,
  });

  return {
    outcome: GrantDecisionOutcome.ALLOWED,
  };
};

export const listTenantRoles = async (
  config: AppConfig,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> => {
  const db = getDatabaseClient(config);

  const rolesList = await db.query.roles.findMany({
    where: eq(roles.tenantId, tenantId),
    orderBy: [roles.name],
  });

  return rolesList.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
};

export const getRoleDetails = async (
  config: AppConfig,
  roleId: string,
  tenantId: string,
): Promise<{
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
} | null> => {
  const db = getDatabaseClient(config);

  const role = await db.query.roles.findFirst({
    where: and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)),
  });

  if (!role) {
    return null;
  }

  const rolePerms = await db
    .select({
      permissionId: rolePermissions.permissionId,
    })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  const permissionIds = rolePerms.map((rp) => rp.permissionId).filter(Boolean);

  let permissionKeys: string[] = [];
  if (permissionIds.length > 0) {
    const permRecords = await db.query.permissions.findMany({
      where: inArray(permissions.id, permissionIds),
    });
    permissionKeys = permRecords.map((p) => `${p.resource}:${p.action}`);
  }

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: permissionKeys,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

export const getRolePermissions = async (config: AppConfig, roleId: string): Promise<string[]> => {
  const roleDetails = await getRoleDetails(config, roleId, '');
  if (!roleDetails) {
    return [];
  }
  return roleDetails.permissions;
};
