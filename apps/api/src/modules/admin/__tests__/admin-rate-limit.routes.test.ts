import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';

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

  const columnDefs = [
    'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email varchar(255)',
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state jsonb DEFAULT '{}'::jsonb",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS idp_config jsonb DEFAULT '{}'::jsonb",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_frameworks jsonb DEFAULT '{}'::jsonb",
  ];

  for (const columnDef of columnDefs) {
    try {
      await pool`${pool.unsafe(columnDef)}`;
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
      email: `rate-limit-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Rate Limit Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('admin-rate-limit routes security', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await seedDatabase(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('GET /admin/rate-limit/status', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 with learner role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'learner' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 403 with trainer role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 403 with manager role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'manager' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 200 with tenant_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('store');
      expect(body.data).toHaveProperty('redisAvailable');
      expect(body.data).toHaveProperty('strictMode');
    });

    it('returns 200 with super_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('store');
      expect(body.data).toHaveProperty('redisAvailable');
      expect(body.data).toHaveProperty('strictMode');
    });

    it('response schema includes rate limit status fields', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.store).toMatch(/^(redis|memory)$/);
      expect(body.data.redisAvailable).toBe(true);
      expect(body.data.strictMode).toBe(false);
    });

    it('does not accept tenantId query parameter', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status?tenantId=00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('does not accept userId query parameter', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/rate-limit/status?userId=00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
