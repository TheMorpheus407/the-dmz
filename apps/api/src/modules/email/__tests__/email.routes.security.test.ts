import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../websocket/websocket.gateway.js', async () => {
  const { createMockWsGateway } = await import('@the-dmz/shared/testing');
  const { wsGateway, WebSocketGateway } = createMockWsGateway();
  return {
    ...(await vi.importActual('../websocket/websocket.gateway.js')),
    wsGateway,
    WebSocketGateway,
  };
});

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';

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
      email: `email-security-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Email Security Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register email security test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('email routes security', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const databaseName = `dmz_t_ers_${randomUUID().replace(/-/g, '_')}`;
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
    vi.restoreAllMocks();
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

  describe('POST /api/v1/email/integrations', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations',
        payload: {
          name: 'Test Integration',
          type: 'sendgrid',
          config: {
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_UNAUTHORIZED',
          }),
        }),
      );
    });

    it('returns 401 with invalid bearer token', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: {
          name: 'Test Integration',
          type: 'sendgrid',
          config: {
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_INVALID_TOKEN',
          }),
        }),
      );
    });

    it('returns 403 without email.manage scope', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Integration',
          type: 'sendgrid',
          config: {
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 201 with valid authentication and email.manage scope', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Integration',
          type: 'sendgrid',
          config: {
            apiKey: 'test-key',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Integration',
            type: 'sendgrid',
          }),
        }),
      );
    });
  });

  describe('GET /api/v1/email/integrations', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with valid authentication and email.manage scope', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          total: expect.any(Number),
        }),
      );
    });
  });

  describe('GET /api/v1/email/integrations/:integrationId', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('PATCH /api/v1/email/integrations/:integrationId', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('DELETE /api/v1/email/integrations/:integrationId', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('GET /api/v1/email/integrations/:integrationId/ready', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/ready',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/ready',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('POST /api/v1/email/integrations/:integrationId/ready', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/ready',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/ready',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('POST /api/v1/email/integrations/:integrationId/validate', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/validate',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent integration with valid auth', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/email/integrations/00000000-0000-0000-0000-000000000001/validate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          runSpfCheck: true,
          runDkimCheck: true,
          runDmarcCheck: true,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'EMAIL_CONFIG_NOT_FOUND',
          }),
        }),
      );
    });
  });
});
