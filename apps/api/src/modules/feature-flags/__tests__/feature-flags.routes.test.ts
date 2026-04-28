import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { createTestId } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import { seedTenantAuthModel } from '../../../shared/database/seed.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';

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

export const testConfig = createTestConfig();

export const registerUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: email ?? `ff-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Feature Flags Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

export const createFeatureFlag = async (
  app: FastifyInstance,
  accessToken: string,
  payload: {
    name: string;
    key: string;
    description?: string;
    enabledByDefault?: boolean;
    rolloutPercentage?: number;
    isActive?: boolean;
  },
): Promise<{ id: string }> => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/features',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    payload,
  });

  expect(response.statusCode).toBe(201);
  return response.json();
};

export const setupApp = async () => {
  await resetTestDatabase(testConfig);
  const app = await buildApp(testConfig);
  await app.ready();
  return app;
};

export const cleanupApp = async (app: Awaited<ReturnType<typeof buildApp>>) => {
  await closeDatabase();
  await app.close();
};

describe('Feature flags routes HTTP integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await cleanupApp(app);
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
  });

  describe('Authentication', () => {
    it('rejects GET /api/v1/admin/features without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /api/v1/admin/features without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        payload: {
          name: 'Test Flag',
          key: 'test_flag',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /api/v1/features without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /api/v1/features/:key without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features/test_flag',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('rejects GET /api/v1/admin/features for non-admin user', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('rejects POST /api/v1/admin/features for non-admin user', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Flag',
          key: 'test_flag',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('allows admin routes with admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows admin routes with super_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Tenant isolation', () => {
    it('returns only flags for the current tenant', async () => {
      const { accessToken: token1, user: user1 } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user1.tenantId, [{ userId: user1.id, role: 'admin' }]);

      const { accessToken: token2, user: user2 } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user2.tenantId, [{ userId: user2.id, role: 'admin' }]);

      await createFeatureFlag(app, token1, {
        name: 'Tenant 1 Flag',
        key: 'tenant1_flag',
      });

      await createFeatureFlag(app, token2, {
        name: 'Tenant 2 Flag',
        key: 'tenant2_flag',
      });

      const tenant1Response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${token1}`,
        },
      });

      const tenant2Response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${token2}`,
        },
      });

      const tenant1Flags = tenant1Response.json();
      const tenant2Flags = tenant2Response.json();

      expect(tenant1Flags).toHaveLength(1);
      expect(tenant1Flags[0].name).toBe('Tenant 1 Flag');
      expect(tenant1Flags[0].tenantId).toBe(user1.tenantId);

      expect(tenant2Flags).toHaveLength(1);
      expect(tenant2Flags[0].name).toBe('Tenant 2 Flag');
      expect(tenant2Flags[0].tenantId).toBe(user2.tenantId);
    });

    it('does not allow accessing another tenant flag by ID', async () => {
      const { accessToken: token1, user: user1 } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user1.tenantId, [{ userId: user1.id, role: 'admin' }]);

      const { accessToken: token2, user: user2 } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user2.tenantId, [{ userId: user2.id, role: 'admin' }]);

      const tenant1Flag = await createFeatureFlag(app, token1, {
        name: 'Tenant 1 Secret Flag',
        key: 'tenant1_secret',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/features/${tenant1Flag.id}`,
        headers: {
          authorization: `Bearer ${token2}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
