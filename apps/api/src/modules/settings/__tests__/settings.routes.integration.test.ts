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

describe('Settings routes HTTP integration', () => {
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
        displayName: 'Settings Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    return registerResponse.json().accessToken;
  };

  describe('Authentication', () => {
    it('rejects GET /settings/:category without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/display',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects PATCH /settings/:category without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        payload: { theme: 'green' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /settings/export without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/export',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /settings/account/data-export without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/data-export',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /settings/account/delete without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/delete',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /settings/:category', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('settings-get-test@example.com');
    });

    it('returns default settings for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.display).toBeDefined();
      expect(body.display.theme).toBe('green');
      expect(body.display.fontSize).toBe(16);
    });

    it('returns default settings for each category', async () => {
      const categories = ['display', 'accessibility', 'gameplay', 'audio', 'account'];

      for (const category of categories) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/settings/${category}`,
          headers: {
            authorization: `Bearer ${userAccessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body[category]).toBeDefined();
      }
    });

    it('returns all settings when category is "all"', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/all',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.display).toBeDefined();
      expect(body.accessibility).toBeDefined();
      expect(body.gameplay).toBeDefined();
      expect(body.audio).toBeDefined();
      expect(body.account).toBeDefined();
    });

    it('returns 400 for invalid category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/invalid-category',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /settings/:category', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('settings-patch-test@example.com');
    });

    it('updates display settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          theme: 'amber',
          fontSize: 18,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.settings.display.theme).toBe('amber');
      expect(body.settings.display.fontSize).toBe(18);
    });

    it('updates accessibility settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          reducedMotion: true,
          highContrast: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.settings.accessibility.reducedMotion).toBe(true);
      expect(body.settings.accessibility.highContrast).toBe(true);
    });

    it('updates gameplay settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          difficulty: 'hard',
          notificationVolume: 50,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.settings.gameplay.difficulty).toBe('hard');
      expect(body.settings.gameplay.notificationVolume).toBe(50);
    });

    it('updates audio settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          masterVolume: 75,
          muteAll: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.settings.audio.masterVolume).toBe(75);
      expect(body.settings.audio.muteAll).toBe(true);
    });

    it('updates account settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          displayName: 'Updated Name',
          privacyMode: 'private',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.settings.account.displayName).toBe('Updated Name');
      expect(body.settings.account.privacyMode).toBe('private');
    });

    it('returns 400 for invalid settings payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          theme: 'invalid-theme',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in settings payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          __proto__: { polluted: true },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid category', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/invalid-category',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /settings/export (GDPR data export)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('settings-export-test@example.com');
    });

    it('exports all user settings', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/export',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.settings).toBeDefined();
      expect(body.exportedAt).toBeDefined();
      expect(body.settings.display).toBeDefined();
      expect(body.settings.accessibility).toBeDefined();
      expect(body.settings.gameplay).toBeDefined();
      expect(body.settings.audio).toBeDefined();
      expect(body.settings.account).toBeDefined();
    });

    it('returns valid ISO date-time in exportedAt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/export',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(new Date(body.exportedAt).toISOString()).toBe(body.exportedAt);
    });
  });

  describe('POST /settings/account/data-export (GDPR portability)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('settings-data-export-test@example.com');
    });

    it('creates a data export request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/data-export',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.requestId).toBeDefined();
      expect(body.message).toContain('Data export request has been submitted');
    });

    it('returns unique request IDs for each request', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/data-export',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/data-export',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      const body1 = response1.json();
      const body2 = response2.json();
      expect(body1.requestId).not.toBe(body2.requestId);
    });
  });

  describe('POST /settings/account/delete (GDPR right to erasure)', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('settings-delete-test@example.com');
    });

    it('creates an account deletion request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/delete',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(202);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.requestId).toBeDefined();
      expect(body.message).toContain('Account deletion request has been submitted');
      expect(body.message).toContain('30 days');
    });

    it('returns unique request IDs for each request', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/delete',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/account/delete',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      const body1 = response1.json();
      const body2 = response2.json();
      expect(body1.requestId).not.toBe(body2.requestId);
    });
  });

  describe('Tenant isolation', () => {
    it('returns tenant-isolated settings', async () => {
      const user1Token = await registerTestUser('tenant-isolation-user1@example.com');
      const user2Token = await registerTestUser('tenant-isolation-user2@example.com');

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
        payload: {
          displayName: 'User One Display Name',
        },
      });

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
        payload: {
          displayName: 'User Two Display Name',
        },
      });

      const user1Response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      const user2Response = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(user1Response.json().account.displayName).toBe('User One Display Name');
      expect(user2Response.json().account.displayName).toBe('User Two Display Name');
    });
  });
});
