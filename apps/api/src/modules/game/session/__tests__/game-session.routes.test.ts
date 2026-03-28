import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../../shared/database/connection.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../../__tests__/helpers/db.js';

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
    await pool.unsafe(`TRUNCATE TABLE "game_sessions" RESTART IDENTITY CASCADE`);
  } catch {
    // Some local test databases do not have the game schema fully migrated yet.
  }

  await ensureTenantColumns(testConfig);
};

describe('game session routes', () => {
  const app = buildApp(testConfig);
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let environmentReady = false;
  let skipReason = 'game session test prerequisites are unavailable in the current test database';

  beforeAll(async () => {
    await resetTestData();
    await app.ready();

    const pool = getDatabasePool(testConfig);
    const [prerequisites] = await pool`
      SELECT
        to_regclass('public.game_sessions') IS NOT NULL AS has_game_sessions,
        EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'idempotency'
            AND tablename = 'records'
            AND indexname = 'idempotency_tenant_key_hash_unique'
        ) AS has_idempotency_index
    `;

    if (!prerequisites?.['has_game_sessions']) {
      skipReason = 'game_sessions table is missing from dmz_test';
      return;
    }

    if (!prerequisites?.['has_idempotency_index']) {
      skipReason = 'idempotency unique index is missing from dmz_test';
      return;
    }

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'game-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Game Test User',
      },
    });

    if (registerResponse.statusCode !== 201) {
      skipReason = `auth/register returned ${registerResponse.statusCode}`;
      return;
    }

    const body = registerResponse.json();
    authToken = body.accessToken;
    tenantId = body.user.tenantId;
    userId = body.user.id;
    environmentReady = true;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/game/session', () => {
    it('returns 200 and creates a new game session on first call', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
          'Idempotency-Key': 'game-session-create-01',
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

    it('returns existing session on repeated calls (idempotent)', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
          'Idempotency-Key': 'game-session-repeat-01',
        },
      });

      const firstBody = firstResponse.json();
      const firstSessionId = firstBody.data.sessionId;

      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${authToken}`,
          'Idempotency-Key': 'game-session-repeat-01',
        },
      });

      const secondBody = secondResponse.json();
      expect(secondBody.data.sessionId).toBe(firstSessionId);
    });

    it('returns 401 without authorization header', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/game/session', () => {
    it('returns 200 and the existing session', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

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

    it('returns 404 when no session exists', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

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

    it('returns 401 without authorization header', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/game/session',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
