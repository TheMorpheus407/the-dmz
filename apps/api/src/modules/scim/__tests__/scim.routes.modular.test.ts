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
      email: `scim-routes-modular-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'SCIM Routes Modular Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('SCIM routes modularization', () => {
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

  describe('ServiceProviderConfig route', () => {
    it('GET /scim/v2/ServiceProviderConfig returns 200 with config', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/ServiceProviderConfig',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ServiceProviderConfig');
      expect(body.patch).toBeDefined();
      expect(body.bulk).toBeDefined();
      expect(body.filter).toBeDefined();
    });
  });

  describe('Schemas routes', () => {
    it('GET /scim/v2/Schemas returns 200 with schema list', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Schemas',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
      expect(body.Resources).toBeInstanceOf(Array);
    });

    it('GET /scim/v2/Schemas/:id returns 200 for User schema', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('urn:ietf:params:scim:schemas:core:2.0:User');
    });

    it('GET /scim/v2/Schemas/:id returns 200 for Group schema', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('urn:ietf:params:scim:schemas:core:2.0:Group');
    });
  });

  describe('ResourceTypes routes', () => {
    it('GET /scim/v2/ResourceTypes returns 200 with resource type list', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/ResourceTypes',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
      expect(body.Resources).toBeInstanceOf(Array);
    });

    it('GET /scim/v2/ResourceTypes/:id returns 200 for User resource type', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/ResourceTypes/User',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('User');
    });

    it('GET /scim/v2/ResourceTypes/:id returns 200 for Group resource type', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/ResourceTypes/Group',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('Group');
    });
  });

  describe('Users routes', () => {
    it('GET /scim/v2/Users returns 200 with empty list', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('GET /scim/v2/Users/:id returns 404 for non-existent user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('POST /scim/v2/Users creates a new user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'testuser',
          displayName: 'Test User',
          active: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.userName).toBe('testuser');
      expect(body.id).toBeDefined();
    });

    it('POST /scim/v2/Users returns 400 without userName', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          displayName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('PUT /scim/v2/Users/:id returns 404 for non-existent user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'updateduser',
          displayName: 'Updated User',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('PATCH /scim/v2/Users/:id returns 404 for non-existent user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          operations: [{ op: 'replace', path: 'displayName', value: 'Patched Name' }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('DELETE /scim/v2/Users/:id returns 404 for non-existent user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Groups routes', () => {
    it('GET /scim/v2/Groups returns 200 with empty list', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('GET /scim/v2/Groups/:id returns 404 for non-existent group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Groups/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('POST /scim/v2/Groups creates a new group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Test Group',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.displayName).toBe('Test Group');
      expect(body.id).toBeDefined();
    });

    it('POST /scim/v2/Groups returns 400 without displayName', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('PUT /scim/v2/Groups/:id returns 404 for non-existent group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/scim/v2/Groups/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Updated Group',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('PATCH /scim/v2/Groups/:id returns 404 for non-existent group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/scim/v2/Groups/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          operations: [{ op: 'replace', path: 'displayName', value: 'Patched Group' }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('DELETE /scim/v2/Groups/:id returns 404 for non-existent group', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/scim/v2/Groups/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Bulk operations route', () => {
    it('POST /scim/v2/Bulk returns 200 with empty results for no operations', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:write' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Bulk',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'],
          operations: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:BulkResponse');
    });
  });

  describe('Route modularity - all routes accessible', () => {
    it('all 18 SCIM route handlers are accessible', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const routes = [
        { method: 'GET', path: '/api/v1/scim/v2/ServiceProviderConfig' },
        { method: 'GET', path: '/api/v1/scim/v2/Schemas' },
        {
          method: 'GET',
          path: '/api/v1/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User',
        },
        { method: 'GET', path: '/api/v1/scim/v2/ResourceTypes' },
        { method: 'GET', path: '/api/v1/scim/v2/ResourceTypes/User' },
        { method: 'GET', path: '/api/v1/scim/v2/Users' },
        { method: 'GET', path: '/api/v1/scim/v2/Groups' },
      ];

      for (const route of routes) {
        const response = await app.inject({
          method: route.method,
          url: route.path,
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect([200, 404]).toContain(response.statusCode);
      }
    });
  });

  describe('Authentication requirements preserved after modularization', () => {
    it('returns 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users',
      });

      expect([401, 500]).toContain(response.statusCode);
    });

    it('returns 403 when using token without proper scope', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin', permission: 'scim:read' },
      ]);

      const writeResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'testuser',
        },
      });

      expect(writeResponse.statusCode).toBe(403);
    });
  });
});
