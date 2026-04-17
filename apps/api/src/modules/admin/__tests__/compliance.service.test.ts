import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { ensureTenantColumns } from '../../../__tests__/helpers/db.js';
import { createTestTenant, createTestUser } from '../../../__tests__/helpers/fixtures.js';
import { playerProfiles } from '../../../db/schema/analytics/index.js';
import * as complianceService from '../compliance.service.js';
import { frameworkRequirements } from '../../../db/schema/compliance/index.js';

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
  await ensureTenantColumns(testConfig);
  await pool`TRUNCATE TABLE
    compliance.framework_requirements,
    compliance.compliance_snapshots,
    training.certificates,
    analytics.events,
    analytics.player_profiles,
    auth.sessions,
    auth.user_roles,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('compliance-service', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('initializeFrameworkRequirements', () => {
    it('should initialize framework requirements for all 8 frameworks', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const requirements = await db
        .select()
        .from(frameworkRequirements)
        .where(eq(frameworkRequirements.tenantId, tenant.tenantId))
        .execute();

      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should not duplicate requirements on multiple calls', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);
      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const requirements = await db
        .select()
        .from(frameworkRequirements)
        .where(eq(frameworkRequirements.tenantId, tenant.tenantId))
        .execute();

      const uniqueRequirements = new Set(requirements.map((r) => r.requirementId));
      expect(uniqueRequirements.size).toBe(requirements.length);
    });
  });

  describe('calculateComplianceSnapshot', () => {
    it('should create a compliance snapshot for a framework', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const result = await complianceService.calculateComplianceSnapshot(
        tenant.tenantId,
        'nist_800_50',
        'test-user',
        testConfig,
      );

      expect(result.tenantId).toBe(tenant.tenantId);
      expect(result.frameworkId).toBe('nist_800_50');
      expect(result.status).toBe('not_started');
      expect(result.completionPercentage).toBe(0);
    });

    it('should update existing snapshot on recalculation', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const firstResult = await complianceService.calculateComplianceSnapshot(
        tenant.tenantId,
        'nist_800_50',
        'test-user',
        testConfig,
      );
      const firstId = firstResult.id;

      const secondResult = await complianceService.calculateComplianceSnapshot(
        tenant.tenantId,
        'nist_800_50',
        'test-user',
        testConfig,
      );

      expect(secondResult.id).toBe(firstId);
    });

    it('should calculate completion based on player profiles', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'learner',
      });

      await db
        .insert(playerProfiles)
        .values({
          userId: user.userId,
          tenantId: tenant.tenantId,
          competencyScores: {
            phishing_detection: {
              score: 85,
              evidenceCount: 10,
              lastUpdated: new Date().toISOString(),
            },
          },
        })
        .execute();

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const result = await complianceService.calculateComplianceSnapshot(
        tenant.tenantId,
        'nist_800_50',
        'test-user',
        testConfig,
      );

      expect(result.completionPercentage).toBeGreaterThan(0);
    });
  });

  describe('calculateAllComplianceSnapshots', () => {
    it('should calculate snapshots for all frameworks', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      const results = await complianceService.calculateAllComplianceSnapshots(
        tenant.tenantId,
        'test-user',
        testConfig,
      );

      expect(results).toHaveLength(8);
    });
  });

  describe('getComplianceSummary', () => {
    it('should return empty summary when no snapshots exist', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const result = await complianceService.getComplianceSummary(tenantId, testConfig);

      expect(result.summaries).toHaveLength(0);
      expect(result.totalFrameworks).toBe(8);
      expect(result.compliantCount).toBe(0);
    });

    it('should return summary with calculated data', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.calculateAllComplianceSnapshots(
        tenant.tenantId,
        'test-user',
        testConfig,
      );

      const result = await complianceService.getComplianceSummary(tenant.tenantId, testConfig);

      expect(result.summaries).toHaveLength(8);
      expect(result.totalFrameworks).toBe(8);
    });
  });

  describe('getComplianceDetail', () => {
    it('should return null when no snapshot exists', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const result = await complianceService.getComplianceDetail(
        tenantId,
        'nist_800_50',
        testConfig,
      );

      expect(result).toBeNull();
    });

    it('should return detail with requirements', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.calculateComplianceSnapshot(
        tenant.tenantId,
        'nist_800_50',
        'test-user',
        testConfig,
      );

      const result = await complianceService.getComplianceDetail(
        tenant.tenantId,
        'nist_800_50',
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result?.frameworkId).toBe('nist_800_50');
      expect(result?.requirements).toBeDefined();
    });
  });

  describe('getFrameworkRequirements', () => {
    it('should return requirements for a framework', async () => {
      const db = getDatabaseClient(testConfig);

      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
        dataRegion: 'eu',
        planId: 'free',
      });

      await complianceService.initializeFrameworkRequirements(tenant.tenantId, testConfig);

      const result = await complianceService.getFrameworkRequirements(
        tenant.tenantId,
        'nist_800_50',
        testConfig,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.frameworkId).toBe('nist_800_50');
    });
  });
});
