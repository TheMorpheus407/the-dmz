import { z } from 'zod';

export const CredentialType = {
  API_KEY: 'api_key',
  PAT: 'pat',
} as const;

export type CredentialType = (typeof CredentialType)[keyof typeof CredentialType];

export const credentialTypeSchema = z.enum([CredentialType.API_KEY, CredentialType.PAT]);

export const CredentialOwnerType = {
  SERVICE: 'service',
  USER: 'user',
} as const;

export type CredentialOwnerType = (typeof CredentialOwnerType)[keyof typeof CredentialOwnerType];

export const credentialOwnerTypeSchema = z.enum([
  CredentialOwnerType.SERVICE,
  CredentialOwnerType.USER,
]);

export const CredentialStatus = {
  ACTIVE: 'active',
  ROTATING: 'rotating',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type CredentialStatus = (typeof CredentialStatus)[keyof typeof CredentialStatus];

export const credentialStatusSchema = z.enum([
  CredentialStatus.ACTIVE,
  CredentialStatus.ROTATING,
  CredentialStatus.REVOKED,
  CredentialStatus.EXPIRED,
]);

export const activeCredentialStatuses: readonly CredentialStatus[] = [
  CredentialStatus.ACTIVE,
  CredentialStatus.ROTATING,
];

export const validCredentialStatuses: readonly CredentialStatus[] = [
  CredentialStatus.ACTIVE,
  CredentialStatus.ROTATING,
  CredentialStatus.EXPIRED,
];

export const DEFAULT_ROTATION_GRACE_PERIOD_DAYS = 7;
export const MAX_ROTATION_GRACE_PERIOD_DAYS = 30;
export const MIN_ROTATION_GRACE_PERIOD_DAYS = 1;
export const API_KEY_PREFIX = 'dmz_ak_';
export const PAT_PREFIX = 'dmz_pat_';
export const API_KEY_MIN_LENGTH = 32;
export const API_KEY_MAX_LENGTH = 64;
export const MAX_KEYS_PER_TENANT = 100;
export const MAX_KEYS_PER_USER = 10;

export interface ApiKeyScope {
  resource: string;
  actions: readonly string[];
}

export const ApiKeyScopeResource = {
  ANALYTICS: 'analytics',
  USERS: 'users',
  ADMIN: 'admin',
  WEBHOOKS: 'webhooks',
  SCIM: 'scim',
  INTEGRATIONS: 'integrations',
} as const;

export type ApiKeyScopeResource = (typeof ApiKeyScopeResource)[keyof typeof ApiKeyScopeResource];

export const apiKeyScopeResourceSchema = z.enum([
  'analytics',
  'users',
  'admin',
  'webhooks',
  'scim',
  'integrations',
]);

export const scopeActions = ['read', 'write', 'admin'] as const;
export type ScopeAction = (typeof scopeActions)[number];

export const scopeActionSchema = z.enum(scopeActions);

export const apiKeyScopeSchema: z.ZodSchema<ApiKeyScope> = z.object({
  resource: apiKeyScopeResourceSchema,
  actions: z.array(scopeActionSchema).min(1),
});

export const apiKeyScopesSchema = z.array(apiKeyScopeSchema);

export const ApiKeyPermission = {
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_WRITE: 'analytics:write',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
  SCIM_READ: 'scim:read',
  SCIM_WRITE: 'scim:write',
  INTEGRATIONS_READ: 'integrations:read',
  INTEGRATIONS_WRITE: 'integrations:write',
} as const;

export type ApiKeyPermission = (typeof ApiKeyPermission)[keyof typeof ApiKeyPermission];

export const apiKeyPermissionSchema = z.enum([
  'analytics:read',
  'analytics:write',
  'users:read',
  'users:write',
  'admin:read',
  'admin:write',
  'webhooks:read',
  'webhooks:write',
  'scim:read',
  'scim:write',
  'integrations:read',
  'integrations:write',
]);

export const permissionToScope: Record<ApiKeyScopeResource, ScopeAction[]> = {
  [ApiKeyScopeResource.ANALYTICS]: ['read', 'write'],
  [ApiKeyScopeResource.USERS]: ['read', 'write'],
  [ApiKeyScopeResource.ADMIN]: ['read', 'write', 'admin'],
  [ApiKeyScopeResource.WEBHOOKS]: ['read', 'write'],
  [ApiKeyScopeResource.SCIM]: ['read', 'write'],
  [ApiKeyScopeResource.INTEGRATIONS]: ['read', 'write'],
};

export const scopeToPermissions = (scope: ApiKeyScope): readonly ApiKeyPermission[] => {
  const permissions: ApiKeyPermission[] = [];
  const resource = scope.resource;
  const adminActions = ['admin'] as const;

  for (const action of scope.actions) {
    let suffixes: string[];

    if (adminActions.includes(action as 'admin')) {
      suffixes = ['read', 'write'];
    } else {
      suffixes = [action];
    }

    for (const suffix of suffixes) {
      const permission = `${resource}:${suffix}` as ApiKeyPermission;
      if (Object.values(ApiKeyPermission).includes(permission)) {
        permissions.push(permission);
      }
    }
  }

  return permissions;
};

export const hasScopePermission = (
  scopes: readonly ApiKeyScope[],
  requiredPermission: ApiKeyPermission,
): boolean => {
  const [resource, action] = requiredPermission.split(':') as [ApiKeyScopeResource, ScopeAction];

  const scope = scopes.find((s) => s.resource === resource);
  if (!scope) {
    return false;
  }

  return scope.actions.includes(action) || scope.actions.includes('admin');
};

export const hasAllScopePermissions = (
  scopes: readonly ApiKeyScope[],
  requiredPermissions: readonly ApiKeyPermission[],
): boolean => {
  return requiredPermissions.every((p) => hasScopePermission(scopes, p));
};

export const validateScopeCombination = (
  requestedScopes: readonly ApiKeyScope[],
  allowedScopes: readonly ApiKeyScope[],
): boolean => {
  const allowedResources = new Set(allowedScopes.map((s) => s.resource));

  return requestedScopes.every((scope) => {
    if (!allowedResources.has(scope.resource)) {
      return false;
    }
    const allowedScope = allowedScopes.find((s) => s.resource === scope.resource);
    if (!allowedScope) {
      return false;
    }
    return scope.actions.every(
      (action) => allowedScope.actions.includes(action) || allowedScope.actions.includes('admin'),
    );
  });
};

export interface ApiKeyCreate {
  name: string;
  type: CredentialType;
  ownerType: CredentialOwnerType;
  ownerId?: string;
  scopes: readonly ApiKeyScope[];
  expiresAt?: Date;
  rotationGracePeriodDays?: number;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyResponse {
  id: string;
  keyId: string;
  name: string;
  type: CredentialType;
  ownerType: CredentialOwnerType;
  ownerId: string | null;
  tenantId: string;
  scopes: readonly ApiKeyScope[];
  status: CredentialStatus;
  expiresAt: Date | null;
  rotationGracePeriodDays: number;
  rotationGraceEndsAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface ApiKeyWithSecret extends ApiKeyResponse {
  secret: string;
}

export const apiKeyResponseSchema: z.ZodSchema<ApiKeyResponse> = z.object({
  id: z.string().uuid(),
  keyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: credentialTypeSchema,
  ownerType: credentialOwnerTypeSchema,
  ownerId: z.string().uuid().nullable(),
  tenantId: z.string().uuid(),
  scopes: apiKeyScopesSchema,
  status: credentialStatusSchema,
  expiresAt: z.date().nullable(),
  rotationGracePeriodDays: z.number().int().min(1).max(30),
  rotationGraceEndsAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  revokedAt: z.date().nullable(),
});

export const apiKeyWithSecretSchema: z.ZodSchema<ApiKeyWithSecret> = z.object({
  id: z.string().uuid(),
  keyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: credentialTypeSchema,
  ownerType: credentialOwnerTypeSchema,
  ownerId: z.string().uuid().nullable(),
  tenantId: z.string().uuid(),
  scopes: apiKeyScopesSchema,
  status: credentialStatusSchema,
  expiresAt: z.date().nullable(),
  rotationGracePeriodDays: z.number().int().min(1).max(30),
  rotationGraceEndsAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  revokedAt: z.date().nullable(),
  secret: z.string().min(API_KEY_MIN_LENGTH).max(API_KEY_MAX_LENGTH),
});

export const apiKeyListResponseSchema = z.object({
  keys: z.array(apiKeyResponseSchema),
  total: z.number().int().nonnegative(),
  cursor: z.string().optional(),
});

export type ApiKeyListResponse = z.infer<typeof apiKeyListResponseSchema>;

export const ApiKeyInsufficientScopeError = {
  code: 'API_KEY_INSUFFICIENT_SCOPE',
  message: 'Insufficient scope for this request',
} as const;

export const ApiKeyInvalidError = {
  code: 'API_KEY_INVALID',
  message: 'Invalid API key or Personal Access Token',
} as const;

export const ApiKeyRevokedError = {
  code: 'API_KEY_REVOKED',
  message: 'API key or Personal Access Token has been revoked',
} as const;

export const ApiKeyExpiredError = {
  code: 'API_KEY_EXPIRED',
  message: 'API key or Personal Access Token has expired',
} as const;

export const ApiKeyRotationGraceExpiredError = {
  code: 'API_KEY_ROTATION_GRACE_EXPIRED',
  message: 'API key rotation grace period has expired',
} as const;

export const ApiKeyNotFoundError = {
  code: 'API_KEY_NOT_FOUND',
  message: 'API key or Personal Access Token not found',
} as const;

export const ApiKeyRotationInProgressError = {
  code: 'API_KEY_ROTATION_IN_PROGRESS',
  message: 'API key rotation already in progress',
} as const;

export const ApiKeyTooManyError = {
  code: 'API_KEY_TOO_MANY',
  message: 'Maximum number of API keys reached for this scope',
} as const;

export const apiKeyInsufficientScopeErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: ApiKeyInsufficientScopeError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;

export const invalidKeyErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: ApiKeyInvalidError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;

export const revokedKeyErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: ApiKeyRevokedError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;

export const expiredKeyErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: ApiKeyExpiredError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  tenantId?: string;
  ownerType?: CredentialOwnerType;
  ownerId?: string;
  scopes?: readonly ApiKeyScope[];
  status?: CredentialStatus;
  error?: {
    code: string;
    message: string;
  };
}

export const rotateApiKeySchema = z.object({
  rotationGracePeriodDays: z
    .number()
    .int()
    .min(MIN_ROTATION_GRACE_PERIOD_DAYS)
    .max(MAX_ROTATION_GRACE_PERIOD_DAYS)
    .optional(),
});

export type RotateApiKeyInput = z.infer<typeof rotateApiKeySchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  type: credentialTypeSchema.optional().default(CredentialType.API_KEY),
  ownerType: credentialOwnerTypeSchema.optional().default(CredentialOwnerType.SERVICE),
  ownerId: z.string().uuid().optional(),
  scopes: apiKeyScopesSchema.min(1),
  expiresAt: z.string().datetime().optional(),
  rotationGracePeriodDays: z
    .number()
    .int()
    .min(MIN_ROTATION_GRACE_PERIOD_DAYS)
    .max(MAX_ROTATION_GRACE_PERIOD_DAYS)
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const revokeApiKeySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;

export const validateApiKeyInputSchema = z.object({
  keyId: z.string().uuid(),
  secret: z.string().min(API_KEY_MIN_LENGTH).max(API_KEY_MAX_LENGTH),
});

export type ValidateApiKeyInput = z.infer<typeof validateApiKeyInputSchema>;
