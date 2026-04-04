import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { LogLevel } from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { getRefreshCookieName } from '../../auth/cookies.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { csrfCookieName } from '../../auth/csrf.js';
import {
  createDualTenantFixture,
  type DualTenantFixture,
  type TestTenant,
} from '../../../__tests__/helpers/factory.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const createTestConfig = (logLevel: LogLevel = 'silent'): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: logLevel as LogLevel,
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
    TENANT_RESOLVER_ENABLED: true,
    TENANT_HEADER_NAME: 'x-tenant-id',
    TENANT_FALLBACK_ENABLED: false,
  };
};

const testConfig = createTestConfig('silent');

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

const createUserWithTenant = async (
  app: ReturnType<typeof buildApp>,
  tenantId: string,
  email: string,
  displayName: string,
): Promise<{ userId: string; tokens: AuthTokens; tenantId: string }> => {
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    headers: {
      'x-tenant-id': tenantId,
    },
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
  const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

  const { accessToken, user } = registerResponse.json() as {
    accessToken: string;
    user: { id: string; tenantId: string };
  };

  return {
    userId: user.id,
    tenantId: user.tenantId,
    tokens: {
      accessToken,
      refreshToken: refreshTokenCookie?.value ?? '',
      csrfToken: csrfCookie?.value ?? '',
    },
  };
};

describe('social integration', () => {
  const app = buildApp(testConfig);
  let fixture: DualTenantFixture;

  beforeAll(async () => {
    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await resetTestDatabase(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
    fixture = createDualTenantFixture('social');
  });

  const setupTenant = async (): Promise<{
    tenant: TestTenant;
    user: { userId: string; tokens: AuthTokens };
  }> => {
    const db = getDatabaseClient(testConfig);

    const [tenantRow] = await db
      .insert(tenants)
      .values({
        tenantId: fixture.tenantA.id,
        name: fixture.tenantA.name,
        slug: fixture.tenantA.slug,
        status: 'active',
      })
      .returning({ tenantId: tenants.tenantId });

    if (!tenantRow) {
      throw new Error('Failed to create tenant');
    }

    const tenant = { ...fixture.tenantA, id: tenantRow.tenantId };
    const user = await createUserWithTenant(
      app,
      tenant.id,
      fixture.userAStandard.email,
      fixture.userAStandard.displayName,
    );

    return { tenant, user };
  };

  describe('player-profiles.routes', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent profile', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('creates profile on first login and returns it', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.userId).toBe(user.userId);
      expect(body.displayName).toBeDefined();
    });

    it('updates player profile', async () => {
      const { user } = await setupTenant();

      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });
      expect(getResponse.statusCode).toBe(200);

      const updateResponse = await app.inject({
        method: 'PATCH',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
        payload: {
          bio: 'Test bio',
          displayName: 'Updated Name',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.bio).toBe('Test bio');
      expect(body.displayName).toBe('Updated Name');
    });

    it('gets privacy settings', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/privacy',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.privacyMode).toBeDefined();
    });

    it('updates privacy settings', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/players/me/privacy',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
        payload: {
          privacyMode: 'private',
          socialVisibility: { showOnline: false },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.privacyMode).toBe('private');
    });

    it('returns 404 for non-existent player by ID', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns player profile by ID', async () => {
      const { user } = await setupTenant();

      const getMeResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });
      const profile = getMeResponse.json();

      const getByIdResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/players/${profile.profileId}`,
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(getByIdResponse.statusCode).toBe(200);
      const body = getByIdResponse.json();
      expect(body.profileId).toBe(profile.profileId);
    });
  });

  describe('social-relationship.routes', () => {
    it('returns relationship status for non-existent relationship', async () => {
      const { user } = await setupTenant();
      const otherUser = await createUserWithTenant(
        app,
        user.tenantId,
        'other@example.com',
        'Other User',
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/social/relationships/${otherUser.userId}`,
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.relationshipType).toBeNull();
      expect(body.status).toBeNull();
    });

    it('returns relationship counts', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/social/relationships/counts',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.friends).toBe(0);
      expect(body.blocked).toBe(0);
      expect(body.muted).toBe(0);
    });
  });

  describe('leaderboard.routes', () => {
    it('lists leaderboards', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.leaderboards)).toBe(true);
    });

    it('returns empty entries for non-existent leaderboard', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('gets player ranks', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/me',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.ranks)).toBe(true);
    });

    it('returns 404 for non-existent leaderboard position', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/me/position/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns friends leaderboard', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/friends',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.entries)).toBe(true);
    });

    it('returns 400 for invalid guild ID', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/guild/invalid-guild-id',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('filters leaderboards by scope', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards?scope=global',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('paginates leaderboard entries', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/00000000-0000-0000-0000-000000000000?limit=10&offset=0',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('tenant isolation', () => {
    it('isolates player profiles by tenant', async () => {
      const db = getDatabaseClient(testConfig);

      const [tenantARow] = await db
        .insert(tenants)
        .values({
          tenantId: fixture.tenantA.id,
          name: fixture.tenantA.name,
          slug: fixture.tenantA.slug,
          status: 'active',
        })
        .returning({ tenantId: tenants.tenantId });

      const [tenantBRow] = await db
        .insert(tenants)
        .values({
          tenantId: fixture.tenantB.id,
          name: fixture.tenantB.name,
          slug: fixture.tenantB.slug,
          status: 'active',
        })
        .returning({ tenantId: tenants.tenantId });

      const tenantA = { ...fixture.tenantA, id: tenantARow.tenantId };
      const tenantB = { ...fixture.tenantB, id: tenantBRow.tenantId };

      const userA = await createUserWithTenant(app, tenantA.id, 'usera@example.com', 'User A');
      const userB = await createUserWithTenant(app, tenantB.id, 'userb@example.com', 'User B');

      const profileAResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${userA.tokens.accessToken}`,
        },
      });
      expect(profileAResponse.statusCode).toBe(200);
      const profileA = profileAResponse.json();

      const profileBResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${userB.tokens.accessToken}`,
        },
      });
      expect(profileBResponse.statusCode).toBe(200);
      const profileB = profileBResponse.json();

      expect(profileA.userId).toBe(userA.userId);
      expect(profileB.userId).toBe(userB.userId);
      expect(profileA.tenantId).toBe(tenantA.id);
      expect(profileB.tenantId).toBe(tenantB.id);
    });
  });

  describe('privacy mode enforcement', () => {
    it('hides bio for private profiles', async () => {
      const { user } = await setupTenant();

      await app.inject({
        method: 'PUT',
        url: '/api/v1/players/me/privacy',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
        payload: {
          privacyMode: 'private',
        },
      });

      const profileResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      const body = profileResponse.json();
      expect(body.privacyMode).toBe('private');
      expect(body.isOwner).toBe(true);
    });

    it('shows bio for public profiles', async () => {
      const { user } = await setupTenant();

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
        payload: {
          bio: 'My public bio',
        },
      });

      await app.inject({
        method: 'PUT',
        url: '/api/v1/players/me/privacy',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
        payload: {
          privacyMode: 'public',
        },
      });

      const profileResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/profile',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      const body = profileResponse.json();
      expect(body.privacyMode).toBe('public');
      expect(body.bio).toBe('My public bio');
    });
  });
});
