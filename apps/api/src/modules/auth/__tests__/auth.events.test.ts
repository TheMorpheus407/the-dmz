import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { AUTH_EVENTS } from '../auth.events.js';
import { getRefreshCookieName } from '../cookies.js';
import { csrfCookieName } from '../csrf.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('auth events', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('event emission', () => {
    it('emits auth.user.created and auth.session.created on register', async () => {
      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.USER_CREATED, handler as never);
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'eventtest@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Event Test',
        },
      });

      expect(response.statusCode).toBe(201);

      const userCreatedCalls = handler.mock.calls.filter(
        (call) => call[0].eventType === AUTH_EVENTS.USER_CREATED,
      );
      const sessionCreatedCalls = handler.mock.calls.filter(
        (call) => call[0].eventType === AUTH_EVENTS.SESSION_CREATED,
      );

      expect(userCreatedCalls.length).toBe(1);
      expect(sessionCreatedCalls.length).toBe(1);

      const userCreatedEvent = userCreatedCalls[0]![0]!;
      expect(userCreatedEvent.payload).toBeDefined();
      expect(userCreatedEvent.payload!.userId).toBeDefined();
      expect(userCreatedEvent.payload!.email).toBe('eventtest@example.com');
      expect(userCreatedEvent.payload!.tenantId).toBeDefined();

      expect(userCreatedEvent.eventType).toBe(AUTH_EVENTS.USER_CREATED);
      expect(userCreatedEvent.source).toBe('auth-module');
      expect(userCreatedEvent.version).toBe(1);
      expect(userCreatedEvent.tenantId).toBe(userCreatedEvent.payload!.tenantId);

      const sessionCreatedEvent = sessionCreatedCalls[0]![0]!;
      expect(sessionCreatedEvent.payload!.sessionId).toBeDefined();
      expect(sessionCreatedEvent.payload!.userId).toBe(userCreatedEvent.payload!.userId);
      expect(sessionCreatedEvent.payload!.tenantId).toBe(userCreatedEvent.payload!.tenantId);

      app.eventBus.unsubscribe(AUTH_EVENTS.USER_CREATED, handler as never);
      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);
    });

    it('emits auth.session.created on successful login', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'loginevent@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Login Event Test',
        },
      });

      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'loginevent@example.com',
          password: 'Valid' + 'Pass123!',
        },
      });

      expect(response.statusCode).toBe(200);

      expect(handler).toHaveBeenCalledTimes(1);

      const event = handler.mock.calls[0]![0]!;
      expect(event.eventType).toBe(AUTH_EVENTS.SESSION_CREATED);
      expect(event.payload!.sessionId).toBeDefined();
      expect(event.payload!.userId).toBeDefined();
      expect(event.payload!.tenantId).toBeDefined();

      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);
    });

    it('emits auth.login.failed on failed login attempt', async () => {
      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.LOGIN_FAILED, handler as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrong pass 1234',
        },
      });

      expect(response.statusCode).toBe(401);

      expect(handler).toHaveBeenCalledTimes(1);

      const event = handler.mock.calls[0]![0]!;
      expect(event.eventType).toBe(AUTH_EVENTS.LOGIN_FAILED);
      expect(event.payload!.email).toBe('nonexistent@example.com');
      expect(event.payload!.reason).toBe('invalid_credentials');
      expect(event.payload!.correlationId).toBeDefined();

      app.eventBus.unsubscribe(AUTH_EVENTS.LOGIN_FAILED, handler as never);
    });

    it('emits exactly one auth.login.failed event on failed login', async () => {
      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.LOGIN_FAILED, handler as never);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'singlefail@example.com',
          password: 'wrong pass 1234',
        },
      });

      expect(handler).toHaveBeenCalledTimes(1);

      app.eventBus.unsubscribe(AUTH_EVENTS.LOGIN_FAILED, handler as never);
    });

    it('emits auth.session.revoked on logout', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logouttest@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Logout Test',
        },
      });

      const cookies = registerResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());
      const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

      const accessToken = (registerResponse.json() as { accessToken: string }).accessToken;
      const refreshTokenValue = refreshTokenCookie?.value;
      const csrfTokenValue = csrfCookie?.value;

      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_REVOKED, handler as never);

      const cookieHeader = `${getRefreshCookieName()}=${refreshTokenValue}; ${csrfCookieName}=${csrfTokenValue}`;

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-csrf-token': csrfTokenValue,
          cookie: cookieHeader,
        },
      });

      expect(response.statusCode).toBe(200);

      expect(handler).toHaveBeenCalledTimes(1);

      const event = handler.mock.calls[0]![0]!;
      expect(event.eventType).toBe(AUTH_EVENTS.SESSION_REVOKED);
      expect(event.payload!.reason).toBe('logout');
      expect(event.payload!.sessionId).toBeDefined();
      expect(event.payload!.userId).toBeDefined();
      expect(event.payload!.tenantId).toBeDefined();

      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_REVOKED, handler as never);
    });

    it('emits auth.session.revoked exactly once on logout', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logoutonce@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Logout Once',
        },
      });

      const cookies = registerResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());
      const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

      const accessToken = (registerResponse.json() as { accessToken: string }).accessToken;
      const refreshTokenValue = refreshTokenCookie?.value;
      const csrfTokenValue = csrfCookie?.value;

      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_REVOKED, handler as never);

      const cookieHeader = `${getRefreshCookieName()}=${refreshTokenValue}; ${csrfCookieName}=${csrfTokenValue}`;

      await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-csrf-token': csrfTokenValue,
          cookie: cookieHeader,
        },
      });

      expect(handler).toHaveBeenCalledTimes(1);

      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_REVOKED, handler as never);
    });

    it('does not leak sensitive data in event payloads', async () => {
      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.USER_CREATED, handler as never);
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'securetest@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Secure Test',
        },
      });

      const allEvents = handler.mock.calls.map((call) => call[0]);

      for (const event of allEvents) {
        const payloadStr = JSON.stringify(event.payload);
        expect(payloadStr).not.toContain('password');
        expect(payloadStr).not.toContain('hash');
        expect(payloadStr).not.toContain('token');
        expect(payloadStr).not.toContain('secret');
      }

      app.eventBus.unsubscribe(AUTH_EVENTS.USER_CREATED, handler as never);
      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_CREATED, handler as never);
    });

    it('includes tenant context in event payloads when available', async () => {
      const handler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.USER_CREATED, handler as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenanttest@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Tenant Test',
        },
      });

      expect(response.statusCode).toBe(201);

      const event = handler.mock.calls[0]![0]!;
      expect(event.tenantId).toBeDefined();
      expect(event.tenantId).toBe(event.payload!.tenantId);

      app.eventBus.unsubscribe(AUTH_EVENTS.USER_CREATED, handler as never);
    });

    it('emits auth.session.created and auth.session.revoked on refresh token rotation', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refreshtest@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Refresh Test',
        },
      });

      const cookies = registerResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());
      const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

      const refreshTokenValue = refreshTokenCookie?.value;
      const csrfTokenValue = csrfCookie?.value;

      const cookieHeader = `${getRefreshCookieName()}=${refreshTokenValue}; ${csrfCookieName}=${csrfTokenValue}`;

      const sessionCreatedHandler = vi.fn();
      const sessionRevokedHandler = vi.fn();
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_CREATED, sessionCreatedHandler as never);
      app.eventBus.subscribe(AUTH_EVENTS.SESSION_REVOKED, sessionRevokedHandler as never);

      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: {
          'x-csrf-token': csrfTokenValue,
          cookie: cookieHeader,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);

      expect(sessionCreatedHandler).toHaveBeenCalledTimes(1);
      expect(sessionRevokedHandler).toHaveBeenCalledTimes(1);

      const createdEvent = sessionCreatedHandler.mock.calls[0]![0]!;
      expect(createdEvent.eventType).toBe(AUTH_EVENTS.SESSION_CREATED);
      expect(createdEvent.payload!.sessionId).toBeDefined();
      expect(createdEvent.payload!.userId).toBeDefined();
      expect(createdEvent.payload!.tenantId).toBeDefined();

      const revokedEvent = sessionRevokedHandler.mock.calls[0]![0]!;
      expect(revokedEvent.eventType).toBe(AUTH_EVENTS.SESSION_REVOKED);
      expect(revokedEvent.payload!.reason).toBe('refresh_rotation');
      expect(revokedEvent.payload!.sessionId).toBeDefined();
      expect(revokedEvent.payload!.sessionId).not.toBe(createdEvent.payload!.sessionId);
      expect(revokedEvent.payload!.userId).toBe(createdEvent.payload!.userId);
      expect(revokedEvent.payload!.tenantId).toBe(createdEvent.payload!.tenantId);

      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_CREATED, sessionCreatedHandler as never);
      app.eventBus.unsubscribe(AUTH_EVENTS.SESSION_REVOKED, sessionRevokedHandler as never);
    });
  });
});
