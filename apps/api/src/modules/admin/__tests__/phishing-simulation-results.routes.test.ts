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
      email: `phish-results-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Phish Results Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('phishing-simulation-results routes security', () => {
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

  describe('GET /api/v1/admin/simulations/:id/results', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results',
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
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/v1/admin/simulations/:id/results/summary', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/summary',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/summary',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent simulation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/summary',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/admin/simulations/:id/results/export', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/export',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001/results/export',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
