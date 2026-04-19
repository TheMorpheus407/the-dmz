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

const testConfig = createTestConfig();

const registerUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `admin-tp-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Admin TP Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('admin-tenants-provisioning routes security', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestDatabase(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
  });

  describe('POST /admin/tenants/:id/initialize', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        payload: {
          adminEmail: 'admin@test.com',
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without super_admin role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          adminEmail: 'admin@test.com',
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 when adminEmail is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when adminDisplayName is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          adminEmail: 'admin@test.com',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          adminEmail: 'not-an-email',
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 200 with valid super_admin JWT', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/initialize',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          adminEmail: 'admin@test.com',
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.tenantId).toBeDefined();
      expect(body.data.adminUserId).toBeDefined();
      expect(body.data.temporaryPassword).toBeDefined();
    });
  });

  describe('GET /admin/tenants/:id/status', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without super_admin role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with valid super_admin JWT', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'super_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });
});
