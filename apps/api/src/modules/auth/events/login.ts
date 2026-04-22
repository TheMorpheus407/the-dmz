import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthLoginFailedPayload,
  AuthPasswordResetRequestedPayload,
  AuthPasswordResetCompletedPayload,
  AuthPasswordResetFailedPayload,
  AuthAccountLockedPayload,
  AuthAccountUnlockedPayload,
  AuthNewDeviceSessionPayload,
  BaseAuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

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
