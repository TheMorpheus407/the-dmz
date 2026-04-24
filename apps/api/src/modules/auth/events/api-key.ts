import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthApiKeyCreatedPayload,
  AuthApiKeyRotatedPayload,
  AuthApiKeyRevokedPayload,
  AuthApiKeyRejectedPayload,
  AuthDomainEvent,
} from '../auth.events.js';

interface ApiKeyEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createAuthApiKeyCreatedEvent = (
  params: ApiKeyEventParams & { payload: AuthApiKeyCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.API_KEY_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.API_KEY_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.createdBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthApiKeyRotatedEvent = (
  params: ApiKeyEventParams & { payload: AuthApiKeyRotatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.API_KEY_ROTATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.API_KEY_ROTATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.rotatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthApiKeyRevokedEvent = (
  params: ApiKeyEventParams & { payload: AuthApiKeyRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.API_KEY_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.API_KEY_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.revokedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthApiKeyRejectedEvent = (
  params: ApiKeyEventParams & { payload: AuthApiKeyRejectedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.API_KEY_REJECTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.API_KEY_REJECTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
