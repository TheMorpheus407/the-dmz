import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { createTestId } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';
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

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);

  const pool = getDatabasePool(testConfig);
  try {
    await pool.unsafe(`TRUNCATE TABLE "training"."certificates" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

const registerUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `certificate-route-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Certificate Route Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('certificate routes security', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await seedDatabase(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('GET /api/v1/admin/certificates/:certificateId/pdf', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/certificates/00000000-0000-0000-0000-000000000001/pdf',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 403 with trainer role', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'trainer' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/certificates/00000000-0000-0000-0000-000000000001/pdf',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });

    it('sets X-Download-Options header for PDF download', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [
        { userId: user.id, role: 'tenant_admin' },
      ]);

      const generateResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/certificates/generate',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          userId: user.id,
          frameworkId: 'nist_800_50',
          courseName: 'Test Security Awareness Course',
          userName: 'Certificate Route Test User',
        },
      });

      expect(generateResponse.statusCode).toBe(201);
      const generateBody = generateResponse.json();
      expect(generateBody.success).toBe(true);
      const certificateId = generateBody.data.certificateId;

      const downloadResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/certificates/${certificateId}/pdf`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(downloadResponse.statusCode).toBe(200);
      expect(downloadResponse.headers['x-download-options']).toBe('noopen');
      expect(downloadResponse.headers['content-type']).toBe('application/pdf');
      expect(downloadResponse.headers['content-disposition']).toContain('attachment');
    });
  });
});
