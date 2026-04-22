import { AUTH_EVENTS } from '../auth.events.js';

import type {
  OAuthClientCreatedPayload,
  OAuthClientRotatedPayload,
  OAuthClientRevokedPayload,
  OAuthTokenIssuedPayload,
  OAuthScopeDeniedPayload,
  AuthDomainEvent,
} from '../auth.events.js';

interface BaseOAuthEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createOAuthClientCreatedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthClientRotatedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientRotatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_ROTATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_ROTATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthClientRevokedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthTokenIssuedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthTokenIssuedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_TOKEN_ISSUED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_TOKEN_ISSUED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthScopeDeniedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthScopeDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_SCOPE_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_SCOPE_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
