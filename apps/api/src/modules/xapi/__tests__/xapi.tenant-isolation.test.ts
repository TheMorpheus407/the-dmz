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

describe('xAPI Tenant isolation', () => {
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

  it('prevents tenant A from accessing tenant B statements', async () => {
    const { accessToken: accessTokenA } = await registerUser(app);
    const { accessToken: accessTokenB } = await registerUser(
      app,
      `tenant-b-${createTestId()}@archive.test`,
    );

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/xapi/statements',
      headers: { authorization: `Bearer ${accessTokenA}` },
      payload: {
        verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
        object: { id: 'https://example.com/activity/tenant-a-only' },
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();

    const getByIdResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/xapi/statements/${created.statementId}`,
      headers: {
        authorization: `Bearer ${accessTokenB}`,
      },
    });

    expect(getByIdResponse.statusCode).toBe(404);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/xapi/statements',
      headers: {
        authorization: `Bearer ${accessTokenB}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = listResponse.json();
    const tenantAStatement = listBody.statements.find(
      (s: { statementId: string }) => s.statementId === created.statementId,
    );
    expect(tenantAStatement).toBeUndefined();
  });

  it('prevents tenant A from accessing tenant B LRS configs', async () => {
    const { accessToken: accessTokenA } = await registerUser(app);
    const { accessToken: accessTokenB } = await registerUser(
      app,
      `tenant-b-isolate-${createTestId()}@archive.test`,
    );

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/xapi/lrs-configs',
      headers: { authorization: `Bearer ${accessTokenA}` },
      payload: {
        name: 'Tenant A LRS',
        endpoint: 'https://tenant-a.lrs.example.com/data/xAPI',
        authKeyId: 'key123',
        authSecret: 'secret123456',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();

    const getByIdResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/xapi/lrs-configs/${created.id}`,
      headers: {
        authorization: `Bearer ${accessTokenB}`,
      },
    });

    expect(getByIdResponse.statusCode).toBe(404);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/xapi/lrs-configs',
      headers: {
        authorization: `Bearer ${accessTokenB}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = listResponse.json();
    const tenantAConfig = listBody.configs.find((c: { id: string }) => c.id === created.id);
    expect(tenantAConfig).toBeUndefined();
  });
});
