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
      email: `onboarding-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Onboarding Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('onboarding routes security', () => {
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

  describe('GET /api/v1/onboarding/status', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/onboarding/status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with valid JWT', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/onboarding/status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBeDefined();
    });
  });

  describe('POST /api/v1/onboarding/start', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/start',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without tenant_admin role', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/start',
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
        method: 'POST',
        url: '/api/v1/onboarding/start',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBeDefined();
    });
  });

  describe('POST /api/v1/onboarding/org-profile', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/org-profile',
        payload: {
          name: 'Test Org',
          domain: 'test.com',
          industry: 'tech',
          companySize: '100-500',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/org-profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Org',
          domain: 'test.com',
          industry: 'tech',
          companySize: '100-500',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 when name is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'onboarding:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/org-profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          domain: 'test.com',
          industry: 'tech',
          companySize: '100-500',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 200 with valid data', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'onboarding:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/org-profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Org',
          domain: 'test.com',
          industry: 'tech',
          companySize: '100-500',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/v1/onboarding/progress', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/onboarding/progress',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with valid JWT', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/onboarding/progress',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/onboarding/idp-config', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/idp-config',
        payload: {
          type: 'oidc',
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/idp-config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          type: 'oidc',
          enabled: false,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/onboarding/scim-token', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/scim-token',
        payload: {
          name: 'Test Token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/scim-token',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 when name is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'onboarding:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/scim-token',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/onboarding/compliance', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/compliance',
        payload: {
          frameworks: ['gdpr'],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/compliance',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          frameworks: ['gdpr'],
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/onboarding/users', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/users',
        payload: {
          users: [],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          users: [],
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/onboarding/complete', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without required permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
