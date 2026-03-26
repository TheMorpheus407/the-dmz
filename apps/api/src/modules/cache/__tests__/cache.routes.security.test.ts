import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { seedTenantAuthModel } from '../../../shared/database/seed.js';
import { TENANT_COLUMN_DEFS } from '../../../__tests__/helpers/db.js';

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

  for (const columnDef of TENANT_COLUMN_DEFS) {
    try {
      await pool.unsafe(columnDef);
    } catch {
      // Column may already exist
    }
  }

  const tablesToTruncate = [
    'auth.user_profiles',
    'auth.role_permissions',
    'auth.user_roles',
    'auth.sessions',
    'auth.sso_connections',
    'auth.roles',
    'auth.permissions',
    'users',
    'tenants',
  ];

  for (const table of tablesToTruncate) {
    try {
      await pool`TRUNCATE TABLE ${pool.unsafe(table)} RESTART IDENTITY CASCADE`;
    } catch {
      // Table doesn't exist - skip
    }
  }
};

const registerUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `cache-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Cache Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('cache routes security', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('POST /cache/invalidate', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        payload: {
          type: 'abac',
          tenantId: '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 when invalidating another tenant cache without super_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const otherTenantId = '00000000-0000-0000-0000-000000000002';

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'abac',
          tenantId: otherTenantId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 400 when tenantId is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'abac',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('tenantId is required');
    });

    it('returns 400 when userId is missing for user-permissions invalidation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'user-permissions',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('userId is required for user-permissions invalidation');
    });

    it('returns 400 when userId is missing for game-state-user invalidation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'game-state-user',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('userId is required for game-state-user invalidation');
    });

    it('returns 400 for invalid cache type', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'invalid-type',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid invalidation type');
    });

    it('returns 200 when invalidating own tenant cache with proper permission', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'abac',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('abac');
      expect(body.tenantId).toBe(user.tenantId);
    });

    it('returns 200 for super_admin invalidating any tenant cache', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const otherTenantId = '00000000-0000-0000-0000-000000000002';

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'abac',
          tenantId: otherTenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('abac');
      expect(body.tenantId).toBe(otherTenantId);
    });

    it('returns 200 for content cache invalidation with contentType and contentId', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'content',
          tenantId: user.tenantId,
          contentType: 'email-template',
          contentId: 'template-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('content');
    });

    it('returns 200 for feature-flags cache invalidation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'feature-flags',
          tenantId: user.tenantId,
          userId: user.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('feature-flags');
    });

    it('returns 200 for all-permissions cache invalidation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'all-permissions',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('all-permissions');
    });

    it('returns 200 for game-state-tenant cache invalidation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'game-state-tenant',
          tenantId: user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('game-state-tenant');
    });

    it('returns 200 for game-state-user cache invalidation with userId', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/cache/invalidate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'game-state-user',
          tenantId: user.tenantId,
          userId: user.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.type).toBe('game-state-user');
    });
  });

  describe('GET /cache/health', () => {
    it('returns 200 without authentication (public endpoint)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/cache',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /cache/metrics', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics/cache',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with valid authentication', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/metrics/cache',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('metrics');
      expect(body).toHaveProperty('summary');
    });
  });

  describe('GET /cache/metrics/prometheus', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics/cache/prometheus',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with valid authentication', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/metrics/cache/prometheus',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });
});
