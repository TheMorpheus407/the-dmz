import {
  evaluatePermissionRequirements,
  type EndpointPermissionRequirements,
  type PermissionEvaluator,
  createAuthzDenialLog,
  createPermissionKey,
} from '@the-dmz/shared';

import { AppError, ErrorCodes, insufficientPermissions } from './error-handler.js';
import { resolvePermissions } from './authorization.js';

import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    permissionContext?: {
      permissions: string[];
      roles: string[];
    };
    permissionRequirements?: EndpointPermissionRequirements;
  }
}

export interface PermissionDeclarationOptions {
  permissions: { resource: string; action: string }[];
  evaluator?: PermissionEvaluator;
}

const logAuthorizationDenial = (
  _request: FastifyRequest,
  denialLog: ReturnType<typeof createAuthzDenialLog>,
): void => {
  _request.log.warn(
    {
      requestId: denialLog.requestId,
      tenantId: denialLog.tenantId,
      userId: denialLog.userId,
      route: denialLog.route,
      method: denialLog.method,
      denialReason: denialLog.denialReason,
      requiredPermissions: denialLog.requiredPermissions,
      grantedPermissions: denialLog.grantedPermissions,
      evaluator: denialLog.evaluator,
    },
    'Authorization denied',
  );
};

const isProductionEnvironment = (nodeEnv: string | undefined): boolean => nodeEnv === 'production';

const formatDeniedResponse = (
  _request: FastifyRequest,
  requiredPermissions: string[],
  grantedPermissions: string[],
  evaluator: PermissionEvaluator,
  nodeEnv: string | undefined,
): { message: string; details?: Record<string, unknown> } => {
  if (isProductionEnvironment(nodeEnv)) {
    return {
      message: 'Insufficient permissions to perform this action',
    };
  }

  return {
    message: 'Insufficient permissions to perform this action',
    details: {
      reason:
        evaluator === 'allOf'
          ? 'missing_all_required_permissions'
          : 'missing_any_required_permission',
      required: requiredPermissions,
      granted: grantedPermissions,
    },
  };
};

export const requirePermissions = (
  permissions: { resource: string; action: string }[],
  evaluator: PermissionEvaluator = 'allOf',
) => {
  const requirements: EndpointPermissionRequirements = {
    permissions,
    evaluator,
  };

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const startTime = performance.now();
    const user = request.user;
    const tenantContext = request.tenantContext;
    const config = request.server.config;

    if (!user || !tenantContext) {
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    request.permissionRequirements = requirements;

    const permissionContext = await resolvePermissions(config, tenantContext.tenantId, user.userId);

    request.permissionContext = permissionContext;

    const requiredPermStrings = permissions.map((p) => createPermissionKey(p.resource, p.action));

    const hasAccess = evaluatePermissionRequirements(permissionContext.permissions, requirements);

    if (!hasAccess) {
      const denialLog = createAuthzDenialLog(
        request.id,
        request.routeOptions?.url ?? request.url,
        request.method,
        'insufficient_permissions',
        {
          tenantId: tenantContext.tenantId,
          userId: user.userId,
          requiredPermissions: requiredPermStrings,
          grantedPermissions: permissionContext.permissions,
          evaluator,
        },
      );

      logAuthorizationDenial(request, denialLog);

      const response = formatDeniedResponse(
        request,
        requiredPermStrings,
        permissionContext.permissions,
        evaluator,
        config.NODE_ENV,
      );

      throw insufficientPermissions(response.message, response.details);
    }

    const latencyMs = performance.now() - startTime;
    if (latencyMs > 100) {
      request.log.warn(
        {
          requestId: request.id,
          tenantId: tenantContext.tenantId,
          userId: user.userId,
          route: request.routeOptions?.url ?? request.url,
          latencyMs,
        },
        'Permission evaluation exceeded threshold',
      );
    }
  };
};

export const verifyPermissionDeclaration = async (request: FastifyRequest): Promise<void> => {
  const nodeEnv = request.server.config.NODE_ENV;

  if (!request.permissionRequirements) {
    const route = request.routeOptions?.url ?? request.url;
    const method = request.method;

    request.log.error(
      {
        requestId: request.id,
        route,
        method,
      },
      'Protected route missing permission declaration - route must declare required permissions',
    );

    if (isProductionEnvironment(nodeEnv)) {
      throw insufficientPermissions('Insufficient permissions to perform this action');
    }

    throw new AppError({
      code: ErrorCodes.AUTH_PERMISSION_DECLARATION_MISSING,
      message: 'Route missing permission declaration - configuration error',
      statusCode: 500,
      details: {
        route,
        method,
        message: 'This protected route does not declare required permissions',
      },
    });
  }
};
