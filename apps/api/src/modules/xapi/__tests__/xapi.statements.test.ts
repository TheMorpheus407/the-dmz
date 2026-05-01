import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { createMockDate, createTestId } from '@the-dmz/shared/testing';

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

describe('xAPI Statement routes', () => {
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

  describe('POST /api/v1/xapi/statements', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        payload: {
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'https://example.com/activity/1' },
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 201 with valid statement', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'https://example.com/activity/1' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.statementId).toBeDefined();
      expect(body.stored).toBeDefined();
    });

    it('returns 400 with invalid statement body', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          verb: 'not-an-object',
          object: { id: 'https://example.com/activity/1' },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when verb is missing', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          object: { id: 'https://example.com/activity/1' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when object is missing', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('creates statement with optional fields', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          actor: {
            mbox: 'mailto:testuser@example.com',
            name: 'Test User Name',
          },
          object: {
            id: 'https://example.com/activity/complex',
            definition: {
              name: { 'en-US': 'Complex Activity' },
              description: { 'en-US': 'An activity with full metadata' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: {
            score: { raw: 85, min: 0, max: 100 },
            success: true,
            completion: true,
            duration: 'PT1H30M',
          },
          context: {
            extensions: {
              'https://example.com/extensions/session': 'session-123',
            },
          },
          version: '1.0.3',
          timestamp: '2024-03-15T10:00:00Z',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.statementId).toBeDefined();
      expect(body.stored).toBeDefined();

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/xapi/statements/${body.statementId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const retrieved = getResponse.json();
      expect(retrieved.actorMbox).toBe('mailto:testuser@example.com');
      expect(retrieved.actorName).toBe('Test User Name');
      expect(retrieved.objectName).toBe('Complex Activity');
      expect(retrieved.objectDescription).toBe('An activity with full metadata');
      expect(retrieved.resultScore).toBe(85);
      expect(retrieved.resultSuccess).toBe(true);
      expect(retrieved.resultCompletion).toBe(true);
      expect(retrieved.resultDuration).toBe('PT1H30M');
    });
  });

  describe('GET /api/v1/xapi/statements', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns empty list when no statements exist', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.statements).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('returns paginated statements', async () => {
      const { accessToken } = await registerUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'https://example.com/activity/1' },
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.statements.length).toBeGreaterThan(0);
      expect(body.total).toBeGreaterThan(0);
    });

    it('supports limit and offset pagination', async () => {
      const { accessToken } = await registerUser(app);

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/xapi/statements',
          headers: { authorization: `Bearer ${accessToken}` },
          payload: {
            verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
            object: { id: `https://example.com/activity/${i}` },
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements?limit=2&offset=0',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.statements.length).toBe(2);
    });

    it('supports filtering by verbId', async () => {
      const { accessToken } = await registerUser(app);

      const experiencedVerb = 'http://adlnet.gov/expapi/verbs/experienced';
      const completedVerb = 'http://adlnet.gov/expapi/verbs/completed';

      await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          verb: { id: experiencedVerb },
          object: { id: 'https://example.com/activity/1' },
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          verb: { id: completedVerb },
          object: { id: 'https://example.com/activity/2' },
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/xapi/statements?verbId=${encodeURIComponent(completedVerb)}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.statements.length).toBe(1);
      expect(body.statements[0].verbId).toBe(completedVerb);
    });
  });

  describe('GET /api/v1/xapi/statements/:statementId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent statement', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/xapi/statements/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns single statement by id', async () => {
      const { accessToken } = await registerUser(app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/statements',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'https://example.com/activity/test' },
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/xapi/statements/${created.statementId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.statementId).toBe(created.statementId);
    });
  });

  describe('POST /api/v1/xapi/archive', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/archive',
        payload: {
          beforeDate: createMockDate().toISOString(),
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 with invalid date format', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/archive',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          beforeDate: 'not-a-date',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns archived count', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/xapi/archive',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          beforeDate: createMockDate().toISOString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.archived).toBeDefined();
      expect(typeof body.archived).toBe('number');
    });
  });
});
