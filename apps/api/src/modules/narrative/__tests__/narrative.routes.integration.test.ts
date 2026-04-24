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

const setTenantContext = async (tenantId: string): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool.unsafe(
    `SELECT set_config('app.current_tenant_id', '${tenantId}', false), set_config('app.tenant_id', '${tenantId}', false)`,
  );
};

const seedFactionForTenant = async (
  tenantId: string,
  factionKey: string,
  displayName: string,
): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await setTenantContext(tenantId);
  await pool.unsafe(`
    INSERT INTO content.factions (tenant_id, faction_key, display_name, description, motivations, communication_style, initial_reputation, is_active)
    VALUES ('${tenantId}', '${factionKey}', '${displayName}', 'Description', 'Motivation', 'formal', 50, true)
    ON CONFLICT (tenant_id, faction_key) DO NOTHING
  `);
};

const seedNarrativeContent = async (tenantId: string): Promise<void> => {
  const pool = getDatabasePool(testConfig);

  await setTenantContext(tenantId);

  await pool.unsafe(`
    INSERT INTO content.factions (tenant_id, faction_key, display_name, description, motivations, communication_style, initial_reputation, is_active)
    VALUES
      ('${tenantId}', 'sovereign_compact', 'The Sovereign Compact', 'Government remnants', 'Maintain order', 'formal', 50, true),
      ('${tenantId}', 'nexion_industries', 'Nexion Industries', 'Corporate consortium', 'Profit maximization', 'corporate', 50, true),
      ('${tenantId}', 'librarians', 'The Librarians', 'Knowledge preservers', 'Knowledge preservation', 'academic', 50, true)
    ON CONFLICT (tenant_id, faction_key) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      motivations = EXCLUDED.motivations,
      communication_style = EXCLUDED.communication_style
  `);

  await pool.unsafe(`
    INSERT INTO content.morpheus_messages (tenant_id, message_key, title, content, trigger_type, severity, is_active)
    VALUES
      ('${tenantId}', 'welcome_message', 'Welcome!', 'Welcome to the Gate, Operator.', 'first_login', 'info', true),
      ('${tenantId}', 'day_start_1', 'Day One', 'Your first day begins.', 'day_start', 'info', true)
    ON CONFLICT (tenant_id, message_key) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content
  `);
};

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

describe('Narrative routes HTTP integration', () => {
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
  let tenantId: string;

  const registerTestUser = async (email: string): Promise<string> => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'Valid' + 'Pass123!',
        displayName: 'Narrative Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    return registerResponse.json().accessToken;
  };

  const getTenantIdForUser = async (email: string): Promise<string> => {
    const pool = getDatabasePool(testConfig);
    const result = await pool.unsafe(
      `SELECT tenants.tenant_id FROM auth.users JOIN tenants ON users.tenant_id = tenants.tenant_id WHERE users.email = '${email}' LIMIT 1`,
    );
    return result[0]?.tenant_id;
  };

  describe('Authentication', () => {
    it('rejects GET /narrative/factions without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /narrative/factions/:factionKey without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions/sovereign_compact',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /narrative/relations without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/relations',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects PATCH /narrative/relations/:factionId without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/narrative/relations/00000000-0000-0000-0000-000000000001',
        payload: { reputationDelta: 10, currentDay: 1 },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /narrative/coaching without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/coaching',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /narrative/events without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/events',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /narrative/events without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        payload: {
          eventKey: 'test_event',
          title: 'Test Event',
          description: 'Test description',
          triggerType: 'manual',
          dayTriggered: 1,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects PATCH /narrative/events/:eventId/read without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/narrative/events/00000000-0000-0000-0000-000000000001/read',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects GET /narrative/state without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/state',
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /narrative/welcome without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/welcome',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /narrative/factions', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-factions-test@example.com');
      tenantId = await getTenantIdForUser('narrative-factions-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns faction list for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('returns factions with expected fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const faction = body.data[0];
      expect(faction).toHaveProperty('id');
      expect(faction).toHaveProperty('factionKey');
      expect(faction).toHaveProperty('displayName');
      expect(faction).toHaveProperty('description');
      expect(faction).toHaveProperty('motivations');
      expect(faction).toHaveProperty('communicationStyle');
      expect(faction).toHaveProperty('initialReputation');
      expect(faction).toHaveProperty('isActive');
    });

    it('filters factions by isActive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions?isActive=true',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const faction of body.data) {
        expect(faction.isActive).toBe(true);
      }
    });

    it('filters factions by factionKey', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions?factionKey=sovereign_compact',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0]?.factionKey).toBe('sovereign_compact');
    });
  });

  describe('GET /narrative/factions/:factionKey', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-faction-detail-test@example.com');
      tenantId = await getTenantIdForUser('narrative-faction-detail-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns faction by key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions/sovereign_compact',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.factionKey).toBe('sovereign_compact');
    });

    it('returns 404 for non-existent faction', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions/nonexistent_faction',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FACTION_NOT_FOUND');
    });
  });

  describe('GET /narrative/relations', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-relations-test@example.com');
      tenantId = await getTenantIdForUser('narrative-relations-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns empty relations for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/relations',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('PATCH /narrative/relations/:factionId', () => {
    let factionId: string;

    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-relation-update-test@example.com');
      tenantId = await getTenantIdForUser('narrative-relation-update-test@example.com');
      await seedNarrativeContent(tenantId);

      const pool = getDatabasePool(testConfig);
      const factionResult = await pool.unsafe(
        `SELECT id FROM content.factions WHERE tenant_id = '${tenantId}' AND faction_key = 'sovereign_compact' LIMIT 1`,
      );
      factionId = factionResult[0]?.id;
    });

    it('returns 400 when reputationDelta is missing', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/narrative/relations/${factionId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: { currentDay: 1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when currentDay is missing', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/narrative/relations/${factionId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: { reputationDelta: 10 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 404 for non-existent faction', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/narrative/relations/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: { reputationDelta: 10, currentDay: 1 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /narrative/coaching', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-coaching-test@example.com');
      tenantId = await getTenantIdForUser('narrative-coaching-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns coaching messages for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/coaching',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns coaching messages with expected fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/coaching',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      if (body.data.length > 0) {
        const message = body.data[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('messageKey');
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('triggerType');
        expect(message).toHaveProperty('severity');
      }
    });

    it('filters by triggerType', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/coaching?triggerType=first_login',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const message of body.data) {
        expect(message.triggerType).toBe('first_login');
      }
    });
  });

  describe('GET /narrative/events', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-events-list-test@example.com');
      tenantId = await getTenantIdForUser('narrative-events-list-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns empty events for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /narrative/events', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-events-create-test@example.com');
      tenantId = await getTenantIdForUser('narrative-events-create-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('creates a narrative event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          eventKey: 'test_event',
          title: 'Test Event',
          description: 'Test event description',
          triggerType: 'manual',
          dayTriggered: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.eventKey).toBe('test_event');
      expect(body.data.title).toBe('Test Event');
      expect(body.data.isRead).toBe(false);
    });

    it('creates event with factionKey', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          eventKey: 'faction_event',
          factionKey: 'sovereign_compact',
          title: 'Faction Event',
          description: 'A faction-specific event',
          triggerType: 'faction_reputation',
          dayTriggered: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.eventKey).toBe('faction_event');
      expect(body.data.factionKey).toBe('sovereign_compact');
    });

    it('returns 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          eventKey: 'incomplete_event',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /narrative/events/:eventId/read', () => {
    let eventId: string;

    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-event-read-test@example.com');
      tenantId = await getTenantIdForUser('narrative-event-read-test@example.com');
      await seedNarrativeContent(tenantId);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          eventKey: 'event_to_mark_read',
          title: 'Event to Mark Read',
          description: 'Test description',
          triggerType: 'manual',
          dayTriggered: 1,
        },
      });
      eventId = createResponse.json().data.id;
    });

    it('marks event as read', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/narrative/events/${eventId}/read`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.isRead).toBe(true);
    });

    it('returns 404 for non-existent event', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/narrative/events/00000000-0000-0000-0000-000000000001/read',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('GET /narrative/state', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-state-test@example.com');
      tenantId = await getTenantIdForUser('narrative-state-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns player narrative state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/state',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data).toHaveProperty('currentSeason');
      expect(body.data).toHaveProperty('currentChapter');
      expect(body.data).toHaveProperty('currentAct');
      expect(body.data).toHaveProperty('milestonesReached');
      expect(body.data).toHaveProperty('welcomeMessageShown');
    });

    it('initializes state if not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/state',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.currentSeason).toBe(1);
      expect(body.data.welcomeMessageShown).toBe(false);
    });
  });

  describe('POST /narrative/welcome', () => {
    beforeAll(async () => {
      userAccessToken = await registerTestUser('narrative-welcome-test@example.com');
      tenantId = await getTenantIdForUser('narrative-welcome-test@example.com');
      await seedNarrativeContent(tenantId);
    });

    it('returns welcome message for new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/welcome',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data).toHaveProperty('message');
      expect(body.data).toHaveProperty('playerState');
      expect(body.data.playerState).toHaveProperty('welcomeMessageShown');
    });
  });

  describe('Tenant isolation', () => {
    it('isolates factions between tenants', async () => {
      const user1Token = await registerTestUser('narrative-iso-user1@example.com');
      const user2Token = await registerTestUser('narrative-iso-user2@example.com');

      const tenant1Id = await getTenantIdForUser('narrative-iso-user1@example.com');
      const tenant2Id = await getTenantIdForUser('narrative-iso-user2@example.com');

      await seedFactionForTenant(tenant1Id, 'unique_faction_t1', 'Tenant 1 Faction');
      await seedFactionForTenant(tenant2Id, 'unique_faction_t2', 'Tenant 2 Faction');

      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/factions',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const factions1 = response1.json().data;
      const factions2 = response2.json().data;

      const hasT1Faction = factions1.some(
        (f: { factionKey: string }) => f.factionKey === 'unique_faction_t1',
      );
      const hasT2Faction = factions2.some(
        (f: { factionKey: string }) => f.factionKey === 'unique_faction_t2',
      );

      expect(hasT1Faction).toBe(true);
      expect(hasT2Faction).toBe(true);

      const hasT2FactionInT1 = factions1.some(
        (f: { factionKey: string }) => f.factionKey === 'unique_faction_t2',
      );
      const hasT1FactionInT2 = factions2.some(
        (f: { factionKey: string }) => f.factionKey === 'unique_faction_t1',
      );

      expect(hasT2FactionInT1).toBe(false);
      expect(hasT1FactionInT2).toBe(false);
    });

    it('isolates narrative events between users', async () => {
      const user1Token = await registerTestUser('narrative-iso-events-1@example.com');
      const user2Token = await registerTestUser('narrative-iso-events-2@example.com');

      await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
        payload: {
          eventKey: 'user1_exclusive_event',
          title: 'User 1 Event',
          description: 'This belongs to user 1',
          triggerType: 'manual',
          dayTriggered: 1,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
        payload: {
          eventKey: 'user2_exclusive_event',
          title: 'User 2 Event',
          description: 'This belongs to user 2',
          triggerType: 'manual',
          dayTriggered: 1,
        },
      });

      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/narrative/events',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const events1 = response1.json().data;
      const events2 = response2.json().data;

      const hasUser1Event = events1.some(
        (e: { eventKey: string }) => e.eventKey === 'user1_exclusive_event',
      );
      const hasUser2Event = events2.some(
        (e: { eventKey: string }) => e.eventKey === 'user2_exclusive_event',
      );

      expect(hasUser1Event).toBe(true);
      expect(hasUser2Event).toBe(true);

      const hasUser2EventInUser1 = events1.some(
        (e: { eventKey: string }) => e.eventKey === 'user2_exclusive_event',
      );
      const hasUser1EventInUser2 = events2.some(
        (e: { eventKey: string }) => e.eventKey === 'user1_exclusive_event',
      );

      expect(hasUser2EventInUser1).toBe(false);
      expect(hasUser1EventInUser2).toBe(false);
    });
  });
});
