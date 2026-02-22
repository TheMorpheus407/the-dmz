import { z } from 'zod';

export const ActorType = {
  ANONYMOUS: 'anonymous',
  AUTHENTICATED: 'authenticated',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const Role = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  MANAGER: 'manager',
  TRAINER: 'trainer',
  LEARNER: 'learner',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const roleSchema = z.enum([
  Role.SUPER_ADMIN,
  Role.TENANT_ADMIN,
  Role.MANAGER,
  Role.TRAINER,
  Role.LEARNER,
]);

export const allRoles: readonly Role[] = [
  Role.SUPER_ADMIN,
  Role.TENANT_ADMIN,
  Role.MANAGER,
  Role.TRAINER,
  Role.LEARNER,
];

export const adminRoles: readonly Role[] = [Role.SUPER_ADMIN, Role.TENANT_ADMIN];

export const AccessPolicyTenantStatus = {
  PROVISIONING: 'provisioning',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
} as const;

export type AccessPolicyTenantStatus =
  (typeof AccessPolicyTenantStatus)[keyof typeof AccessPolicyTenantStatus];

export const tenantStatusSchema = z.enum([
  AccessPolicyTenantStatus.PROVISIONING,
  AccessPolicyTenantStatus.ACTIVE,
  AccessPolicyTenantStatus.SUSPENDED,
  AccessPolicyTenantStatus.DEACTIVATED,
]);

export const allowedTenantStatuses: readonly AccessPolicyTenantStatus[] = [
  AccessPolicyTenantStatus.ACTIVE,
];
export const blockedTenantStatuses: readonly AccessPolicyTenantStatus[] = [
  AccessPolicyTenantStatus.SUSPENDED,
  AccessPolicyTenantStatus.DEACTIVATED,
];

export const RouteGroup = {
  PUBLIC: '(public)',
  AUTH: '(auth)',
  GAME: '(game)',
  ADMIN: '(admin)',
} as const;

export type RouteGroup = (typeof RouteGroup)[keyof typeof RouteGroup];

export const routeGroupSchema = z.enum([
  RouteGroup.PUBLIC,
  RouteGroup.AUTH,
  RouteGroup.GAME,
  RouteGroup.ADMIN,
]);

export interface RouteGroupPolicy {
  actorType: ActorType;
  requiredRoles: readonly Role[];
  allowedTenantStatuses: readonly AccessPolicyTenantStatus[];
  redirectOnDeny?: string;
}

export const routeGroupPolicyMatrix: Record<RouteGroup, RouteGroupPolicy> = {
  [RouteGroup.PUBLIC]: {
    actorType: ActorType.ANONYMOUS,
    requiredRoles: [],
    allowedTenantStatuses: [],
  },
  [RouteGroup.AUTH]: {
    actorType: ActorType.ANONYMOUS,
    requiredRoles: [],
    allowedTenantStatuses: [],
    redirectOnDeny: '/game',
  },
  [RouteGroup.GAME]: {
    actorType: ActorType.AUTHENTICATED,
    requiredRoles: [],
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
    redirectOnDeny: '/login',
  },
  [RouteGroup.ADMIN]: {
    actorType: ActorType.AUTHENTICATED,
    requiredRoles: adminRoles,
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
    redirectOnDeny: '/game',
  },
};

export const ApiScope = {
  AUTH_ME: 'auth:me',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_REFRESH: 'auth:refresh',
  AUTH_REGISTER: 'auth:register',
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',
  GAME_READ: 'game:read',
  GAME_WRITE: 'game:write',
  GAME_ADMIN_READ: 'game:admin_read',
  GAME_ADMIN_WRITE: 'game:admin_write',
  ADMIN_TENANT_READ: 'admin:tenant_read',
  ADMIN_TENANT_WRITE: 'admin:tenant_write',
  ADMIN_USER_READ: 'admin:user_read',
  ADMIN_USER_WRITE: 'admin:user_write',
} as const;

export type ApiScope = (typeof ApiScope)[keyof typeof ApiScope];

export const apiScopeSchema = z.enum(Object.values(ApiScope) as [string, ...string[]]);

export interface ApiEndpointPolicy {
  scopes: readonly ApiScope[];
  requiredRoles: readonly Role[];
  allowedTenantStatuses: readonly AccessPolicyTenantStatus[];
}

export const apiEndpointPolicyMatrix: Record<string, ApiEndpointPolicy> = {
  '/api/v1/auth/me': {
    scopes: [ApiScope.AUTH_ME],
    requiredRoles: [],
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
  '/api/v1/auth/login': {
    scopes: [ApiScope.AUTH_LOGIN],
    requiredRoles: [],
    allowedTenantStatuses: [],
  },
  '/api/v1/auth/logout': {
    scopes: [ApiScope.AUTH_LOGOUT],
    requiredRoles: [],
    allowedTenantStatuses: [],
  },
  '/api/v1/auth/refresh': {
    scopes: [ApiScope.AUTH_REFRESH],
    requiredRoles: [],
    allowedTenantStatuses: [],
  },
  '/api/v1/auth/register': {
    scopes: [ApiScope.AUTH_REGISTER],
    requiredRoles: [],
    allowedTenantStatuses: [],
  },
  '/api/v1/profile': {
    scopes: [ApiScope.PROFILE_READ, ApiScope.PROFILE_WRITE],
    requiredRoles: [],
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
  '/api/v1/games': {
    scopes: [ApiScope.GAME_READ, ApiScope.GAME_WRITE],
    requiredRoles: [],
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
  '/api/v1/admin/games': {
    scopes: [ApiScope.GAME_ADMIN_READ, ApiScope.GAME_ADMIN_WRITE],
    requiredRoles: adminRoles,
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
  '/api/v1/admin/tenants': {
    scopes: [ApiScope.ADMIN_TENANT_READ, ApiScope.ADMIN_TENANT_WRITE],
    requiredRoles: adminRoles,
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
  '/api/v1/admin/users': {
    scopes: [ApiScope.ADMIN_USER_READ, ApiScope.ADMIN_USER_WRITE],
    requiredRoles: adminRoles,
    allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
  },
};

export const isRouteGroupProtected = (routeGroup: RouteGroup): boolean => {
  const policy = routeGroupPolicyMatrix[routeGroup];
  return policy.actorType === ActorType.AUTHENTICATED || policy.requiredRoles.length > 0;
};

export const isApiEndpointProtected = (endpoint: string): boolean => {
  const policy = apiEndpointPolicyMatrix[endpoint];
  if (!policy) {
    return false;
  }
  return policy.requiredRoles.length > 0 || policy.allowedTenantStatuses.length > 0;
};

export const hasRequiredRole = (
  userRole: string | undefined,
  requiredRoles: readonly Role[],
): boolean => {
  if (requiredRoles.length === 0) {
    return true;
  }
  if (!userRole) {
    return false;
  }
  return requiredRoles.some((role) => role.toLowerCase() === userRole.toLowerCase());
};

export const hasAllowedTenantStatus = (
  tenantStatus: string | undefined,
  allowedStatuses: readonly AccessPolicyTenantStatus[],
): boolean => {
  if (allowedStatuses.length === 0) {
    return true;
  }
  if (!tenantStatus) {
    return true;
  }
  return allowedStatuses.includes(tenantStatus as AccessPolicyTenantStatus);
};

export interface PolicyEvaluationResult {
  allowed: boolean;
  redirectUrl?: string;
}

export const evaluateRouteGroupPolicy = (
  routeGroup: RouteGroup,
  user: { role?: string; tenantStatus?: string } | null,
): PolicyEvaluationResult => {
  const policy = routeGroupPolicyMatrix[routeGroup];

  if (policy.actorType === ActorType.ANONYMOUS) {
    if (user && policy.redirectOnDeny) {
      return { allowed: false, redirectUrl: policy.redirectOnDeny };
    }
    return { allowed: true };
  }

  if (!user) {
    return { allowed: false, redirectUrl: policy.redirectOnDeny ?? '/login' };
  }

  if (
    !hasRequiredRole(user.role, policy.requiredRoles) ||
    !hasAllowedTenantStatus(user.tenantStatus, policy.allowedTenantStatuses)
  ) {
    const result: PolicyEvaluationResult = { allowed: false };
    if (policy.redirectOnDeny) {
      result.redirectUrl = policy.redirectOnDeny;
    }
    return result;
  }

  return { allowed: true };
};

export const getApiPolicyForEndpoint = (endpoint: string): ApiEndpointPolicy | undefined => {
  const exactMatch = apiEndpointPolicyMatrix[endpoint];
  if (exactMatch) {
    return exactMatch;
  }

  for (const [pattern, policy] of Object.entries(apiEndpointPolicyMatrix)) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    if (regex.test(endpoint)) {
      return policy;
    }
  }

  return undefined;
};
