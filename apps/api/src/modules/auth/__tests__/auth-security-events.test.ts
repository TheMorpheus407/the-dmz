import { describe, expect, it } from 'vitest';

import {
  AUTH_EVENTS,
  createAuthAccountLockedEvent,
  createAuthAccountUnlockedEvent,
  createAuthNewDeviceSessionEvent,
  createAuthMfaEnabledEvent,
  createAuthMfaDisabledEvent,
  createAuthMfaRecoveryCodesUsedEvent,
} from '../auth.events.js';

describe('Auth Security Events', () => {
  const baseParams = {
    source: 'auth-module',
    correlationId: 'test-correlation-id',
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    version: 1,
  };

  describe('createAuthAccountLockedEvent', () => {
    it('creates event with required fields', () => {
      const event = createAuthAccountLockedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'Too many failed attempts',
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.ACCOUNT_LOCKED);
      expect(event.payload.userId).toBe('user-1');
      expect(event.payload.email).toBe('test@example.com');
      expect(event.payload.tenantId).toBe('tenant-1');
      expect(event.payload.reason).toBe('Too many failed attempts');
      expect(event.tenantId).toBe(baseParams.tenantId);
      expect(event.userId).toBe(baseParams.userId);
    });

    it('includes optional risk context', () => {
      const event = createAuthAccountLockedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'Suspicious activity',
          riskContext: {
            ipAddress: '192.168.1.1',
            isAnomalous: true,
          },
        },
      });

      expect(event.payload.riskContext).toBeDefined();
      expect(event.payload.riskContext?.ipAddress).toBe('192.168.1.1');
      expect(event.payload.riskContext?.isAnomalous).toBe(true);
    });
  });

  describe('createAuthAccountUnlockedEvent', () => {
    it('creates event with required fields', () => {
      const event = createAuthAccountUnlockedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'Admin unlock',
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.ACCOUNT_UNLOCKED);
      expect(event.payload.userId).toBe('user-1');
      expect(event.payload.email).toBe('test@example.com');
      expect(event.payload.tenantId).toBe('tenant-1');
    });
  });

  describe('createAuthNewDeviceSessionEvent', () => {
    it('creates event with required fields', () => {
      const event = createAuthNewDeviceSessionEvent({
        ...baseParams,
        payload: {
          sessionId: 'session-1',
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          riskContext: {
            isNewDevice: true,
            deviceFingerprint: 'fp-123',
          },
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.NEW_DEVICE_SESSION);
      expect(event.payload.sessionId).toBe('session-1');
      expect(event.payload.userId).toBe('user-1');
      expect(event.payload.riskContext.isNewDevice).toBe(true);
    });

    it('includes location in risk context', () => {
      const event = createAuthNewDeviceSessionEvent({
        ...baseParams,
        payload: {
          sessionId: 'session-1',
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          riskContext: {
            isNewDevice: true,
            location: 'US-CA',
          },
        },
      });

      expect(event.payload.riskContext?.location).toBe('US-CA');
    });
  });

  describe('createAuthMfaEnabledEvent', () => {
    it('creates event with totp method', () => {
      const event = createAuthMfaEnabledEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          method: 'totp',
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.MFA_ENABLED);
      expect(event.payload.method).toBe('totp');
    });

    it('creates event with webauthn method', () => {
      const event = createAuthMfaEnabledEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          method: 'webauthn',
        },
      });

      expect(event.payload.method).toBe('webauthn');
    });
  });

  describe('createAuthMfaDisabledEvent', () => {
    it('creates event with user_request reason', () => {
      const event = createAuthMfaDisabledEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'user_request',
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.MFA_DISABLED);
      expect(event.payload.reason).toBe('user_request');
    });

    it('creates event with compromised reason', () => {
      const event = createAuthMfaDisabledEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'compromised',
        },
      });

      expect(event.payload.reason).toBe('compromised');
    });
  });

  describe('createAuthMfaRecoveryCodesUsedEvent', () => {
    it('creates event with required fields', () => {
      const event = createAuthMfaRecoveryCodesUsedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
        },
      });

      expect(event.eventType).toBe(AUTH_EVENTS.MFA_RECOVERY_CODES_USED);
      expect(event.payload.userId).toBe('user-1');
      expect(event.payload.email).toBe('test@example.com');
    });

    it('includes optional risk context', () => {
      const event = createAuthMfaRecoveryCodesUsedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          riskContext: {
            ipAddress: '10.0.0.1',
          },
        },
      });

      expect(event.payload.riskContext).toBeDefined();
      expect(event.payload.riskContext?.ipAddress).toBe('10.0.0.1');
    });
  });

  describe('event payload security', () => {
    it('does not include sensitive fields in account_locked payload', () => {
      const event = createAuthAccountLockedEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          reason: 'test',
        },
      });

      const payloadStr = JSON.stringify(event.payload);
      expect(payloadStr).not.toContain('password');
      expect(payloadStr).not.toContain('token');
      expect(payloadStr).not.toContain('secret');
    });

    it('does not include sensitive fields in new_device_session payload', () => {
      const event = createAuthNewDeviceSessionEvent({
        ...baseParams,
        payload: {
          sessionId: 'session-1',
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          riskContext: {
            isNewDevice: true,
          },
        },
      });

      const payloadStr = JSON.stringify(event.payload);
      expect(payloadStr).not.toContain('accessToken');
      expect(payloadStr).not.toContain('refreshToken');
    });

    it('does not include mfa secrets in mfa_enabled payload', () => {
      const event = createAuthMfaEnabledEvent({
        ...baseParams,
        payload: {
          userId: 'user-1',
          email: 'test@example.com',
          tenantId: 'tenant-1',
          method: 'totp',
        },
      });

      const payloadStr = JSON.stringify(event.payload);
      expect(payloadStr).not.toContain('mfaSecret');
      expect(payloadStr).not.toContain('mfaBackupCodes');
    });
  });
});
