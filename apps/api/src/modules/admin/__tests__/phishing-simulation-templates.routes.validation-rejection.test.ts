/* eslint-disable max-lines */
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

const registerAdminUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `phish-template-validation-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Phish Template Validation Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  const result = response.json() as { accessToken: string; user: { id: string; tenantId: string } };
  await seedTenantAuthModel(testConfig, result.user.tenantId, [
    { userId: result.user.id, role: 'tenant_admin' },
  ]);

  return result;
};

describe('phishing-simulation-templates routes validation rejection', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
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

  describe('POST /api/v1/admin/simulations/templates - body validation', () => {
    it('returns 400 when name is missing', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when name is empty string', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: '',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when name exceeds max length (255)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'a'.repeat(256),
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when subject is missing', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when subject exceeds max length (500)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'a'.repeat(501),
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when body is missing', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when body is empty string', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when urgencyLevel is invalid enum value', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          urgencyLevel: 'extreme',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when difficultyTier is out of range (below min)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          difficultyTier: 0,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when difficultyTier is out of range (above max)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          difficultyTier: 6,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when senderEmail is invalid format', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          senderEmail: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when replyTo is invalid format', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          replyTo: 'invalid-email-format',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when category exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          category: 'a'.repeat(101),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when description exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          description: 'a'.repeat(65536),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when senderName exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          senderName: 'a'.repeat(256),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when attachmentName exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          attachmentName: 'a'.repeat(256),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when mergeTags contains non-strings', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          mergeTags: [1, 2, 3],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when indicatorHints contains non-strings', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Template',
          subject: 'Test Subject',
          body: 'Test body content',
          indicatorHints: ['valid', 123, 'also valid'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/simulations/templates - query validation', () => {
    it('returns 400 when limit exceeds maximum (100)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates?limit=101',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when limit is less than minimum (1)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates?limit=0',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when offset is negative', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates?offset=-5',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/admin/simulations/templates/:templateId - body validation', () => {
    it('returns 400 when name is empty string', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: '',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when name exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'a'.repeat(256),
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when urgencyLevel is invalid enum', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          urgencyLevel: 'invalid_level',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when difficultyTier is out of range', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          difficultyTier: 99,
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when senderEmail is invalid', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          senderEmail: 'not-valid',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when mergeTags contains wrong element type', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations/templates',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Template',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const template = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/templates/${template.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          mergeTags: ['valid', 123, 'strings'],
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
