import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { party } from '#/db/schema/multiplayer/party.js';
import { partyMember } from '#/db/schema/multiplayer/party-member.js';
import { coopSession } from '#/db/schema/multiplayer/coop-session.js';
import { playerProfiles } from '#/db/schema/social/player-profiles.js';
import { users } from '#/shared/database/schema/users.js';
import { tenants } from '#/shared/database/schema/tenants.js';
import { buildApp } from '#/app.js';
import { loadConfig, type AppConfig } from '#/config.js';
import { closeDatabase, getDatabaseClient } from '#/shared/database/connection.js';
import { resetTestDatabase, ensureTenantColumns } from '#/__tests__/helpers/db.js';
import { getRefreshCookieName } from '#/modules/auth/cookies.js';

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

const unique = Date.now();

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const createUserAndGetTokens = async (
  app: ReturnType<typeof buildApp>,
  tenantId: string,
  email: string,
  displayName: string,
): Promise<{ userId: string; tenantId: string; tokens: AuthTokens; profileId: string }> => {
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

  const cookies = registerResponse.cookies;
  const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());

  const body = registerResponse.json() as {
    accessToken: string;
    user: { id: string; tenantId: string };
  };

  const db = getDatabaseClient(testConfig);
  const [profile] = await db
    .insert(playerProfiles)
    .values({
      profileId: body.user.id,
      tenantId: body.tenantId,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ profileId: playerProfiles.profileId });

  return {
    userId: body.user.id,
    tenantId: body.tenantId,
    tokens: {
      accessToken: body.accessToken,
      refreshToken: refreshTokenCookie?.value ?? '',
    },
    profileId: profile.profileId,
  };
};

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);
  await ensureTenantColumns(testConfig);

  const pool = getDatabaseClient(testConfig);
  try {
    await pool.unsafe(
      `TRUNCATE TABLE "multiplayer"."coop_decision_proposal" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(
      `TRUNCATE TABLE "multiplayer"."coop_role_assignment" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."coop_session" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party_member" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "social"."player_profiles" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }
};

describe('coop session lifecycle API', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
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

  beforeEach(async () => {
    await resetTestData();
  });

  let user1: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let user2: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let party1Id: string;
  let party2Id: string;
  let sessionId: string;

  it('registers two users and creates parties', async () => {
    user1 = await createUserAndGetTokens(
      app,
      '',
      `coop-user1-${unique}@archive.test`,
      'Coop User 1',
    );
    user2 = await createUserAndGetTokens(
      app,
      '',
      `coop-user2-${unique}@archive.test`,
      'Coop User 2',
    );

    const partyResponse1 = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {},
    });

    expect(partyResponse1.statusCode).toBe(200);
    const partyBody1 = partyResponse1.json() as { party: { partyId: string } };
    party1Id = partyBody1.party.partyId;

    const partyResponse2 = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${user2.tokens.accessToken}` },
      payload: {},
    });

    expect(partyResponse2.statusCode).toBe(200);
    const partyBody2 = partyResponse2.json() as { party: { partyId: string } };
    party2Id = partyBody2.party.partyId;
  });

  it('creates a coop session', async () => {
    const sessionResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/coop/sessions',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {
        partyId: party1Id,
        seed: '12345678901234567890123456789012',
      },
    });

    expect(sessionResponse.statusCode).toBe(200);
    const body = sessionResponse.json() as {
      success: boolean;
      session: { sessionId: string; status: string };
    };
    expect(body.success).toBe(true);
    expect(body.session.status).toBe('lobby');
    sessionId = body.session.sessionId;
  });

  it('gets a coop session', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/coop/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(getResponse.statusCode).toBe(200);
    const body = getResponse.json() as { success: boolean; session: { sessionId: string } };
    expect(body.success).toBe(true);
    expect(body.session.sessionId).toBe(sessionId);
  });

  it('returns 404 for non-existent session', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/coop/sessions/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(getResponse.statusCode).toBe(404);
  });

  it('assigns roles to session', async () => {
    const assignResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/sessions/${sessionId}/roles`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {
        player1Id: user1.profileId,
        player2Id: user2.profileId,
      },
    });

    expect(assignResponse.statusCode).toBe(200);
    const body = assignResponse.json() as {
      success: boolean;
      session: { roles: Array<{ role: string }> };
    };
    expect(body.success).toBe(true);
    expect(body.session.roles.length).toBe(2);
  });

  it('starts a session', async () => {
    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/${sessionId}/start`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {
        scenarioId: 'triage-training-01',
        difficultyTier: 'training',
      },
    });

    expect(startResponse.statusCode).toBe(200);
    const body = startResponse.json() as {
      success: boolean;
      session: { status: string; dayNumber: number };
    };
    expect(body.success).toBe(true);
    expect(body.session.status).toBe('active');
    expect(body.session.dayNumber).toBe(1);
  });

  it('advances day', async () => {
    const advanceResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/sessions/${sessionId}/advance-day`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(advanceResponse.statusCode).toBe(200);
    const body = advanceResponse.json() as { success: boolean; session: { dayNumber: number } };
    expect(body.success).toBe(true);
    expect(body.session.dayNumber).toBe(2);
  });

  it('rotates authority', async () => {
    const rotateResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/coop/sessions/${sessionId}/authority`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(rotateResponse.statusCode).toBe(200);
    const body = rotateResponse.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('gets session permissions', async () => {
    const permResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/coop/${sessionId}/permissions`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(permResponse.statusCode).toBe(200);
    const body = permResponse.json() as { success: boolean; config: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.config).toBeDefined();
  });

  it('ends a session', async () => {
    const endResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/sessions/${sessionId}/end`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(endResponse.statusCode).toBe(200);
    const body = endResponse.json() as { success: boolean; session: { status: string } };
    expect(body.success).toBe(true);
    expect(body.session.status).toBe('completed');
  });

  it('abandons a session', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/coop/sessions',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {
        partyId: party1Id,
        seed: 'abcdefghijklmnopqrstuvwxyz01',
      },
    });
    const newSessionId = (createRes.json() as { session: { sessionId: string } }).session.sessionId;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/coop/sessions/${newSessionId}`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(deleteRes.statusCode).toBe(200);
    const body = deleteRes.json() as { success: boolean; session: { status: string } };
    expect(body.success).toBe(true);
    expect(body.session.status).toBe('abandoned');
  });

  it('rejects concurrent update with stale sequence', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/coop/sessions',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {
        partyId: party2Id,
        seed: 'abcdefghijklmnopqrstuvwxyz02',
      },
    });
    const testSessionId = (createRes.json() as { session: { sessionId: string } }).session
      .sessionId;

    const startRes = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/${testSessionId}/start`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: { scenarioId: 'triage-training-01', difficultyTier: 'training' },
    });
    expect(startRes.statusCode).toBe(200);

    const advanceRes1 = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/sessions/${testSessionId}/advance-day`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });
    expect(advanceRes1.statusCode).toBe(200);

    const db = getDatabaseClient(testConfig);
    await db
      .update(coopSession)
      .set({ sessionSeq: 0n })
      .where(eq(coopSession.sessionId, testSessionId));

    const advanceRes2 = await app.inject({
      method: 'POST',
      url: `/api/v1/coop/sessions/${testSessionId}/advance-day`,
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
    });

    expect(advanceRes2.statusCode).toBe(409);
  });
});
