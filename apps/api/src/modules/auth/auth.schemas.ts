import {
  loginJsonSchema,
  registerJsonSchema,
  refreshTokenJsonSchema,
  loginResponseJsonSchema,
  profileJsonSchema,
  updateProfileJsonSchema,
  refreshResponseJsonSchema as sharedRefreshResponseJsonSchema,
  meResponseJsonSchema as sharedMeResponseJsonSchema,
  effectivePreferencesJsonSchema,
  passwordResetRequestJsonSchema,
  passwordResetRequestResponseJsonSchema as sharedPasswordResetRequestResponseJsonSchema,
  passwordChangeRequestJsonSchema,
  passwordChangeRequestResponseJsonSchema as sharedPasswordChangeRequestResponseJsonSchema,
} from '@the-dmz/shared/schemas';

export const loginBodyJsonSchema = loginJsonSchema;

export const registerBodyJsonSchema = registerJsonSchema;

export const refreshBodyJsonSchema = refreshTokenJsonSchema;

export const authResponseJsonSchema = loginResponseJsonSchema;

export const refreshResponseJsonSchema = sharedRefreshResponseJsonSchema;

export const meResponseJsonSchema = {
  ...sharedMeResponseJsonSchema,
  properties: {
    ...sharedMeResponseJsonSchema.properties,
    permissions: {
      type: 'array',
      items: { type: 'string' },
    },
    roles: {
      type: 'array',
      items: { type: 'string' },
    },
    effectivePreferences: effectivePreferencesJsonSchema,
  },
  required: [...(sharedMeResponseJsonSchema.required || []), 'permissions', 'roles'],
} as const;

export const updateProfileBodyJsonSchema = updateProfileJsonSchema;

export const profileResponseJsonSchema = profileJsonSchema;

export const passwordResetRequestBodyJsonSchema = passwordResetRequestJsonSchema;

export const passwordResetRequestResponseJsonSchema = sharedPasswordResetRequestResponseJsonSchema;

export const passwordChangeRequestBodyJsonSchema = passwordChangeRequestJsonSchema;

export const passwordChangeRequestResponseJsonSchema =
  sharedPasswordChangeRequestResponseJsonSchema;

export const logoutResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
} as const;

export const healthAuthenticatedResponseJsonSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        tenantId: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['id', 'tenantId', 'role'],
    },
  },
  required: ['status', 'user'],
} as const;

export const adminUsersListResponseJsonSchema = {
  type: 'object',
  properties: {
    users: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
  },
} as const;

export const oauthTokenBodyJsonSchema = {
  type: 'object',
  required: ['grant_type', 'client_id', 'client_secret'],
  properties: {
    grant_type: { type: 'string', enum: ['client_credentials'] },
    client_id: { type: 'string', format: 'uuid' },
    client_secret: { type: 'string', minLength: 1 },
    scope: { type: 'string' },
  },
} as const;

export const oauthTokenResponseJsonSchema = {
  type: 'object',
  properties: {
    access_token: { type: 'string' },
    token_type: { type: 'string', enum: ['Bearer'] },
    expires_in: { type: 'integer' },
    scope: { type: 'string' },
  },
  required: ['access_token', 'token_type', 'expires_in', 'scope'],
} as const;

export const oauthClientsListResponseJsonSchema = {
  type: 'object',
  properties: {
    clients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clientId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          tenantId: { type: 'string', format: 'uuid' },
          scopes: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          revokedAt: { type: 'string', format: 'date-time', nullable: true },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
} as const;

export const oauthClientCreateBodyJsonSchema = {
  type: 'object',
  required: ['name', 'scopes'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    scopes: {
      type: 'array',
      items: { type: 'string', enum: ['scim.read', 'scim.write'] },
      minItems: 1,
    },
  },
} as const;

export const oauthClientCreateResponseJsonSchema = {
  type: 'object',
  properties: {
    clientId: { type: 'string', format: 'uuid' },
    clientSecret: { type: 'string' },
    name: { type: 'string' },
    tenantId: { type: 'string', format: 'uuid' },
    scopes: { type: 'array', items: { type: 'string' } },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['clientId', 'clientSecret', 'name', 'tenantId', 'scopes', 'expiresAt'],
} as const;

export const oauthClientIdParamJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
  required: ['id'],
} as const;

export const oauthClientRotateResponseJsonSchema = {
  type: 'object',
  properties: {
    clientSecret: { type: 'string' },
  },
  required: ['clientSecret'],
} as const;

export const oauthClientRevokeResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
} as const;

export const federatedRevocationBodyJsonSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    sourceType: { type: 'string', enum: ['saml', 'oidc', 'scim'] },
    ssoProviderId: { type: 'string' },
  },
  required: ['sourceType'],
} as const;

export const federatedRevocationResponseJsonSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'string',
      enum: ['revoked', 'already_revoked', 'ignored_invalid', 'failed'],
    },
    sessionsRevoked: { type: 'integer' },
    userId: { type: 'string', format: 'uuid' },
    reason: { type: 'string' },
  },
} as const;

export const userIdParamJsonSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
  },
  required: ['userId'],
} as const;

export const sessionRevokeResponseJsonSchema = {
  type: 'object',
  properties: {
    sessionsRevoked: { type: 'integer' },
  },
} as const;

export const sessionListQueryJsonSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['active', 'expired', 'revoked'] },
    cursor: { type: 'string' },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
  },
} as const;

export const sessionListResponseJsonSchema = {
  type: 'object',
  properties: {
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          userEmail: { type: 'string', format: 'email' },
          tenantId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
          expiresAt: { type: 'string', format: 'date-time' },
          deviceInfo: {
            type: 'object',
            properties: {
              userAgent: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
            },
            nullable: true,
          },
          status: { type: 'string', enum: ['active', 'expired', 'revoked'] },
        },
        required: [
          'sessionId',
          'userId',
          'userEmail',
          'tenantId',
          'createdAt',
          'expiresAt',
          'status',
        ],
      },
    },
    nextCursor: { type: 'string', nullable: true },
    total: { type: 'number' },
  },
  required: ['sessions', 'total'],
} as const;

export const sessionIdParamJsonSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
  },
  required: ['sessionId'],
} as const;

export const sessionSingleRevokeResponseJsonSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'string',
      enum: ['revoked', 'already_revoked', 'not_found', 'forbidden', 'failed'],
    },
    sessionId: { type: 'string', format: 'uuid' },
    reason: { type: 'string' },
  },
  required: ['result', 'sessionId', 'reason'],
} as const;

export const sessionUserAllRevokeResponseJsonSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'string',
      enum: ['revoked', 'already_revoked', 'not_found', 'forbidden', 'failed'],
    },
    sessionsRevoked: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['result', 'sessionsRevoked', 'reason'],
} as const;

export const sessionTenantAllRevokeResponseJsonSchema = {
  type: 'object',
  properties: {
    result: { type: 'string', enum: ['revoked', 'failed'] },
    sessionsRevoked: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['result', 'sessionsRevoked', 'reason'],
} as const;

export const rolesListResponseJsonSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      isSystem: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'description', 'isSystem', 'createdAt', 'updatedAt'],
  },
} as const;

export const roleIdParamJsonSchema = {
  type: 'object',
  properties: {
    roleId: { type: 'string', format: 'uuid' },
  },
  required: ['roleId'],
} as const;

export const roleDetailsResponseJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    isSystem: { type: 'boolean' },
    permissions: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'description', 'isSystem', 'permissions', 'createdAt', 'updatedAt'],
} as const;

export const roleCreateBodyJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 64 },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'permissions'],
} as const;

export const roleCreateResponseJsonSchema = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['allowed'] },
    roleId: { type: 'string', format: 'uuid' },
  },
  required: ['outcome', 'roleId'],
} as const;

export const roleAssignBodyJsonSchema = {
  type: 'object',
  properties: {
    targetUserId: { type: 'string', format: 'uuid' },
    scope: { type: 'string', nullable: true },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['targetUserId'],
} as const;

export const roleAssignResponseJsonSchema = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['allowed'] },
  },
  required: ['outcome'],
} as const;

export const roleUpdateBodyJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 64 },
    description: { type: 'string', nullable: true },
    permissions: { type: 'array', items: { type: 'string' } },
  },
} as const;
