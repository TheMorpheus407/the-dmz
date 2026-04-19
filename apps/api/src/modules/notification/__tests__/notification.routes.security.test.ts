import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestId,
} from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';

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
      email: `notification-security-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Notification Security Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register notification security test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('notification routes security', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const databaseName = `dmz_t_nrs_${randomUUID().replace(/-/g, '_')}`;
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

  describe('GET /api/v1/notification/metrics', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notification/metrics',
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
        method: 'GET',
        url: '/api/v1/notification/metrics',
        headers: {
          authorization: 'Bearer invalid-token',
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

    it('returns 200 with valid authentication', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notification/metrics',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          totalConnections: expect.any(Number),
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('GET /api/v1/notification/events', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notification/events',
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
        method: 'GET',
        url: '/api/v1/notification/events',
        headers: {
          authorization: 'Bearer invalid-token',
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

    it('returns 200 with valid authentication', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notification/events',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('sets security headers for SSE stream', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notification/events',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });
  });

  describe('POST /api/v1/notification/events/subscribe', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notification/events/subscribe',
        payload: { channel: 'notifications:user-123' },
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
        url: '/api/v1/notification/events/subscribe',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: { channel: 'notifications:user-123' },
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

    it('returns 200 with valid authentication', async () => {
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
        url: '/api/v1/notification/events/subscribe',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { channel: 'notifications:user-123' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/notification/events/unsubscribe', () => {
    it('returns 401 without authorization header', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notification/events/unsubscribe',
        payload: { channel: 'notifications:user-123' },
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
        url: '/api/v1/notification/events/unsubscribe',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: { channel: 'notifications:user-123' },
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

    it('returns 200 with valid authentication', async () => {
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
        url: '/api/v1/notification/events/unsubscribe',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { channel: 'notifications:user-123' },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
