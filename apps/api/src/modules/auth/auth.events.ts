import type { DomainEvent } from '../../shared/events/event-types.js';

export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_DEACTIVATED: 'auth.user.deactivated',
  SESSION_CREATED: 'auth.session.created',
  SESSION_REVOKED: 'auth.session.revoked',
  LOGIN_FAILED: 'auth.login.failed',
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
