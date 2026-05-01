import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  SessionOutcome,
  SessionRevocationReason,
  DEFAULT_TENANT_SESSION_POLICY,
  SessionBindingMode,
  SESSION_POLICY_DEFAULTS,
} from '@the-dmz/shared/auth/session-policy.js';
import { Role } from '@the-dmz/shared/auth';

import {
  evaluateSessionTimeouts,
  evaluateConcurrentSessions,
  validateSessionBinding,
  resolveTenantSessionPolicy,
  defaultSessionPolicy,
  roleBasedSessionPolicies,
  getSessionPolicyForRole,
  canRefreshSession,
  getSessionExpiryDate,
  getNextIdleTimeout,
} from '../session-policy.service.js';

const TEST_CONSTANTS = {
  SUPER_ADMIN_DURATION_MS: 4 * 60 * 60 * 1000,
  TENANT_ADMIN_DURATION_MS: 8 * 60 * 60 * 1000,
  MANAGER_DURATION_MS: 24 * 60 * 60 * 1000,
  DEFAULT_SESSION_DURATION_MS: 30 * 24 * 60 * 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  THIRTY_MINUTES_MS: 30 * 60 * 1000,
  FIVE_MINUTES_MS: 5 * 60 * 1000,
  FORTY_FIVE_MINUTES_MS: 45 * 60 * 1000,
  TWENTY_FIVE_HOURS_MS: 25 * 60 * 60 * 1000,
  FIXED_TEST_DATE: new Date('2024-01-01T00:00:00Z'),
  FIXED_LATE_TEST_DATE: new Date('2024-01-01T10:00:00Z'),
  MAX_CONCURRENT_SESSIONS: SESSION_POLICY_DEFAULTS.MAX_CONCURRENT_SESSIONS,
  IDLE_TIMEOUT_MINUTES: SESSION_POLICY_DEFAULTS.IDLE_TIMEOUT_MINUTES,
  ABSOLUTE_TIMEOUT_MINUTES: SESSION_POLICY_DEFAULTS.ABSOLUTE_TIMEOUT_MINUTES,
};

const FIXED_NOW = new Date('2024-01-01T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('session-policy.service', () => {
  describe('roleBasedSessionPolicies', () => {
    it('should have a policy for super_admin with 4 hour max duration and no refresh', () => {
      const superAdminPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.SUPER_ADMIN);
      expect(superAdminPolicy).toBeDefined();
      expect(superAdminPolicy!.policy.maxSessionDurationMs).toBe(
        TEST_CONSTANTS.SUPER_ADMIN_DURATION_MS,
      );
      expect(superAdminPolicy!.policy.refreshable).toBe(false);
    });

    it('should have a policy for tenant_admin with 8 hour max duration', () => {
      const tenantAdminPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.TENANT_ADMIN);
      expect(tenantAdminPolicy).toBeDefined();
      expect(tenantAdminPolicy!.policy.maxSessionDurationMs).toBe(
        TEST_CONSTANTS.TENANT_ADMIN_DURATION_MS,
      );
      expect(tenantAdminPolicy!.policy.refreshable).toBe(true);
    });

    it('should have a policy for manager with 24 hour max duration', () => {
      const managerPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.MANAGER);
      expect(managerPolicy).toBeDefined();
      expect(managerPolicy!.policy.maxSessionDurationMs).toBe(TEST_CONSTANTS.MANAGER_DURATION_MS);
      expect(managerPolicy!.policy.refreshable).toBe(true);
    });

    it('should have default policy for trainer and learner with 30 day duration', () => {
      const trainerPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.TRAINER);
      const learnerPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.LEARNER);

      expect(trainerPolicy).toBeDefined();
      expect(learnerPolicy).toBeDefined();

      expect(trainerPolicy!.policy).toEqual(defaultSessionPolicy);
      expect(learnerPolicy!.policy).toEqual(defaultSessionPolicy);
    });
  });

  describe('getSessionPolicyForRole', () => {
    it('should return super_admin policy for super_admin role', () => {
      const policy = getSessionPolicyForRole(Role.SUPER_ADMIN);
      expect(policy.maxSessionDurationMs).toBe(TEST_CONSTANTS.SUPER_ADMIN_DURATION_MS);
      expect(policy.refreshable).toBe(false);
    });

    it('should return tenant_admin policy for tenant_admin role', () => {
      const policy = getSessionPolicyForRole(Role.TENANT_ADMIN);
      expect(policy.maxSessionDurationMs).toBe(TEST_CONSTANTS.TENANT_ADMIN_DURATION_MS);
      expect(policy.refreshable).toBe(true);
    });

    it('should return default policy for unknown role', () => {
      const policy = getSessionPolicyForRole('unknown_role');
      expect(policy).toEqual(defaultSessionPolicy);
    });

    it('should return default policy for undefined role', () => {
      const policy = getSessionPolicyForRole(undefined);
      expect(policy).toEqual(defaultSessionPolicy);
    });
  });

  describe('canRefreshSession', () => {
    it('should return true for refreshable role within duration', () => {
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.ONE_HOUR_MS);
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(true);
    });

    it('should return false for non-refreshable role (super_admin)', () => {
      const sessionCreatedAt = new Date(FIXED_NOW.getTime());
      const result = canRefreshSession(sessionCreatedAt, Role.SUPER_ADMIN);
      expect(result).toBe(false);
    });

    it('should return false for session exceeding max duration', () => {
      const sessionCreatedAt = new Date(
        FIXED_NOW.getTime() -
          TEST_CONSTANTS.DEFAULT_SESSION_DURATION_MS -
          TEST_CONSTANTS.ONE_HOUR_MS,
      );
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(false);
    });

    it('should return false for unknown role exceeding default duration', () => {
      const sessionCreatedAt = new Date(
        FIXED_NOW.getTime() -
          TEST_CONSTANTS.DEFAULT_SESSION_DURATION_MS -
          TEST_CONSTANTS.ONE_HOUR_MS,
      );
      const result = canRefreshSession(sessionCreatedAt, 'unknown_role');
      expect(result).toBe(false);
    });

    it('should return false for session at exact max duration boundary', () => {
      const sessionCreatedAt = new Date(
        FIXED_NOW.getTime() - TEST_CONSTANTS.DEFAULT_SESSION_DURATION_MS,
      );
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(false);
    });

    it('should return true for session 1ms before max duration boundary', () => {
      const sessionCreatedAt = new Date(
        FIXED_NOW.getTime() - TEST_CONSTANTS.DEFAULT_SESSION_DURATION_MS + 1,
      );
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(true);
    });
  });

  describe('getSessionExpiryDate', () => {
    it('should return correct expiry for super_admin role', () => {
      const sessionCreatedAt = TEST_CONSTANTS.FIXED_TEST_DATE;
      const expiry = getSessionExpiryDate(sessionCreatedAt, Role.SUPER_ADMIN);

      expect(expiry.getTime()).toBe(
        sessionCreatedAt.getTime() + TEST_CONSTANTS.SUPER_ADMIN_DURATION_MS,
      );
    });

    it('should return correct expiry for tenant_admin role', () => {
      const sessionCreatedAt = TEST_CONSTANTS.FIXED_TEST_DATE;
      const expiry = getSessionExpiryDate(sessionCreatedAt, Role.TENANT_ADMIN);

      expect(expiry.getTime()).toBe(
        sessionCreatedAt.getTime() + TEST_CONSTANTS.TENANT_ADMIN_DURATION_MS,
      );
    });

    it('should return correct expiry for default role', () => {
      const sessionCreatedAt = TEST_CONSTANTS.FIXED_TEST_DATE;
      const expiry = getSessionExpiryDate(sessionCreatedAt, undefined);

      expect(expiry.getTime()).toBe(
        sessionCreatedAt.getTime() + defaultSessionPolicy.maxSessionDurationMs,
      );
    });
  });

  describe('resolveTenantSessionPolicy', () => {
    it('should return defaults when tenant settings are undefined', () => {
      const result = resolveTenantSessionPolicy(undefined);
      expect(result).toEqual(DEFAULT_TENANT_SESSION_POLICY);
    });

    it('should return defaults when tenant settings are empty', () => {
      const result = resolveTenantSessionPolicy({});
      expect(result).toEqual(DEFAULT_TENANT_SESSION_POLICY);
    });

    it('should use custom policy when provided in settings', () => {
      const customSettings = {
        sessionPolicy: {
          idleTimeoutMinutes: TEST_CONSTANTS.IDLE_TIMEOUT_MINUTES * 2,
          absoluteTimeoutMinutes: TEST_CONSTANTS.ABSOLUTE_TIMEOUT_MINUTES,
        },
      };

      const result = resolveTenantSessionPolicy(customSettings);
      expect(result.idleTimeoutMinutes).toBe(TEST_CONSTANTS.IDLE_TIMEOUT_MINUTES * 2);
      expect(result.absoluteTimeoutMinutes).toBe(TEST_CONSTANTS.ABSOLUTE_TIMEOUT_MINUTES);
      expect(result.maxConcurrentSessionsPerUser).toBe(
        DEFAULT_TENANT_SESSION_POLICY.maxConcurrentSessionsPerUser,
      );
    });

    it('should merge partial custom settings with defaults', () => {
      const customSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: 10,
        },
      };

      const result = resolveTenantSessionPolicy(customSettings);
      expect(result.maxConcurrentSessionsPerUser).toBe(10);
      expect(result.idleTimeoutMinutes).toBe(DEFAULT_TENANT_SESSION_POLICY.idleTimeoutMinutes);
    });
  });

  describe('evaluateSessionTimeouts', () => {
    it('should return active for fresh session within timeouts', () => {
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.THIRTY_MINUTES_MS);
      const lastActiveAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.FIVE_MINUTES_MS);

      const result = evaluateSessionTimeouts(
        sessionCreatedAt,
        lastActiveAt,
        DEFAULT_TENANT_SESSION_POLICY,
      );

      expect(result.allowed).toBe(true);
      expect(result.outcome).toBe(SessionOutcome.ACTIVE);
      expect(result.idleTimeoutExpired).toBe(false);
      expect(result.absoluteTimeoutExpired).toBe(false);
    });

    it('should return expired with idle timeout when idle too long', () => {
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.ONE_HOUR_MS);
      const lastActiveAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.FORTY_FIVE_MINUTES_MS);

      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, idleTimeoutMinutes: 30 };

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.EXPIRED);
      expect(result.reason).toBe(SessionRevocationReason.IDLE_TIMEOUT);
      expect(result.idleTimeoutExpired).toBe(true);
    });

    it('should return expired with absolute timeout when session too old', () => {
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.TWENTY_FIVE_HOURS_MS);
      const lastActiveAt = new Date(FIXED_NOW.getTime());

      const policy = {
        ...DEFAULT_TENANT_SESSION_POLICY,
        absoluteTimeoutMinutes: TEST_CONSTANTS.ABSOLUTE_TIMEOUT_MINUTES,
      };

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.EXPIRED);
      expect(result.reason).toBe(SessionRevocationReason.ABSOLUTE_TIMEOUT);
      expect(result.absoluteTimeoutExpired).toBe(true);
    });

    it('should return active at exact idle timeout boundary', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, idleTimeoutMinutes: 30 };
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.ONE_HOUR_MS);
      const lastActiveAt = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000);

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(true);
      expect(result.outcome).toBe(SessionOutcome.ACTIVE);
      expect(result.reason).toBeUndefined();
    });

    it('should return active at exact idle timeout boundary - 1ms before', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, idleTimeoutMinutes: 30 };
      const sessionCreatedAt = new Date(FIXED_NOW.getTime() - TEST_CONSTANTS.ONE_HOUR_MS);
      const lastActiveAt = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000 + 1);

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(true);
      expect(result.outcome).toBe(SessionOutcome.ACTIVE);
    });
  });

  describe('evaluateConcurrentSessions', () => {
    it('should allow session when under limit', () => {
      const result = evaluateConcurrentSessions(3, DEFAULT_TENANT_SESSION_POLICY);

      expect(result.allowed).toBe(true);
      expect(result.currentSessionCount).toBe(3);
      expect(result.maxSessions).toBe(TEST_CONSTANTS.MAX_CONCURRENT_SESSIONS);
    });

    it('should allow session when currentSessionCount is zero', () => {
      const result = evaluateConcurrentSessions(0, DEFAULT_TENANT_SESSION_POLICY);

      expect(result.allowed).toBe(true);
      expect(result.currentSessionCount).toBe(0);
    });

    it('should deny session when at limit', () => {
      const result = evaluateConcurrentSessions(5, DEFAULT_TENANT_SESSION_POLICY);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.POLICY_DENIED);
      expect(result.reason).toBe(SessionRevocationReason.CONCURRENT_SESSION);
    });

    it('should deny all sessions when maxConcurrentSessionsPerUser is 0', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, maxConcurrentSessionsPerUser: 0 };

      const result = evaluateConcurrentSessions(0, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.POLICY_DENIED);
      expect(result.reason).toBe(SessionRevocationReason.CONCURRENT_SESSION);
    });

    it('should allow exactly at limit boundary', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, maxConcurrentSessionsPerUser: 3 };
      const result = evaluateConcurrentSessions(2, policy);

      expect(result.allowed).toBe(true);
    });

    it('should deny at limit boundary (current equals max)', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, maxConcurrentSessionsPerUser: 3 };
      const result = evaluateConcurrentSessions(3, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.POLICY_DENIED);
    });

    it('should allow unlimited sessions when maxConcurrentSessionsPerUser is null', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, maxConcurrentSessionsPerUser: null };

      const result = evaluateConcurrentSessions(100, policy);

      expect(result.allowed).toBe(true);
    });
  });

  describe('validateSessionBinding', () => {
    it('should allow when binding mode is none', () => {
      const policy = {
        ...DEFAULT_TENANT_SESSION_POLICY,
        sessionBindingMode: SessionBindingMode.NONE,
      };
      const original = { ipAddress: '192.168.1.1', deviceFingerprint: 'abc123' };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: 'xyz789' };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(false);
    });

    it('should detect IP binding violation', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, sessionBindingMode: SessionBindingMode.IP };
      const original = { ipAddress: '192.168.1.1', deviceFingerprint: null };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: null };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(true);
      expect(result.violations).toContain('ip');
    });

    it('should detect device binding violation', () => {
      const policy = {
        ...DEFAULT_TENANT_SESSION_POLICY,
        sessionBindingMode: SessionBindingMode.DEVICE,
      };
      const original = { ipAddress: null, deviceFingerprint: 'abc123' };
      const current = { ipAddress: null, deviceFingerprint: 'xyz789' };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(true);
      expect(result.violations).toContain('device');
    });

    it('should detect both IP and device binding violations', () => {
      const policy = {
        ...DEFAULT_TENANT_SESSION_POLICY,
        sessionBindingMode: SessionBindingMode.IP_DEVICE,
      };
      const original = { ipAddress: '192.168.1.1', deviceFingerprint: 'abc123' };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: 'xyz789' };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(true);
      expect(result.violations).toContain('ip');
      expect(result.violations).toContain('device');
    });

    it('should allow when no original context', () => {
      const policy = { ...DEFAULT_TENANT_SESSION_POLICY, sessionBindingMode: SessionBindingMode.IP };
      const original = { ipAddress: null, deviceFingerprint: null };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: null };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(false);
    });
  });

  describe('getNextIdleTimeout', () => {
    it('should return correct next idle timeout date', () => {
      const lastActiveAt = TEST_CONSTANTS.FIXED_LATE_TEST_DATE;
      const nextTimeout = getNextIdleTimeout(lastActiveAt, TEST_CONSTANTS.IDLE_TIMEOUT_MINUTES);

      expect(nextTimeout.getTime()).toBe(lastActiveAt.getTime() + TEST_CONSTANTS.THIRTY_MINUTES_MS);
    });
  });

  describe('defaultSessionPolicy', () => {
    it('should have correct default max session duration (30 days)', () => {
      expect(defaultSessionPolicy.maxSessionDurationMs).toBe(
        TEST_CONSTANTS.DEFAULT_SESSION_DURATION_MS,
      );
    });

    it('should be refreshable by default', () => {
      expect(defaultSessionPolicy.refreshable).toBe(true);
    });
  });
});
