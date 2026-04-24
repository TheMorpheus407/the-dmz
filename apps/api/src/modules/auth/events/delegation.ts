import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthDelegationRoleCreatedPayload,
  AuthDelegationRoleUpdatedPayload,
  AuthDelegationRoleAssignedPayload,
  AuthDelegationDeniedPayload,
  AuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createAuthDelegationRoleCreatedEvent = (
  params: AuthEventParams & { payload: AuthDelegationRoleCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.DELEGATION_ROLE_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.DELEGATION_ROLE_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.actorId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthDelegationRoleUpdatedEvent = (
  params: AuthEventParams & { payload: AuthDelegationRoleUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.DELEGATION_ROLE_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.DELEGATION_ROLE_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.actorId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthDelegationRoleAssignedEvent = (
  params: AuthEventParams & { payload: AuthDelegationRoleAssignedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.DELEGATION_ROLE_ASSIGNED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.DELEGATION_ROLE_ASSIGNED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.actorId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthDelegationDeniedEvent = (
  params: AuthEventParams & { payload: AuthDelegationDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.DELEGATION_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.DELEGATION_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.actorId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
