import { z } from 'zod';

import { Role, type Role as RoleType } from './access-policy.js';

export const SessionOutcome = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  POLICY_DENIED: 'policy_denied',
} as const;

export type SessionOutcome = (typeof SessionOutcome)[keyof typeof SessionOutcome];

export const SessionRevocationReason = {
  USER_LOGOUT: 'user_logout',
  TENANT_SUSPENDED: 'tenant_suspended',
  TENANT_DEACTIVATED: 'tenant_deactivated',
  ADMIN_REVOKED: 'admin_revoked',
  SESSION_EXPIRED: 'session_expired',
  CONCURRENT_SESSION: 'concurrent_session',
} as const;

export type SessionRevocationReason =
  (typeof SessionRevocationReason)[keyof typeof SessionRevocationReason];

export const SessionRevocationReasonSchema = z.enum([
  SessionRevocationReason.USER_LOGOUT,
  SessionRevocationReason.TENANT_SUSPENDED,
  SessionRevocationReason.TENANT_DEACTIVATED,
  SessionRevocationReason.ADMIN_REVOKED,
  SessionRevocationReason.SESSION_EXPIRED,
  SessionRevocationReason.CONCURRENT_SESSION,
]);

export const sessionOutcomeSchema = z.enum([
  SessionOutcome.ACTIVE,
  SessionOutcome.EXPIRED,
  SessionOutcome.REVOKED,
  SessionOutcome.POLICY_DENIED,
]);

export interface SessionPolicy {
  maxSessionDurationMs: number;
  refreshable: boolean;
  maxRefreshCount?: number;
}

export interface RoleBasedSessionPolicy {
  role: RoleType;
  policy: SessionPolicy;
}

export const defaultSessionPolicy: SessionPolicy = {
  maxSessionDurationMs: 30 * 24 * 60 * 60 * 1000,
  refreshable: true,
};

export const roleBasedSessionPolicies: RoleBasedSessionPolicy[] = [
  {
    role: Role.SUPER_ADMIN,
    policy: {
      maxSessionDurationMs: 4 * 60 * 60 * 1000,
      refreshable: false,
    },
  },
  {
    role: Role.TENANT_ADMIN,
    policy: {
      maxSessionDurationMs: 8 * 60 * 60 * 1000,
      refreshable: true,
    },
  },
  {
    role: Role.MANAGER,
    policy: {
      maxSessionDurationMs: 24 * 60 * 60 * 1000,
      refreshable: true,
    },
  },
  {
    role: Role.TRAINER,
    policy: defaultSessionPolicy,
  },
  {
    role: Role.LEARNER,
    policy: defaultSessionPolicy,
  },
];

export const getSessionPolicyForRole = (role: string | undefined): SessionPolicy => {
  if (!role) {
    return defaultSessionPolicy;
  }

  const rolePolicy = roleBasedSessionPolicies.find((p) => p.role === role);
  return rolePolicy?.policy ?? defaultSessionPolicy;
};

export interface SessionPolicyEvaluation {
  allowed: boolean;
  outcome: SessionOutcome;
  reason?: SessionRevocationReason;
  maxSessionDurationMs?: number;
  refreshable?: boolean;
}

export const evaluateSessionPolicy = (
  sessionCreatedAt: Date,
  role: string | undefined,
  sessionRevokedAt: Date | null,
  tenantStatus: string | undefined,
): SessionPolicyEvaluation => {
  if (sessionRevokedAt && sessionRevokedAt < new Date()) {
    return {
      allowed: false,
      outcome: SessionOutcome.REVOKED,
      reason: determineRevocationReason(tenantStatus),
    };
  }

  const policy = getSessionPolicyForRole(role);
  const sessionAgeMs = Date.now() - sessionCreatedAt.getTime();

  if (sessionAgeMs > policy.maxSessionDurationMs) {
    return {
      allowed: false,
      outcome: SessionOutcome.EXPIRED,
      reason: SessionRevocationReason.SESSION_EXPIRED,
      maxSessionDurationMs: policy.maxSessionDurationMs,
      refreshable: policy.refreshable,
    };
  }

  if (!policy.refreshable && sessionAgeMs > 0) {
    return {
      allowed: false,
      outcome: SessionOutcome.POLICY_DENIED,
      reason: SessionRevocationReason.SESSION_EXPIRED,
      maxSessionDurationMs: policy.maxSessionDurationMs,
      refreshable: policy.refreshable,
    };
  }

  return {
    allowed: true,
    outcome: SessionOutcome.ACTIVE,
    maxSessionDurationMs: policy.maxSessionDurationMs,
    refreshable: policy.refreshable,
  };
};

const determineRevocationReason = (tenantStatus: string | undefined): SessionRevocationReason => {
  if (tenantStatus === 'suspended') {
    return SessionRevocationReason.TENANT_SUSPENDED;
  }
  if (tenantStatus === 'deactivated') {
    return SessionRevocationReason.TENANT_DEACTIVATED;
  }
  return SessionRevocationReason.ADMIN_REVOKED;
};

export const canRefreshSession = (sessionCreatedAt: Date, role: string | undefined): boolean => {
  const policy = getSessionPolicyForRole(role);
  const sessionAgeMs = Date.now() - sessionCreatedAt.getTime();
  return policy.refreshable && sessionAgeMs < policy.maxSessionDurationMs;
};

export const getSessionExpiryDate = (sessionCreatedAt: Date, role: string | undefined): Date => {
  const policy = getSessionPolicyForRole(role);
  return new Date(sessionCreatedAt.getTime() + policy.maxSessionDurationMs);
};

export const SessionOutcomeStatusCode: Record<SessionOutcome, number> = {
  [SessionOutcome.ACTIVE]: 200,
  [SessionOutcome.EXPIRED]: 401,
  [SessionOutcome.REVOKED]: 401,
  [SessionOutcome.POLICY_DENIED]: 403,
};

export const SessionOutcomeMessages: Record<SessionOutcome, { title: string; message: string }> = {
  [SessionOutcome.ACTIVE]: {
    title: 'Session Active',
    message: 'Your session is valid.',
  },
  [SessionOutcome.EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
  },
  [SessionOutcome.REVOKED]: {
    title: 'Session Revoked',
    message: 'Your session has been revoked. Please sign in again.',
  },
  [SessionOutcome.POLICY_DENIED]: {
    title: 'Session Denied',
    message: 'Your session does not meet the required policy for this resource.',
  },
};
