import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestId,
} from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase } from '../../../shared/database/seed.js';

import type { FastifyInstance } from 'fastify';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const registerUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = email ?? createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `scenario-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Scenario Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register user: ${response.statusCode} - ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('scenarios routes', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    const databaseName = `dmz_t_sce_${randomUUID().replace(/-/g, '_')}`;
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

  describe('GET /api/v1/content/scenarios', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns scenarios with valid token', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios',
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

    it('filters scenarios by difficulty', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios?difficulty=1',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters scenarios by faction', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios?faction=Criminal%20Networks',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters scenarios by season', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios?season=1',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters scenarios by isActive', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios?isActive=true',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/content/scenarios/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent scenario', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/00000000-0000-0000-0000-000000000000',
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
        url: '/api/v1/content/scenarios/not-a-uuid',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/content/scenarios/act1', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/act1',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns email templates for act1 with valid token', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/act1',
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

    it('filters act1 templates by difficulty', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/act1?difficulty=1',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters act1 templates by faction', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios/act1?faction=Criminal%20Networks',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });
  });

  describe('tenant isolation', () => {
    it('returns only tenant-specific scenarios', async () => {
      const { accessToken, user } = await registerUser(app!);

      const listResponse = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/scenarios',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();

      if (body.data.length > 0) {
        for (const scenario of body.data) {
          expect(scenario.tenantId).toBe(user.tenantId);
        }
      }
    });
  });
});
