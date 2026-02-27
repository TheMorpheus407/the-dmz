import type { DomainEvent } from '../../shared/events/event-types.js';

export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_DEACTIVATED: 'auth.user.deactivated',
  SESSION_CREATED: 'auth.session.created',
  SESSION_REVOKED: 'auth.session.revoked',
  LOGIN_FAILED: 'auth.login.failed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',
  PASSWORD_RESET_FAILED: 'auth.password_reset.failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  NEW_DEVICE_SESSION: 'auth.new_device_session',
  MFA_ENABLED: 'auth.mfa_enabled',
  MFA_DISABLED: 'auth.mfa_disabled',
  MFA_RECOVERY_CODES_USED: 'auth.mfa_recovery_codes_used',
  JWT_SIGNING_KEY_CREATED: 'jwt.' + 'signing_key.created',
  JWT_SIGNING_KEY_ROTATED: 'jwt.' + 'signing_key.rotated',
  JWT_SIGNING_KEY_REVOKED: 'jwt.' + 'signing_key.revoked',
} as const;

export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export interface AuthUserCreatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthUserUpdatedPayload {
  userId: string;
  email: string;
  tenantId: string;
  changes: Array<keyof AuthUserUpdatedPayload>;
}

export interface AuthUserDeactivatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthSessionCreatedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
}

export interface AuthSessionRevokedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: 'logout' | 'expired' | 'revoked' | 'refresh_rotation';
}

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

export interface AuthMfaEnabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  method: 'totp' | 'webauthn' | 'email';
}

export interface AuthMfaDisabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: 'user_request' | 'admin_reset' | 'compromised';
}

export interface AuthMfaRecoveryCodesUsedPayload {
  userId: string;
  email: string;
  tenantId: string;
  riskContext?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
}

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

export type AuthEventPayloadMap = {
  [AUTH_EVENTS.USER_CREATED]: AuthUserCreatedPayload;
  [AUTH_EVENTS.USER_UPDATED]: AuthUserUpdatedPayload;
  [AUTH_EVENTS.USER_DEACTIVATED]: AuthUserDeactivatedPayload;
  [AUTH_EVENTS.SESSION_CREATED]: AuthSessionCreatedPayload;
  [AUTH_EVENTS.SESSION_REVOKED]: AuthSessionRevokedPayload;
  [AUTH_EVENTS.LOGIN_FAILED]: AuthLoginFailedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_REQUESTED]: AuthPasswordResetRequestedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_COMPLETED]: AuthPasswordResetCompletedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_FAILED]: AuthPasswordResetFailedPayload;
  [AUTH_EVENTS.ACCOUNT_LOCKED]: AuthAccountLockedPayload;
  [AUTH_EVENTS.ACCOUNT_UNLOCKED]: AuthAccountUnlockedPayload;
  [AUTH_EVENTS.NEW_DEVICE_SESSION]: AuthNewDeviceSessionPayload;
  [AUTH_EVENTS.MFA_ENABLED]: AuthMfaEnabledPayload;
  [AUTH_EVENTS.MFA_DISABLED]: AuthMfaDisabledPayload;
  [AUTH_EVENTS.MFA_RECOVERY_CODES_USED]: AuthMfaRecoveryCodesUsedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_CREATED]: JWTSigningKeyCreatedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED]: JWTSigningKeyRotatedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED]: JWTSigningKeyRevokedPayload;
};

export type AuthDomainEvent<T extends AuthEventType = AuthEventType> = DomainEvent<
  AuthEventPayloadMap[T]
>;

interface BaseAuthEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export const createAuthUserCreatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthUserUpdatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthUserDeactivatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserDeactivatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_DEACTIVATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_DEACTIVATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionCreatedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthLoginFailedEvent = (
  params: BaseAuthEventParams & { payload: AuthLoginFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.LOGIN_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.LOGIN_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

interface BaseJWTSigningKeyEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createJWTSigningKeyCreatedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createJWTSigningKeyRotatedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyRotatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createJWTSigningKeyRevokedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetRequestedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetRequestedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_REQUESTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_REQUESTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetCompletedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetCompletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_COMPLETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_COMPLETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetFailedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthAccountLockedEvent = (
  params: BaseAuthEventParams & { payload: AuthAccountLockedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.ACCOUNT_LOCKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.ACCOUNT_LOCKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthAccountUnlockedEvent = (
  params: BaseAuthEventParams & { payload: AuthAccountUnlockedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.ACCOUNT_UNLOCKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.ACCOUNT_UNLOCKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthNewDeviceSessionEvent = (
  params: BaseAuthEventParams & { payload: AuthNewDeviceSessionPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.NEW_DEVICE_SESSION> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.NEW_DEVICE_SESSION,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaEnabledEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaEnabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_ENABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_ENABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaDisabledEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaDisabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_DISABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_DISABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaRecoveryCodesUsedEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaRecoveryCodesUsedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_RECOVERY_CODES_USED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_RECOVERY_CODES_USED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
