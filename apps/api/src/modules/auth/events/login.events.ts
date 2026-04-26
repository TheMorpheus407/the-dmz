export const LOGIN_EVENTS = {
  LOGIN_FAILED: 'auth.login.failed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',
  PASSWORD_RESET_FAILED: 'auth.password_reset.failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  NEW_DEVICE_SESSION: 'auth.new_device_session',
} as const;

export type LoginEventType = (typeof LOGIN_EVENTS)[keyof typeof LOGIN_EVENTS];

export interface AuthLoginFailedPayload {
  tenantId: string;
  email: string;
  reason: 'invalid_credentials' | 'user_inactive' | 'account_locked';
  correlationId: string;
}

export interface AuthPasswordResetRequestedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthPasswordResetCompletedPayload {
  userId: string;
  email: string;
  tenantId: string;
  sessionsRevoked: number;
}

export interface AuthPasswordResetFailedPayload {
  tenantId: string;
  email: string;
  reason: 'expired' | 'invalid' | 'already_used' | 'policy_denied' | 'rate_limited';
  correlationId: string;
}

export interface AuthAccountLockedPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: string;
  riskContext?: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    location?: string;
    isAnomalous?: boolean;
  };
}

export interface AuthAccountUnlockedPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: string;
}

export interface AuthNewDeviceSessionPayload {
  sessionId: string;
  userId: string;
  email: string;
  tenantId: string;
  riskContext: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    location?: string;
    isNewDevice: boolean;
    isAnomalous?: boolean;
  };
}
