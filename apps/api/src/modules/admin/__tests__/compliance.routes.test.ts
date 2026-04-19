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
      email: `compliance-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Compliance Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('compliance routes security', () => {
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

  describe('GET /admin/compliance', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance',
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
        url: '/admin/compliance',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /admin/compliance/:frameworkId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/gdpr',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/gdpr',
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
        url: '/admin/compliance/gdpr',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /admin/compliance/:frameworkId/requirements', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/gdpr/requirements',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/gdpr/requirements',
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
        url: '/admin/compliance/gdpr/requirements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /admin/compliance/:frameworkId/snapshot', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/compliance/gdpr/snapshot',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/compliance/gdpr/snapshot',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
