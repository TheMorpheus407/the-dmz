import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthSessionCreatedPayload,
  AuthSessionRevokedPayload,
  AuthSessionRevokedFederatedPayload,
  AuthSessionRevocationFailedPayload,
  AuthSessionRevocationIgnoredPayload,
  AuthSessionRevokedAdminPayload,
  AuthSessionRevokedUserAllPayload,
  AuthSessionRevokedTenantAllPayload,
  AuthSessionRevocationDeniedPayload,
  AuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createAuthSessionCreatedEvent = (
  params: AuthEventParams & { payload: AuthSessionCreatedPayload },
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
  params: AuthEventParams & { payload: AuthSessionRevokedPayload },
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

export const createAuthSessionRevokedFederatedEvent = (
  params: AuthEventParams & { payload: AuthSessionRevokedFederatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED_FEDERATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED_FEDERATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevocationFailedEvent = (
  params: AuthEventParams & { payload: AuthSessionRevocationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOCATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOCATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevocationIgnoredEvent = (
  params: AuthEventParams & { payload: AuthSessionRevocationIgnoredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOCATION_IGNORED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOCATION_IGNORED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedAdminEvent = (
  params: AuthEventParams & { payload: AuthSessionRevokedAdminPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED_ADMIN> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED_ADMIN,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedUserAllEvent = (
  params: AuthEventParams & { payload: AuthSessionRevokedUserAllPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED_USER_ALL> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED_USER_ALL,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedTenantAllEvent = (
  params: AuthEventParams & { payload: AuthSessionRevokedTenantAllPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED_TENANT_ALL> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED_TENANT_ALL,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.initiatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevocationDeniedEvent = (
  params: AuthEventParams & { payload: AuthSessionRevocationDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOCATION_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOCATION_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.initiatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
