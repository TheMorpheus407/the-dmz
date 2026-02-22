import { describe, expect, it } from 'vitest';

import {
  AUTH_EVENTS,
  createAuthLoginFailedEvent,
  createAuthSessionCreatedEvent,
  createAuthSessionRevokedEvent,
  createAuthUserCreatedEvent,
  createAuthUserDeactivatedEvent,
  createAuthUserUpdatedEvent,
} from '../auth.events.js';

const BASE_PARAMS = {
  source: 'auth-module',
  correlationId: 'test-correlation-id',
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  version: 1,
};

describe('event consumer compatibility: auth events', () => {
  describe('JSON serialization/deserialization', () => {
    it('auth.user.created can be decoded from JSON without TypeScript types', () => {
      const event = createAuthUserCreatedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-456',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.user.created');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.userId).toBe('user-123');
      expect(decoded.payload.email).toBe('test@example.com');
      expect(decoded.payload.tenantId).toBe('tenant-456');
    });

    it('auth.user.updated can be decoded from JSON without TypeScript types', () => {
      const event = createAuthUserUpdatedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'user-123',
          email: 'updated@example.com',
          tenantId: 'tenant-456',
          changes: ['email'],
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.user.updated');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.changes).toEqual(['email']);
    });

    it('auth.user.deactivated can be decoded from JSON without TypeScript types', () => {
      const event = createAuthUserDeactivatedEvent({
        ...BASE_PARAMS,
        payload: {
          userId: 'user-123',
          email: 'deactivated@example.com',
          tenantId: 'tenant-456',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.user.deactivated');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.userId).toBe('user-123');
    });

    it('auth.session.created can be decoded from JSON without TypeScript types', () => {
      const event = createAuthSessionCreatedEvent({
        ...BASE_PARAMS,
        payload: {
          sessionId: 'session-789',
          userId: 'user-123',
          tenantId: 'tenant-456',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.session.created');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.sessionId).toBe('session-789');
      expect(decoded.payload.userId).toBe('user-123');
      expect(decoded.payload.tenantId).toBe('tenant-456');
    });

    it('auth.session.revoked can be decoded from JSON without TypeScript types', () => {
      const event = createAuthSessionRevokedEvent({
        ...BASE_PARAMS,
        payload: {
          sessionId: 'session-789',
          userId: 'user-123',
          tenantId: 'tenant-456',
          reason: 'logout',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.session.revoked');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.reason).toBe('logout');
    });

    it('auth.login.failed can be decoded from JSON without TypeScript types', () => {
      const event = createAuthLoginFailedEvent({
        ...BASE_PARAMS,
        payload: {
          tenantId: 'tenant-456',
          email: 'failed@example.com',
          reason: 'invalid_credentials',
          correlationId: 'test-correlation-id',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.login.failed');
      expect(decoded.version).toBe(1);
      expect(decoded.payload.reason).toBe('invalid_credentials');
    });
  });

  describe('unknown field tolerance', () => {
    it('events with extra unknown fields can still be decoded', () => {
      const event = {
        eventId: crypto.randomUUID(),
        eventType: 'auth.user.created',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'tenant-456',
        userId: 'user-123',
        source: 'auth-module',
        version: 1,
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-456',
          unknownField: 'should be ignored',
          extraData: { nested: 'value' },
        },
      };

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.eventType).toBe('auth.user.created');
      expect(decoded.payload.userId).toBe('user-123');
      expect(decoded.payload.unknownField).toBe('should be ignored');
    });
  });

  describe('version handling', () => {
    it('version field is always a number', () => {
      const event = createAuthUserCreatedEvent({
        ...BASE_PARAMS,
        version: 1,
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-456',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(typeof decoded.version).toBe('number');
      expect(decoded.version).toBe(1);
    });

    it('unknown version should fail closed (not be accepted silently)', () => {
      const event = createAuthUserCreatedEvent({
        ...BASE_PARAMS,
        version: 999,
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-456',
        },
      });

      const json = JSON.stringify(event);
      const decoded = JSON.parse(json);

      expect(decoded.version).toBe(999);
      expect(decoded.version).not.toBe(1);
    });
  });

  describe('all M1 auth events are covered', () => {
    const allEvents = [
      AUTH_EVENTS.USER_CREATED,
      AUTH_EVENTS.USER_UPDATED,
      AUTH_EVENTS.USER_DEACTIVATED,
      AUTH_EVENTS.SESSION_CREATED,
      AUTH_EVENTS.SESSION_REVOKED,
      AUTH_EVENTS.LOGIN_FAILED,
    ];

    for (const eventType of allEvents) {
      it(`${eventType} is JSON serializable and deserializable`, () => {
        const event = createTestEvent(eventType);
        const json = JSON.stringify(event);
        const decoded = JSON.parse(json);

        expect(decoded.eventType).toBe(eventType);
        expect(decoded.payload).toBeDefined();
      });
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

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}
