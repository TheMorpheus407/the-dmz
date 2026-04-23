import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
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
    await pool.unsafe(`TRUNCATE TABLE "lrs"."scorm_packages" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  try {
    await pool.unsafe(`TRUNCATE TABLE "lrs"."scorm_registrations" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

describe('SCORM routes', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  let userAccessToken: string;
  let userId: string;
  let _tenantId: string;

  beforeEach(async () => {
    await resetTestData();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'scorm-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'SCORM Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const body = registerResponse.json();
    userAccessToken = body.accessToken;
    userId = body.userId;
    _tenantId = body.tenantId;
  });

  describe('Package CRUD', () => {
    let _createdPackageId: string;

    it('creates a package → 201', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Test SCORM Package',
          description: 'A test package',
          version: '1.2',
          masteringScore: 80,
          contentId: 'test-content-1',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const pkg = createResponse.json();
      expect(pkg.title).toBe('Test SCORM Package');
      expect(pkg.version).toBe('1.2');
      expect(pkg.masteringScore).toBe(80);
      expect(pkg.id).toBeDefined();
      createdPackageId = pkg.id;
    });

    it('lists packages → 200 with array', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Package 1',
          version: '1.2',
          contentId: 'content-1',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Package 2',
          version: '2004_3rd',
          contentId: 'content-2',
        },
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const packages = listResponse.json();
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeGreaterThanOrEqual(2);
    });

    it('gets package by ID → 200', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Get Test Package',
          version: '2004_4th',
          contentId: 'get-test',
        },
      });

      const pkg = createResponse.json();

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scorm/packages/${pkg.id}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const found = getResponse.json();
      expect(found.id).toBe(pkg.id);
      expect(found.title).toBe('Get Test Package');
    });

    it('gets non-existent package → 404', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/packages/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('deletes package → 204', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Delete Test Package',
          version: '1.2',
          contentId: 'delete-test',
        },
      });

      const pkg = createResponse.json();

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/scorm/packages/${pkg.id}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);
    });
  });

  describe('Registration lifecycle', () => {
    let packageId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Registration Test Package',
          version: '1.2',
          contentId: 'reg-test',
        },
      });

      packageId = createResponse.json().id;
    });

    it('creates a registration → 201', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId,
          userId,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const reg = createResponse.json();
      expect(reg.packageId).toBe(packageId);
      expect(reg.userId).toBe(userId);
      expect(reg.status).toBe('in_progress');
    });

    it('creates registration for non-existent package → 404', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId: '00000000-0000-0000-0000-000000000000',
          userId,
        },
      });

      expect(createResponse.statusCode).toBe(404);
    });

    it('gets registration → 200', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId,
          userId,
        },
      });

      const reg = createResponse.json();

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scorm/registrations/${reg.id}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const found = getResponse.json();
      expect(found.id).toBe(reg.id);
    });

    it('gets non-existent registration → 404', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/registrations/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('updates registration status → 200', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId,
          userId,
        },
      });

      const reg = createResponse.json();

      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scorm/registrations/${reg.id}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          status: 'completed',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = updateResponse.json();
      expect(updated.status).toBe('completed');
    });

    it('updates registration score → 200', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId,
          userId,
        },
      });

      const reg = createResponse.json();

      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scorm/registrations/${reg.id}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          score: 85,
          completionStatus: 'completed',
          successStatus: 'passed',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = updateResponse.json();
      expect(updated.score).toBe(85);
      expect(updated.completionStatus).toBe('completed');
      expect(updated.successStatus).toBe('passed');
    });

    it('lists registrations for package → 200 with array', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId,
          userId,
        },
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scorm/packages/${packageId}/registrations`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const registrations = listResponse.json();
      expect(Array.isArray(registrations)).toBe(true);
      expect(registrations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Auth requirements', () => {
    it('request without auth → 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/packages',
      });

      expect(response.statusCode).toBe(401);
    });

    it('request with invalid token → 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Tenant isolation', () => {
    it('returns 404 when accessing non-existent package', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scorm/packages/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('isolates packages between tenants → 404 for other tenant', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Tenant A Package',
          version: '1.2',
          contentId: 'tenant-a-content',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const pkg = createResponse.json();
      const tenantAPackageId = pkg.id;

      const registerResponse2 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant-b-user@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Tenant B User',
        },
      });

      expect(registerResponse2.statusCode).toBe(201);
      const body2 = registerResponse2.json();
      const user2Token = body2.accessToken;

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scorm/packages/${tenantAPackageId}`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/scorm/packages/${tenantAPackageId}`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(404);
    });

    it('isolates registrations between tenants → 404 for other tenant', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/packages',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          title: 'Tenant A Reg Package',
          version: '2004_4th',
          contentId: 'tenant-a-reg-content',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const pkg = createResponse.json();

      const regResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scorm/registrations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          packageId: pkg.id,
          userId,
        },
      });

      expect(regResponse.statusCode).toBe(201);
      const reg = regResponse.json();
      const tenantARegId = reg.id;

      const registerResponse2 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant-b-user2@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Tenant B User 2',
        },
      });

      expect(registerResponse2.statusCode).toBe(201);
      const body2 = registerResponse2.json();
      const user2Token = body2.accessToken;

      const getRegResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scorm/registrations/${tenantARegId}`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(getRegResponse.statusCode).toBe(404);
    });
  });
});
