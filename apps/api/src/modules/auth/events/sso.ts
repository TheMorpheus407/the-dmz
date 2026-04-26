import { AUTH_EVENTS } from '../auth.events.js';

import type {
  SSOLoginInitiatedPayload,
  SSOLoginSuccessPayload,
  SSOLoginFailedPayload,
  SSOAssertionValidatedPayload,
  SSOAssertionFailedPayload,
  SSOTokenExchangedPayload,
  SSOAccountLinkedPayload,
  SSOAccountLinkingFailedPayload,
  SSOJitProvisionedPayload,
  SSOJitDeniedPayload,
  SSOMetadataRefreshedPayload,
  SSOMetadataFailedPayload,
  SSOValidationStartedPayload,
  SSOValidationCompletedPayload,
  SSOValidationFailedPayload,
  SSOActivationSucceededPayload,
  SSOActivationFailedPayload,
  SSODeactivationSucceededPayload,
  SSOLogoutInitiatedPayload,
  SSOLogoutProcessedPayload,
  SSOLogoutFailedPayload,
} from './sso.events.js';
import type { AuthDomainEvent } from '../auth.events.js';

interface SSOEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createSSOLoginInitiatedEvent = (
  params: SSOEventParams & { payload: SSOLoginInitiatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_INITIATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_INITIATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLoginSuccessEvent = (
  params: SSOEventParams & { payload: SSOLoginSuccessPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_SUCCESS> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_SUCCESS,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLoginFailedEvent = (
  params: SSOEventParams & { payload: SSOLoginFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAssertionValidatedEvent = (
  params: SSOEventParams & { payload: SSOAssertionValidatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ASSERTION_VALIDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ASSERTION_VALIDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAssertionFailedEvent = (
  params: SSOEventParams & { payload: SSOAssertionFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ASSERTION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ASSERTION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOTokenExchangedEvent = (
  params: SSOEventParams & { payload: SSOTokenExchangedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_TOKEN_EXCHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_TOKEN_EXCHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAccountLinkedEvent = (
  params: SSOEventParams & { payload: SSOAccountLinkedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACCOUNT_LINKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACCOUNT_LINKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAccountLinkingFailedEvent = (
  params: SSOEventParams & { payload: SSOAccountLinkingFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACCOUNT_LINKING_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACCOUNT_LINKING_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOJitProvisionedEvent = (
  params: SSOEventParams & { payload: SSOJitProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_JIT_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_JIT_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOJitDeniedEvent = (
  params: SSOEventParams & { payload: SSOJitDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_JIT_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_JIT_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOMetadataRefreshedEvent = (
  params: SSOEventParams & { payload: SSOMetadataRefreshedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_METADATA_REFRESHED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_METADATA_REFRESHED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOMetadataFailedEvent = (
  params: SSOEventParams & { payload: SSOMetadataFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_METADATA_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_METADATA_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationStartedEvent = (
  params: SSOEventParams & { payload: SSOValidationStartedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_STARTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_STARTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.executedBy ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationCompletedEvent = (
  params: SSOEventParams & { payload: SSOValidationCompletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_COMPLETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_COMPLETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationFailedEvent = (
  params: SSOEventParams & { payload: SSOValidationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOActivationSucceededEvent = (
  params: SSOEventParams & { payload: SSOActivationSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACTIVATION_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACTIVATION_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.activatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOActivationFailedEvent = (
  params: SSOEventParams & { payload: SSOActivationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACTIVATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACTIVATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSODeactivationSucceededEvent = (
  params: SSOEventParams & { payload: SSODeactivationSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_DEACTIVATION_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_DEACTIVATION_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.deactivatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutInitiatedEvent = (
  params: SSOEventParams & { payload: SSOLogoutInitiatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_INITIATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_INITIATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutProcessedEvent = (
  params: SSOEventParams & { payload: SSOLogoutProcessedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_PROCESSED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_PROCESSED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutFailedEvent = (
  params: SSOEventParams & { payload: SSOLogoutFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
