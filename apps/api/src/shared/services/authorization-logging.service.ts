import {
  createAuthzDenialLog,
  type AuthorizationDenialLog,
  type PermissionEvaluator,
} from '@the-dmz/shared';

import type { FastifyRequest } from 'fastify';

export type DenialReason = AuthorizationDenialLog['denialReason'];

export interface AuthorizationLoggingOptions {
  includeUserId: boolean;
  includeTenantId: boolean;
  redactSensitiveData: boolean;
}

const defaultOptions: AuthorizationLoggingOptions = {
  includeUserId: true,
  includeTenantId: true,
  redactSensitiveData: true,
};

const shouldRedactInProduction = (
  nodeEnv: string | undefined,
  redactSensitiveData: boolean,
): boolean => {
  if (!redactSensitiveData) return false;
  return nodeEnv === 'production';
};

export const logAuthorizationDenial = (
  request: FastifyRequest,
  reason: DenialReason,
  options?: Partial<AuthorizationLoggingOptions>,
): void => {
  const config = request.server.config;
  const nodeEnv = config.NODE_ENV;
  const opts = { ...defaultOptions, ...options };

  const user = request.user;
  const tenantContext = request.tenantContext;

  let userId: string | undefined;
  let tenantId: string | undefined;

  if (!shouldRedactInProduction(nodeEnv, opts.redactSensitiveData)) {
    userId = user?.userId;
    tenantId = tenantContext?.tenantId;
  }

  const route = request.routeOptions?.url ?? request.url;
  const method = request.method;

  const logOptions: {
    tenantId?: string;
    userId?: string;
  } = {};

  if (tenantId) logOptions.tenantId = tenantId;
  if (userId) logOptions.userId = userId;

  const denialLog = createAuthzDenialLog(request.id, route, method, reason, logOptions);

  request.log.warn(
    {
      requestId: denialLog.requestId,
      tenantId: denialLog.tenantId,
      userId: denialLog.userId,
      route: denialLog.route,
      method: denialLog.method,
      denialReason: denialLog.denialReason,
      timestamp: denialLog.timestamp,
    },
    `Authorization denied: ${reason}`,
  );
};

export const logInsufficientPermissions = (
  request: FastifyRequest,
  requiredPermissions: string[],
  grantedPermissions: string[],
  evaluator: PermissionEvaluator,
  options?: Partial<AuthorizationLoggingOptions>,
): void => {
  const config = request.server.config;
  const nodeEnv = config.NODE_ENV;
  const opts = { ...defaultOptions, ...options };

  const user = request.user;
  const tenantContext = request.tenantContext;

  let userId: string | undefined;
  let tenantId: string | undefined;

  if (!shouldRedactInProduction(nodeEnv, opts.redactSensitiveData)) {
    userId = user?.userId;
    tenantId = tenantContext?.tenantId;
  }

  const route = request.routeOptions?.url ?? request.url;
  const method = request.method;

  request.log.warn(
    {
      requestId: request.id,
      tenantId,
      userId,
      route,
      method,
      denialReason: 'insufficient_permissions',
      requiredPermissions: shouldRedactInProduction(nodeEnv, opts.redactSensitiveData)
        ? undefined
        : requiredPermissions,
      grantedPermissions: shouldRedactInProduction(nodeEnv, opts.redactSensitiveData)
        ? undefined
        : grantedPermissions,
      evaluator,
      timestamp: new Date().toISOString(),
    },
    'Authorization denied: insufficient permissions',
  );
};

export const logMissingPermissionDeclaration = (
  request: FastifyRequest,
  _options?: Partial<AuthorizationLoggingOptions>,
): void => {
  const route = request.routeOptions?.url ?? request.url;
  const method = request.method;

  request.log.error(
    {
      requestId: request.id,
      route,
      method,
      denialReason: 'missing_permission_declaration',
      timestamp: new Date().toISOString(),
    },
    'Protected route missing permission declaration',
  );
};

export const logNoRoles = (
  request: FastifyRequest,
  options?: Partial<AuthorizationLoggingOptions>,
): void => {
  const config = request.server.config;
  const nodeEnv = config.NODE_ENV;
  const opts = { ...defaultOptions, ...options };

  const user = request.user;
  const tenantContext = request.tenantContext;

  let userId: string | undefined;
  let tenantId: string | undefined;

  if (!shouldRedactInProduction(nodeEnv, opts.redactSensitiveData)) {
    userId = user?.userId;
    tenantId = tenantContext?.tenantId;
  }

  const route = request.routeOptions?.url ?? request.url;
  const method = request.method;

  request.log.warn(
    {
      requestId: request.id,
      tenantId,
      userId,
      route,
      method,
      denialReason: 'no_roles',
      timestamp: new Date().toISOString(),
    },
    'Authorization denied: user has no roles assigned',
  );
};
