export const SessionStatus = {
  ANONYMOUS: 'anonymous',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  POLICY_DENIED: 'policy_denied',
  MFA_REQUIRED: 'mfa_required',
} as const;

export const UserRole = {
  ADMIN: 'admin',
  PLAYER: 'player',
  SUPER_ADMIN: 'super-admin',
} as const;
