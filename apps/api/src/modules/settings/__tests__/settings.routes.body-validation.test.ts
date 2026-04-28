/* eslint-disable max-lines */
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

describe('PATCH /settings/:category route body validation', () => {
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
        displayName: 'Body Validation Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    return registerResponse.json().accessToken;
  };

  beforeAll(async () => {
    userAccessToken = await registerTestUser('body-validation-test@example.com');
  });

  describe('display category body validation', () => {
    it('accepts valid display settings', async () => {
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
    });

    it('accepts empty body for partial update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects unknown fields in display body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          unknownField: 'should be rejected',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects invalid theme value', async () => {
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

    it('rejects fontSize below minimum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          fontSize: 8,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects fontSize above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          fontSize: 40,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for theme field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          theme: 123,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for fontSize field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          fontSize: 'eighteen',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in display body', async () => {
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

    it('rejects constructor prototype pollution in display body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          constructor: { prototype: { polluted: true } },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts terminalGlowIntensity at minimum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          terminalGlowIntensity: 0,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts terminalGlowIntensity at maximum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          terminalGlowIntensity: 100,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects terminalGlowIntensity below minimum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          terminalGlowIntensity: -1,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects terminalGlowIntensity above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          terminalGlowIntensity: 101,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts complete effects object', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          effects: {
            scanlines: true,
            curvature: false,
            glow: true,
            noise: false,
            vignette: true,
            flicker: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects effects with missing required field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          effects: {
            scanlines: true,
            curvature: false,
            glow: true,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts complete effectIntensity object', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          effectIntensity: {
            scanlines: 50,
            curvature: 75,
            glow: 100,
            noise: 25,
            vignette: 60,
            flicker: 80,
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects effectIntensity with out-of-range value', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          effectIntensity: {
            scanlines: 50,
            curvature: 75,
            glow: 150,
            noise: 25,
            vignette: 60,
            flicker: 80,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('accessibility category body validation', () => {
    it('accepts valid accessibility settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          reducedMotion: true,
          highContrast: false,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts empty body for partial update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects unknown fields in accessibility body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          unknownField: 'should be rejected',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects invalid colorBlindMode value', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          colorBlindMode: 'invalid-mode',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for reducedMotion field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          reducedMotion: 'true',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in accessibility body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          __proto__: { polluted: true },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts screenReaderAnnouncements true', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          screenReaderAnnouncements: true,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts screenReaderAnnouncements false', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          screenReaderAnnouncements: false,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts keyboardNavigationHints true', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          keyboardNavigationHints: true,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts keyboardNavigationHints false', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          keyboardNavigationHints: false,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts focusIndicatorStyle subtle', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          focusIndicatorStyle: 'subtle',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts focusIndicatorStyle strong', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          focusIndicatorStyle: 'strong',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects fontSize as string type coercion', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/accessibility',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          fontSize: '18',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('gameplay category body validation', () => {
    it('accepts valid gameplay settings', async () => {
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
    });

    it('accepts empty body for partial update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects unknown fields in gameplay body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          unknownField: 'should be rejected',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects invalid difficulty level', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          difficulty: 'impossible',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects notificationVolume above 100', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationVolume: 150,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for difficulty field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          difficulty: 123,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in gameplay body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          __proto__: { polluted: true },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts notificationCategoryVolumes with valid property names', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationCategoryVolumes: {
            master: 80,
            alerts: 100,
            ui: 60,
            ambient: 40,
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects notificationCategoryVolumes with invalid property name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationCategoryVolumes: {
            invalidProperty: 50,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts notificationDuration at minimum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationDuration: 1,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts notificationDuration at maximum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationDuration: 30,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects notificationDuration above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationDuration: 31,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts autoAdvanceTiming at minimum boundary (0)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          autoAdvanceTiming: 0,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts autoAdvanceTiming at maximum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          autoAdvanceTiming: 30,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects autoAdvanceTiming above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          autoAdvanceTiming: 31,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts queueBuildupRate at minimum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          queueBuildupRate: 1,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts queueBuildupRate at maximum boundary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          queueBuildupRate: 10,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects queueBuildupRate above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          queueBuildupRate: 11,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('audio category body validation', () => {
    it('accepts valid audio settings', async () => {
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
    });

    it('accepts empty body for partial update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects unknown fields in audio body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          unknownField: 'should be rejected',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects masterVolume above 100', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          masterVolume: 150,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for muteAll field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          muteAll: 'yes',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects textToSpeechSpeed below minimum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          textToSpeechSpeed: 20,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in audio body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          __proto__: { polluted: true },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts categoryVolumes with valid property names', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          categoryVolumes: {
            alerts: 80,
            ui: 60,
            ambient: 40,
            narrative: 100,
            effects: 70,
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects categoryVolumes with invalid property name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          categoryVolumes: {
            invalidProperty: 50,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts textToSpeechEnabled true', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          textToSpeechEnabled: true,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts textToSpeechEnabled false', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          textToSpeechEnabled: false,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects textToSpeechSpeed above maximum', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          textToSpeechSpeed: 250,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('account category body validation', () => {
    it('accepts valid account settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          displayName: 'New Display Name',
          privacyMode: 'private',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('accepts empty body for partial update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('rejects unknown fields in account body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          unknownField: 'should be rejected',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects invalid privacyMode value', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          privacyMode: 'publicity',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects displayName exceeding max length', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          displayName: 'a'.repeat(51),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects wrong type for privacyMode field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          privacyMode: 123,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects __proto__ pollution in account body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          __proto__: { polluted: true },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects constructor prototype pollution in account body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/account',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          constructor: { prototype: { polluted: true } },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('schema validation catches type coercion bypass', () => {
    it('rejects string "false" for boolean fields in display', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/display',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          enableTerminalEffects: 'false',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects string "0" for number fields in audio', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/audio',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          masterVolume: '0',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects numeric string for notificationVolume in gameplay', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/gameplay',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          notificationVolume: '50',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
