import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import type { LogLevel } from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';
import {
  createDualTenantFixture,
  type DualTenantFixture,
  type TestTenant,
} from '../../../__tests__/helpers/factory.js';

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

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.user_profiles,
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    public.game_sessions,
    public.game_events,
    public.game_state_snapshots,
    public.users,
    tenants
    RESTART IDENTITY CASCADE`;
};

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
  role: string = 'learner',
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
  const refreshTokenCookie = cookies.find((c) => c.name === 'dmz_refresh_token');
  const csrfCookie = cookies.find((c) => c.name === 'dmz_csrf_token');

  const { accessToken, user } = registerResponse.json() as {
    accessToken: string;
    user: { id: string; tenantId: string };
  };

  if (role !== 'learner') {
    const db = getDatabaseClient(testConfig);
    await db.update(users).set({ role: role }).where(eq(users.userId, user.id));
  }

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

describe('rls-policies', () => {
  const app = buildApp(testConfig);
  let fixture: DualTenantFixture;

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestData();
    fixture = createDualTenantFixture('rls');
  });

  const insertTenantAndUsers = async (): Promise<{
    tenantA: TestTenant;
    tenantB: TestTenant;
    userA: { userId: string; tokens: AuthTokens };
    userB: { userId: string; tokens: AuthTokens };
  }> => {
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

    if (!tenantARow || !tenantBRow) {
      throw new Error('Failed to create tenants');
    }

    const tenantA = { ...fixture.tenantA, id: tenantARow.tenantId };
    const tenantB = { ...fixture.tenantB, id: tenantBRow.tenantId };

    const userA = await createUserWithTenant(
      app,
      tenantA.id,
      fixture.userAStandard.email,
      fixture.userAStandard.displayName,
    );
    const userB = await createUserWithTenant(
      app,
      tenantB.id,
      fixture.userBStandard.email,
      fixture.userBStandard.displayName,
    );

    return {
      tenantA,
      tenantB,
      userA,
      userB,
    };
  };

  describe('RLS policy enforcement', () => {
    it('ensures game sessions are isolated by tenant through RLS', async () => {
      const { tenantA, tenantB, userA, userB } = await insertTenantAndUsers();

      const sessionAResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/sessions',
        headers: {
          authorization: `Bearer ${userA.tokens.accessToken}`,
          'x-tenant-id': tenantA.id,
        },
      });

      const sessionBResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/sessions',
        headers: {
          authorization: `Bearer ${userB.tokens.accessToken}`,
          'x-tenant-id': tenantB.id,
        },
      });

      expect(sessionAResponse.statusCode).toBe(201);
      expect(sessionBResponse.statusCode).toBe(201);

      const sessionAData = sessionAResponse.json();
      const sessionBData = sessionBResponse.json();

      const mySessionsA = await app.inject({
        method: 'GET',
        url: '/api/v1/game/sessions',
        headers: {
          authorization: `Bearer ${userA.tokens.accessToken}`,
          'x-tenant-id': tenantA.id,
        },
      });

      const mySessionsB = await app.inject({
        method: 'GET',
        url: '/api/v1/game/sessions',
        headers: {
          authorization: `Bearer ${userB.tokens.accessToken}`,
          'x-tenant-id': tenantB.id,
        },
      });

      expect(mySessionsA.statusCode).toBe(200);
      expect(mySessionsB.statusCode).toBe(200);

      const sessionsA = mySessionsA.json().sessions ?? [];
      const sessionsB = mySessionsB.json().sessions ?? [];

      expect(sessionsA).toHaveLength(1);
      expect(sessionsB).toHaveLength(1);
      expect(sessionsA[0]?.id).toBe(sessionAData.session?.id);
      expect(sessionsB[0]?.id).toBe(sessionBData.session?.id);
    });

    it('verifies tenant context middleware sets isSuperAdmin flag', async () => {
      const { tenantA, userA } = await insertTenantAndUsers();

      const db = getDatabaseClient(testConfig);
      await db.update(users).set({ role: 'super_admin' }).where(eq(users.userId, userA.userId));

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'x-tenant-id': tenantA.id,
        },
        payload: {
          email: fixture.userAStandard.email,
          password: 'test-fixture-password',
        },
      });

      expect(loginResponse.statusCode).toBe(200);

      const token = loginResponse.json().accessToken;

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-id': tenantA.id,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      expect(meResponse.json().user?.role).toBe('super_admin');
    });
  });

  describe('cross-tenant access prevention', () => {
    it('prevents Tenant A from accessing Tenant B game sessions', async () => {
      const { tenantA, tenantB, userA, userB } = await insertTenantAndUsers();

      const sessionBResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/game/sessions',
        headers: {
          authorization: `Bearer ${userB.tokens.accessToken}`,
          'x-tenant-id': tenantB.id,
        },
      });

      expect(sessionBResponse.statusCode).toBe(201);
      const sessionBId = sessionBResponse.json().session?.id;

      const getSessionResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/game/sessions/${sessionBId}`,
        headers: {
          authorization: `Bearer ${userA.tokens.accessToken}`,
          'x-tenant-id': tenantA.id,
        },
      });

      expect(getSessionResponse.statusCode).toBe(404);
    });
  });

  describe('RLS policy metadata', () => {
    it('verifies all tenant-scoped tables have RLS enabled', async () => {
      const pool = getDatabasePool(testConfig);

      const result = await pool`
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname IN ('public', 'auth', 'content', 'analytics', 'idempotency', 'ai')
          AND rowsecurity = true
        ORDER BY schemaname, tablename;
      `;

      const rlsEnabledTables = result.map(
        (r: { [key: string]: unknown }) => `${r['schemaname']}.${r['tablename']}`,
      );

      expect(rlsEnabledTables).toContain('public.users');
      expect(rlsEnabledTables).toContain('public.game_sessions');
      expect(rlsEnabledTables).toContain('public.game_events');
      expect(rlsEnabledTables).toContain('auth.sessions');
      expect(rlsEnabledTables).toContain('auth.roles');
      expect(rlsEnabledTables).toContain('auth.user_roles');
      expect(rlsEnabledTables).toContain('content.email_templates');
      expect(rlsEnabledTables).toContain('content.scenarios');
      expect(rlsEnabledTables).toContain('analytics.events');
    });

    it('verifies tenant isolation policies exist', async () => {
      const pool = getDatabasePool(testConfig);

      const result = await pool`
        SELECT 
          schemaname,
          tablename,
          policyname
        FROM pg_policies
        WHERE policyname LIKE 'tenant_isolation_%'
        ORDER BY schemaname, tablename;
      `;

      const policies = result.map(
        (r: { [key: string]: unknown }) =>
          `${r['schemaname']}.${r['tablename']}:${r['policyname']}`,
      );

      expect(policies).toContain('public.users:tenant_isolation_users');
      expect(policies).toContain('public.game_sessions:tenant_isolation_game_sessions');
      expect(policies).toContain('auth.sessions:tenant_isolation_sessions');
      expect(policies).toContain('auth.roles:tenant_isolation_roles');
    });
  });
});
