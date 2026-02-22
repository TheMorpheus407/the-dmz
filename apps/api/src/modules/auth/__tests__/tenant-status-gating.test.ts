import { randomUUID } from 'crypto';

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabasePool, getDatabaseClient } from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../../db/schema/auth/sessions.js';
import { preAuthTenantStatusGuard } from '../../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { invalidateTenantSessions } from '../auth.service.js';

import type { PreAuthTenantContext } from '../../../shared/middleware/pre-auth-tenant-resolver.js';
import type { AuthenticatedUser } from '../auth.types.js';

interface MockPreAuthRequest {
  preAuthTenantContext: PreAuthTenantContext | undefined;
  server: { config: AppConfig };
  log: { warn: ReturnType<typeof vi.fn> };
}

interface MockAuthenticatedRequest {
  user: AuthenticatedUser | undefined;
  server: { config: AppConfig };
  log: { warn: ReturnType<typeof vi.fn> };
}

type MockReply = {
  code?: number;
  send?: (body: unknown) => void;
};

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
    TENANT_RESOLVER_ENABLED: true,
    TENANT_HEADER_NAME: 'x-tenant-id',
    TENANT_FALLBACK_ENABLED: false,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
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

describe('tenant status gating', () => {
  beforeEach(async () => {
    await resetTestData();
  });

  describe('preAuthTenantStatusGuard', () => {
    const testUniqueId = `preauth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    it('allows request when tenant is active', async () => {
      const db = getDatabaseClient(testConfig);
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Active Tenant',
          slug: `active-tenant-${testUniqueId}`,
          status: 'active',
        })
        .returning({ tenantId: tenants.tenantId });

      expect(tenant).toBeDefined();

      const mockRequest: MockPreAuthRequest = {
        preAuthTenantContext: {
          tenantId: tenant!.tenantId,
          tenantSlug: `active-tenant-${testUniqueId}`,
          source: 'header' as const,
        },
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await preAuthTenantStatusGuard(mockRequest as any, mockReply as any);

      expect(mockRequest.log.warn).not.toHaveBeenCalled();
    });

    it('blocks request when tenant is suspended', async () => {
      const db = getDatabaseClient(testConfig);
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Suspended Tenant',
          slug: `suspended-tenant-${testUniqueId}`,
          status: 'suspended',
        })
        .returning({ tenantId: tenants.tenantId });

      expect(tenant).toBeDefined();

      const mockRequest: MockPreAuthRequest = {
        preAuthTenantContext: {
          tenantId: tenant!.tenantId,
          tenantSlug: `suspended-tenant-${testUniqueId}`,
          source: 'header' as const,
        },
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preAuthTenantStatusGuard(mockRequest as any, mockReply as any),
      ).rejects.toThrow();
    });

    it('blocks request when tenant is deactivated', async () => {
      const db = getDatabaseClient(testConfig);
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Deactivated Tenant',
          slug: `deactivated-tenant-${testUniqueId}`,
          status: 'deactivated',
        })
        .returning({ tenantId: tenants.tenantId });

      expect(tenant).toBeDefined();

      const mockRequest: MockPreAuthRequest = {
        preAuthTenantContext: {
          tenantId: tenant!.tenantId,
          tenantSlug: `deactivated-tenant-${testUniqueId}`,
          source: 'header' as const,
        },
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preAuthTenantStatusGuard(mockRequest as any, mockReply as any),
      ).rejects.toThrow();
    });

    it('allows request when no preAuthTenantContext is set', async () => {
      const mockRequest: MockPreAuthRequest = {
        preAuthTenantContext: undefined,
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await preAuthTenantStatusGuard(mockRequest as any, mockReply as any);

      expect(mockRequest.log.warn).not.toHaveBeenCalled();
    });
  });

  describe('tenantStatusGuard', () => {
    it('allows request when tenant is active', async () => {
      const testUniqueId = `active_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tenantId = randomUUID();
      const pool = getDatabasePool(testConfig);
      await pool`
        INSERT INTO tenants (tenant_id, name, slug, status)
        VALUES (${tenantId}, 'Active Tenant', ${`active-tenant-auth-${testUniqueId}`}, 'active')
      `;

      const db = getDatabaseClient(testConfig);
      const insertedTenant = await db.query.tenants.findFirst({
        where: (t, { eq }) => eq(t.tenantId, tenantId),
      });
      expect(insertedTenant).toBeDefined();
      expect(insertedTenant?.status).toBe('active');

      const mockRequest: MockAuthenticatedRequest = {
        user: {
          userId: 'user-1',
          tenantId: tenantId,
          sessionId: 'session-1',
          role: 'learner',
        },
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tenantStatusGuard(mockRequest as any, mockReply as any);

      expect(mockRequest.log.warn).not.toHaveBeenCalled();
    });

    it('blocks request when tenant is suspended', async () => {
      const testUniqueId = `suspended_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tenantId = randomUUID();
      const pool = getDatabasePool(testConfig);
      await pool`
        INSERT INTO tenants (tenant_id, name, slug, status)
        VALUES (${tenantId}, 'Suspended Tenant', ${`suspended-tenant-auth-${testUniqueId}`}, 'suspended')
      `;

      const db = getDatabaseClient(testConfig);
      const insertedTenant = await db.query.tenants.findFirst({
        where: (t, { eq }) => eq(t.tenantId, tenantId),
      });
      expect(insertedTenant).toBeDefined();
      expect(insertedTenant?.status).toBe('suspended');

      const mockRequest: MockAuthenticatedRequest = {
        user: {
          userId: 'user-1',
          tenantId: tenantId,
          sessionId: 'session-1',
          role: 'learner',
        },
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tenantStatusGuard(mockRequest as any, mockReply as any);
        // If we get here without throwing, check if the tenant was found
        // by querying again with the guard's database client
        const dbAfter = getDatabaseClient(mockRequest.server.config);
        const tenantAfter = await dbAfter.query.tenants.findFirst({
          where: (t, { eq }) => eq(t.tenantId, tenantId),
        });
        throw new Error(
          `Expected guard to throw but it didn't. Tenant in DB: ${JSON.stringify(tenantAfter)}`,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('Expected guard to throw')) {
          throw error;
        }
        // Expected - the guard should throw
        expect(error).toBeDefined();
      }
    });

    it('allows request when no user is set', async () => {
      const mockRequest: MockAuthenticatedRequest = {
        user: undefined,
        server: { config: testConfig },
        log: {
          warn: vi.fn(),
        },
      };

      const mockReply: MockReply = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tenantStatusGuard(mockRequest as any, mockReply as any);

      expect(mockRequest.log.warn).not.toHaveBeenCalled();
    });
  });

  describe('invalidateTenantSessions', () => {
    const testUniqueId = `invalidate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    it('deletes all sessions for a tenant', async () => {
      const db = getDatabaseClient(testConfig);
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: `test-tenant-${testUniqueId}`,
          status: 'active',
        })
        .returning({ tenantId: tenants.tenantId });

      expect(tenant).toBeDefined();

      const [user] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          passwordHash: 'hash',
          displayName: 'Test User',
          tenantId: tenant!.tenantId,
          role: 'learner',
        })
        .returning({ userId: users.userId });

      expect(user).toBeDefined();

      await db.insert(sessionsTable).values([
        {
          userId: user!.userId,
          tenantId: tenant!.tenantId,
          tokenHash: 'hash1',
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          userId: user!.userId,
          tenantId: tenant!.tenantId,
          tokenHash: 'hash2',
          expiresAt: new Date(Date.now() + 86400000),
        },
      ]);

      const deletedCount = await invalidateTenantSessions(testConfig, tenant!.tenantId);

      expect(deletedCount).toBe(2);

      const remainingSessions = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.tenantId, tenant!.tenantId));

      expect(remainingSessions).toHaveLength(0);
    });

    it('returns 0 when no sessions exist for tenant', async () => {
      const db = getDatabaseClient(testConfig);
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: 'Test Tenant',
          slug: `test-tenant-2-${testUniqueId}`,
          status: 'active',
        })
        .returning({ tenantId: tenants.tenantId });

      expect(tenant).toBeDefined();

      const deletedCount = await invalidateTenantSessions(testConfig, tenant!.tenantId);

      expect(deletedCount).toBe(0);
    });
  });
});
