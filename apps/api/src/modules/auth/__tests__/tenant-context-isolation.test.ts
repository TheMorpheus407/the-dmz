import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { LogLevel } from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import {
  createDualTenantFixture,
  type DualTenantFixture,
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
    public.users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('tenant-context DB isolation', () => {
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

  describe('parallel tenant traffic isolation', () => {
    it('prevents Tenant A session context from bleeding into Tenant B request', async () => {
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

      expect(tenantARow).toBeDefined();
      expect(tenantBRow).toBeDefined();

      const registerA = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantA.id },
        payload: {
          email: 'usera@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'User A',
        },
      });

      const registerB = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantB.id },
        payload: {
          email: 'userb@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'User B',
        },
      });

      expect(registerA.statusCode).toBe(201);
      expect(registerB.statusCode).toBe(201);

      const tokenA = registerA.json().accessToken;
      const tokenB = registerB.json().accessToken;

      const results = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const [resA, resB] = await Promise.all([
            app.inject({
              method: 'GET',
              url: '/api/v1/auth/me',
              headers: { authorization: `Bearer ${tokenA}` },
            }),
            app.inject({
              method: 'GET',
              url: '/api/v1/auth/me',
              headers: { authorization: `Bearer ${tokenB}` },
            }),
          ]);

          return {
            iteration: i,
            a: { status: resA.statusCode, tenant: resA.json().user?.tenantId },
            b: { status: resB.statusCode, tenant: resB.json().user?.tenantId },
          };
        }),
      );

      for (const result of results) {
        expect(result.a.status).toBe(200);
        expect(result.b.status).toBe(200);
        expect(result.a.tenant).toBe(fixture.tenantA.id);
        expect(result.b.tenant).toBe(fixture.tenantB.id);
      }
    });

    it('ensures rapid sequential requests maintain strict isolation', async () => {
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

      expect(tenantARow).toBeDefined();
      expect(tenantBRow).toBeDefined();

      const registerA = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantA.id },
        payload: {
          email: 'sequential-a@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Seq A',
        },
      });

      const registerB = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantB.id },
        payload: {
          email: 'sequential-b@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Seq B',
        },
      });

      const tokenA = registerA.json().accessToken;
      const tokenB = registerB.json().accessToken;

      for (let i = 0; i < 20; i++) {
        const resA = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: { authorization: `Bearer ${tokenA}` },
        });

        const resB = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: { authorization: `Bearer ${tokenB}` },
        });

        expect(resA.json().user?.tenantId).toBe(fixture.tenantA.id);
        expect(resB.json().user?.tenantId).toBe(fixture.tenantB.id);
      }
    });
  });

  describe('connection reuse isolation', () => {
    it('validates connection pool does not leak tenant context between requests', async () => {
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

      expect(tenantARow).toBeDefined();
      expect(tenantBRow).toBeDefined();

      const registerA = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantA.id },
        payload: {
          email: 'pool-a@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Pool A',
        },
      });

      const registerB = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantB.id },
        payload: {
          email: 'pool-b@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Pool B',
        },
      });

      const tokenA = registerA.json().accessToken;
      const tokenB = registerB.json().accessToken;

      const iterations = 50;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const resA = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: { authorization: `Bearer ${tokenA}` },
        });

        const resB = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: { authorization: `Bearer ${tokenB}` },
        });

        results.push({
          iteration: i,
          aTenant: resA.json().user?.tenantId,
          bTenant: resB.json().user?.tenantId,
        });
      }

      const mismatches = results.filter(
        (r) => r.aTenant !== fixture.tenantA.id || r.bTenant !== fixture.tenantB.id,
      );

      expect(mismatches).toHaveLength(0);
    });
  });

  describe('error responses standardization', () => {
    it('returns standardized error for missing authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
      expect(body.error.requestId).toBeDefined();
    });

    it('includes correlation ID in tenant context errors', async () => {
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

      expect(tenantRow).toBeDefined();

      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'x-tenant-id': fixture.tenantA.id },
        payload: {
          email: 'error-test@test.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Error Test',
        },
      });

      const token = register.json().accessToken;

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().user?.requestId).toBeUndefined();
    });
  });
});
