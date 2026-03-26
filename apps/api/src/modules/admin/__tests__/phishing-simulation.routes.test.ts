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
    'users',
    'phishing.simulations',
    'phishing.templates',
    'phishing.teachable_moments',
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
      email: `phishing-route-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Phishing Route Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('phishing-simulation routes security', () => {
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

  describe('POST /api/v1/admin/simulations', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
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
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
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
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
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
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 201 with tenant_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Test Simulation',
        subject: 'Test Subject',
        body: 'Test body content',
      });
    });

    it('returns 201 with super_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/v1/admin/simulations', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations',
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
        url: '/api/v1/admin/simulations',
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
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
    });

    it('returns 200 with super_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/admin/simulations/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001',
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
        method: 'DELETE',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 404 with tenant_admin role for non-existent simulation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/admin/simulations/templates', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
        },
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
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 201 with tenant_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Test Template',
      });
    });
  });

  describe('POST /api/v1/admin/simulations/teachable-moments', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/teachable-moments',
        payload: {
          name: 'Test Moment',
          title: 'Test Title',
          description: 'Test description',
          educationalContent: 'Test educational content',
          whatToDoInstead: 'Test what to do instead',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 with trainer role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/teachable-moments',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Moment',
          title: 'Test Title',
          description: 'Test description',
          educationalContent: 'Test educational content',
          whatToDoInstead: 'Test what to do instead',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 201 with tenant_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/teachable-moments',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Moment',
          title: 'Test Title',
          description: 'Test description',
          educationalContent: 'Test educational content',
          whatToDoInstead: 'Test what to do instead',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Test Moment',
      });
    });
  });

  describe('POST /api/v1/admin/simulations/:id/launch', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/launch',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 with manager role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'manager' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/launch',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('returns 400 with tenant_admin role for non-existent simulation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/launch',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/admin/simulations/:id/results/export', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/export',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 with trainer role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/export',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('sets X-Download-Options header for CSV format', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/export?format=csv',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });
});
