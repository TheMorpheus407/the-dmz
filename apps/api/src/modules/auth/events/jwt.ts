import { AUTH_EVENTS } from '../auth.events.js';

import type {
  JWTSigningKeyCreatedPayload,
  JWTSigningKeyRotatedPayload,
  JWTSigningKeyRevokedPayload,
  AuthDomainEvent,
} from '../auth.events.js';

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
