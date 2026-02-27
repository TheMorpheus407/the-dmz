import { describe, expect, it } from 'vitest';

import { m1AuthEventContracts } from '@the-dmz/shared/contracts';

import {
  AUTH_EVENTS,
  createAuthLoginFailedEvent,
  createAuthSessionCreatedEvent,
  createAuthSessionRevokedEvent,
  createAuthUserCreatedEvent,
  createAuthUserDeactivatedEvent,
  createAuthUserUpdatedEvent,
  createAuthAccountLockedEvent,
  createAuthAccountUnlockedEvent,
  createAuthNewDeviceSessionEvent,
  createAuthMfaEnabledEvent,
  createAuthMfaDisabledEvent,
  createAuthMfaRecoveryCodesUsedEvent,
} from '../auth.events.js';

const BASE_PARAMS = {
  source: 'auth-module',
  correlationId: 'test-correlation-id',
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  version: 1,
};

describe('event contract parity: auth events', () => {
  for (const contract of m1AuthEventContracts) {
    describe(contract.eventType, () => {
      it('has matching event type', () => {
        const event = createTestEvent(contract.eventType);
        expect(event.eventType).toBe(contract.eventType);
      });

      it('has correct version', () => {
        const event = createTestEvent(contract.eventType);
        expect(event.version).toBe(contract.version);
      });

      it('has all required metadata fields', () => {
        const event = createTestEvent(contract.eventType);
        for (const field of contract.requiredMetadataFields) {
          expect(event).toHaveProperty(field);
        }
      });

      it('has all required payload fields', () => {
        const event = createTestEvent(contract.eventType);
        for (const field of contract.requiredPayloadFields) {
          expect(event.payload).toHaveProperty(field);
        }
      });

      it('has no forbidden payload fields', () => {
        const event = createTestEvent(contract.eventType);
        for (const field of contract.forbiddenPayloadFields) {
          expect(event.payload).not.toHaveProperty(field);
        }
      });

      it('metadata fields are not null or undefined', () => {
        const event = createTestEvent(contract.eventType);
        expect(event.eventId).toBeDefined();
        expect(event.eventType).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.correlationId).toBeDefined();
        expect(event.tenantId).toBeDefined();
        expect(event.userId).toBeDefined();
        expect(event.source).toBeDefined();
        expect(event.version).toBeDefined();
        expect(event.payload).toBeDefined();
      });

      it('timestamp is valid ISO 8601 format', () => {
        const event = createTestEvent(contract.eventType);
        const date = new Date(event.timestamp);
        expect(date.getTime()).not.toBeNaN();
      });
    });
  }

  it('covers all M1 auth event contracts', () => {
    const definedEvents = [
      AUTH_EVENTS.USER_CREATED,
      AUTH_EVENTS.USER_UPDATED,
      AUTH_EVENTS.USER_DEACTIVATED,
      AUTH_EVENTS.SESSION_CREATED,
      AUTH_EVENTS.SESSION_REVOKED,
      AUTH_EVENTS.LOGIN_FAILED,
    ];

    for (const eventType of definedEvents) {
      expect(m1AuthEventContracts.some((c) => c.eventType === eventType)).toBe(true);
    }
  });
});

function createTestEvent(eventType: string) {
  const basePayload = {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
  };

  switch (eventType) {
    case 'auth.user.created':
      return createAuthUserCreatedEvent({
        ...BASE_PARAMS,
        payload: { ...basePayload, email: 'test@example.com' },
      });

    case 'auth.user.updated':
      return createAuthUserUpdatedEvent({
        ...BASE_PARAMS,
        payload: {
          ...basePayload,
          email: 'test@example.com',
          changes: ['email'],
        },
      });

    case 'auth.user.deactivated':
      return createAuthUserDeactivatedEvent({
        ...BASE_PARAMS,
        payload: { ...basePayload, email: 'test@example.com' },
      });

    case 'auth.session.created':
      return createAuthSessionCreatedEvent({
        ...BASE_PARAMS,
        payload: { ...basePayload, sessionId: 'test-session-id' },
      });

    case 'auth.session.revoked':
      return createAuthSessionRevokedEvent({
        ...BASE_PARAMS,
        payload: {
          ...basePayload,
          sessionId: 'test-session-id',
          reason: 'logout',
        },
      });

    case 'auth.login.failed':
      return createAuthLoginFailedEvent({
        ...BASE_PARAMS,
        payload: {
          tenantId: 'test-tenant-id',
          email: 'test@example.com',
          reason: 'invalid_credentials',
          correlationId: 'test-correlation-id',
        },
      });

    case 'auth.account_locked':
      return createAuthAccountLockedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          reason: 'abuse_detection',
          riskContext: { isAnomalous: true },
        },
      });

    case 'auth.account_unlocked':
      return createAuthAccountUnlockedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          reason: 'password_reset_complete',
        },
      });

    case 'auth.new_device_session':
      return createAuthNewDeviceSessionEvent({
        ...BASE_PARAMS,
        payload: {
          sessionId: 'test-session-id',
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          riskContext: { isNewDevice: true, isAnomalous: false },
        },
      });

    case 'auth.mfa_enabled':
      return createAuthMfaEnabledEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          method: 'totp',
        },
      });

    case 'auth.mfa_disabled':
      return createAuthMfaDisabledEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          reason: 'user_request',
        },
      });

    case 'auth.mfa_recovery_codes_used':
      return createAuthMfaRecoveryCodesUsedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'test-user-id',
          email: 'test@example.com',
          tenantId: 'test-tenant-id',
          riskContext: { ipAddress: '192.168.1.1' },
        },
      });

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}
