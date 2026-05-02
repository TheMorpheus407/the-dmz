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
      email: `phish-validation-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Phish Validation Test',
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

describe('phishing-simulation routes validation rejection', () => {
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

  describe('POST /api/v1/admin/simulations - body validation', () => {
    it('returns 400 when name is missing', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
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
        url: '/api/v1/admin/simulations',
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

    it('returns 400 when name exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          body: 'Test body content',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when subject exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          urgencyLevel: 'invalid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when difficultyTier is out of range (too low)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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

    it('returns 400 when difficultyTier is out of range (too high)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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

    it('returns 400 when templateId is not a valid UUID', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          templateId: 'not-a-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when senderEmail is invalid', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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

    it('returns 400 when replyTo is invalid', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          replyTo: 'invalid-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when scheduledStartDate is invalid datetime', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          scheduledStartDate: 'not-a-datetime',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when teachableMomentId is not a valid UUID', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          teachableMomentId: 'invalid-uuid',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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

    it('returns 400 when timezone exceeds max length', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
          timezone: 'a'.repeat(51),
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
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
  });

  describe('GET /api/v1/admin/simulations - query validation', () => {
    it('returns 400 when status is invalid enum value', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations?status=invalid_status',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when dateFrom is invalid datetime', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations?dateFrom=not-a-datetime',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when dateTo is invalid datetime', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations?dateTo=not-a-datetime',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when limit exceeds maximum (100)', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations?limit=101',
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
        url: '/api/v1/admin/simulations?limit=0',
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
        url: '/api/v1/admin/simulations?offset=-1',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/admin/simulations/:id - body validation', () => {
    it('returns 400 when name is empty string', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
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

    it('returns 400 when urgencyLevel is invalid enum', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          urgencyLevel: 'super_critical',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          difficultyTier: 10,
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when templateId is not a valid UUID', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          templateId: 'not-uuid',
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
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          senderEmail: 'bad-email',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when scheduledStartDate is invalid', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Original Name',
          subject: 'Original Subject',
          body: 'Original body content',
        },
      });

      const simulation = createResponse.json().data;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          scheduledStartDate: 'invalid-date',
        },
      });

      expect(updateResponse.statusCode).toBe(400);
      const body = updateResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/admin/simulations/:id/audience - body validation', () => {
    it('returns 400 when groupIds contains invalid UUID', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      const simulation = createResponse.json().data;

      const audienceResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}/audience`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          groupIds: ['not-a-valid-uuid'],
        },
      });

      expect(audienceResponse.statusCode).toBe(400);
      const body = audienceResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when groupIds is not an array', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      const simulation = createResponse.json().data;

      const audienceResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}/audience`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          groupIds: 'not-an-array',
        },
      });

      expect(audienceResponse.statusCode).toBe(400);
      const body = audienceResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when attributeFilters is not an object', async () => {
      const { accessToken } = await registerAdminUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/simulations',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Simulation',
          subject: 'Test Subject',
          body: 'Test body content',
        },
      });

      const simulation = createResponse.json().data;

      const audienceResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/simulations/${simulation.id}/audience`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          attributeFilters: 'not-an-object',
        },
      });

      expect(audienceResponse.statusCode).toBe(400);
      const body = audienceResponse.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
