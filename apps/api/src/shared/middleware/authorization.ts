import { eq, and, inArray } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { permissions, rolePermissions, roles, userRoles } from '../../db/schema/auth/index.js';
import {
  getABACCachedPermissions,
  setABACCachedPermissions,
  invalidateABACCache,
} from '../cache/abac-cache.js';
import { AuthError } from '../../modules/auth/auth.errors.js';
import * as authService from '../../modules/auth/auth.service.js';

import { AppError, ErrorCodes, insufficientPermissions } from './error-handler.js';
import {
  recordAuthorizationEvaluation,
  recordAuthorizationError,
  ABAC_PERFORMANCE_TARGET_MS,
  ABAC_SLOW_PATH_THRESHOLD_MS,
} from './authorization-metrics.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

export interface PermissionContext {
  permissions: string[];
  roles: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    permissionContext?: PermissionContext;
  }
}

export interface RoleAssignmentValidity {
  isValid: boolean;
  reason?: 'expired' | 'scope_mismatch';
  expiresAt?: Date | undefined;
  scope?: string | null | undefined;
}

export const isRoleAssignmentValid = (
  assignment: {
    expiresAt: Date | null;
    scope: string | null;
  },
  requiredScope?: string | null,
): RoleAssignmentValidity => {
  const now = new Date();

  if (assignment.expiresAt && assignment.expiresAt <= now) {
    return {
      isValid: false,
      reason: 'expired',
      expiresAt: assignment.expiresAt,
      scope: assignment.scope ?? undefined,
    };
  }

  if (
    requiredScope !== undefined &&
    assignment.scope !== null &&
    assignment.scope !== requiredScope
  ) {
    return {
      isValid: false,
      reason: 'scope_mismatch',
      expiresAt: assignment.expiresAt ?? undefined,
      scope: assignment.scope,
    };
  }

  return {
    isValid: true,
    expiresAt: assignment.expiresAt ?? undefined,
    scope: assignment.scope ?? undefined,
  };
};

type UserRoleRecord = {
  roleId: string;
  roleName: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

type ValidatedRoles = {
  validRoleAssignments: UserRoleRecord[];
  hasExpiredAssignment: boolean;
  hasScopeMismatchAssignment: boolean;
};

async function fetchUserRoles(
  db: ReturnType<typeof getDatabaseClient>,
  tenantId: string,
  userId: string,
): Promise<UserRoleRecord[]> {
  const records = await db
    .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
      expiresAt: userRoles.expiresAt,
      scope: userRoles.scope,
    })
    .from(userRoles)
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.tenantId, tenantId)))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

  return records.map((r) => ({
    roleId: r.roleId,
    roleName: r.roleName,
    expiresAt: r.expiresAt,
    scope: r.scope,
  }));
}

export function extractRoleIds(validRoleAssignments: UserRoleRecord[]): string[] {
  return validRoleAssignments.map((ur) => ur.roleId).filter(Boolean);
}

export function extractRoleNames(validRoleAssignments: UserRoleRecord[]): string[] {
  return validRoleAssignments.map((ur) => ur.roleName).filter((name): name is string => !!name);
}

async function fetchPermissionsForRoles(
  db: ReturnType<typeof getDatabaseClient>,
  roleIds: string[],
): Promise<string[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const rolePerms = await db
    .select({
      permissionId: rolePermissions.permissionId,
    })
    .from(rolePermissions)
    .where(
      roleIds.length === 1
        ? eq(rolePermissions.roleId, roleIds[0]!)
        : inArray(rolePermissions.roleId, roleIds),
    );

  return rolePerms.map((rp) => rp.permissionId).filter(Boolean);
}

type PermissionRecord = {
  id: string;
  resource: string;
  action: string;
};

async function fetchPermissionRecords(
  db: ReturnType<typeof getDatabaseClient>,
  permissionIds: string[],
): Promise<Map<string, PermissionRecord>> {
  if (permissionIds.length === 0) {
    return new Map();
  }

  const permRecords = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(permissions)
    .where(inArray(permissions.id, permissionIds));

  return new Map(
    permRecords.map((p) => [p.id, { id: p.id, resource: p.resource, action: p.action }]),
  );
}

export function validateRoleAssignments(userRoleRecords: UserRoleRecord[]): ValidatedRoles {
  const validRoleAssignments: UserRoleRecord[] = [];
  let hasExpiredAssignment = false;
  let hasScopeMismatchAssignment = false;

  for (const assignment of userRoleRecords) {
    const validity = isRoleAssignmentValid({
      expiresAt: assignment.expiresAt,
      scope: assignment.scope,
    });

    if (validity.isValid) {
      validRoleAssignments.push(assignment);
    } else if (validity.reason === 'expired') {
      hasExpiredAssignment = true;
    } else if (validity.reason === 'scope_mismatch') {
      hasScopeMismatchAssignment = true;
    }
  }

  return { validRoleAssignments, hasExpiredAssignment, hasScopeMismatchAssignment };
}

export function assertValidRoleAssignments(
  validated: ValidatedRoles,
  userRoleRecordsCount: number,
): void {
  if (validated.validRoleAssignments.length === 0 && userRoleRecordsCount > 0) {
    if (validated.hasExpiredAssignment) {
      throw insufficientPermissions('Role assignment has expired');
    }
    if (validated.hasScopeMismatchAssignment) {
      throw insufficientPermissions('Role assignment scope does not match');
    }
    throw insufficientPermissions('No valid role assignments found');
  }
}

export function buildPermissionKeys(
  permissionIds: string[],
  permMap: Map<string, PermissionRecord>,
): string[] {
  return permissionIds
    .map((id) => permMap.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => `${p.resource}:${p.action}`);
}

type SlowLogContext = {
  tenantId: string;
  userId: string;
  roleNames: string[];
  permissionKeys: string[];
};

function logSlowAuthorization(latencyMs: number, context: SlowLogContext): void {
  if (latencyMs > ABAC_SLOW_PATH_THRESHOLD_MS) {
    console.warn(
      {
        type: 'SLOW_AUTHORIZATION_EVALUATION',
        latencyMs,
        thresholdMs: ABAC_SLOW_PATH_THRESHOLD_MS,
        targetMs: ABAC_PERFORMANCE_TARGET_MS,
        ...context,
      },
      'Authorization evaluation exceeded slow-path threshold',
    );
  }
}

export const resolvePermissions = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<PermissionContext> => {
  const startTime = performance.now();

  const redisCached = await getABACCachedPermissions(config, tenantId, userId);
  if (redisCached) {
    const latencyMs = performance.now() - startTime;
    recordAuthorizationEvaluation(latencyMs, true);
    return {
      permissions: redisCached.permissions,
      roles: redisCached.roles,
    };
  }

  const db = getDatabaseClient(config);

  const userRoleRecords = await fetchUserRoles(db, tenantId, userId);
  const validated = validateRoleAssignments(userRoleRecords);
  assertValidRoleAssignments(validated, userRoleRecords.length);

  const roleIds = extractRoleIds(validated.validRoleAssignments);
  const roleNames = extractRoleNames(validated.validRoleAssignments);

  const permissionIds = await fetchPermissionsForRoles(db, roleIds);

  const permMap = await fetchPermissionRecords(db, permissionIds);
  const permissionKeys = buildPermissionKeys(permissionIds, permMap);

  await setABACCachedPermissions(config, tenantId, userId, permissionKeys, roleNames);

  const latencyMs = performance.now() - startTime;
  recordAuthorizationEvaluation(latencyMs, false);
  logSlowAuthorization(latencyMs, { tenantId, userId, roleNames, permissionKeys });

  return {
    permissions: permissionKeys,
    roles: roleNames,
  };
};

export const hasPermission = (
  userPermissions: string[],
  resource: string,
  action: string,
): boolean => {
  const requiredPermission = `${resource}:${action}`;
  return userPermissions.includes(requiredPermission);
};

export const hasRole = (userRoles: string[], requiredRoles: string[]): boolean => {
  const lowerUserRoles = userRoles.map((r) => r.toLowerCase());
  return requiredRoles.some((role) => lowerUserRoles.includes(role.toLowerCase()));
};

export const authGuard = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  const config = request.server.config;
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError({
      message: 'Missing or invalid authorization header',
      statusCode: 401,
    });
  }

  const bearerValue = authHeader.substring(7);

  try {
    const user = await authService.verifyAccessToken(config, bearerValue);
    request.user = user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError({
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
};

export const requirePermission = (resource: string, action: string) => {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const startTime = performance.now();
    const user = request.user;
    const tenantContext = request.tenantContext;

    if (!user || !tenantContext) {
      recordAuthorizationError();
      request.log.warn(
        {
          requestId: request.id,
          route: request.routeOptions?.url ?? request.url,
        },
        'Authorization check failed: missing user or tenant context',
      );
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    try {
      const config = request.server.config;
      const permissionContext = await resolvePermissions(
        config,
        tenantContext.tenantId,
        user.userId,
      );

      request.permissionContext = permissionContext;

      if (!hasPermission(permissionContext.permissions, resource, action)) {
        request.log.warn(
          {
            requestId: request.id,
            tenantId: tenantContext.tenantId,
            userId: user.userId,
            route: request.routeOptions?.url ?? request.url,
            requiredPermission: `${resource}:${action}`,
          },
          'Authorization denied: insufficient permissions',
        );

        throw insufficientPermissions(`Missing required permission: ${resource}:${action}`, {
          required: `${resource}:${action}`,
          granted: permissionContext.permissions,
        });
      }

      const latencyMs = performance.now() - startTime;
      if (latencyMs > ABAC_SLOW_PATH_THRESHOLD_MS) {
        request.log.warn(
          {
            requestId: request.id,
            tenantId: tenantContext.tenantId,
            userId: user.userId,
            route: request.routeOptions?.url ?? request.url,
            latencyMs,
            thresholdMs: ABAC_SLOW_PATH_THRESHOLD_MS,
          },
          'Authorization path exceeded slow-path threshold',
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      recordAuthorizationError();
      throw error;
    }
  };
};

export const requireRole = (...requiredRoles: string[]) => {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const startTime = performance.now();
    const user = request.user;
    const tenantContext = request.tenantContext;

    if (!user || !tenantContext) {
      recordAuthorizationError();
      request.log.warn(
        {
          requestId: request.id,
          route: request.routeOptions?.url ?? request.url,
        },
        'Authorization check failed: missing user or tenant context',
      );
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    try {
      const config = request.server.config;
      const permissionContext = await resolvePermissions(
        config,
        tenantContext.tenantId,
        user.userId,
      );

      request.permissionContext = permissionContext;

      if (!hasRole(permissionContext.roles, requiredRoles)) {
        request.log.warn(
          {
            requestId: request.id,
            tenantId: tenantContext.tenantId,
            userId: user.userId,
            route: request.routeOptions?.url ?? request.url,
            requiredRoles,
          },
          'Authorization denied: insufficient role',
        );

        throw insufficientPermissions(`Missing required role: ${requiredRoles.join(' or ')}`, {
          required: requiredRoles,
          granted: permissionContext.roles,
        });
      }

      const latencyMs = performance.now() - startTime;
      if (latencyMs > ABAC_SLOW_PATH_THRESHOLD_MS) {
        request.log.warn(
          {
            requestId: request.id,
            tenantId: tenantContext.tenantId,
            userId: user.userId,
            route: request.routeOptions?.url ?? request.url,
            latencyMs,
            thresholdMs: ABAC_SLOW_PATH_THRESHOLD_MS,
          },
          'Authorization path exceeded slow-path threshold',
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      recordAuthorizationError();
      throw error;
    }
  };
};

export const clearPermissionCache = async (
  config: AppConfig,
  tenantId?: string,
  userId?: string,
): Promise<void> => {
  if (tenantId) {
    await invalidateABACCache(config, tenantId, userId);
  }
};
