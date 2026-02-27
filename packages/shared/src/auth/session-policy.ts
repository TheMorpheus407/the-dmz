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
  IDLE_TIMEOUT: 'idle_timeout',
  ABSOLUTE_TIMEOUT: 'absolute_timeout',
  PASSWORD_CHANGED: 'password_changed',
  ROLE_CHANGED: 'role_changed',
  SESSION_BINDING_VIOLATION: 'session_binding_violation',
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
  SessionRevocationReason.IDLE_TIMEOUT,
  SessionRevocationReason.ABSOLUTE_TIMEOUT,
  SessionRevocationReason.PASSWORD_CHANGED,
  SessionRevocationReason.ROLE_CHANGED,
  SessionRevocationReason.SESSION_BINDING_VIOLATION,
]);

export const sessionOutcomeSchema = z.enum([
  SessionOutcome.ACTIVE,
  SessionOutcome.EXPIRED,
  SessionOutcome.REVOKED,
  SessionOutcome.POLICY_DENIED,
]);

export const SessionBindingMode = {
  NONE: 'none',
  IP: 'ip',
  DEVICE: 'device',
  IP_DEVICE: 'ip_device',
} as const;

export type SessionBindingMode = (typeof SessionBindingMode)[keyof typeof SessionBindingMode];

export const sessionBindingModeSchema = z.enum([
  SessionBindingMode.NONE,
  SessionBindingMode.IP,
  SessionBindingMode.DEVICE,
  SessionBindingMode.IP_DEVICE,
]);

export const ConcurrentSessionStrategy = {
  REJECT_NEWEST: 'reject_newest',
  REVOKE_OLDEST: 'revoke_oldest',
} as const;

export type ConcurrentSessionStrategy =
  (typeof ConcurrentSessionStrategy)[keyof typeof ConcurrentSessionStrategy];

export const concurrentSessionStrategySchema = z.enum([
  ConcurrentSessionStrategy.REJECT_NEWEST,
  ConcurrentSessionStrategy.REVOKE_OLDEST,
]);

export const SESSION_POLICY_DEFAULTS = {
  IDLE_TIMEOUT_MINUTES: 30,
  ABSOLUTE_TIMEOUT_MINUTES: 8 * 60,
  MAX_CONCURRENT_SESSIONS: 5,
  MAX_IDLE_TIMEOUT_MINUTES: 480,
  MIN_IDLE_TIMEOUT_MINUTES: 5,
  MAX_ABSOLUTE_TIMEOUT_MINUTES: 7 * 24 * 60,
  MIN_ABSOLUTE_TIMEOUT_MINUTES: 60,
} as const;

export interface TenantSessionPolicy {
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
  maxConcurrentSessionsPerUser: number | null;
  sessionBindingMode: SessionBindingMode;
  forceLogoutOnPasswordChange: boolean;
  forceLogoutOnRoleChange: boolean;
  concurrentSessionStrategy: ConcurrentSessionStrategy;
}

export const tenantSessionPolicySchema: z.ZodType<TenantSessionPolicy> = z.object({
  idleTimeoutMinutes: z
    .number()
    .int()
    .min(SESSION_POLICY_DEFAULTS.MIN_IDLE_TIMEOUT_MINUTES)
    .max(SESSION_POLICY_DEFAULTS.MAX_IDLE_TIMEOUT_MINUTES),
  absoluteTimeoutMinutes: z
    .number()
    .int()
    .min(SESSION_POLICY_DEFAULTS.MIN_ABSOLUTE_TIMEOUT_MINUTES)
    .max(SESSION_POLICY_DEFAULTS.MAX_ABSOLUTE_TIMEOUT_MINUTES),
  maxConcurrentSessionsPerUser: z.number().int().min(1).nullable(),
  sessionBindingMode: sessionBindingModeSchema,
  forceLogoutOnPasswordChange: z.boolean(),
  forceLogoutOnRoleChange: z.boolean(),
  concurrentSessionStrategy: concurrentSessionStrategySchema,
});

export const defaultTenantSessionPolicy: TenantSessionPolicy = {
  idleTimeoutMinutes: SESSION_POLICY_DEFAULTS.IDLE_TIMEOUT_MINUTES,
  absoluteTimeoutMinutes: SESSION_POLICY_DEFAULTS.ABSOLUTE_TIMEOUT_MINUTES,
  maxConcurrentSessionsPerUser: SESSION_POLICY_DEFAULTS.MAX_CONCURRENT_SESSIONS,
  sessionBindingMode: SessionBindingMode.NONE,
  forceLogoutOnPasswordChange: true,
  forceLogoutOnRoleChange: false,
  concurrentSessionStrategy: ConcurrentSessionStrategy.REVOKE_OLDEST,
};

export interface SessionPolicy {
  maxSessionDurationMs: number;
  refreshable: boolean;
  maxRefreshCount?: number;
}

export interface SessionBindingContext {
  ipAddress?: string | null;
  deviceFingerprint?: string | null;
}

export interface SessionBindingViolation {
  violated: boolean;
  mode: SessionBindingMode;
  violations: Array<'ip' | 'device'>;
}

export const validateSessionBinding = (
  policy: TenantSessionPolicy,
  originalContext: SessionBindingContext,
  currentContext: SessionBindingContext,
): SessionBindingViolation => {
  if (policy.sessionBindingMode === SessionBindingMode.NONE) {
    return { violated: false, mode: policy.sessionBindingMode, violations: [] };
  }

  const violations: Array<'ip' | 'device'> = [];

  if (
    policy.sessionBindingMode === SessionBindingMode.IP ||
    policy.sessionBindingMode === SessionBindingMode.IP_DEVICE
  ) {
    if (
      originalContext.ipAddress &&
      currentContext.ipAddress &&
      originalContext.ipAddress !== currentContext.ipAddress
    ) {
      violations.push('ip');
    }
  }

  if (
    policy.sessionBindingMode === SessionBindingMode.DEVICE ||
    policy.sessionBindingMode === SessionBindingMode.IP_DEVICE
  ) {
    if (
      originalContext.deviceFingerprint &&
      currentContext.deviceFingerprint &&
      originalContext.deviceFingerprint !== currentContext.deviceFingerprint
    ) {
      violations.push('device');
    }
  }

  return {
    violated: violations.length > 0,
    mode: policy.sessionBindingMode,
    violations,
  };
};

export const resolveTenantSessionPolicy = (
  tenantSettings: Record<string, unknown> | undefined,
): TenantSessionPolicy => {
  if (!tenantSettings) {
    return defaultTenantSessionPolicy;
  }

  const sessionPolicySettings = tenantSettings['sessionPolicy'] as
    | Partial<TenantSessionPolicy>
    | undefined;

  if (!sessionPolicySettings) {
    return defaultTenantSessionPolicy;
  }

  return {
    idleTimeoutMinutes:
      sessionPolicySettings['idleTimeoutMinutes'] ?? defaultTenantSessionPolicy.idleTimeoutMinutes,
    absoluteTimeoutMinutes:
      sessionPolicySettings['absoluteTimeoutMinutes'] ??
      defaultTenantSessionPolicy.absoluteTimeoutMinutes,
    maxConcurrentSessionsPerUser:
      sessionPolicySettings['maxConcurrentSessionsPerUser'] ??
      defaultTenantSessionPolicy.maxConcurrentSessionsPerUser,
    sessionBindingMode:
      sessionPolicySettings['sessionBindingMode'] ?? defaultTenantSessionPolicy.sessionBindingMode,
    forceLogoutOnPasswordChange:
      sessionPolicySettings['forceLogoutOnPasswordChange'] ??
      defaultTenantSessionPolicy.forceLogoutOnPasswordChange,
    forceLogoutOnRoleChange:
      sessionPolicySettings['forceLogoutOnRoleChange'] ??
      defaultTenantSessionPolicy.forceLogoutOnRoleChange,
    concurrentSessionStrategy:
      sessionPolicySettings['concurrentSessionStrategy'] ??
      defaultTenantSessionPolicy.concurrentSessionStrategy,
  };
};

export const validateTenantSessionPolicy = (
  policy: unknown,
): { valid: boolean; errors: string[] } => {
  const result = tenantSessionPolicySchema.safeParse(policy);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { valid: false, errors };
};

export interface SessionTimeoutEvaluation {
  allowed: boolean;
  outcome: SessionOutcome;
  reason?: SessionRevocationReason;
  idleTimeoutExpired: boolean;
  absoluteTimeoutExpired: boolean;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
}

export const evaluateSessionTimeouts = (
  sessionCreatedAt: Date,
  lastActiveAt: Date,
  policy: TenantSessionPolicy,
): SessionTimeoutEvaluation => {
  const now = new Date();
  const absoluteElapsedMs = now.getTime() - sessionCreatedAt.getTime();
  const idleElapsedMs = now.getTime() - lastActiveAt.getTime();

  const idleTimeoutMs = policy.idleTimeoutMinutes * 60 * 1000;
  const absoluteTimeoutMs = policy.absoluteTimeoutMinutes * 60 * 1000;

  const idleTimeoutExpired = idleElapsedMs > idleTimeoutMs;
  const absoluteTimeoutExpired = absoluteElapsedMs > absoluteTimeoutMs;

  if (absoluteTimeoutExpired) {
    return {
      allowed: false,
      outcome: SessionOutcome.EXPIRED,
      reason: SessionRevocationReason.ABSOLUTE_TIMEOUT,
      idleTimeoutExpired,
      absoluteTimeoutExpired,
      idleTimeoutMs,
      absoluteTimeoutMs,
    };
  }

  if (idleTimeoutExpired) {
    return {
      allowed: false,
      outcome: SessionOutcome.EXPIRED,
      reason: SessionRevocationReason.IDLE_TIMEOUT,
      idleTimeoutExpired,
      absoluteTimeoutExpired,
      idleTimeoutMs,
      absoluteTimeoutMs,
    };
  }

  return {
    allowed: true,
    outcome: SessionOutcome.ACTIVE,
    idleTimeoutExpired: false,
    absoluteTimeoutExpired: false,
    idleTimeoutMs,
    absoluteTimeoutMs,
  };
};

export const getNextIdleTimeout = (lastActiveAt: Date, idleTimeoutMinutes: number): Date => {
  return new Date(lastActiveAt.getTime() + idleTimeoutMinutes * 60 * 1000);
};

export interface ConcurrentSessionEvaluation {
  allowed: boolean;
  outcome: SessionOutcome;
  reason?: SessionRevocationReason;
  currentSessionCount: number;
  maxSessions: number | null;
  strategy: ConcurrentSessionStrategy;
}

export const evaluateConcurrentSessions = (
  currentSessionCount: number,
  policy: TenantSessionPolicy,
): ConcurrentSessionEvaluation => {
  const maxSessions = policy.maxConcurrentSessionsPerUser;

  if (maxSessions === null) {
    return {
      allowed: true,
      outcome: SessionOutcome.ACTIVE,
      currentSessionCount,
      maxSessions,
      strategy: policy.concurrentSessionStrategy,
    };
  }

  if (currentSessionCount >= maxSessions) {
    return {
      allowed: false,
      outcome: SessionOutcome.POLICY_DENIED,
      reason: SessionRevocationReason.CONCURRENT_SESSION,
      currentSessionCount,
      maxSessions,
      strategy: policy.concurrentSessionStrategy,
    };
  }

  return {
    allowed: true,
    outcome: SessionOutcome.ACTIVE,
    currentSessionCount,
    maxSessions,
    strategy: policy.concurrentSessionStrategy,
  };
};

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

export const SessionRevocationReasonMessages: Record<
  SessionRevocationReason,
  { title: string; message: string }
> = {
  [SessionRevocationReason.USER_LOGOUT]: {
    title: 'Logged Out',
    message: 'You have been logged out.',
  },
  [SessionRevocationReason.TENANT_SUSPENDED]: {
    title: 'Tenant Suspended',
    message: 'Your tenant has been suspended. Please contact support.',
  },
  [SessionRevocationReason.TENANT_DEACTIVATED]: {
    title: 'Tenant Deactivated',
    message: 'Your tenant has been deactivated. Please contact support.',
  },
  [SessionRevocationReason.ADMIN_REVOKED]: {
    title: 'Session Revoked',
    message: 'Your session has been revoked by an administrator.',
  },
  [SessionRevocationReason.SESSION_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has exceeded its maximum duration.',
  },
  [SessionRevocationReason.CONCURRENT_SESSION]: {
    title: 'Concurrent Session Limit',
    message: 'You have reached the maximum number of concurrent sessions.',
  },
  [SessionRevocationReason.IDLE_TIMEOUT]: {
    title: 'Session Idle Timeout',
    message: 'Your session has been inactive for too long. Please sign in again.',
  },
  [SessionRevocationReason.ABSOLUTE_TIMEOUT]: {
    title: 'Session Expired',
    message: 'Your session has exceeded its maximum lifetime. Please sign in again.',
  },
  [SessionRevocationReason.PASSWORD_CHANGED]: {
    title: 'Session Revoked',
    message: 'Your session was revoked due to a password change.',
  },
  [SessionRevocationReason.ROLE_CHANGED]: {
    title: 'Session Revoked',
    message: 'Your session was revoked due to a role change.',
  },
  [SessionRevocationReason.SESSION_BINDING_VIOLATION]: {
    title: 'Session Binding Violation',
    message: 'Your session context has changed. Please sign in again.',
  },
};

export const getStatusCodeForSessionOutcome = (outcome: SessionOutcome): number => {
  return SessionOutcomeStatusCode[outcome];
};

export const getMessageForSessionOutcome = (
  outcome: SessionOutcome,
): { title: string; message: string } => {
  return SessionOutcomeMessages[outcome];
};

export const getMessageForRevocationReason = (
  reason: SessionRevocationReason,
): { title: string; message: string } => {
  return SessionRevocationReasonMessages[reason];
};
