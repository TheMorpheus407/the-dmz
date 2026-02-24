import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../../shared/database/connection.js';

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
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.user_profiles,
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;

  try {
    await pool`TRUNCATE TABLE game_sessions RESTART IDENTITY CASCADE`;
  } catch {
    // Table might not exist yet
  }
};

describe('game session routes', () => {
  const app = buildApp(testConfig);
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    await resetTestData();
    await app.ready();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'game-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Game Test User',
      },
    });

    const body = registerResponse.json();
    authToken = body.accessToken;
    tenantId = body.user.tenantId;
    userId = body.user.id;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/game/session', () => {
    it('returns 200 and creates a new game session on first call', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.schemaVersion).toBe(1);
      expect(body.data.tenantId).toBe(tenantId);
      expect(body.data.userId).toBe(userId);
      expect(body.data.day).toBe(1);
      expect(body.data.funds).toBe(1000);
      expect(body.data.clientCount).toBe(5);
      expect(body.data.threatLevel).toBe('low');
      expect(body.data.facilityLoadout).toEqual({
        defenseLevel: 1,
        serverLevel: 1,
        networkLevel: 1,
      });
      expect(body.data.sessionId).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
    });

    it('returns existing session on repeated calls (idempotent)', async () => {
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const firstBody = firstResponse.json();
      const firstSessionId = firstBody.data.sessionId;

      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const secondBody = secondResponse.json();
      expect(secondBody.data.sessionId).toBe(firstSessionId);
    });

    it('returns 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/game/session', () => {
    it('returns 200 and the existing session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.sessionId).toBeDefined();
      expect(body.data.tenantId).toBe(tenantId);
      expect(body.data.userId).toBe(userId);
    });

    it('returns 404 when no session exists', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'new-user@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'New User',
        },
      });

      const newUserBody = registerResponse.json();
      const newAuthToken = newUserBody.accessToken;

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${newAuthToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/game/session',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
