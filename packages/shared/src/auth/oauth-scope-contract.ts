import { z } from 'zod';

export const OAuthGrantType = {
  CLIENT_CREDENTIALS: 'client_credentials',
} as const;

export type OAuthGrantType = (typeof OAuthGrantType)[keyof typeof OAuthGrantType];

export const oauthGrantTypeSchema = z.enum([OAuthGrantType.CLIENT_CREDENTIALS]);

export const OAuthScope = {
  SCIM_READ: 'scim.read',
  SCIM_WRITE: 'scim.write',
} as const;

export type OAuthScope = (typeof OAuthScope)[keyof typeof OAuthScope];

export const oauthScopeSchema = z.enum([OAuthScope.SCIM_READ, OAuthScope.SCIM_WRITE]);

export const oauthScopes = [OAuthScope.SCIM_READ, OAuthScope.SCIM_WRITE] as const;

export const oauthScopesArray = oauthScopes as unknown as string[];

export interface OAuthClientScopeConfig {
  allowedScopes: readonly OAuthScope[];
  defaultScopes: readonly OAuthScope[];
}

export const oauthClientScopeConfigs: Record<string, OAuthClientScopeConfig> = {
  scim: {
    allowedScopes: [OAuthScope.SCIM_READ, OAuthScope.SCIM_WRITE],
    defaultScopes: [OAuthScope.SCIM_READ],
  },
};

export const getAllowedScopes = (clientType: string): readonly OAuthScope[] => {
  const config = oauthClientScopeConfigs[clientType];
  return config?.allowedScopes ?? [];
};

export const getDefaultScopes = (clientType: string): readonly OAuthScope[] => {
  const config = oauthClientScopeConfigs[clientType];
  return config?.defaultScopes ?? [];
};

export const isValidScope = (scope: string): scope is OAuthScope => {
  return oauthScopes.includes(scope as OAuthScope);
};

export const isValidScopeCombination = (
  requestedScopes: readonly string[],
  allowedScopes: readonly OAuthScope[],
): boolean => {
  return requestedScopes.every((scope) => allowedScopes.includes(scope as OAuthScope));
};

export const OAuthTokenType = {
  BEARER: 'Bearer',
} as const;

export type OAuthTokenType = (typeof OAuthTokenType)[keyof typeof OAuthTokenType];

export interface OAuthTokenResponse {
  access_token: string;
  token_type: OAuthTokenType;
  expires_in: number;
  scope: string;
}

export interface OAuthClientCreateRequest {
  name: string;
  tenantId: string;
  scopes: readonly OAuthScope[];
}

export interface OAuthClientResponse {
  clientId: string;
  name: string;
  tenantId: string;
  scopes: readonly OAuthScope[];
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

export interface OAuthClientWithSecret extends OAuthClientResponse {
  clientSecret: string;
}

export const OAuthInsufficientScopeError = {
  code: 'OAUTH_INSUFFICIENT_SCOPE',
  message: 'Insufficient scope for this request',
} as const;

export const OAuthInvalidClientError = {
  code: 'OAUTH_INVALID_CLIENT',
  message: 'Invalid client credentials',
} as const;

export const OAuthInvalidGrantError = {
  code: 'OAUTH_INVALID_GRANT',
  message: 'Invalid grant type',
} as const;

export const OAuthClientRevokedError = {
  code: 'OAUTH_CLIENT_REVOKED',
  message: 'OAuth client has been revoked',
} as const;

export const OAuthClientExpiredError = {
  code: 'OAUTH_CLIENT_EXPIRED',
  message: 'OAuth client has expired',
} as const;

export const insufficientScopeErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: OAuthInsufficientScopeError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;

export const invalidClientErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', const: OAuthInvalidClientError.code },
        message: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
} as const;
