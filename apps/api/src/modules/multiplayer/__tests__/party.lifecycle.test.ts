import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { party } from '#/db/schema/multiplayer/party.js';
import { partyMember } from '#/db/schema/multiplayer/party-member.js';
import { playerProfiles } from '#/db/schema/social/player-profiles.js';
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

const unique = Date.now() + 1;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const createUserAndGetTokens = async (
  app: ReturnType<typeof buildApp>,
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
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party_member" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "social"."player_profiles" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }
};

describe('party lifecycle API', () => {
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

  let leader: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let member: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let partyId: string;
  let inviteCode: string;

  it('registers two users', async () => {
    leader = await createUserAndGetTokens(
      app,
      `party-leader-${unique}@archive.test`,
      'Party Leader',
    );
    member = await createUserAndGetTokens(
      app,
      `party-member-${unique}@archive.test`,
      'Party Member',
    );
  });

  it('creates a party', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
      payload: {
        difficulty: 'training',
        preferredRole: 'triage_lead',
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const body = createResponse.json() as {
      success: boolean;
      party: { partyId: string; inviteCode: string; status: string };
    };
    expect(body.success).toBe(true);
    expect(body.party.status).toBe('forming');
    expect(body.party.inviteCode).toHaveLength(8);
    partyId = body.party.partyId;
    inviteCode = body.party.inviteCode;
  });

  it('gets a party', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/parties/${partyId}`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(getResponse.statusCode).toBe(200);
    const body = getResponse.json() as { success: boolean; party: { partyId: string } };
    expect(body.success).toBe(true);
    expect(body.party.partyId).toBe(partyId);
  });

  it('returns 404 for non-existent party', async () => {
    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/parties/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(getResponse.statusCode).toBe(404);
  });

  it('joins a party via invite code', async () => {
    const joinResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/parties/${partyId}/join`,
      headers: { authorization: `Bearer ${member.tokens.accessToken}` },
      payload: {
        inviteCode,
      },
    });

    expect(joinResponse.statusCode).toBe(200);
    const body = joinResponse.json() as {
      success: boolean;
      party: { members: Array<{ playerId: string }> };
    };
    expect(body.success).toBe(true);
    expect(body.party.members.length).toBe(2);
  });

  it('toggles ready status', async () => {
    const readyResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/parties/${partyId}/ready`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(readyResponse.statusCode).toBe(200);
    const body = readyResponse.json() as { success: boolean; party: { status: string } };
    expect(body.success).toBe(true);
  });

  it('sets declared role', async () => {
    const roleResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/parties/${partyId}/role`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
      payload: {
        declaredRole: 'verification_lead',
      },
    });

    expect(roleResponse.statusCode).toBe(200);
    const body = roleResponse.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('regenerates invite code', async () => {
    const regenerateResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/parties/${partyId}/regenerate-invite`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(regenerateResponse.statusCode).toBe(200);
    const body = regenerateResponse.json() as { success: boolean; party: { inviteCode: string } };
    expect(body.success).toBe(true);
    expect(body.party.inviteCode).toHaveLength(8);
    expect(body.party.inviteCode).not.toBe(inviteCode);
  });

  it('launches party', async () => {
    const launchResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/parties/${partyId}/launch`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(launchResponse.statusCode).toBe(200);
    const body = launchResponse.json() as { success: boolean; party: { status: string } };
    expect(body.success).toBe(true);
    expect(body.party.status).toBe('in_session');
  });

  it('leaves a party (member)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
      payload: {},
    });
    const newPartyId = (createRes.json() as { party: { partyId: string } }).party.partyId;

    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/parties/${newPartyId}/join`,
      headers: { authorization: `Bearer ${member.tokens.accessToken}` },
      payload: {
        inviteCode: (createRes.json() as { party: { inviteCode: string } }).party.inviteCode,
      },
    });
    expect(joinRes.statusCode).toBe(200);

    const leaveRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/parties/${newPartyId}/leave`,
      headers: { authorization: `Bearer ${member.tokens.accessToken}` },
    });

    expect(leaveRes.statusCode).toBe(200);
    const body = leaveRes.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('disbands a party (leader)', async () => {
    const disbandRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/parties/${partyId}`,
      headers: { authorization: `Bearer ${leader.tokens.accessToken}` },
    });

    expect(disbandRes.statusCode).toBe(200);
    const body = disbandRes.json() as { success: boolean; party: { status: string } };
    expect(body.success).toBe(true);
    expect(body.party.status).toBe('disbanded');
  });
});
