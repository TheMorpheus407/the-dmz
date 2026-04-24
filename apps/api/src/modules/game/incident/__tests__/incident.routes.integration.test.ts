/* eslint-disable max-lines, max-statements */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../../app.js';
import { loadConfig, type AppConfig } from '../../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../../shared/database/connection.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../../__tests__/helpers/db.js';
import * as incidentRepo from '../incident.repo.js';

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
    await pool.unsafe(`TRUNCATE TABLE "incidents" RESTART IDENTITY CASCADE`);
  } catch {
    // Some local test databases do not have the game schema fully migrated yet.
  }

  await ensureTenantColumns(testConfig);
};

describe('incident routes integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let authToken: string;
  let tenantId: string;
  let sessionId: string;
  let userId: string;
  let environmentReady = false;
  let skipReason = 'game session test prerequisites are unavailable in the current test database';

  const checkPrerequisites = async (): Promise<boolean> => {
    const pool = getDatabasePool(testConfig);
    const [prerequisites] = await pool`
      SELECT
        to_regclass('public.game_sessions') IS NOT NULL AS has_game_sessions,
        to_regclass('public.incidents') IS NOT NULL AS has_incidents,
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

    if (!prerequisites?.['has_incidents']) {
      skipReason = 'incidents table is missing from dmz_test';
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
        email: 'incident-integration-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Incident Integration Test',
      },
    });

    if (registerResponse.statusCode !== 201) {
      skipReason = `auth/register returned ${registerResponse.statusCode}`;
      return false;
    }

    const body = registerResponse.json();
    authToken = body.accessToken;
    tenantId = body.user.tenantId;
    userId = body.user.userId;
    return true;
  };

  const createTestSession = async (): Promise<boolean> => {
    const sessionResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/game/session',
      headers: {
        authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `incident-integration-test-${Date.now()}`,
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

  const createTestIncident = async (overrides: Partial<incidentRepo.NewIncident> = {}) => {
    const pool = getDatabasePool(testConfig);
    const incidentId = randomUUID();
    const now = new Date().toISOString();

    const defaultIncident: incidentRepo.NewIncident = {
      incidentId,
      sessionId,
      userId,
      tenantId,
      attackId: randomUUID(),
      day: 1,
      detectionSource: 'siem',
      classification: 'phishing',
      severity: 2,
      affectedAssets: [],
      evidence: { indicators: [], logs: [] },
      status: 'open',
      timeline: [
        {
          timestamp: now,
          day: 1,
          action: 'incident_created',
          description: 'Test incident created',
          actor: 'system',
        },
        {
          timestamp: now,
          day: 1,
          action: 'detected',
          description: 'Detected by SIEM',
          actor: 'system',
        },
      ],
      responseActions: [],
    };

    const incident = await incidentRepo.createIncident(pool, {
      ...defaultIncident,
      ...overrides,
    });
    return incident;
  };

  beforeAll(async () => {
    await resetTestData();
    app = await buildApp(testConfig);
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

  describe('Authentication', () => {
    it('returns 401 when no token is provided', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 when invalid token is provided', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents`,
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /game/sessions/:sessionId/incidents', () => {
    it('returns empty array when no incidents exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data).toHaveLength(0);
    });

    it('returns all incidents for session', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      await createTestIncident({ status: 'open' });
      await createTestIncident({ status: 'investigating', day: 2 });
      await createTestIncident({ status: 'closed', day: 3 });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data).toHaveLength(3);
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/active', () => {
    it('returns only active incidents', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      await createTestIncident({ status: 'open' });
      await createTestIncident({ status: 'investigating' });
      await createTestIncident({ status: 'closed' });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/active`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data).toHaveLength(2);
      for (const incident of body.data) {
        expect(['open', 'investigating', 'contained']).toContain(incident.status);
      }
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/:incidentId', () => {
    it('returns incident by id', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident();

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.incidentId).toBe(incident.incidentId);
      expect(body.data.classification).toBe('phishing');
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/:incidentId/available-actions', () => {
    it('returns available actions for phishing incident', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ classification: 'phishing' });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/available-actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data).toContain('deny_email');
    });

    it('returns available actions for ddos incident', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ classification: 'ddos' });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/available-actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data).toContain('rate_limiting');
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/status', () => {
    beforeEach(async () => {
      if (!environmentReady) return;
    });

    it('updates incident status', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ status: 'open' });

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/status`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          status: 'investigating',
          day: 2,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe('investigating');
    });

    it('adds timeline entry on status change', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ status: 'open' });

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/status`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          status: 'contained',
          notes: 'Contained the threat',
          day: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const timelineEntry = body.data.timeline.find(
        (entry: { action: string }) => entry.action === 'status_changed_to_contained',
      );
      expect(timelineEntry).toBeDefined();
      expect(timelineEntry.description).toBe('Contained the threat');
      expect(timelineEntry.actor).toBe('player');
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/actions', () => {
    it('adds response action', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident();

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          actionType: 'deny_email',
          effectiveness: 0.85,
          day: 2,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.responseActions).toBeInstanceOf(Array);
      const addedAction = body.data.responseActions.find(
        (action: { actionType: string }) => action.actionType === 'deny_email',
      );
      expect(addedAction).toBeDefined();
      expect(addedAction.effectiveness).toBe(0.85);
    });

    it('adds timeline entry when response action is taken', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident();

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/actions`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          actionType: 'report_threat_intel',
          day: 2,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const timelineEntry = body.data.timeline.find(
        (entry: { action: string }) => entry.action === 'response_action',
      );
      expect(timelineEntry).toBeDefined();
      expect(timelineEntry.description).toContain('report_threat_intel');
    });
  });

  describe('POST /game/sessions/:sessionId/incidents/:incidentId/resolve', () => {
    it('resolves incident with outcome', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ status: 'open' });

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/resolve`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          outcome: 'Successfully contained and eradicated',
          rootCause: 'Phishing email',
          lessonsLearned: 'Better email filtering needed',
          day: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe('closed');
      expect(body.data.outcome).toBe('Successfully contained and eradicated');
      expect(body.data.rootCause).toBe('Phishing email');
      expect(body.data.resolutionDays).toBe(4);
    });

    it('adds timeline entry on resolution', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ status: 'open' });

      const response = await app.inject({
        method: 'POST',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/resolve`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          outcome: 'Resolved',
          day: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const timelineEntry = body.data.timeline.find(
        (entry: { action: string }) => entry.action === 'incident_resolved',
      );
      expect(timelineEntry).toBeDefined();
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/:incidentId/review', () => {
    it('returns post-incident review for resolved incident', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const incident = await createTestIncident({ status: 'closed' });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/${incident.incidentId}/review`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.incidentId).toBe(incident.incidentId);
      expect(body.data.detectionAnalysis).toBeDefined();
      expect(body.data.responseEvaluation).toBeDefined();
      expect(body.data.rootCause).toBeDefined();
      expect(body.data.recommendations).toBeInstanceOf(Array);
      expect(body.data.competenceScore).toBeDefined();
    });
  });

  describe('GET /game/sessions/:sessionId/incidents/stats', () => {
    it('returns incident statistics', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      await createTestIncident({ status: 'open' });
      await createTestIncident({ status: 'open' });
      await createTestIncident({ status: 'investigating' });
      await createTestIncident({ status: 'closed', resolutionDays: 3 });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/stats`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.total).toBe(4);
      expect(body.data.open).toBe(2);
      expect(body.data.investigating).toBe(1);
      expect(body.data.closed).toBe(1);
      expect(body.data.avgResolutionDays).toBe(3);
    });

    it('returns zero stats when no incidents exist', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${sessionId}/incidents/stats`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.total).toBe(0);
      expect(body.data.open).toBe(0);
      expect(body.data.avgResolutionDays).toBe(0);
    });
  });

  describe('Tenant isolation', () => {
    it('does not return incidents from another tenant', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const otherTenantId = randomUUID();
      const otherUserId = randomUUID();
      const pool = getDatabasePool(testConfig);
      const otherSessionId = randomUUID();

      await pool`
        INSERT INTO game_sessions (id, tenant_id, user_id, status, current_day)
        VALUES (
          ${otherSessionId}::uuid,
          ${otherTenantId}::uuid,
          ${otherUserId}::uuid,
          'active',
          1
        )
      `;

      await createTestIncident({
        sessionId: otherSessionId,
        tenantId: otherTenantId,
        userId: otherUserId,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${otherSessionId}/incidents`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('user cannot access incidents via another users session', async (ctx) => {
      if (!environmentReady) {
        ctx.skip(skipReason);
      }

      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'other-user@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Other User',
        },
      });

      if (registerResponse.statusCode !== 201) {
        ctx.skip('Could not create other user');
        return;
      }

      const otherUserToken = registerResponse.json().accessToken;

      const sessionResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/session',
        headers: {
          authorization: `Bearer ${otherUserToken}`,
          'Idempotency-Key': `other-user-session-${Date.now()}`,
        },
      });

      if (sessionResponse.statusCode !== 200) {
        ctx.skip('Could not create other user session');
        return;
      }

      const otherUserSessionId = sessionResponse.json().data.sessionId;
      const incident = await createTestIncident({ sessionId: otherUserSessionId });

      const response = await app.inject({
        method: 'GET',
        url: `/game/sessions/${otherUserSessionId}/incidents/${incident.incidentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
