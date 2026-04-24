import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthUserCreatedPayload,
  AuthUserUpdatedPayload,
  AuthUserDeactivatedPayload,
  AuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createAuthUserCreatedEvent = (
  params: AuthEventParams & { payload: AuthUserCreatedPayload },
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
  params: AuthEventParams & { payload: AuthUserUpdatedPayload },
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
  params: AuthEventParams & { payload: AuthUserDeactivatedPayload },
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
