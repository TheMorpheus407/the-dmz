import {
  SessionOutcome,
  SessionRevocationReason,
  ConcurrentSessionStrategy,
  SessionBindingMode,
  type TenantSessionPolicy,
  DEFAULT_TENANT_SESSION_POLICY,
  type SessionBindingContext,
  type SessionPolicy,
  type SessionBindingViolation,
  type SessionTimeoutEvaluation,
  type ConcurrentSessionEvaluation,
} from '@the-dmz/shared/auth/session-policy.js';
import { Role } from '@the-dmz/shared/auth';

export { ConcurrentSessionStrategy };

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
    return DEFAULT_TENANT_SESSION_POLICY;
  }

  const sessionPolicySettings = tenantSettings['sessionPolicy'] as
    | Partial<TenantSessionPolicy>
    | undefined;

  if (!sessionPolicySettings) {
    return DEFAULT_TENANT_SESSION_POLICY;
  }

  return {
    idleTimeoutMinutes:
      sessionPolicySettings['idleTimeoutMinutes'] ??
      DEFAULT_TENANT_SESSION_POLICY.idleTimeoutMinutes,
    absoluteTimeoutMinutes:
      sessionPolicySettings['absoluteTimeoutMinutes'] ??
      DEFAULT_TENANT_SESSION_POLICY.absoluteTimeoutMinutes,
    maxConcurrentSessionsPerUser:
      sessionPolicySettings['maxConcurrentSessionsPerUser'] ??
      DEFAULT_TENANT_SESSION_POLICY.maxConcurrentSessionsPerUser,
    sessionBindingMode:
      sessionPolicySettings['sessionBindingMode'] ??
      DEFAULT_TENANT_SESSION_POLICY.sessionBindingMode,
    forceLogoutOnPasswordChange:
      sessionPolicySettings['forceLogoutOnPasswordChange'] ??
      DEFAULT_TENANT_SESSION_POLICY.forceLogoutOnPasswordChange,
    forceLogoutOnRoleChange:
      sessionPolicySettings['forceLogoutOnRoleChange'] ??
      DEFAULT_TENANT_SESSION_POLICY.forceLogoutOnRoleChange,
    concurrentSessionStrategy:
      sessionPolicySettings['concurrentSessionStrategy'] ??
      DEFAULT_TENANT_SESSION_POLICY.concurrentSessionStrategy,
  };
};

export const defaultSessionPolicy: SessionPolicy = {
  maxSessionDurationMs: 30 * 24 * 60 * 60 * 1000,
  refreshable: true,
};

export const roleBasedSessionPolicies = [
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

export const canRefreshSession = (sessionCreatedAt: Date, role: string | undefined): boolean => {
  const policy = getSessionPolicyForRole(role);
  const sessionAgeMs = Date.now() - sessionCreatedAt.getTime();
  return policy.refreshable && sessionAgeMs < policy.maxSessionDurationMs;
};

export const getSessionExpiryDate = (sessionCreatedAt: Date, role: string | undefined): Date => {
  const policy = getSessionPolicyForRole(role);
  return new Date(sessionCreatedAt.getTime() + policy.maxSessionDurationMs);
};

export const getNextIdleTimeout = (lastActiveAt: Date, idleTimeoutMinutes: number): Date => {
  return new Date(lastActiveAt.getTime() + idleTimeoutMinutes * 60 * 1000);
};
