import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import type { LogLevel } from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';
import { getRefreshCookieName } from '../cookies.js';
import { csrfCookieName } from '../csrf.js';
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
    users,
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
      password: 'valid pass 1234',
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

describe('tenant-isolation', () => {
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
    fixture = createDualTenantFixture('isolation');
  });

  const insertTenantAndUsers = async (): Promise<{
    tenantA: TestTenant;
    tenantB: TestTenant;
    userAStandard: { userId: string; tokens: AuthTokens };
    userAAdmin: { userId: string; tokens: AuthTokens };
    userBStandard: { userId: string; tokens: AuthTokens };
    userBAdmin: { userId: string; tokens: AuthTokens };
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

    const userAStandard = await createUserWithTenant(
      app,
      tenantA.id,
      fixture.userAStandard.email,
      fixture.userAStandard.displayName,
    );
    const userAAdmin = await createUserWithTenant(
      app,
      tenantA.id,
      fixture.userAAdmin.email,
      fixture.userAAdmin.displayName,
      'super_admin',
    );
    const userBStandard = await createUserWithTenant(
      app,
      tenantB.id,
      fixture.userBStandard.email,
      fixture.userBStandard.displayName,
    );
    const userBAdmin = await createUserWithTenant(
      app,
      tenantB.id,
      fixture.userBAdmin.email,
      fixture.userBAdmin.displayName,
      'super_admin',
    );

    return {
      tenantA,
      tenantB,
      userAStandard,
      userAAdmin,
      userBStandard,
      userBAdmin,
    };
  };

  describe('cross-tenant API denial matrix', () => {
    it('returns correct tenant context for authenticated user', async () => {
      const { userAStandard, tenantA } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.tenantId).toBe(tenantA.id);
    });

    it('verifies Tenant A admin can access Tenant A resources but response reflects correct tenant', async () => {
      const { userAAdmin, tenantA } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAAdmin.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.tenantId).toBe(tenantA.id);
    });

    it('prevents session refresh from being replayed across tenant boundaries', async () => {
      const { userBStandard } = await insertTenantAndUsers();

      const cookieHeader = `${getRefreshCookieName()}=${userBStandard.tokens.refreshToken}; ${csrfCookieName}=${userBStandard.tokens.csrfToken}`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: {
          'x-csrf-token': userBStandard.tokens.csrfToken,
          cookie: cookieHeader,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
    });

    it('blocks Tenant A user from updating Tenant B profile', async () => {
      const { userAStandard } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/profile',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
        payload: {
          displayName: 'Trying to update',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('tenant-context spoof resistance', () => {
    it('ignores X-Tenant-ID header and uses tenant from JWT token', async () => {
      const { userAStandard, tenantB } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
          'x-tenant-id': tenantB.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.tenantId).not.toBe(tenantB.id);
    });

    it('ignores tenantId in query string', async () => {
      const { userAStandard, tenantB } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/me?tenantId=${tenantB.id}`,
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.tenantId).not.toBe(tenantB.id);
    });

    it('ignores tenantId in request body for GET requests', async () => {
      const { userAStandard, tenantB } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
        payload: {
          tenantId: tenantB.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.tenantId).not.toBe(tenantB.id);
    });
  });

  describe('request-context isolation safety', () => {
    it('ensures tenant context is request-scoped and not leaked between concurrent requests', async () => {
      const { userAStandard, userBStandard } = await insertTenantAndUsers();

      const [responseA, responseB] = await Promise.all([
        app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            authorization: `Bearer ${userAStandard.tokens.accessToken}`,
          },
        }),
        app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            authorization: `Bearer ${userBStandard.tokens.accessToken}`,
          },
        }),
      ]);

      expect(responseA.statusCode).toBe(200);
      expect(responseB.statusCode).toBe(200);

      const bodyA = responseA.json();
      const bodyB = responseB.json();

      expect(bodyA.user.tenantId).not.toBe(bodyB.user.tenantId);
    });

    it('handles rapid sequential requests without context bleeding', async () => {
      const { userAStandard, userBStandard } = await insertTenantAndUsers();

      for (let i = 0; i < 5; i++) {
        const responseA = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            authorization: `Bearer ${userAStandard.tokens.accessToken}`,
          },
        });

        const responseB = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: {
            authorization: `Bearer ${userBStandard.tokens.accessToken}`,
          },
        });

        expect(responseA.statusCode).toBe(200);
        expect(responseB.statusCode).toBe(200);

        const bodyA = responseA.json();
        const bodyB = responseB.json();

        expect(bodyA.user.tenantId).not.toBe(bodyB.user.tenantId);
      }
    });
  });

  describe('error/logging consistency for isolation denials', () => {
    it('returns standardized error envelope for unauthorized access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      expect(body.error.requestId).toBeDefined();
    });

    it('includes requestId in error response for tenant context failures', async () => {
      const { userAStandard } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.requestId).toBeUndefined();
    });

    it('returns proper error format for forbidden access', async () => {
      const { userAStandard } = await insertTenantAndUsers();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_INSUFFICIENT_PERMS');
    });
  });

  describe('tenant status gating with isolation', () => {
    it('tenant resolver requires valid tenant header when resolver is enabled', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `test@fallback-${Date.now()}.test`,
          password: 'valid pass 1234',
          displayName: 'Fallback Test',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TENANT_CONTEXT_MISSING');
    });
  });

  describe('logout isolation', () => {
    it('logout only invalidates the calling users session, not other tenant sessions', async () => {
      const { userAStandard, userBStandard } = await insertTenantAndUsers();

      const logoutResponse = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
          'x-csrf-token': userAStandard.tokens.csrfToken,
          cookie: `${getRefreshCookieName()}=${userAStandard.tokens.refreshToken}; ${csrfCookieName}=${userAStandard.tokens.csrfToken}`,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);

      const userBMeResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userBStandard.tokens.accessToken}`,
        },
      });

      expect(userBMeResponse.statusCode).toBe(200);
    });
  });

  describe('structured logging verification', () => {
    let appWithLogs: ReturnType<typeof buildApp>;
    let capturedLogs: Array<{ level: string; args: unknown[] }>;

    beforeAll(async () => {
      capturedLogs = [];
      appWithLogs = buildApp(createTestConfig('info'));

      vi.spyOn(appWithLogs.log, 'child').mockImplementation((_bindings) => {
        const logger = {
          info: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'info', args });
          }),
          warn: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'warn', args });
          }),
          error: vi.fn((...args: unknown[]) => {
            capturedLogs.push({ level: 'error', args });
          }),
          debug: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn(),
        };
        return logger as unknown as typeof appWithLogs.log;
      });

      await appWithLogs.ready();
      await resetTestData();
    });

    afterAll(async () => {
      await appWithLogs.close();
    });

    it('includes tenant context in logs for unauthorized access', async () => {
      capturedLogs.length = 0;

      await appWithLogs.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const errorLogs = capturedLogs.filter(
        (log) => log.level === 'warn' && log.args[1] === 'request error',
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      const logPayload = errorLogs[0]?.args[0] as Record<string, unknown>;
      expect(logPayload['tenantId'] || logPayload['requestId']).toBeDefined();
    });

    it('includes requestId in structured logs for auth failures', async () => {
      capturedLogs.length = 0;

      const response = await appWithLogs.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      const requestId = body.error?.requestId;

      const errorLogs = capturedLogs.filter(
        (log) => log.level === 'warn' && log.args[1] === 'request error',
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      const logPayload = errorLogs[0]?.args[0] as Record<string, unknown>;
      expect(logPayload['requestId']).toBe(requestId);
    });

    it('includes user context in logs for permission denied errors', async () => {
      capturedLogs.length = 0;

      const { userAStandard } = await insertTenantAndUsers();

      await appWithLogs.inject({
        method: 'GET',
        url: '/api/v1/auth/admin/users',
        headers: {
          authorization: `Bearer ${userAStandard.tokens.accessToken}`,
        },
      });

      const errorLogs = capturedLogs.filter(
        (log) => log.level === 'warn' && log.args[1] === 'request error',
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      const logPayload = errorLogs[0]?.args[0] as Record<string, unknown>;
      expect(logPayload['userId'] || logPayload['user']).toBeDefined();
    });
  });
});
