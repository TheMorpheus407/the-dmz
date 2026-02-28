export type PermissionEvaluator = 'allOf' | 'anyOf';

export interface EndpointPermissionDeclaration {
  resource: string;
  action: string;
}

export interface EndpointPermissionRequirements {
  permissions: EndpointPermissionDeclaration[];
  evaluator: PermissionEvaluator;
}

export interface ProtectedEndpointConfig {
  permissions: EndpointPermissionRequirements;
}

export interface AuthorizationDenialDetails {
  required: string[];
  granted: string[];
  evaluator: PermissionEvaluator;
}

export interface AuthorizationDenialLog {
  requestId: string;
  tenantId?: string;
  userId?: string;
  route: string;
  method: string;
  denialReason: 'insufficient_permissions' | 'missing_permission_declaration' | 'no_roles';
  requiredPermissions?: string[];
  grantedPermissions?: string[];
  evaluator?: PermissionEvaluator;
  timestamp: string;
}

export interface AuthorizationDeniedResponse {
  code: string;
  message: string;
  requestId: string;
  details?: {
    reason: string;
    required?: string[];
    granted?: string[];
  };
}

export const createPermissionKey = (resource: string, action: string): string =>
  `${resource}:${action}`;

export const parsePermissionKey = (
  permission: string,
): { resource: string; action: string } | null => {
  const colonIndex = permission.indexOf(':');
  if (colonIndex === -1) return null;
  return {
    resource: permission.substring(0, colonIndex),
    action: permission.substring(colonIndex + 1),
  };
};

export const evaluatePermissionRequirements = (
  userPermissions: string[],
  requirements: EndpointPermissionRequirements,
): boolean => {
  const userPermSet = new Set(userPermissions);

  const requirementPerms = requirements.permissions.map((p) =>
    createPermissionKey(p.resource, p.action),
  );

  if (requirements.evaluator === 'allOf') {
    return requirementPerms.every((required) => userPermSet.has(required));
  } else {
    return requirementPerms.some((required) => userPermSet.has(required));
  }
};

export const formatPermissionDeclaration = (declaration: EndpointPermissionDeclaration): string =>
  createPermissionKey(declaration.resource, declaration.action);

export const formatPermissionRequirements = (
  requirements: EndpointPermissionRequirements,
): string[] => requirements.permissions.map(formatPermissionDeclaration);

export const createAuthzDenialLog = (
  requestId: string,
  route: string,
  method: string,
  denialReason: AuthorizationDenialLog['denialReason'],
  options?: {
    tenantId?: string;
    userId?: string;
    requiredPermissions?: string[];
    grantedPermissions?: string[];
    evaluator?: PermissionEvaluator;
  },
): AuthorizationDenialLog => ({
  requestId,
  tenantId: options?.tenantId ?? '',
  userId: options?.userId ?? '',
  route,
  method,
  denialReason,
  requiredPermissions: options?.requiredPermissions ?? [],
  grantedPermissions: options?.grantedPermissions ?? [],
  evaluator: options?.evaluator ?? 'allOf',
  timestamp: new Date().toISOString(),
});
