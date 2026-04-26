import { AUTH_EVENTS } from '../auth.events.js';

import type {
  AuthMfaEnabledPayload,
  AuthMfaDisabledPayload,
  AuthMfaRecoveryCodesUsedPayload,
  AuthMfaPolicyUpdatedPayload,
  AuthMfaChallengeRequiredPayload,
  AuthMfaChallengeSucceededPayload,
  AuthMfaChallengeFailedPayload,
  AuthMfaEnrollmentDeferredPayload,
  AuthMfaEnrollmentExpiredPayload,
  AuthStepUpRequiredPayload,
  AuthStepUpSucceededPayload,
  AuthStepUpFailedPayload,
  AuthAdaptiveMfaTriggeredPayload,
} from './mfa.events.js';
import type { AuthEventParams, AuthDomainEvent } from '../auth.events.js';

export const createAuthMfaEnabledEvent = (
  params: AuthEventParams & { payload: AuthMfaEnabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_ENABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_ENABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaDisabledEvent = (
  params: AuthEventParams & { payload: AuthMfaDisabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_DISABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_DISABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaRecoveryCodesUsedEvent = (
  params: AuthEventParams & { payload: AuthMfaRecoveryCodesUsedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_RECOVERY_CODES_USED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_RECOVERY_CODES_USED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaPolicyUpdatedEvent = (
  params: AuthEventParams & { payload: AuthMfaPolicyUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_POLICY_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_POLICY_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.updatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaChallengeRequiredEvent = (
  params: AuthEventParams & { payload: AuthMfaChallengeRequiredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_CHALLENGE_REQUIRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_CHALLENGE_REQUIRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaChallengeSucceededEvent = (
  params: AuthEventParams & { payload: AuthMfaChallengeSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_CHALLENGE_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_CHALLENGE_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaChallengeFailedEvent = (
  params: AuthEventParams & { payload: AuthMfaChallengeFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_CHALLENGE_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_CHALLENGE_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaEnrollmentDeferredEvent = (
  params: AuthEventParams & { payload: AuthMfaEnrollmentDeferredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_ENROLLMENT_DEFERRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_ENROLLMENT_DEFERRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaEnrollmentExpiredEvent = (
  params: AuthEventParams & { payload: AuthMfaEnrollmentExpiredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_ENROLLMENT_EXPIRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_ENROLLMENT_EXPIRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthStepUpRequiredEvent = (
  params: AuthEventParams & { payload: AuthStepUpRequiredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.STEP_UP_REQUIRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.STEP_UP_REQUIRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthStepUpSucceededEvent = (
  params: AuthEventParams & { payload: AuthStepUpSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.STEP_UP_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.STEP_UP_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthStepUpFailedEvent = (
  params: AuthEventParams & { payload: AuthStepUpFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.STEP_UP_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.STEP_UP_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthAdaptiveMfaTriggeredEvent = (
  params: AuthEventParams & { payload: AuthAdaptiveMfaTriggeredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.ADAPTIVE_MFA_TRIGGERED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.ADAPTIVE_MFA_TRIGGERED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
