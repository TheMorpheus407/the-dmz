import { eq, and, inArray } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { permissions, rolePermissions, roles, userRoles } from '../../db/schema/auth/index.js';
import {
  getABACCachedPermissions,
  setABACCachedPermissions,
  invalidateABACCache,
} from '../cache/abac-cache.js';

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

const permissionCache = new Map<
  string,
  { permissions: string[]; roles: string[]; expiresAt: number }
>();

const CACHE_TTL_MS = 30_000;

const buildPermissionCacheKey = (tenantId: string, userId: string): string =>
  `permissions:${tenantId}:${userId}`;

const getCachedPermissions = (
  tenantId: string,
  userId: string,
): { permissions: string[]; roles: string[] } | null => {
  const key = buildPermissionCacheKey(tenantId, userId);
  const cached = permissionCache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return {
      permissions: cached.permissions,
      roles: cached.roles,
    };
  }

  permissionCache.delete(key);
  return null;
};

const setCachedPermissions = (
  tenantId: string,
  userId: string,
  permissions: string[],
  roles: string[],
): void => {
  const key = buildPermissionCacheKey(tenantId, userId);
  permissionCache.set(key, {
    permissions,
    roles,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const resolvePermissions = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<PermissionContext> => {
  const startTime = performance.now();

  const redisCached = await getABACCachedPermissions(config, tenantId, userId);
  if (redisCached) {
    setCachedPermissions(tenantId, userId, redisCached.permissions, redisCached.roles);
    const latencyMs = performance.now() - startTime;
    recordAuthorizationEvaluation(latencyMs, true);
    return {
      permissions: redisCached.permissions,
      roles: redisCached.roles,
    };
  }

  const cached = getCachedPermissions(tenantId, userId);
  if (cached) {
    const latencyMs = performance.now() - startTime;
    recordAuthorizationEvaluation(latencyMs, true);
    return {
      permissions: cached.permissions,
      roles: cached.roles,
    };
  }

  const db = getDatabaseClient(config);

  const userRoleRecords = await db
    .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
    .from(userRoles)
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.tenantId, tenantId)))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

  const roleIds = userRoleRecords.map((ur) => ur.roleId).filter(Boolean);
  const roleNames = userRoleRecords
    .map((ur) => ur.roleName)
    .filter((name): name is string => !!name);

  let permissionIds: string[] = [];

  if (roleIds.length > 0) {
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
      .from(permissions);

    const permMap = new Map(permRecords.map((p) => [p.id, p]));

    permissionKeys = permissionIds
      .map((id) => permMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => `${p.resource}:${p.action}`);
  }

  setCachedPermissions(tenantId, userId, permissionKeys, roleNames);
  await setABACCachedPermissions(config, tenantId, userId, permissionKeys, roleNames);

  const latencyMs = performance.now() - startTime;
  recordAuthorizationEvaluation(latencyMs, false);

  if (latencyMs > ABAC_SLOW_PATH_THRESHOLD_MS) {
    console.warn(
      {
        type: 'SLOW_AUTHORIZATION_EVALUATION',
        latencyMs,
        thresholdMs: ABAC_SLOW_PATH_THRESHOLD_MS,
        targetMs: ABAC_PERFORMANCE_TARGET_MS,
        tenantId,
        userId,
        roleCount: roleNames.length,
        permissionCount: permissionKeys.length,
      },
      'Authorization evaluation exceeded slow-path threshold',
    );
  }

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
  if (tenantId && userId) {
    const key = buildPermissionCacheKey(tenantId, userId);
    permissionCache.delete(key);
    await invalidateABACCache(config, tenantId, userId);
  } else if (tenantId) {
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`permissions:${tenantId}:`)) {
        permissionCache.delete(key);
      }
    }
    await invalidateABACCache(config, tenantId);
  } else {
    permissionCache.clear();
  }
};
