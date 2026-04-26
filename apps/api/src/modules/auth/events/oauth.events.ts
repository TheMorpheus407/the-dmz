export const OAUTH_EVENTS = {
  OAUTH_CLIENT_CREATED: 'auth.oauth_client.created',
  OAUTH_CLIENT_ROTATED: 'auth.oauth_client.rotated',
  OAUTH_CLIENT_REVOKED: 'auth.oauth_client.revoked',
  OAUTH_TOKEN_ISSUED: 'auth.oauth_token.issued',
  OAUTH_TOKEN_REVOKED: 'auth.oauth_token.revoked',
  OAUTH_SCOPE_DENIED: 'auth.oauth_scope_denied',
} as const;

export type OAuthEventType = (typeof OAUTH_EVENTS)[keyof typeof OAUTH_EVENTS];

export interface OAuthClientCreatedPayload {
  clientId: string;
  name: string;
  tenantId: string;
  scopes: string[];
}

export interface OAuthClientRotatedPayload {
  clientId: string;
  name: string;
  tenantId: string;
}

export interface OAuthClientRevokedPayload {
  clientId: string;
  name: string;
  tenantId: string;
  reason: string;
}

export interface OAuthTokenIssuedPayload {
  clientId: string;
  tenantId: string;
  scopes: string[];
}

export interface OAuthTokenRevokedPayload {
  clientId: string;
  tenantId: string;
  scopes?: string[];
}

export interface OAuthScopeDeniedPayload {
  clientId: string;
  tenantId: string;
  requestedScope: string;
  requiredScope: string;
}
