import { z } from 'zod';

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

export interface SessionTimeoutEvaluation {
  allowed: boolean;
  outcome: SessionOutcome;
  reason?: SessionRevocationReason;
  idleTimeoutExpired: boolean;
  absoluteTimeoutExpired: boolean;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
}

export interface ConcurrentSessionEvaluation {
  allowed: boolean;
  outcome: SessionOutcome;
  reason?: SessionRevocationReason;
  currentSessionCount: number;
  maxSessions: number | null;
  strategy: ConcurrentSessionStrategy;
}

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
