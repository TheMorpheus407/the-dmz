export type UserBase = {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
};

export type SessionBase = {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  expiresAt: string;
};

export type JwtPayloadBase = {
  sub: string;
  tenantId: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type MfaState = {
  required: boolean;
  verified: boolean;
  method: 'webauthn' | 'totp' | 'sms' | 'email' | null;
  verifiedAt: Date | null;
};

export type AuthenticatedUserWithMfa = {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
  mfaState: MfaState;
};
