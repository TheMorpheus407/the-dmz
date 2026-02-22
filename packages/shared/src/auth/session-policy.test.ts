import { describe, it, expect } from 'vitest';

import {
  SessionOutcome,
  SessionRevocationReason,
  evaluateSessionPolicy,
  getSessionPolicyForRole,
  canRefreshSession,
  getSessionExpiryDate,
  roleBasedSessionPolicies,
  defaultSessionPolicy,
} from './session-policy.js';
import { Role } from './access-policy.js';

describe('session-policy', () => {
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

  describe('evaluateSessionPolicy', () => {
    it('should return active outcome for valid session', () => {
      const sessionCreatedAt = new Date();
      const result = evaluateSessionPolicy(sessionCreatedAt, Role.LEARNER, null, 'active');

      expect(result.allowed).toBe(true);
      expect(result.outcome).toBe(SessionOutcome.ACTIVE);
    });

    it('should return expired outcome when session exceeds max duration', () => {
      const sessionCreatedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const result = evaluateSessionPolicy(sessionCreatedAt, Role.LEARNER, null, 'active');

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.EXPIRED);
      expect(result.reason).toBe(SessionRevocationReason.SESSION_EXPIRED);
    });

    it('should return revoked outcome when session is revoked', () => {
      const sessionCreatedAt = new Date();
      const revokedAt = new Date(Date.now() - 1000);
      const result = evaluateSessionPolicy(sessionCreatedAt, Role.LEARNER, revokedAt, 'active');

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.REVOKED);
    });

    it('should return policy_denied for non-refreshable role after some time', () => {
      const sessionCreatedAt = new Date(Date.now() - 60 * 60 * 1000);
      const result = evaluateSessionPolicy(sessionCreatedAt, Role.SUPER_ADMIN, null, 'active');

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.POLICY_DENIED);
      expect(result.refreshable).toBe(false);
    });

    it('should return revoked with tenant_suspended reason for suspended tenant', () => {
      const sessionCreatedAt = new Date();
      const revokedAt = new Date(Date.now() - 1000);
      const result = evaluateSessionPolicy(sessionCreatedAt, Role.LEARNER, revokedAt, 'suspended');

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.REVOKED);
      expect(result.reason).toBe(SessionRevocationReason.TENANT_SUSPENDED);
    });

    it('should return revoked with tenant_deactivated reason for deactivated tenant', () => {
      const sessionCreatedAt = new Date();
      const revokedAt = new Date(Date.now() - 1000);
      const result = evaluateSessionPolicy(
        sessionCreatedAt,
        Role.LEARNER,
        revokedAt,
        'deactivated',
      );

      expect(result.allowed).toBe(false);
      expect(result.outcome).toBe(SessionOutcome.REVOKED);
      expect(result.reason).toBe(SessionRevocationReason.TENANT_DEACTIVATED);
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
});
