import { describe, expect, it } from 'vitest';

import {
  AUTH_SECURITY_NOTIFICATION_CONTRACTS,
  AUTH_SECURITY_EVENT_CONTRACT_MAP,
  AuthSecurityEventType,
  AuthSecuritySeverity,
  NotificationDeliveryChannel,
  getContractForEvent,
  isMandatoryNotification,
  getSeverityForEvent,
  AUTH_SECURITY_FORBIDDEN_FIELDS,
} from '../contracts/auth-security-notification.js';

describe('Auth Security Notification Contract', () => {
  describe('contract definitions', () => {
    it('defines all required security event types', () => {
      const expectedTypes = [
        AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        AuthSecurityEventType.PASSWORD_CHANGED,
        AuthSecurityEventType.ACCOUNT_LOCKED,
        AuthSecurityEventType.ACCOUNT_UNLOCKED,
        AuthSecurityEventType.NEW_DEVICE_SESSION,
        AuthSecurityEventType.MFA_ENABLED,
        AuthSecurityEventType.MFA_DISABLED,
        AuthSecurityEventType.MFA_RECOVERY_CODES_USED,
      ];

      for (const eventType of expectedTypes) {
        expect(AUTH_SECURITY_EVENT_CONTRACT_MAP[eventType]).toBeDefined();
      }
    });

    it('defines contracts for all event types in the array', () => {
      for (const contract of AUTH_SECURITY_NOTIFICATION_CONTRACTS) {
        expect(AUTH_SECURITY_EVENT_CONTRACT_MAP[contract.eventType]).toBeDefined();
      }
    });

    it('maps all contract array entries to the map', () => {
      expect(AUTH_SECURITY_NOTIFICATION_CONTRACTS.length).toBe(
        Object.keys(AUTH_SECURITY_EVENT_CONTRACT_MAP).length,
      );
    });
  });

  describe('severity levels', () => {
    it('assigns correct severity to password_reset_requested', () => {
      const contract = getContractForEvent(AuthSecurityEventType.PASSWORD_RESET_REQUESTED);
      expect(contract?.severity).toBe(AuthSecuritySeverity.MEDIUM);
    });

    it('assigns correct severity to password_changed', () => {
      const contract = getContractForEvent(AuthSecurityEventType.PASSWORD_CHANGED);
      expect(contract?.severity).toBe(AuthSecuritySeverity.HIGH);
    });

    it('assigns correct severity to account_locked', () => {
      const contract = getContractForEvent(AuthSecurityEventType.ACCOUNT_LOCKED);
      expect(contract?.severity).toBe(AuthSecuritySeverity.CRITICAL);
    });

    it('assigns correct severity to mfa_recovery_codes_used', () => {
      const contract = getContractForEvent(AuthSecurityEventType.MFA_RECOVERY_CODES_USED);
      expect(contract?.severity).toBe(AuthSecuritySeverity.CRITICAL);
    });

    it('returns correct severity via helper', () => {
      expect(getSeverityForEvent(AuthSecurityEventType.ACCOUNT_LOCKED)).toBe(
        AuthSecuritySeverity.CRITICAL,
      );
    });
  });

  describe('mandatory notifications', () => {
    it('marks account_locked as mandatory', () => {
      expect(isMandatoryNotification(AuthSecurityEventType.ACCOUNT_LOCKED)).toBe(true);
    });

    it('marks account_unlocked as mandatory', () => {
      expect(isMandatoryNotification(AuthSecurityEventType.ACCOUNT_UNLOCKED)).toBe(true);
    });

    it('marks mfa_enabled as mandatory', () => {
      expect(isMandatoryNotification(AuthSecurityEventType.MFA_ENABLED)).toBe(true);
    });

    it('marks password_reset_requested as non-mandatory', () => {
      expect(isMandatoryNotification(AuthSecurityEventType.PASSWORD_RESET_REQUESTED)).toBe(false);
    });
  });

  describe('delivery channels', () => {
    it('assigns email-only to password_reset_requested', () => {
      const contract = getContractForEvent(AuthSecurityEventType.PASSWORD_RESET_REQUESTED);
      expect(contract?.deliveryChannels).toContain(NotificationDeliveryChannel.EMAIL);
      expect(contract?.deliveryChannels).not.toContain(NotificationDeliveryChannel.IN_APP);
    });

    it('assigns email and in-app to high severity events', () => {
      const highSeverityEvents = [
        AuthSecurityEventType.PASSWORD_CHANGED,
        AuthSecurityEventType.ACCOUNT_LOCKED,
        AuthSecurityEventType.NEW_DEVICE_SESSION,
        AuthSecurityEventType.MFA_ENABLED,
        AuthSecurityEventType.MFA_DISABLED,
        AuthSecurityEventType.MFA_RECOVERY_CODES_USED,
      ];

      for (const eventType of highSeverityEvents) {
        const contract = getContractForEvent(eventType);
        expect(contract?.deliveryChannels).toContain(NotificationDeliveryChannel.EMAIL);
        expect(contract?.deliveryChannels).toContain(NotificationDeliveryChannel.IN_APP);
      }
    });
  });

  describe('dedupe and throttle', () => {
    it('has dedupe window for password_reset_requested', () => {
      const contract = getContractForEvent(AuthSecurityEventType.PASSWORD_RESET_REQUESTED);
      expect(contract?.dedupeWindowMs).toBeGreaterThan(0);
    });

    it('has no dedupe for critical events', () => {
      const criticalEvents = [
        AuthSecurityEventType.ACCOUNT_LOCKED,
        AuthSecurityEventType.MFA_RECOVERY_CODES_USED,
      ];

      for (const eventType of criticalEvents) {
        const contract = getContractForEvent(eventType);
        expect(contract?.dedupeWindowMs).toBe(0);
      }
    });

    it('has throttle limits configured', () => {
      for (const contract of AUTH_SECURITY_NOTIFICATION_CONTRACTS) {
        expect(contract.throttleLimit).toBeGreaterThan(0);
        expect(contract.throttleWindowMs).toBeGreaterThan(0);
      }
    });
  });

  describe('forbidden fields', () => {
    it('includes password-related fields', () => {
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('password');
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('passwordHash');
    });

    it('includes token-related fields', () => {
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('accessToken');
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('refreshToken');
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('resetToken');
    });

    it('includes mfa-related fields', () => {
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('mfaSecret');
      expect(AUTH_SECURITY_FORBIDDEN_FIELDS).toContain('mfaBackupCodes');
    });

    it('all contracts forbid sensitive fields', () => {
      for (const contract of AUTH_SECURITY_NOTIFICATION_CONTRACTS) {
        expect(contract.forbiddenPayloadFields).toContain('password');
        expect(contract.forbiddenPayloadFields).toContain('accessToken');
        expect(contract.forbiddenPayloadFields).toContain('refreshToken');
      }
    });
  });

  describe('template categories', () => {
    it('maps each event type to a template category', () => {
      for (const contract of AUTH_SECURITY_NOTIFICATION_CONTRACTS) {
        expect(contract.templateCategory).toBeDefined();
      }
    });
  });

  describe('getContractForEvent', () => {
    it('returns contract for valid event type', () => {
      const contract = getContractForEvent(AuthSecurityEventType.ACCOUNT_LOCKED);
      expect(contract).toBeDefined();
      expect(contract?.eventType).toBe(AuthSecurityEventType.ACCOUNT_LOCKED);
    });

    it('returns undefined for unknown event type', () => {
      const contract = getContractForEvent('unknown' as AuthSecurityEventType);
      expect(contract).toBeUndefined();
    });
  });
});
