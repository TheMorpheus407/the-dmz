import { AUTH_EVENTS } from '../auth.events.js';

import type {
  SCIMUserProvisionedPayload,
  SCIMUserUpdatedPayload,
  SCIMUserDeprovisionedPayload,
  SCIMUserReactivatedPayload,
  SCIMGroupProvisionedPayload,
  SCIMGroupUpdatedPayload,
  SCIMGroupDeletedPayload,
  SCIMGroupMembershipChangedPayload,
  SCIMJitReconciliationPayload,
  AuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createSCIMUserProvisionedEvent = (
  params: AuthEventParams & { payload: SCIMUserProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserUpdatedEvent = (
  params: AuthEventParams & { payload: SCIMUserUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserDeprovisionedEvent = (
  params: AuthEventParams & { payload: SCIMUserDeprovisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_DEPROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_DEPROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserReactivatedEvent = (
  params: AuthEventParams & { payload: SCIMUserReactivatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_REACTIVATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_REACTIVATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupProvisionedEvent = (
  params: AuthEventParams & { payload: SCIMGroupProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupUpdatedEvent = (
  params: AuthEventParams & { payload: SCIMGroupUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupDeletedEvent = (
  params: AuthEventParams & { payload: SCIMGroupDeletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_DELETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_DELETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupMembershipChangedEvent = (
  params: AuthEventParams & { payload: SCIMGroupMembershipChangedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_MEMBERSHIP_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_MEMBERSHIP_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMJitReconciliationEvent = (
  params: AuthEventParams & { payload: SCIMJitReconciliationPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_JIT_RECONCILIATION> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_JIT_RECONCILIATION,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.scimUserId ?? params.payload.jitUserId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
