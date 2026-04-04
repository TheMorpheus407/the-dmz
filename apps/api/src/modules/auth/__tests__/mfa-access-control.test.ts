import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestConfig } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';
import { sessions as sessionsTable } from '../../../db/schema/auth/sessions.js';
import { users } from '../../../shared/database/schema/users.js';
import { getRefreshCookieName } from '../cookies.js';
import { csrfCookieName } from '../csrf.js';

import type { FastifyInstance } from 'fastify';

const adminDatabaseUrl = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';
const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

let testConfig = createTestConfig();

const createIsolatedTestConfig = (base: AppConfig, databaseName: string): AppConfig => ({
  ...base,
  DATABASE_URL: `postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`,
});

const createIsolatedDatabase = async (config: AppConfig): Promise<() => Promise<void>> => {
  const databaseName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
  const adminPool = postgres(adminDatabaseUrl, { max: 1 });

  const cleanup = async (): Promise<void> => {
    await adminPool.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}'
        AND pid <> pg_backend_pid()
    `);
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end({ timeout: 5 });
  };

  try {
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.unsafe(`CREATE DATABASE "${databaseName}"`);
    return cleanup;
  } catch (error) {
    await adminPool.end({ timeout: 5 });
    throw error;
  }
};

let testConfig: AppConfig;
let app: FastifyInstance;
let cleanupDatabase: (() => Promise<void>) | undefined;

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);
  await ensureTenantColumns(testConfig);
};

describe('MFA Access Control - Super Admin Step-up Flow', () => {
  beforeAll(async () => {
    const databaseName = `dmz_t_mfa_access_${randomUUID().replace(/-/g, '_')}`;
    testConfig = createIsolatedTestConfig(testConfig, databaseName);
    cleanupDatabase = await createIsolatedDatabase(testConfig);

    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await db.execute(
      sql`ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128)`,
    );

    app = buildApp(testConfig, { skipHealthCheck: true });
    await app.ready();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
    if (cleanupDatabase) {
      await cleanupDatabase();
    }
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
