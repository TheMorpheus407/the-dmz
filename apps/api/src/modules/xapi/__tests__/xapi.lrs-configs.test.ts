import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { createTestId } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
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
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: email ?? `xapi-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'XAPI Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('xAPI LRS Config routes', () => {
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

  describe('POST /api/v1/xapi/lrs-configs', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 201 with valid config', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test LRS');
      expect(body.endpoint).toBe('https://lrs.example.com/data/xAPI');
      expect(body.enabled).toBe(true);
    });

    it('returns 400 with invalid URL', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test LRS',
          endpoint: 'not-a-valid-url',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 with short auth secret', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/xapi/lrs-configs', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/lrs-configs',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns empty list when no configs exist', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/lrs-configs',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.configs).toEqual([]);
    });

    it('returns list of configs', async () => {
      const { accessToken } = await registerUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/lrs-configs',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.configs.length).toBe(1);
      expect(body.configs[0].name).toBe('Test LRS');
    });
  });

  describe('GET /api/v1/xapi/lrs-configs/:configId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent config', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns single config by id', async () => {
      const { accessToken } = await registerUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/xapi/lrs-configs/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Test LRS');
    });
  });

  describe('PATCH /api/v1/xapi/lrs-configs/:configId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent config', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('updates config successfully', async () => {
      const { accessToken } = await registerUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const patchResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/xapi/lrs-configs/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated LRS Name',
          enabled: false,
        },
      });

      expect(patchResponse.statusCode).toBe(200);
      const body = patchResponse.json();
      expect(body.name).toBe('Updated LRS Name');
      expect(body.enabled).toBe(false);
    });
  });

  describe('DELETE /api/v1/xapi/lrs-configs/:configId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent config', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/xapi/lrs-configs/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('deletes config and returns 204', async () => {
      const { accessToken } = await registerUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/lrs-configs',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test LRS',
          endpoint: 'https://lrs.example.com/data/xAPI',
          authKeyId: 'key123',
          authSecret: 'secret123456',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/xapi/lrs-configs/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/xapi/lrs-configs/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
