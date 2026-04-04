import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';

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

const unique = Date.now() + 2;

const createUserAndGetToken = async (
  app: ReturnType<typeof buildApp>,
  email: string,
  displayName: string,
): Promise<{ accessToken: string }> => {
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email,
      password: 'Valid' + 'Pass123!',
      displayName,
    },
  });

  if (registerResponse.statusCode !== 201) {
    throw new Error(
      `Failed to create user: ${registerResponse.statusCode} - ${registerResponse.body}`,
    );
  }

  const body = registerResponse.json() as { accessToken: string };
  return { accessToken: body.accessToken };
};

describe('coop scenarios HTTP API', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    try {
      await app.close();
    } catch {
      // App may not be ready or already closed
    }
  });

  let accessToken: string;

  it('registers a user', async () => {
    const result = await createUserAndGetToken(
      app,
      `scenarios-user-${unique}@archive.test`,
      'Scenarios User',
    );
    accessToken = result.accessToken;
  });

  it('lists all scenarios', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { success: boolean; scenarios: Array<{ id: string }> };
    expect(body.success).toBe(true);
    expect(body.scenarios.length).toBeGreaterThan(0);
  });

  it('lists scenarios by difficulty', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios?difficulty=training',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      success: boolean;
      scenarios: Array<{ difficultyTiers: string[] }>;
    };
    expect(body.success).toBe(true);
    expect(body.scenarios.every((s) => s.difficultyTiers.includes('training'))).toBe(true);
  });

  it('gets a specific scenario', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios/cascade_failure',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { success: boolean; scenario: { id: string } };
    expect(body.success).toBe(true);
    expect(body.scenario.id).toBe('cascade_failure');
  });

  it('gets scenario with difficulty scaling', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios/cascade_failure?difficulty=hardened',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      success: boolean;
      scenario: { id: string };
      scaling: { emailVolumeMultiplier: number } | null;
    };
    expect(body.success).toBe(true);
    expect(body.scenario.id).toBe('cascade_failure');
    expect(body.scaling).not.toBeNull();
    expect(typeof body.scaling?.emailVolumeMultiplier).toBe('number');
  });

  it('returns 404 for non-existent scenario', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios/non-existent-scenario',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('rejects invalid difficulty tier', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/coop/scenarios/cascade_failure?difficulty=invalid',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});
