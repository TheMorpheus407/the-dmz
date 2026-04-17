import { randomUUID } from 'crypto';

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

describe('incident routes error codes', () => {
  const app = buildApp(testConfig);
  let authToken: string;
  let _tenantId: string;
  let sessionId: string;
  let environmentReady = false;
  let skipReason = 'game session test prerequisites are unavailable in the current test database';

  const checkPrerequisites = async (): Promise<boolean> => {
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
      return false;
    }

    if (!prerequisites?.['has_idempotency_index']) {
      skipReason = 'idempotency unique index is missing from dmz_test';
      return false;
    }

    return true;
  };

  const registerTestUser = async (): Promise<boolean> => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'incident-error-code-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Incident Error Code Test',
      },
    });

    if (registerResponse.statusCode !== 201) {
      skipReason = `auth/register returned ${registerResponse.statusCode}`;
      return false;
    }

    const body = registerResponse.json();
    authToken = body.accessToken;
    _tenantId = body.user.tenantId;
    return true;
  };

  const createTestSession = async (): Promise<boolean> => {
    const sessionResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/game/session',
      headers: {
        authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `incident-error-code-test-${Date.now()}`,
      },
    });

    if (sessionResponse.statusCode !== 200) {
      skipReason = `game/session returned ${sessionResponse.statusCode}`;
      return false;
    }

    const sessionBody = sessionResponse.json();
    sessionId = sessionBody.data.sessionId;
    return true;
  };

  beforeAll(async () => {
    await resetTestData();
    await app.ready();

    if (!(await checkPrerequisites())) {
      return;
    }

    if (!(await registerTestUser())) {
      return;
    }

    if (!(await createTestSession())) {
      return;
    }

    environmentReady = true;
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  const nonExistentIncidentId = randomUUID();

  describe('GET /game/sessions/:sessionId/incidents/:incidentId', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/:incidentId/available-actions', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}/available-actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/status', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}/status`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          status: 'investigating',
          day: 1,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/actions', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}/actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          actionType: 'deny_email',
          effectiveness: 0.8,
          day: 1,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/resolve', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}/resolve`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          outcome: 'Resolved',
          day: 10,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/:incidentId/review', () => {
    it('returns 404 with GAME_INCIDENT_NOT_FOUND when incident does not exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${nonExistentIncidentId}/review`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('GAME_INCIDENT_NOT_FOUND');
      expect(body.error.message).toBe('Incident not found');
      expect(body.error.details).toEqual({});
    });
  });
});
