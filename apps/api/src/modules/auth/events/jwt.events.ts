export const JWT_EVENTS = {
  JWT_SIGNING_KEY_CREATED: 'jwt.' + 'signing_key.created',
  JWT_SIGNING_KEY_ROTATED: 'jwt.' + 'signing_key.rotated',
  JWT_SIGNING_KEY_REVOKED: 'jwt.' + 'signing_key.revoked',
} as const;

export type JwtEventType = (typeof JWT_EVENTS)[keyof typeof JWT_EVENTS];

export interface JWTSigningKeyCreatedPayload {
  kid: string;
  keyType: string;
  algorithm: string;
}

export interface JWTSigningKeyRotatedPayload {
  oldKid: string;
  newKid: string;
}

export interface JWTSigningKeyRevokedPayload {
  kid: string;
  reason: string;
}
