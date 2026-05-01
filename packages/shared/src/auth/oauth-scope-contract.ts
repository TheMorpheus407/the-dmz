import { z } from 'zod';

export const OAuthGrantType = {
  CLIENT_CREDENTIALS: 'client_credentials',
} as const;

export type OAuthGrantType = (typeof OAuthGrantType)[keyof typeof OAuthGrantType];

export const OAUTH_GRANT_TYPE_SCHEMA = z.enum([OAuthGrantType.CLIENT_CREDENTIALS]);

export const OAuthScope = {
  SCIM_READ: 'scim.read',
  SCIM_WRITE: 'scim.write',
  ZAPIER_READ: 'zapier.read',
  ZAPIER_WRITE: 'zapier.write',
  ZAPIER_TRIGGER: 'zapier.trigger',
  ZAPIER_ACTION: 'zapier.action',
  ZAPIER_SEARCH: 'zapier.search',
  TEAMS_READ: 'teams.read',
  TEAMS_WRITE: 'teams.write',
  TEAMS_NOTIFICATION: 'teams.notification',
  TEAMS_ADAPTIVE_CARD: 'teams.adaptive_card',
  WORKATO_READ: 'workato.read',
  WORKATO_WRITE: 'workato.write',
  WORKATO_RECIPE: 'workato.recipe',
  TRAY_IO_READ: 'tray_io.read',
  TRAY_IO_WRITE: 'tray_io.write',
  TRAY_IO_CONNECTOR: 'tray_io.connector',
  N8N_READ: 'n8n.read',
  N8N_WRITE: 'n8n.write',
  N8N_TEMPLATE: 'n8n.template',
  MAKE_COM_READ: 'makecom.read',
  MAKE_COM_WRITE: 'makecom.write',
  MAKE_COM_TEMPLATE: 'makecom.template',
  DMZ_CLI_QUERY: 'dmz_cli.query',
  DMZ_CLI_MUTATION: 'dmz_cli.mutation',
  DMZ_CLI_ADMIN: 'dmz_cli.admin',
} as const;

export type OAuthScope = (typeof OAuthScope)[keyof typeof OAuthScope];

export const OAUTH_SCOPE_SCHEMA = z.enum([
  OAuthScope.SCIM_READ,
  OAuthScope.SCIM_WRITE,
  OAuthScope.ZAPIER_READ,
  OAuthScope.ZAPIER_WRITE,
  OAuthScope.ZAPIER_TRIGGER,
  OAuthScope.ZAPIER_ACTION,
  OAuthScope.ZAPIER_SEARCH,
  OAuthScope.TEAMS_READ,
  OAuthScope.TEAMS_WRITE,
  OAuthScope.TEAMS_NOTIFICATION,
  OAuthScope.TEAMS_ADAPTIVE_CARD,
  OAuthScope.WORKATO_READ,
  OAuthScope.WORKATO_WRITE,
  OAuthScope.WORKATO_RECIPE,
  OAuthScope.TRAY_IO_READ,
  OAuthScope.TRAY_IO_WRITE,
  OAuthScope.TRAY_IO_CONNECTOR,
  OAuthScope.N8N_READ,
  OAuthScope.N8N_WRITE,
  OAuthScope.N8N_TEMPLATE,
  OAuthScope.MAKE_COM_READ,
  OAuthScope.MAKE_COM_WRITE,
  OAuthScope.MAKE_COM_TEMPLATE,
  OAuthScope.DMZ_CLI_QUERY,
  OAuthScope.DMZ_CLI_MUTATION,
  OAuthScope.DMZ_CLI_ADMIN,
]);

export const OAUTH_SCOPES = [
  OAuthScope.SCIM_READ,
  OAuthScope.SCIM_WRITE,
  OAuthScope.ZAPIER_READ,
  OAuthScope.ZAPIER_WRITE,
  OAuthScope.ZAPIER_TRIGGER,
  OAuthScope.ZAPIER_ACTION,
  OAuthScope.ZAPIER_SEARCH,
  OAuthScope.TEAMS_READ,
  OAuthScope.TEAMS_WRITE,
  OAuthScope.TEAMS_NOTIFICATION,
  OAuthScope.TEAMS_ADAPTIVE_CARD,
  OAuthScope.WORKATO_READ,
  OAuthScope.WORKATO_WRITE,
  OAuthScope.WORKATO_RECIPE,
  OAuthScope.TRAY_IO_READ,
  OAuthScope.TRAY_IO_WRITE,
  OAuthScope.TRAY_IO_CONNECTOR,
  OAuthScope.N8N_READ,
  OAuthScope.N8N_WRITE,
  OAuthScope.N8N_TEMPLATE,
  OAuthScope.MAKE_COM_READ,
  OAuthScope.MAKE_COM_WRITE,
  OAuthScope.MAKE_COM_TEMPLATE,
  OAuthScope.DMZ_CLI_QUERY,
  OAuthScope.DMZ_CLI_MUTATION,
  OAuthScope.DMZ_CLI_ADMIN,
] as const;

export const OAUTH_SCOPES_ARRAY = OAUTH_SCOPES as unknown as string[];

export interface OAuthClientScopeConfig {
  allowedScopes: readonly OAuthScope[];
  defaultScopes: readonly OAuthScope[];
}

export const OAUTH_CLIENT_SCOPE_CONFIGS: Record<string, OAuthClientScopeConfig> = {
  scim: {
    allowedScopes: [OAuthScope.SCIM_READ, OAuthScope.SCIM_WRITE],
    defaultScopes: [OAuthScope.SCIM_READ],
  },
  zapier: {
    allowedScopes: [
      OAuthScope.ZAPIER_READ,
      OAuthScope.ZAPIER_WRITE,
      OAuthScope.ZAPIER_TRIGGER,
      OAuthScope.ZAPIER_ACTION,
      OAuthScope.ZAPIER_SEARCH,
    ],
    defaultScopes: [OAuthScope.ZAPIER_READ, OAuthScope.ZAPIER_TRIGGER],
  },
  teams: {
    allowedScopes: [
      OAuthScope.TEAMS_READ,
      OAuthScope.TEAMS_WRITE,
      OAuthScope.TEAMS_NOTIFICATION,
      OAuthScope.TEAMS_ADAPTIVE_CARD,
    ],
    defaultScopes: [OAuthScope.TEAMS_READ, OAuthScope.TEAMS_NOTIFICATION],
  },
  workato: {
    allowedScopes: [OAuthScope.WORKATO_READ, OAuthScope.WORKATO_WRITE, OAuthScope.WORKATO_RECIPE],
    defaultScopes: [OAuthScope.WORKATO_READ, OAuthScope.WORKATO_RECIPE],
  },
  tray_io: {
    allowedScopes: [
      OAuthScope.TRAY_IO_READ,
      OAuthScope.TRAY_IO_WRITE,
      OAuthScope.TRAY_IO_CONNECTOR,
    ],
    defaultScopes: [OAuthScope.TRAY_IO_READ, OAuthScope.TRAY_IO_CONNECTOR],
  },
  n8n: {
    allowedScopes: [OAuthScope.N8N_READ, OAuthScope.N8N_WRITE, OAuthScope.N8N_TEMPLATE],
    defaultScopes: [OAuthScope.N8N_READ, OAuthScope.N8N_TEMPLATE],
  },
  makecom: {
    allowedScopes: [
      OAuthScope.MAKE_COM_READ,
      OAuthScope.MAKE_COM_WRITE,
      OAuthScope.MAKE_COM_TEMPLATE,
    ],
    defaultScopes: [OAuthScope.MAKE_COM_READ, OAuthScope.MAKE_COM_TEMPLATE],
  },
  dmz_cli: {
    allowedScopes: [
      OAuthScope.DMZ_CLI_QUERY,
      OAuthScope.DMZ_CLI_MUTATION,
      OAuthScope.DMZ_CLI_ADMIN,
    ],
    defaultScopes: [OAuthScope.DMZ_CLI_QUERY],
  },
};

export const getAllowedScopes = (clientType: string): readonly OAuthScope[] => {
  const config = OAUTH_CLIENT_SCOPE_CONFIGS[clientType];
  return config?.allowedScopes ?? [];
};

export const getDefaultScopes = (clientType: string): readonly OAuthScope[] => {
  const config = OAUTH_CLIENT_SCOPE_CONFIGS[clientType];
  return config?.defaultScopes ?? [];
};

export const isValidScope = (scope: string): scope is OAuthScope => {
  return OAUTH_SCOPES.includes(scope as OAuthScope);
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

export const INSUFFICIENT_SCOPE_ERROR_SCHEMA = {
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

export const INVALID_CLIENT_ERROR_SCHEMA = {
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
