import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

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
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `campaign-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Campaign Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('campaign routes security', () => {
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

  describe('POST /admin/campaigns', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/campaigns',
        payload: {
          name: 'Test Campaign',
          type: 'phishing',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/campaigns',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Campaign',
          type: 'phishing',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 201 with valid trainer role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/campaigns',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Campaign',
          type: 'phishing',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('returns 400 when name is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/campaigns',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'phishing',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /admin/campaigns', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with valid manager role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'manager' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.campaigns)).toBe(true);
    });
  });

  describe('GET /admin/campaigns/:campaignId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent campaign', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'manager' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /admin/campaigns/:campaignId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
        payload: {
          name: 'Updated Campaign',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PUT',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Campaign',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /admin/campaigns/:campaignId/status', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001/status',
        payload: {
          status: 'active',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'active',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /admin/campaigns/:campaignId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
