export const MFA_EVENTS = {
  MFA_ENABLED: 'auth.mfa_enabled',
  MFA_DISABLED: 'auth.mfa_disabled',
  MFA_RECOVERY_CODES_USED: 'auth.mfa_recovery_codes_used',
  MFA_POLICY_UPDATED: 'auth.mfa.policy.updated',
  MFA_CHALLENGE_REQUIRED: 'auth.mfa.challenge.required',
  MFA_CHALLENGE_SUCCEEDED: 'auth.mfa.challenge.succeeded',
  MFA_CHALLENGE_FAILED: 'auth.mfa.challenge.failed',
  MFA_ENROLLMENT_DEFERRED: 'auth.mfa.enrollment.deferred',
  MFA_ENROLLMENT_EXPIRED: 'auth.mfa.enrollment.expired',
  STEP_UP_REQUIRED: 'auth.step_up.required',
  STEP_UP_SUCCEEDED: 'auth.step_up.succeeded',
  STEP_UP_FAILED: 'auth.step_up.failed',
  ADAPTIVE_MFA_TRIGGERED: 'auth.adaptive_mfa.triggered',
} as const;

export type MfaEventType = (typeof MFA_EVENTS)[keyof typeof MFA_EVENTS];

export interface AuthMfaEnabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  method: 'totp' | 'webauthn' | 'email';
}

export interface AuthMfaDisabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: 'user_request' | 'admin_reset' | 'compromised';
}

export interface AuthMfaRecoveryCodesUsedPayload {
  userId: string;
  email: string;
  tenantId: string;
  riskContext?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
}

export interface AuthMfaPolicyUpdatedPayload {
  tenantId: string;
  updatedBy: string;
  previousPolicy: Record<string, unknown>;
  newPolicy: Record<string, unknown>;
}

export interface AuthMfaChallengeRequiredPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  method: string;
  reason: 'login' | 'step_up' | 'adaptive';
}

export interface AuthMfaChallengeSucceededPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  method: string;
  challengeOutcome: string;
}

export interface AuthMfaChallengeFailedPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  method: string;
  failureReason: string;
  attempts: number;
}

export interface AuthMfaEnrollmentDeferredPayload {
  userId: string;
  tenantId: string;
  gracePeriodEndDate: string;
}

export interface AuthMfaEnrollmentExpiredPayload {
  userId: string;
  tenantId: string;
  reason: string;
}

export interface AuthStepUpRequiredPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  action: string;
  correlationId: string;
}

export interface AuthStepUpSucceededPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  action: string;
  proofId: string;
}

export interface AuthStepUpFailedPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  action: string;
  failureReason: string;
}

export interface AuthAdaptiveMfaTriggeredPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
  triggers: string[];
  riskScore: number;
}
