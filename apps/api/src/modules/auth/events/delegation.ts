import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthDelegationRoleCreatedPayload,
  AuthDelegationRoleUpdatedPayload,
  AuthDelegationRoleAssignedPayload,
  AuthDelegationDeniedPayload,
  BaseAuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createAuthDelegationRoleCreatedEvent = (
  params: BaseAuthEventParams & { payload: AuthDelegationRoleCreatedPayload },
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
  params: BaseAuthEventParams & { payload: AuthDelegationRoleUpdatedPayload },
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
  params: BaseAuthEventParams & { payload: AuthDelegationRoleAssignedPayload },
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
  params: BaseAuthEventParams & { payload: AuthDelegationDeniedPayload },
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
