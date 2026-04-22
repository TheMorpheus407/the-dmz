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
  BaseAuthEventParams,
  AuthDomainEvent,
} from '../auth.events.js';

export const createAuthMfaEnabledEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaEnabledPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaDisabledPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaRecoveryCodesUsedPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaPolicyUpdatedPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaChallengeRequiredPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaChallengeSucceededPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaChallengeFailedPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaEnrollmentDeferredPayload },
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
  params: BaseAuthEventParams & { payload: AuthMfaEnrollmentExpiredPayload },
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
  params: BaseAuthEventParams & { payload: AuthStepUpRequiredPayload },
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
  params: BaseAuthEventParams & { payload: AuthStepUpSucceededPayload },
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
  params: BaseAuthEventParams & { payload: AuthStepUpFailedPayload },
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
  params: BaseAuthEventParams & { payload: AuthAdaptiveMfaTriggeredPayload },
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
