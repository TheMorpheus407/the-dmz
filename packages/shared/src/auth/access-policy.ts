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

export const RouteOutcome = {
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  TENANT_BLOCKED: 'tenant_blocked',
  NOT_FOUND: 'not_found',
} as const;

export type RouteOutcome = (typeof RouteOutcome)[keyof typeof RouteOutcome];

export const routeOutcomeStatus: Record<RouteOutcome, number> = {
  [RouteOutcome.UNAUTHENTICATED]: 401,
  [RouteOutcome.FORBIDDEN]: 403,
  [RouteOutcome.TENANT_BLOCKED]: 403,
  [RouteOutcome.NOT_FOUND]: 404,
};

export const routeOutcomeMessages: Record<
  RouteOutcome,
  Record<RouteGroup, { title: string; message: string; recoveryAction: string }>
> = {
  [RouteOutcome.UNAUTHENTICATED]: {
    [RouteGroup.PUBLIC]: {
      title: 'Please Sign In',
      message: 'You need to be signed in to access this page.',
      recoveryAction: 'Sign In',
    },
    [RouteGroup.AUTH]: {
      title: 'Session Required',
      message: 'Please sign in to continue.',
      recoveryAction: 'Sign In',
    },
    [RouteGroup.GAME]: {
      title: 'AUTH_FAILURE',
      message: 'Session token invalid or expired. Re-authenticate to continue.',
      recoveryAction: 'RETRY_AUTH',
    },
    [RouteGroup.ADMIN]: {
      title: 'Authentication Required',
      message: 'Your session has expired. Please sign in to continue.',
      recoveryAction: 'Sign In',
    },
  },
  [RouteOutcome.FORBIDDEN]: {
    [RouteGroup.PUBLIC]: {
      title: 'Access Restricted',
      message: 'You do not have permission to view this content.',
      recoveryAction: 'Go Home',
    },
    [RouteGroup.AUTH]: {
      title: 'Account Restricted',
      message: 'Your account does not have access to this resource.',
      recoveryAction: 'Go to Home',
    },
    [RouteGroup.GAME]: {
      title: 'ACCESS_DENIED',
      message: 'Insufficient privileges for this operation. Access denied.',
      recoveryAction: 'RETURN_TO_BASE',
    },
    [RouteGroup.ADMIN]: {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      recoveryAction: 'Go Back',
    },
  },
  [RouteOutcome.TENANT_BLOCKED]: {
    [RouteGroup.PUBLIC]: {
      title: 'Service Unavailable',
      message: 'This service is currently unavailable.',
      recoveryAction: 'Go Home',
    },
    [RouteGroup.AUTH]: {
      title: 'Account Suspended',
      message: 'Your account has been suspended. Please contact support.',
      recoveryAction: 'Contact Support',
    },
    [RouteGroup.GAME]: {
      title: 'TENANT_SUSPENDED',
      message: 'Tenant access suspended. Contact administrator for restoration.',
      recoveryAction: 'CONTACT_ADMIN',
    },
    [RouteGroup.ADMIN]: {
      title: 'Tenant Suspended',
      message: 'This tenant is currently suspended. Please contact support.',
      recoveryAction: 'Contact Support',
    },
  },
  [RouteOutcome.NOT_FOUND]: {
    [RouteGroup.PUBLIC]: {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      recoveryAction: 'Go Home',
    },
    [RouteGroup.AUTH]: {
      title: 'Page Not Found',
      message: 'This page does not exist.',
      recoveryAction: 'Go to Home',
    },
    [RouteGroup.GAME]: {
      title: 'LINK_BROKEN',
      message: 'Connection path no longer exists. Return to secure location.',
      recoveryAction: 'RETURN_TO_BASE',
    },
    [RouteGroup.ADMIN]: {
      title: 'Resource Not Found',
      message: 'The requested resource does not exist or has been removed.',
      recoveryAction: 'Go to Dashboard',
    },
  },
};

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
  outcome?: RouteOutcome;
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
    return {
      allowed: false,
      redirectUrl: policy.redirectOnDeny ?? '/login',
      outcome: RouteOutcome.UNAUTHENTICATED,
    };
  }

  if (!hasAllowedTenantStatus(user.tenantStatus, policy.allowedTenantStatuses)) {
    const result: PolicyEvaluationResult = { allowed: false, outcome: RouteOutcome.TENANT_BLOCKED };
    if (policy.redirectOnDeny) {
      result.redirectUrl = policy.redirectOnDeny;
    }
    return result;
  }

  if (!hasRequiredRole(user.role, policy.requiredRoles)) {
    const result: PolicyEvaluationResult = { allowed: false, outcome: RouteOutcome.FORBIDDEN };
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
