import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase } from '../../../shared/database/seed.js';

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
      email: `season-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Season Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register user: ${response.statusCode} - ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('seasons routes', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    const databaseName = `dmz_t_sea_${randomUUID().replace(/-/g, '_')}`;
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

  describe('GET /api/v1/content/seasons', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns seasons with valid token', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons',
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

    it('filters seasons by seasonNumber', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons?seasonNumber=1',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
    });

    it('filters seasons by isActive', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons?isActive=true',
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

  describe('GET /api/v1/content/seasons/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent season', async () => {
      const { accessToken, user } = await registerUser(app!);

      const response = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons/00000000-0000-0000-0000-000000000000',
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
        url: '/api/v1/content/seasons/not-a-uuid',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('tenant isolation', () => {
    it('returns only tenant-specific seasons', async () => {
      const { accessToken, user } = await registerUser(app!);

      const listResponse = await app!.inject({
        method: 'GET',
        url: '/api/v1/content/seasons',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();

      if (body.data.length > 0) {
        for (const season of body.data) {
          expect(season.tenantId).toBe(user.tenantId);
        }
      }
    });
  });
});
