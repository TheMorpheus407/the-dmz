import { describe, expect, it } from 'vitest';

import { FORBIDDEN_PAYLOAD_FIELDS } from '@the-dmz/shared/contracts';

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

describe('sensitive data exclusion: auth events', () => {
  const forbiddenFields = [...FORBIDDEN_PAYLOAD_FIELDS];

  describe('auth.user.created', () => {
    const event = createAuthUserCreatedEvent({
      ...BASE_PARAMS,
      payload: {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }

    it('excludes password variations in payload keys', () => {
      const payloadKeys = Object.keys(event.payload);
      const forbiddenPatterns = forbiddenFields.map((f) => f.toLowerCase());

      for (const key of payloadKeys) {
        for (const pattern of forbiddenPatterns) {
          expect(key.toLowerCase()).not.toContain(pattern);
        }
      }
    });
  });

  describe('auth.user.updated', () => {
    const event = createAuthUserUpdatedEvent({
      ...BASE_PARAMS,
      payload: {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
        changes: ['email'],
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }
  });

  describe('auth.user.deactivated', () => {
    const event = createAuthUserDeactivatedEvent({
      ...BASE_PARAMS,
      payload: {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }
  });

  describe('auth.session.created', () => {
    const event = createAuthSessionCreatedEvent({
      ...BASE_PARAMS,
      payload: {
        sessionId: 'session-789',
        userId: 'user-123',
        tenantId: 'tenant-456',
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }
  });

  describe('auth.session.revoked', () => {
    const event = createAuthSessionRevokedEvent({
      ...BASE_PARAMS,
      payload: {
        sessionId: 'session-789',
        userId: 'user-123',
        tenantId: 'tenant-456',
        reason: 'logout',
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }
  });

  describe('auth.login.failed', () => {
    const event = createAuthLoginFailedEvent({
      ...BASE_PARAMS,
      payload: {
        tenantId: 'tenant-456',
        email: 'test@example.com',
        reason: 'invalid_credentials',
        correlationId: 'test-correlation-id',
      },
    });

    for (const field of forbiddenFields) {
      it(`excludes ${field}`, () => {
        expect(event.payload).not.toHaveProperty(field);
      });
    }
  });

  describe('comprehensive exclusion verification', () => {
    const allEvents = [
      {
        name: AUTH_EVENTS.USER_CREATED,
        event: createAuthUserCreatedEvent({
          ...BASE_PARAMS,
          payload: {
            userId: 'user-123',
            email: 'test@example.com',
            tenantId: 'tenant-456',
          },
        }),
      },
      {
        name: AUTH_EVENTS.USER_UPDATED,
        event: createAuthUserUpdatedEvent({
          ...BASE_PARAMS,
          payload: {
            userId: 'user-123',
            email: 'test@example.com',
            tenantId: 'tenant-456',
            changes: ['email'],
          },
        }),
      },
      {
        name: AUTH_EVENTS.USER_DEACTIVATED,
        event: createAuthUserDeactivatedEvent({
          ...BASE_PARAMS,
          payload: {
            userId: 'user-123',
            email: 'test@example.com',
            tenantId: 'tenant-456',
          },
        }),
      },
      {
        name: AUTH_EVENTS.SESSION_CREATED,
        event: createAuthSessionCreatedEvent({
          ...BASE_PARAMS,
          payload: {
            sessionId: 'session-789',
            userId: 'user-123',
            tenantId: 'tenant-456',
          },
        }),
      },
      {
        name: AUTH_EVENTS.SESSION_REVOKED,
        event: createAuthSessionRevokedEvent({
          ...BASE_PARAMS,
          payload: {
            sessionId: 'session-789',
            userId: 'user-123',
            tenantId: 'tenant-456',
            reason: 'logout',
          },
        }),
      },
      {
        name: AUTH_EVENTS.LOGIN_FAILED,
        event: createAuthLoginFailedEvent({
          ...BASE_PARAMS,
          payload: {
            tenantId: 'tenant-456',
            email: 'test@example.com',
            reason: 'invalid_credentials',
            correlationId: 'test-correlation-id',
          },
        }),
      },
    ];

    for (const { name, event } of allEvents) {
      it(`${name} has no forbidden payload fields`, () => {
        const payload = event.payload as unknown as Record<string, unknown>;
        for (const field of forbiddenFields) {
          expect(payload).not.toHaveProperty(field);
        }
      });
    }
  });
});
