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
      email: `admin-saml-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Admin SAML Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('admin-saml routes security', () => {
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

  describe('GET /admin/saml/config', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with saml:read permission', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'saml:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body.providers)).toBe(true);
    });
  });

  describe('POST /admin/saml/config', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config',
        payload: {
          name: 'Test SAML Provider',
          metadataUrl: 'https://idp.example.com/metadata.xml',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test SAML Provider',
          metadataUrl: 'https://idp.example.com/metadata.xml',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 when name is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'saml:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          metadataUrl: 'https://idp.example.com/metadata.xml',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when metadataUrl is missing', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'saml:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test SAML Provider',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /admin/saml/config/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent provider', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'saml:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /admin/saml/config/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
        payload: {
          name: 'Updated Provider',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Provider',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /admin/saml/config/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /admin/saml/config/:id/test', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001/test',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without saml:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001/test',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent provider', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'saml:read' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/saml/config/00000000-0000-0000-0000-000000000001/test',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
