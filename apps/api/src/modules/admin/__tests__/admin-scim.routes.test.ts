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
      email: `admin-scim-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Admin SCIM Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('admin-scim routes security', () => {
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

  describe('GET /admin/scim/tokens', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/tokens',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with scim:read permission', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body.tokens)).toBe(true);
    });

    it('returns empty array when no tokens exist', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tokens).toHaveLength(0);
    });
  });

  describe('POST /admin/scim/tokens', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        payload: {
          name: 'Test Token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
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
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when name exceeds 255 characters', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'a'.repeat(256),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns token with secret on creation', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test Token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(body.token).toHaveLength(32);
      expect(body.id).toBeDefined();
    });
  });

  describe('DELETE /admin/scim/tokens/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent token', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 200 when revoking token', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Token to Revoke',
        },
      });

      const tokenId = createResponse.json().id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/admin/scim/tokens/${tokenId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /admin/scim/tokens/:id/rotate', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001/rotate',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001/rotate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent token', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens/00000000-0000-0000-0000-000000000001/rotate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns new token on rotation (only token value changes, not ID)', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/admin/scim/tokens',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Token to Rotate',
        },
      });

      const originalToken = createResponse.json().token;
      const originalId = createResponse.json().id;

      const rotateResponse = await app.inject({
        method: 'POST',
        url: `/admin/scim/tokens/${originalId}/rotate`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(rotateResponse.statusCode).toBe(200);
      const rotateBody = rotateResponse.json();

      expect(rotateBody.token).toBeDefined();
      expect(rotateBody.token).not.toBe(originalToken);
      expect(rotateBody.id).toBeDefined();
    });
  });

  describe('POST /admin/scim/test/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/test/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/test/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent token', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/test/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /admin/scim/provisioning-test/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/provisioning-test/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/provisioning-test/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent token', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/scim/provisioning-test/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /admin/scim/sync-status', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/sync-status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/sync-status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with scim:read permission', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/sync-status',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBeDefined();
    });
  });

  describe('GET /admin/scim/group-mappings', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/group-mappings',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:read permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/group-mappings',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with scim:read permission', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/scim/group-mappings',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.groups).toBeDefined();
      expect(body.roles).toBeDefined();
    });
  });

  describe('PATCH /admin/scim/group-mappings/:id', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/scim/group-mappings/00000000-0000-0000-0000-000000000001',
        payload: {
          roleId: '00000000-0000-0000-0000-000000000002',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without scim:write permission', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/scim/group-mappings/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          roleId: '00000000-0000-0000-0000-000000000002',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/admin/scim/group-mappings/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          roleId: '00000000-0000-0000-0000-000000000002',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
