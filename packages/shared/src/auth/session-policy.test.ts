import { describe, it, expect } from 'vitest';

import {
  SessionOutcome,
  SessionRevocationReason,
  type TenantSessionPolicy,
  defaultTenantSessionPolicy,
  tenantSessionPolicySchema,
  SessionBindingMode,
  ConcurrentSessionStrategy,
  SESSION_POLICY_DEFAULTS,
  SessionOutcomeStatusCode,
  SessionOutcomeMessages,
  SessionRevocationReasonMessages,
  getStatusCodeForSessionOutcome,
  getMessageForSessionOutcome,
  getMessageForRevocationReason,
} from './session-policy.js';

describe('session-policy', () => {
  describe('TenantSessionPolicy', () => {
    describe('default values', () => {
      it('should have correct default idle timeout', () => {
        expect(defaultTenantSessionPolicy.idleTimeoutMinutes).toBe(
          SESSION_POLICY_DEFAULTS.IDLE_TIMEOUT_MINUTES,
        );
      });

      it('should have correct default absolute timeout', () => {
        expect(defaultTenantSessionPolicy.absoluteTimeoutMinutes).toBe(
          SESSION_POLICY_DEFAULTS.ABSOLUTE_TIMEOUT_MINUTES,
        );
      });

      it('should have correct default max concurrent sessions', () => {
        expect(defaultTenantSessionPolicy.maxConcurrentSessionsPerUser).toBe(
          SESSION_POLICY_DEFAULTS.MAX_CONCURRENT_SESSIONS,
        );
      });

      it('should have default session binding mode as none', () => {
        expect(defaultTenantSessionPolicy.sessionBindingMode).toBe(SessionBindingMode.NONE);
      });

      it('should have force logout on password change enabled by default', () => {
        expect(defaultTenantSessionPolicy.forceLogoutOnPasswordChange).toBe(true);
      });

      it('should have force logout on role change disabled by default', () => {
        expect(defaultTenantSessionPolicy.forceLogoutOnRoleChange).toBe(false);
      });

      it('should have default concurrent session strategy as revoke oldest', () => {
        expect(defaultTenantSessionPolicy.concurrentSessionStrategy).toBe(
          ConcurrentSessionStrategy.REVOKE_OLDEST,
        );
      });
    });

    describe('tenantSessionPolicySchema validation', () => {
      it('should validate a correct policy', () => {
        const policy: TenantSessionPolicy = {
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 1440,
          maxConcurrentSessionsPerUser: 5,
          sessionBindingMode: SessionBindingMode.IP,
          forceLogoutOnPasswordChange: true,
          forceLogoutOnRoleChange: false,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REVOKE_OLDEST,
        };

        const result = tenantSessionPolicySchema.safeParse(policy);
        expect(result.success).toBe(true);
      });

      it('should reject idle timeout below minimum', () => {
        const policy = {
          ...defaultTenantSessionPolicy,
          idleTimeoutMinutes: 1,
        };

        const result = tenantSessionPolicySchema.safeParse(policy);
        expect(result.success).toBe(false);
      });

      it('should reject idle timeout above maximum', () => {
        const policy = {
          ...defaultTenantSessionPolicy,
          idleTimeoutMinutes: 1000,
        };

        const result = tenantSessionPolicySchema.safeParse(policy);
        expect(result.success).toBe(false);
      });

      it('should reject invalid session binding mode', () => {
        const policy = {
          ...defaultTenantSessionPolicy,
          sessionBindingMode: 'invalid',
        };

        const result = tenantSessionPolicySchema.safeParse(policy);
        expect(result.success).toBe(false);
      });

      it('should allow null for maxConcurrentSessionsPerUser (unlimited)', () => {
        const policy = {
          ...defaultTenantSessionPolicy,
          maxConcurrentSessionsPerUser: null,
        };

        const result = tenantSessionPolicySchema.safeParse(policy);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('getStatusCodeForSessionOutcome', () => {
    it('should return 200 for ACTIVE outcome', () => {
      expect(getStatusCodeForSessionOutcome(SessionOutcome.ACTIVE)).toBe(200);
    });

    it('should return 401 for EXPIRED outcome', () => {
      expect(getStatusCodeForSessionOutcome(SessionOutcome.EXPIRED)).toBe(401);
    });

    it('should return 401 for REVOKED outcome', () => {
      expect(getStatusCodeForSessionOutcome(SessionOutcome.REVOKED)).toBe(401);
    });

    it('should return 403 for POLICY_DENIED outcome', () => {
      expect(getStatusCodeForSessionOutcome(SessionOutcome.POLICY_DENIED)).toBe(403);
    });
  });

  describe('getMessageForSessionOutcome', () => {
    it('should return correct message for ACTIVE outcome', () => {
      const msg = getMessageForSessionOutcome(SessionOutcome.ACTIVE);
      expect(msg.title).toBe('Session Active');
      expect(msg.message).toBe('Your session is valid.');
    });

    it('should return correct message for EXPIRED outcome', () => {
      const msg = getMessageForSessionOutcome(SessionOutcome.EXPIRED);
      expect(msg.title).toBe('Session Expired');
      expect(msg.message).toBe('Your session has expired. Please sign in again.');
    });

    it('should return correct message for REVOKED outcome', () => {
      const msg = getMessageForSessionOutcome(SessionOutcome.REVOKED);
      expect(msg.title).toBe('Session Revoked');
      expect(msg.message).toBe('Your session has been revoked. Please sign in again.');
    });

    it('should return correct message for POLICY_DENIED outcome', () => {
      const msg = getMessageForSessionOutcome(SessionOutcome.POLICY_DENIED);
      expect(msg.title).toBe('Session Denied');
      expect(msg.message).toBe('Your session does not meet the required policy for this resource.');
    });
  });

  describe('getMessageForRevocationReason', () => {
    it('should return correct message for USER_LOGOUT reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.USER_LOGOUT);
      expect(msg.title).toBe('Logged Out');
      expect(msg.message).toBe('You have been logged out.');
    });

    it('should return correct message for TENANT_SUSPENDED reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.TENANT_SUSPENDED);
      expect(msg.title).toBe('Tenant Suspended');
      expect(msg.message).toBe('Your tenant has been suspended. Please contact support.');
    });

    it('should return correct message for TENANT_DEACTIVATED reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.TENANT_DEACTIVATED);
      expect(msg.title).toBe('Tenant Deactivated');
      expect(msg.message).toBe('Your tenant has been deactivated. Please contact support.');
    });

    it('should return correct message for SESSION_EXPIRED reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.SESSION_EXPIRED);
      expect(msg.title).toBe('Session Expired');
      expect(msg.message).toBe('Your session has exceeded its maximum duration.');
    });

    it('should return correct message for CONCURRENT_SESSION reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.CONCURRENT_SESSION);
      expect(msg.title).toBe('Concurrent Session Limit');
      expect(msg.message).toBe('You have reached the maximum number of concurrent sessions.');
    });

    it('should return correct message for IDLE_TIMEOUT reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.IDLE_TIMEOUT);
      expect(msg.title).toBe('Session Idle Timeout');
      expect(msg.message).toBe(
        'Your session has been inactive for too long. Please sign in again.',
      );
    });

    it('should return correct message for ABSOLUTE_TIMEOUT reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.ABSOLUTE_TIMEOUT);
      expect(msg.title).toBe('Session Expired');
      expect(msg.message).toBe(
        'Your session has exceeded its maximum lifetime. Please sign in again.',
      );
    });

    it('should return correct message for PASSWORD_CHANGED reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.PASSWORD_CHANGED);
      expect(msg.title).toBe('Session Revoked');
      expect(msg.message).toBe('Your session was revoked due to a password change.');
    });

    it('should return correct message for ROLE_CHANGED reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.ROLE_CHANGED);
      expect(msg.title).toBe('Session Revoked');
      expect(msg.message).toBe('Your session was revoked due to a role change.');
    });

    it('should return correct message for SESSION_BINDING_VIOLATION reason', () => {
      const msg = getMessageForRevocationReason(SessionRevocationReason.SESSION_BINDING_VIOLATION);
      expect(msg.title).toBe('Session Binding Violation');
      expect(msg.message).toBe('Your session context has changed. Please sign in again.');
    });
  });
});
