import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { tenants, users } from '../../../shared/database/schema/index.js';
import * as auditService from '../audit.service.js';

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
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    audit.logs,
    audit.retention_config,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

const setupTestTenant = async (): Promise<{ tenantId: string; userId: string }> => {
  const db = getDatabaseClient(testConfig);

  const [tenant] = await db
    .insert(tenants)
    .values({
      tenantId: '00000000-0000-0000-0000-000000000001',
      name: 'Test Tenant',
      slug: 'test-tenant',
      planId: 'enterprise',
      isActive: true,
    })
    .returning();

  if (!tenant) {
    throw new Error('Failed to create test tenant');
  }

  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.tenantId,
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      passwordHash: 'hashed',
    })
    .returning();

  if (!user) {
    throw new Error('Failed to create test user');
  }

  return { tenantId: tenant.tenantId, userId: user.userId };
};

describe('audit-service', () => {
  let testTenantId = '';
  let testUserId = '';

  beforeAll(async () => {
    const state = await setupTestTenant();
    if (state) {
      testTenantId = state.tenantId;
      testUserId = state.userId;
    }
  });

  beforeEach(async () => {
    await resetTestData();
    const state = await setupTestTenant();
    if (state) {
      testTenantId = state.tenantId;
      testUserId = state.userId;
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry with correct hash chain', async () => {
      const result = await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
          resourceId: '00000000-0000-0000-0000-000000000002',
          ipAddress: '192.168.1.1',
          metadata: { foo: 'bar' },
        },
        testConfig,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe(testTenantId);
      expect(result.userId).toBe(testUserId);
      expect(result.action).toBe('user.create');
      expect(result.resourceType).toBe('user');
      expect(result.hash).toHaveLength(64);
      expect(result.previousHash).toHaveLength(64);
    });

    it('should link previous hash correctly for sequential entries', async () => {
      const first = await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      const second = await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.update',
          resourceType: 'user',
        },
        testConfig,
      );

      expect(second.previousHash).toBe(first.hash);
      expect(second.hash).not.toBe(first.hash);
    });
  });

  describe('queryAuditLogs', () => {
    beforeEach(async () => {
      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'role.assign',
          resourceType: 'role',
        },
        testConfig,
      );
    });

    it('should return all logs for tenant', async () => {
      const result = await auditService.queryAuditLogs(
        {
          tenantId: testTenantId,
        },
        testConfig,
      );

      expect(result.logs.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by action', async () => {
      const result = await auditService.queryAuditLogs(
        {
          tenantId: testTenantId,
          action: 'user.create',
        },
        testConfig,
      );

      expect(result.logs.every((log) => log.action === 'user.create')).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const result = await auditService.queryAuditLogs(
        {
          tenantId: testTenantId,
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        },
        testConfig,
      );

      expect(result.logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const result = await auditService.queryAuditLogs(
        {
          tenantId: testTenantId,
          limit: 1,
          offset: 0,
        },
        testConfig,
      );

      expect(result.logs.length).toBe(1);
    });
  });

  describe('verifyAuditChain', () => {
    it('should return valid for empty chain', async () => {
      const result = await auditService.verifyAuditChain(
        testTenantId,
        undefined,
        undefined,
        testConfig,
      );

      expect(result.isValid).toBe(true);
      expect(result.checkedEntries).toBe(0);
    });

    it('should verify valid chain', async () => {
      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      const result = await auditService.verifyAuditChain(
        testTenantId,
        undefined,
        undefined,
        testConfig,
      );

      expect(result.isValid).toBe(true);
      expect(result.checkedEntries).toBe(1);
    });

    it('should detect chain tampering', async () => {
      const db = getDatabaseClient(testConfig);
      const { auditLogs } = await import('../../../db/schema/audit/index.js');

      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      await db
        .update(auditLogs)
        .set({ action: 'tampered.action' })
        .where(eq(auditLogs.tenantId, testTenantId));

      const result = await auditService.verifyAuditChain(
        testTenantId,
        undefined,
        undefined,
        testConfig,
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Hash mismatch');
    });
  });

  describe('retention config', () => {
    it('should get default retention config', async () => {
      const result = await auditService.getRetentionConfig(testTenantId, testConfig);

      expect(result).toBeDefined();
      expect(result?.retentionYears).toBe(7);
    });

    it('should update retention config', async () => {
      await auditService.updateRetentionConfig(testTenantId, 5, 'HIPAA', testConfig);

      const result = await auditService.getRetentionConfig(testTenantId, testConfig);

      expect(result?.retentionYears).toBe(5);
      expect(result?.framework).toBe('HIPAA');
    });

    it('should clamp retention years to valid range', async () => {
      await auditService.updateRetentionConfig(testTenantId, 10, undefined, testConfig);

      const result = await auditService.getRetentionConfig(testTenantId, testConfig);

      expect(result?.retentionYears).toBe(7);
    });
  });

  describe('getAuditActions', () => {
    it('should return distinct actions', async () => {
      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'user.create',
          resourceType: 'user',
        },
        testConfig,
      );

      await auditService.createAuditLog(
        {
          tenantId: testTenantId,
          userId: testUserId,
          action: 'role.assign',
          resourceType: 'role',
        },
        testConfig,
      );

      const actions = await auditService.getAuditActions(testTenantId, testConfig);

      expect(actions).toContain('user.create');
      expect(actions).toContain('role.assign');
      expect(actions.length).toBe(2);
    });
  });
});
