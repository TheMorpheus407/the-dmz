import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../shared/database/connection.js';
import { sessions as sessionsTable } from '../../../db/schema/auth/sessions.js';
import { users } from '../../../shared/database/schema/users.js';
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
  await pool`
    TRUNCATE TABLE
      auth.webauthn_credentials,
      auth.sessions,
      users,
      tenants
    RESTART IDENTITY CASCADE
  `;
};

describe('MFA Access Control - Super Admin Step-up Flow', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('MFA status endpoint reflects correct state', () => {
    it('returns mfaRequired true for super-admin user', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'mfa-status-superadmin@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'MFA Status SuperAdmin',
        },
      });

      expect(registerResponse.statusCode).toBe(201);

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { id: string; tenantId: string };
      };

      const db = getDatabaseClient(testConfig);
      await db.update(users).set({ role: 'super-admin' }).where(eq(users.userId, user.id));

      const statusResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/mfa/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(statusResponse.statusCode).toBe(200);
      const body = statusResponse.json();
      expect(body.mfaRequired).toBe(true);
      expect(body.mfaVerified).toBe(false);
    });

    it('returns mfaRequired false for non-super-admin', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'mfa-status-regular@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'MFA Status Regular',
        },
      });

      expect(registerResponse.statusCode).toBe(201);

      const { accessToken } = registerResponse.json() as {
        accessToken: string;
      };

      const statusResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/mfa/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(statusResponse.statusCode).toBe(200);
      const body = statusResponse.json();
      expect(body.mfaRequired).toBe(false);
    });
  });

  describe('MFA status endpoint security', () => {
    it('MFA status endpoint reveals only necessary information', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'mfa-status-security@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'MFA Status Security',
        },
      });

      expect(registerResponse.statusCode).toBe(201);

      const { accessToken } = registerResponse.json() as {
        accessToken: string;
      };

      const statusResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/mfa/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(statusResponse.statusCode).toBe(200);
      const body = statusResponse.json();
      expect(body).toHaveProperty('mfaRequired');
      expect(body).toHaveProperty('mfaVerified');
      expect(body).toHaveProperty('method');
      expect(body).toHaveProperty('mfaVerifiedAt');
      expect(body).not.toHaveProperty('sessionId');
    });
  });

  describe('MFA session state resets on session expiration', () => {
    it('prevents access when session is expired regardless of MFA state', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'mfa-expired-session@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'MFA Expired Session Test',
        },
      });

      expect(registerResponse.statusCode).toBe(201);

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { id: string; tenantId: string };
      };

      const db = getDatabaseClient(testConfig);
      await db.update(users).set({ role: 'super-admin' }).where(eq(users.userId, user.id));

      const session = await db.query.sessions.findFirst({
        where: eq(sessionsTable.userId, user.id),
      });

      expect(session).toBeDefined();

      await db
        .update(sessionsTable)
        .set({
          mfaVerifiedAt: new Date(),
          mfaMethod: 'webauthn',
          expiresAt: new Date(Date.now() - 1000),
        })
        .where(eq(sessionsTable.id, session!.id));

      const adminResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(adminResponse.statusCode).toBe(401);
      const body = adminResponse.json();
      expect(body.error.code).toBe('AUTH_SESSION_EXPIRED');
    });
  });

  describe('MFA session state resets on logout', () => {
    it('session is deleted on logout, clearing MFA state implicitly', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'mfa-logout-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'MFA Logout Test',
        },
      });

      expect(registerResponse.statusCode).toBe(201);

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { id: string; tenantId: string };
      };

      const cookies = registerResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());
      const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

      const db = getDatabaseClient(testConfig);
      await db.update(users).set({ role: 'super-admin' }).where(eq(users.userId, user.id));

      const sessionBefore = await db.query.sessions.findFirst({
        where: eq(sessionsTable.userId, user.id),
      });

      expect(sessionBefore).toBeDefined();

      await db
        .update(sessionsTable)
        .set({ mfaVerifiedAt: new Date(), mfaMethod: 'webauthn' })
        .where(eq(sessionsTable.id, sessionBefore!.id));

      const statusResponseBefore = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/mfa/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(statusResponseBefore.statusCode).toBe(200);
      expect(statusResponseBefore.json().mfaVerified).toBe(true);

      const cookieHeader = `${getRefreshCookieName()}=${refreshTokenCookie?.value}; ${csrfCookieName}=${csrfCookie?.value}`;

      const logoutResponse = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-csrf-token': csrfCookie?.value,
          cookie: cookieHeader,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);

      const sessionAfter = await db.query.sessions.findFirst({
        where: eq(sessionsTable.userId, user.id),
      });

      expect(sessionAfter).toBeUndefined();
    });
  });
});
