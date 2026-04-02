import { describe, it, expect } from 'vitest';

import {
  SessionOutcome,
  SessionRevocationReason,
  type TenantSessionPolicy,
  defaultTenantSessionPolicy,
  SessionBindingMode,
  ConcurrentSessionStrategy,
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

describe('session-policy.service', () => {
  describe('roleBasedSessionPolicies', () => {
    it('should have a policy for super_admin with 4 hour max duration and no refresh', () => {
      const superAdminPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.SUPER_ADMIN);
      expect(superAdminPolicy).toBeDefined();
      expect(superAdminPolicy!.policy.maxSessionDurationMs).toBe(4 * 60 * 60 * 1000);
      expect(superAdminPolicy!.policy.refreshable).toBe(false);
    });

    it('should have a policy for tenant_admin with 8 hour max duration', () => {
      const tenantAdminPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.TENANT_ADMIN);
      expect(tenantAdminPolicy).toBeDefined();
      expect(tenantAdminPolicy!.policy.maxSessionDurationMs).toBe(8 * 60 * 60 * 1000);
      expect(tenantAdminPolicy!.policy.refreshable).toBe(true);
    });

    it('should have a policy for manager with 24 hour max duration', () => {
      const managerPolicy = roleBasedSessionPolicies.find((p) => p.role === Role.MANAGER);
      expect(managerPolicy).toBeDefined();
      expect(managerPolicy!.policy.maxSessionDurationMs).toBe(24 * 60 * 60 * 1000);
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
      expect(policy.maxSessionDurationMs).toBe(4 * 60 * 60 * 1000);
      expect(policy.refreshable).toBe(false);
    });

    it('should return tenant_admin policy for tenant_admin role', () => {
      const policy = getSessionPolicyForRole(Role.TENANT_ADMIN);
      expect(policy.maxSessionDurationMs).toBe(8 * 60 * 60 * 1000);
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
      const sessionCreatedAt = new Date(Date.now() - 60 * 60 * 1000);
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(true);
    });

    it('should return false for non-refreshable role (super_admin)', () => {
      const sessionCreatedAt = new Date();
      const result = canRefreshSession(sessionCreatedAt, Role.SUPER_ADMIN);
      expect(result).toBe(false);
    });

    it('should return false for session exceeding max duration', () => {
      const sessionCreatedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const result = canRefreshSession(sessionCreatedAt, Role.LEARNER);
      expect(result).toBe(false);
    });

    it('should return false for unknown role exceeding default duration', () => {
      const sessionCreatedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const result = canRefreshSession(sessionCreatedAt, 'unknown_role');
      expect(result).toBe(false);
    });
  });

  describe('getSessionExpiryDate', () => {
    it('should return correct expiry for super_admin role', () => {
      const sessionCreatedAt = new Date('2024-01-01T00:00:00Z');
      const expiry = getSessionExpiryDate(sessionCreatedAt, Role.SUPER_ADMIN);

      expect(expiry.getTime()).toBe(sessionCreatedAt.getTime() + 4 * 60 * 60 * 1000);
    });

    it('should return correct expiry for tenant_admin role', () => {
      const sessionCreatedAt = new Date('2024-01-01T00:00:00Z');
      const expiry = getSessionExpiryDate(sessionCreatedAt, Role.TENANT_ADMIN);

      expect(expiry.getTime()).toBe(sessionCreatedAt.getTime() + 8 * 60 * 60 * 1000);
    });

    it('should return correct expiry for default role', () => {
      const sessionCreatedAt = new Date('2024-01-01T00:00:00Z');
      const expiry = getSessionExpiryDate(sessionCreatedAt, undefined);

      expect(expiry.getTime()).toBe(
        sessionCreatedAt.getTime() + defaultSessionPolicy.maxSessionDurationMs,
      );
    });
  });

  describe('resolveTenantSessionPolicy', () => {
    it('should return defaults when tenant settings are undefined', () => {
      const result = resolveTenantSessionPolicy(undefined);
      expect(result).toEqual(defaultTenantSessionPolicy);
    });

    it('should return defaults when tenant settings are empty', () => {
      const result = resolveTenantSessionPolicy({});
      expect(result).toEqual(defaultTenantSessionPolicy);
    });

    it('should use custom policy when provided in settings', () => {
      const customSettings = {
        sessionPolicy: {
          idleTimeoutMinutes: 60,
          absoluteTimeoutMinutes: 480,
        },
      };

      const result = resolveTenantSessionPolicy(customSettings);
      expect(result.idleTimeoutMinutes).toBe(60);
      expect(result.absoluteTimeoutMinutes).toBe(480);
      expect(result.maxConcurrentSessionsPerUser).toBe(
        defaultTenantSessionPolicy.maxConcurrentSessionsPerUser,
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
      expect(result.idleTimeoutMinutes).toBe(defaultTenantSessionPolicy.idleTimeoutMinutes);
    });
  });

  describe('evaluateSessionTimeouts', () => {
    it('should return active for fresh session within timeouts', () => {
      const sessionCreatedAt = new Date(Date.now() - 30 * 60 * 1000);
      const lastActiveAt = new Date(Date.now() - 5 * 60 * 1000);

      const result = evaluateSessionTimeouts(
        sessionCreatedAt,
        lastActiveAt,
        defaultTenantSessionPolicy,
      );

      expect(result.allowed).toBe(true);
      expect(result.outcome).toBe(SessionOutcome.ACTIVE);
      expect(result.idleTimeoutExpired).toBe(false);
      expect(result.absoluteTimeoutExpired).toBe(false);
    });

    it('should return expired with idle timeout when idle too long', () => {
      const sessionCreatedAt = new Date(Date.now() - 60 * 60 * 1000);
      const lastActiveAt = new Date(Date.now() - 45 * 60 * 1000);

      const policy = { ...defaultTenantSessionPolicy, idleTimeoutMinutes: 30 };

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.EXPIRED);
      expect(result.reason).toBe(SessionRevocationReason.IDLE_TIMEOUT);
      expect(result.idleTimeoutExpired).toBe(true);
    });

    it('should return expired with absolute timeout when session too old', () => {
      const sessionCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const lastActiveAt = new Date();

      const policy = { ...defaultTenantSessionPolicy, absoluteTimeoutMinutes: 24 * 60 };

      const result = evaluateSessionTimeouts(sessionCreatedAt, lastActiveAt, policy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.EXPIRED);
      expect(result.reason).toBe(SessionRevocationReason.ABSOLUTE_TIMEOUT);
      expect(result.absoluteTimeoutExpired).toBe(true);
    });
  });

  describe('evaluateConcurrentSessions', () => {
    it('should allow session when under limit', () => {
      const result = evaluateConcurrentSessions(3, defaultTenantSessionPolicy);

      expect(result.allowed).toBe(true);
      expect(result.currentSessionCount).toBe(3);
      expect(result.maxSessions).toBe(5);
    });

    it('should deny session when at limit', () => {
      const result = evaluateConcurrentSessions(5, defaultTenantSessionPolicy);

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.POLICY_DENIED);
      expect(result.reason).toBe(SessionRevocationReason.CONCURRENT_SESSION);
    });

    it('should allow unlimited sessions when maxConcurrentSessionsPerUser is null', () => {
      const policy = { ...defaultTenantSessionPolicy, maxConcurrentSessionsPerUser: null };

      const result = evaluateConcurrentSessions(100, policy);

      expect(result.allowed).toBe(true);
    });
  });

  describe('validateSessionBinding', () => {
    it('should allow when binding mode is none', () => {
      const policy = {
        ...defaultTenantSessionPolicy,
        sessionBindingMode: SessionBindingMode.NONE,
      };
      const original = { ipAddress: '192.168.1.1', deviceFingerprint: 'abc123' };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: 'xyz789' };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(false);
    });

    it('should detect IP binding violation', () => {
      const policy = { ...defaultTenantSessionPolicy, sessionBindingMode: SessionBindingMode.IP };
      const original = { ipAddress: '192.168.1.1', deviceFingerprint: null };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: null };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(true);
      expect(result.violations).toContain('ip');
    });

    it('should detect device binding violation', () => {
      const policy = {
        ...defaultTenantSessionPolicy,
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
        ...defaultTenantSessionPolicy,
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
      const policy = { ...defaultTenantSessionPolicy, sessionBindingMode: SessionBindingMode.IP };
      const original = { ipAddress: null, deviceFingerprint: null };
      const current = { ipAddress: '10.0.0.1', deviceFingerprint: null };

      const result = validateSessionBinding(policy, original, current);

      expect(result.violated).toBe(false);
    });
  });

  describe('getNextIdleTimeout', () => {
    it('should return correct next idle timeout date', () => {
      const lastActiveAt = new Date('2024-01-01T10:00:00Z');
      const nextTimeout = getNextIdleTimeout(lastActiveAt, 30);

      expect(nextTimeout.getTime()).toBe(lastActiveAt.getTime() + 30 * 60 * 1000);
    });
  });

  describe('defaultSessionPolicy', () => {
    it('should have correct default max session duration (30 days)', () => {
      expect(defaultSessionPolicy.maxSessionDurationMs).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should be refreshable by default', () => {
      expect(defaultSessionPolicy.refreshable).toBe(true);
    });
  });
});
