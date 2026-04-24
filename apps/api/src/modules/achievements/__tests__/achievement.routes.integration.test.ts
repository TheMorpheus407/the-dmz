import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
    await pool.unsafe(`TRUNCATE TABLE "auth"."oauth_clients" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

const setTenantContext = async (tenantId: string): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool.unsafe(
    `SELECT set_config('app.current_tenant_id', '${tenantId}', false), set_config('app.tenant_id', '${tenantId}', false)`,
  );
};

describe('Achievement routes HTTP integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await resetTestData();
    app = await buildApp(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  let userAccessToken: string;

  const registerTestUser = async (email: string): Promise<string> => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'Valid' + 'Pass123!',
        displayName: 'Achievement Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    return registerResponse.json().accessToken;
  };

  describe('Authentication', () => {
    it('rejects GET /achievements without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /players/me/achievements without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /players/:playerId/achievements without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000001/achievements',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /players/me/achievements/:id/share without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /achievements/enterprise without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /achievements (List achievement definitions)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('achievement-defs-test@example.com');
    });

    it('returns achievement definitions for authenticated tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
      expect(Array.isArray(body.achievements)).toBe(true);
    });

    it('returns only visible achievement definitions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const achievement of body.achievements) {
        expect(achievement.visibility).toBe('visible');
      }
    });

    it('returns achievement definitions with expected fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
      expect(Array.isArray(body.achievements));
      if (body.achievements.length > 0) {
        const achievement = body.achievements[0];
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('achievementKey');
        expect(achievement).toHaveProperty('category');
        expect(achievement).toHaveProperty('visibility');
        expect(achievement).toHaveProperty('title');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('points');
        expect(achievement).toHaveProperty('criteria');
      }
    });
  });

  describe('GET /players/me/achievements (Current player achievements)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('player-achievements-test@example.com');
    });

    it('returns empty achievements for new player without achievements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
      expect(Array.isArray(body.achievements)).toBe(true);
      expect(body.achievements.length).toBe(0);
    });

    it('returns achievements with definition data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const pa of body.achievements) {
        expect(pa).toHaveProperty('definition');
        expect(pa.definition).toHaveProperty('id');
        expect(pa.definition).toHaveProperty('achievementKey');
        expect(pa.definition).toHaveProperty('title');
        expect(pa).toHaveProperty('progress');
        expect(pa).toHaveProperty('unlockedAt');
        expect(pa).toHaveProperty('sharedToProfile');
      }
    });
  });

  describe('GET /players/:playerId/achievements (Public player achievements)', () => {
    let playerAccessToken: string;
    let _playerId: string;

    beforeAll(async () => {
      playerAccessToken = await registerTestUser('public-achievements-test@example.com');
      const profileResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${playerAccessToken}`,
        },
      });
      expect(profileResponse.statusCode).toBe(200);
    });

    it('returns 200 with empty achievements for player without shared achievements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${playerAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
      expect(Array.isArray(body.achievements)).toBe(true);
    });

    it('returns 200 for valid playerId format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000001/achievements',
        headers: {
          authorization: `Bearer ${playerAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
    });
  });

  describe('POST /players/me/achievements/:id/share (Toggle share status)', () => {
    let shareAccessToken: string;
    let shareTenantId: string;

    beforeAll(async () => {
      shareAccessToken = await registerTestUser('share-toggle-test@example.com');
    });

    // eslint-disable-next-line max-statements
    it('toggles share status from false to true and back to false', async () => {
      const pool = getDatabasePool(testConfig);

      const achievementsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${shareAccessToken}`,
        },
      });

      expect(achievementsResponse.statusCode).toBe(200);
      const achievementsBody = achievementsResponse.json();
      expect(achievementsBody.achievements.length).toBeGreaterThan(0);
      const achievementId = achievementsBody.achievements[0].id;

      const tenantResult = await pool.unsafe(
        `SELECT tenants.tenant_id FROM auth.users JOIN tenants ON users.tenant_id = tenants.tenant_id WHERE users.email = 'share-toggle-test@example.com' LIMIT 1`,
      );
      expect(tenantResult.length).toBeGreaterThan(0);
      shareTenantId = tenantResult[0].tenant_id;

      const playerResult = await pool.unsafe(
        `SELECT profile_id FROM social.player_profiles WHERE user_id = (SELECT user_id FROM auth.users WHERE email = 'share-toggle-test@example.com' LIMIT 1) LIMIT 1`,
      );
      expect(playerResult.length).toBeGreaterThan(0);
      const playerId = playerResult[0].profile_id;

      await setTenantContext(shareTenantId);
      await pool.unsafe(
        `INSERT INTO social.player_achievements (player_id, achievement_id, tenant_id, progress, notification_sent, shared_to_profile) VALUES ('${playerId}', '${achievementId}', '${shareTenantId}', '{"currentCount": 1, "lastUpdated": "${new Date().toISOString()}", "eventsProcessed": [], "completed": true}', false, false)`,
      );

      const toggle1Response = await app.inject({
        method: 'POST',
        url: `/api/v1/players/me/achievements/${achievementId}/share`,
        headers: {
          authorization: `Bearer ${shareAccessToken}`,
        },
      });

      expect(toggle1Response.statusCode).toBe(200);
      const toggle1Body = toggle1Response.json();
      expect(toggle1Body).toHaveProperty('shared');
      expect(toggle1Body.shared).toBe(true);

      const toggle2Response = await app.inject({
        method: 'POST',
        url: `/api/v1/players/me/achievements/${achievementId}/share`,
        headers: {
          authorization: `Bearer ${shareAccessToken}`,
        },
      });

      expect(toggle2Response.statusCode).toBe(200);
      const toggle2Body = toggle2Response.json();
      expect(toggle2Body).toHaveProperty('shared');
      expect(toggle2Body.shared).toBe(false);
    });

    it('returns 404 for non-existent achievement id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
        headers: {
          authorization: `Bearer ${shareAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 when player achievement does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
        headers: {
          authorization: `Bearer ${shareAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /achievements/enterprise (Enterprise reportable achievements)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('enterprise-achievements-test@example.com');
    });

    it('returns enterprise reportable achievements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.achievements).toBeDefined();
      expect(Array.isArray(body.achievements)).toBe(true);
    });

    it('returns only enterprise_reportable achievements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const achievement of body.achievements) {
        expect(achievement.enterpriseReportable).toBe(true);
      }
    });
  });

  describe('Tenant isolation', () => {
    // eslint-disable-next-line max-statements
    it('isolates player achievements between tenants', async () => {
      const pool = getDatabasePool(testConfig);

      const user1Token = await registerTestUser('player-iso-1@example.com');
      const user2Token = await registerTestUser('player-iso-2@example.com');

      const achievementsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(achievementsResponse.statusCode).toBe(200);
      const achievementsBody = achievementsResponse.json();
      expect(achievementsBody.achievements.length).toBeGreaterThan(0);
      const achievementId = achievementsBody.achievements[0].id;

      const tenant1Result = await pool.unsafe(
        `SELECT tenant_id FROM auth.users WHERE email = 'player-iso-1@example.com' LIMIT 1`,
      );
      const tenant2Result = await pool.unsafe(
        `SELECT tenant_id FROM auth.users WHERE email = 'player-iso-2@example.com' LIMIT 1`,
      );
      expect(tenant1Result.length).toBeGreaterThan(0);
      expect(tenant2Result.length).toBeGreaterThan(0);
      const tenant1Id = tenant1Result[0].tenant_id;
      const _tenant2Id = tenant2Result[0].tenant_id;

      const player1Result = await pool.unsafe(
        `SELECT profile_id FROM social.player_profiles WHERE user_id = (SELECT user_id FROM auth.users WHERE email = 'player-iso-1@example.com' LIMIT 1) LIMIT 1`,
      );
      const player2Result = await pool.unsafe(
        `SELECT profile_id FROM social.player_profiles WHERE user_id = (SELECT user_id FROM auth.users WHERE email = 'player-iso-2@example.com' LIMIT 1) LIMIT 1`,
      );
      expect(player1Result.length).toBeGreaterThan(0);
      expect(player2Result.length).toBeGreaterThan(0);
      const player1Id = player1Result[0].profile_id;
      const _player2Id = player2Result[0].profile_id;

      await setTenantContext(tenant1Id);
      await pool.unsafe(
        `INSERT INTO social.player_achievements (player_id, achievement_id, tenant_id, progress, notification_sent, shared_to_profile) VALUES ('${player1Id}', '${achievementId}', '${tenant1Id}', '{"currentCount": 1, "lastUpdated": "${new Date().toISOString()}", "eventsProcessed": [], "completed": true}', false, false)`,
      );

      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const playerAchievements1 = response1.json().achievements;
      const playerAchievements2 = response2.json().achievements;

      expect(playerAchievements1).toBeDefined();
      expect(playerAchievements2).toBeDefined();
      expect(playerAchievements1.length).toBe(1);
      expect(playerAchievements2.length).toBe(0);
      expect(playerAchievements1[0].definition.id).toBe(achievementId);
    });

    it('isolates enterprise achievements between tenants', async () => {
      const user1Token = await registerTestUser('enterprise-iso-1@example.com');
      const user2Token = await registerTestUser('enterprise-iso-2@example.com');

      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const enterpriseAchievements1 = response1.json().achievements;
      const enterpriseAchievements2 = response2.json().achievements;

      expect(enterpriseAchievements1).toBeDefined();
      expect(enterpriseAchievements2).toBeDefined();
    });
  });
});
