import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase } from '../../../shared/database/seed.js';
import { clearPermissionCache } from '../../../shared/middleware/authorization.js';
import { roles, userRoles } from '../../../db/schema/auth/index.js';

import type { FastifyInstance } from 'fastify';

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

const createIsolatedTestConfig = (databaseName: string): AppConfig => ({
  ...createTestConfig(),
  DATABASE_URL: `postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`,
});

const adminDatabaseUrl = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';
const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

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

const registerUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = email ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `email-template-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Email Template Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register user: ${response.statusCode} - ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

const registerAdminUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const { accessToken, user } = await registerUser(app, email);

  const db = getDatabaseClient(testConfig!);

  const adminRole = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

  if (adminRole.length > 0) {
    await db.insert(userRoles).values({
      tenantId: user.tenantId,
      userId: user.id,
      roleId: adminRole[0]!.id,
    });
  }

  clearPermissionCache(testConfig!, user.tenantId, user.id);

  return { accessToken, user };
};

describe('email-templates routes', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    const databaseName = `dmz_t_etr_${randomUUID().replace(/-/g, '_')}`;
    testConfig = createIsolatedTestConfig(databaseName);
    cleanupDatabase = await createIsolatedDatabase(testConfig);

    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await db.execute(
      sql`ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128)`,
    );
    await seedDatabase(testConfig);

    app = buildApp(testConfig, { skipHealthCheck: true });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    app = undefined;
    await closeDatabase();
    if (cleanupDatabase) {
      await cleanupDatabase();
    }
    cleanupDatabase = undefined;
    testConfig = undefined;
  });

  describe('GET /api/v1/content/emails', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns email templates with valid token', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('filters email templates by difficulty', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails?difficulty=1',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters email templates by threatLevel', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails?threatLevel=HIGH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters email templates by contentType', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails?contentType=phishing',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/content/emails/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent template', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid UUID format', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails/not-a-uuid',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 200 with valid email template', async () => {
      const { accessToken, user } = await registerAdminUser(app!);

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Test Email Template',
          subject: 'Test Subject Line',
          body: 'This is the email body content',
          contentType: 'phishing',
          difficulty: 2,
          threatLevel: 'LOW',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const createdTemplate = createResponse.json().data;

      const getResponse = await app!.inject({
        method: 'GET',
        url: `/api/v1/content/emails/${createdTemplate.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body).toHaveProperty('data');
      expect(body.data.name).toBe('Test Email Template');
    });
  });

  describe('POST /api/v1/content/emails', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        payload: {
          name: 'Test Email',
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty: 1,
          threatLevel: 'LOW',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('creates email template with valid data', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Test Email Template',
          subject: 'Test Subject Line',
          body: 'This is the email body content',
          contentType: 'phishing',
          difficulty: 2,
          threatLevel: 'GUARDED',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(body.data.name).toBe('Test Email Template');
      expect(body.data.subject).toBe('Test Subject Line');
    });

    it('creates email template with all optional fields', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Complete Email Template',
          subject: 'Complete Subject',
          body: 'Complete body',
          contentType: 'spear_phishing',
          difficulty: 3,
          threatLevel: 'ELEVATED',
          fromName: 'Sender Name',
          fromEmail: 'sender@example.com',
          replyTo: 'reply@example.com',
          faction: 'Criminal Networks',
          attackType: 'spear_phishing',
          season: 1,
          chapter: 2,
          language: 'en',
          locale: 'en-US',
          metadata: { customField: 'value' },
          isAiGenerated: false,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.fromName).toBe('Sender Name');
      expect(body.data.faction).toBe('Criminal Networks');
      expect(body.data.season).toBe(1);
      expect(body.data.chapter).toBe(2);
    });

    it('returns 400 for missing required fields', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Incomplete Template',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid difficulty range', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Test Email',
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty: 6,
          threatLevel: 'LOW',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid threatLevel', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Test Email',
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty: 1,
          threatLevel: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('admin authorization', () => {
    it('returns 403 for non-admin user on POST /api/v1/content/emails', async () => {
      const { accessToken, user } = await registerUser(app!);

      clearPermissionCache(testConfig!, user.tenantId, user.id);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Test Email',
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty: 1,
          threatLevel: 'LOW',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('allows admin user to create email template', async () => {
      const { accessToken, user } = await registerAdminUser(app!);

      const response = await app!.inject({
        method: 'POST',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Admin Created Template',
          subject: 'Admin Subject',
          body: 'Admin body content',
          contentType: 'phishing',
          difficulty: 2,
          threatLevel: 'LOW',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.name).toBe('Admin Created Template');
    });
  });

  describe('tenant isolation', () => {
    it('returns only tenant-specific email templates', async () => {
      const { accessToken, user } = await registerUser(app!);

      const listResponse = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/emails',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();

      if (body.data.length > 0) {
        for (const template of body.data) {
          expect(template.tenantId).toBe(user.tenantId);
        }
      }
    });
  });
});
