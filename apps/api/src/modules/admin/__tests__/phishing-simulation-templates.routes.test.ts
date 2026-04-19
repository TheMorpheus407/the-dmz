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
      email: `phish-template-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Phish Template Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('phishing-simulation-templates routes security', () => {
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

  describe('POST /api/v1/admin/simulations/templates', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 201 with valid tenant_admin role', async () => {
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
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('returns 400 when name is missing', async () => {
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
          subject: 'Test Subject',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when subject is missing', async () => {
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
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when body is missing', async () => {
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
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/admin/simulations/templates', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with valid tenant_admin role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/v1/admin/simulations/templates/:templateId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/simulations/templates/:templateId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
        payload: {
          name: 'Updated Template',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Template',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/admin/simulations/templates/:templateId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
