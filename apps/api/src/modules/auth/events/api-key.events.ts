export const API_KEY_EVENTS = {
  API_KEY_CREATED: 'auth.api_key.created',
  API_KEY_ROTATED: 'auth.api_key.rotated',
  API_KEY_REVOKED: 'auth.api_key.revoked',
  API_KEY_REJECTED: 'auth.api_key.rejected',
} as const;

export type ApiKeyEventType = (typeof API_KEY_EVENTS)[keyof typeof API_KEY_EVENTS];

export interface AuthApiKeyCreatedPayload {
  keyId: string;
  name: string;
  tenantId: string;
  ownerType: string;
  ownerId?: string;
  scopes: string[];
  createdBy: string;
}

export interface AuthApiKeyRotatedPayload {
  keyId: string;
  name: string;
  tenantId: string;
  ownerType: string;
  ownerId?: string;
  rotatedBy: string;
}

export interface AuthApiKeyRevokedPayload {
  keyId: string;
  name: string;
  tenantId: string;
  ownerType: string;
  ownerId?: string;
  revokedBy: string;
  reason?: string;
}

export interface AuthApiKeyRejectedPayload {
  keyId: string;
  tenantId: string;
  reason: 'invalid' | 'revoked' | 'expired' | 'rotation_grace_expired' | 'scope_denied';
  correlationId: string;
}
