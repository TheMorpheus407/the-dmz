import { randomUUID } from 'crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../../shared/database/connection.js';
import { tenants, users } from '../../../../shared/database/schema/index.js';
import {
  phishingSimulations,
  phishingSimulationResults,
  phishingSimulationEvents,
} from '../../../../shared/database/schema/training/phishing.schema.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../../__tests__/helpers/db.js';
import * as resultsService from '../results.service.js';

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
    training.phishing_simulation_events,
    training.phishing_simulation_results,
    training.phishing_simulations,
    auth.user_roles,
    auth.sessions,
    auth.user_profiles,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('phishing-simulation-results-service', () => {
  beforeAll(async () => {
    await resetTestDatabase(testConfig);
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const setupTenantAndSimulation = async () => {
    const db = getDatabaseClient(testConfig);
    const tenantId = randomUUID();
    const simulationId = randomUUID();
    const userId = randomUUID();
    const createdBy = randomUUID();

    await db
      .insert(tenants)
      .values({
        tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        dataRegion: 'eu',
        planId: 'free',
      })
      .execute();

    await db
      .insert(phishingSimulations)
      .values({
        simulationId,
        tenantId,
        name: 'Test Simulation',
        description: 'Test description',
        status: 'active',
        subject: 'Test Subject',
        body: 'Test body content',
        createdBy,
      })
      .execute();

    return { tenantId, simulationId, userId, createdBy };
  };

  const setupUsersWithResults = async (tenantId: string, simulationId: string) => {
    const db = getDatabaseClient(testConfig);

    const user1Id = randomUUID();
    const user2Id = randomUUID();
    const user3Id = randomUUID();

    await db
      .insert(users)
      .values({
        userId: user1Id,
        tenantId,
        email: 'user1@example.com',
        displayName: 'User One',
        passwordHash: 'hash',
        role: 'learner',
        department: 'Engineering',
      })
      .execute();

    await db
      .insert(users)
      .values({
        userId: user2Id,
        tenantId,
        email: 'user2@example.com',
        displayName: 'User Two',
        passwordHash: 'hash',
        role: 'learner',
        department: 'Sales',
      })
      .execute();

    await db
      .insert(users)
      .values({
        userId: user3Id,
        tenantId,
        email: 'user3@example.com',
        displayName: 'User Three',
        passwordHash: 'hash',
        role: 'admin',
        department: 'Engineering',
      })
      .execute();

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    await db
      .insert(phishingSimulationResults)
      .values({
        resultId: randomUUID(),
        simulationId,
        userId: user1Id,
        emailDelivered: true,
        emailOpened: true,
        linkClicked: true,
        clickedAt: fiveMinAgo,
        timeToClickSeconds: 300,
        reported: true,
        reportedAt: fiveMinAgo,
        timeToReportSeconds: 300,
        simulationOutcome: 'reported',
        teachableMomentViewed: true,
        teachableMomentViewedAt: fiveMinAgo,
        enrolledInMicroTraining: true,
      })
      .execute();

    await db
      .insert(phishingSimulationResults)
      .values({
        resultId: randomUUID(),
        simulationId,
        userId: user2Id,
        emailDelivered: true,
        emailOpened: false,
        linkClicked: false,
        reported: false,
        simulationOutcome: 'ignored',
      })
      .execute();

    await db
      .insert(phishingSimulationResults)
      .values({
        resultId: randomUUID(),
        simulationId,
        userId: user3Id,
        emailDelivered: true,
        emailOpened: true,
        linkClicked: true,
        clickedAt: thirtyMinAgo,
        timeToClickSeconds: 1800,
        reported: false,
        simulationOutcome: 'clicked',
      })
      .execute();

    return { user1Id, user2Id, user3Id };
  };

  describe('getSimulationResults', () => {
    it('should return results for a simulation', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId: randomUUID(),
          emailDelivered: true,
          emailOpened: true,
          linkClicked: false,
          reported: false,
        })
        .execute();

      const results = await resultsService.getSimulationResults(tenantId, simulationId, testConfig);

      expect(results).toHaveLength(1);
      expect(results[0]?.simulationId).toBe(simulationId);
      expect(results[0]?.emailDelivered).toBe(true);
    });

    it('should throw error when simulation does not exist', async () => {
      const { tenantId } = await setupTenantAndSimulation();
      const nonExistentSimulationId = randomUUID();

      await expect(
        resultsService.getSimulationResults(tenantId, nonExistentSimulationId, testConfig),
      ).rejects.toThrow('Simulation not found');
    });

    it('should return empty array when no results exist', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();

      const results = await resultsService.getSimulationResults(tenantId, simulationId, testConfig);

      expect(results).toHaveLength(0);
    });

    it('should map result fields correctly', async () => {
      const { tenantId, simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);
      const resultId = randomUUID();

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId,
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: true,
          linkClicked: true,
          clickedAt: new Date(),
          timeToClickSeconds: 120,
          reported: true,
          reportedAt: new Date(),
          timeToReportSeconds: 120,
          attachmentOpened: false,
          simulationOutcome: 'clicked',
          teachableMomentViewed: true,
          enrolledInMicroTraining: false,
        })
        .execute();

      const results = await resultsService.getSimulationResults(tenantId, simulationId, testConfig);

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.resultId).toBe(resultId);
      expect(result.simulationId).toBe(simulationId);
      expect(result.userId).toBe(userId);
      expect(result.emailDelivered).toBe(true);
      expect(result.emailOpened).toBe(true);
      expect(result.linkClicked).toBe(true);
      expect(result.clickedAt).toBeInstanceOf(Date);
      expect(result.timeToClickSeconds).toBe(120);
      expect(result.reported).toBe(true);
      expect(result.reportedAt).toBeInstanceOf(Date);
      expect(result.timeToReportSeconds).toBe(120);
      expect(result.simulationOutcome).toBe('clicked');
      expect(result.teachableMomentViewed).toBe(true);
      expect(result.enrolledInMicroTraining).toBe(false);
    });
  });

  describe('getSimulationResultsSummary', () => {
    it('should return aggregated summary for simulation', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      await setupUsersWithResults(tenantId, simulationId);

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary).not.toBeNull();
      expect(summary?.totalTargeted).toBe(3);
      expect(summary?.emailDelivered).toBe(3);
      expect(summary?.emailOpened).toBe(2);
      expect(summary?.linkClicked).toBe(2);
      expect(summary?.reported).toBe(1);
      expect(summary?.clickRate).toBeCloseTo(66.67, 1);
      expect(summary?.reportRate).toBeCloseTo(33.33, 1);
    });

    it('should return null when simulation does not exist', async () => {
      const { tenantId } = await setupTenantAndSimulation();
      const nonExistentSimulationId = randomUUID();

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        nonExistentSimulationId,
        testConfig,
      );

      expect(summary).toBeNull();
    });

    it('should calculate department breakdown correctly', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      await setupUsersWithResults(tenantId, simulationId);

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary?.byDepartment).toBeDefined();
      const engineeringDept = summary?.byDepartment.find((d) => d.department === 'Engineering');
      const salesDept = summary?.byDepartment.find((d) => d.department === 'Sales');

      expect(engineeringDept?.total).toBe(2);
      expect(engineeringDept?.clicked).toBe(2);
      expect(engineeringDept?.reported).toBe(1);

      expect(salesDept?.total).toBe(1);
      expect(salesDept?.clicked).toBe(0);
      expect(salesDept?.reported).toBe(0);
    });

    it('should calculate role breakdown correctly', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      await setupUsersWithResults(tenantId, simulationId);

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary?.byRole).toBeDefined();
      const learnerRole = summary?.byRole.find((r) => r.role === 'learner');
      const adminRole = summary?.byRole.find((r) => r.role === 'admin');

      expect(learnerRole?.total).toBe(2);
      expect(adminRole?.total).toBe(1);
    });

    it('should calculate time-to-click distribution buckets', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      await setupUsersWithResults(tenantId, simulationId);

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary?.timeToClickDistribution).toBeDefined();
      expect(summary?.timeToClickDistribution).toHaveLength(6);

      const buckets = summary?.timeToClickDistribution;
      expect(buckets?.find((b) => b.bucket === '1-5 min')?.count).toBe(1);
      expect(buckets?.find((b) => b.bucket === '15-30 min')?.count).toBe(1);
    });

    it('should identify repeat failures', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      const user1Id = randomUUID();
      const user2Id = randomUUID();

      await db
        .insert(users)
        .values({
          userId: user1Id,
          tenantId,
          email: 'repeat1@example.com',
          displayName: 'Repeat User 1',
          passwordHash: 'hash',
          role: 'learner',
          department: 'Engineering',
        })
        .execute();

      await db
        .insert(users)
        .values({
          userId: user2Id,
          tenantId,
          email: 'repeat2@example.com',
          displayName: 'Repeat User 2',
          passwordHash: 'hash',
          role: 'learner',
          department: 'Sales',
        })
        .execute();

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId: user1Id,
          emailDelivered: true,
          linkClicked: true,
          clickedAt: new Date(),
          timeToClickSeconds: 60,
          simulationOutcome: 'clicked',
        })
        .execute();

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId: user2Id,
          emailDelivered: true,
          linkClicked: false,
          simulationOutcome: 'ignored',
        })
        .execute();

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary?.repeatFailures).toBeDefined();
      expect(summary?.repeatFailures).toHaveLength(0);
    });

    it('should handle unknown department and role gracefully', async () => {
      const { tenantId, simulationId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);
      const userId = randomUUID();

      await db
        .insert(users)
        .values({
          userId,
          tenantId,
          email: 'nodept@example.com',
          displayName: 'No Department User',
          passwordHash: 'hash',
          role: 'learner',
        })
        .execute();

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          linkClicked: true,
          simulationOutcome: 'clicked',
        })
        .execute();

      const summary = await resultsService.getSimulationResultsSummary(
        tenantId,
        simulationId,
        testConfig,
      );

      expect(summary).not.toBeNull();
      const unknownDept = summary?.byDepartment.find((d) => d.department === 'Unknown');
      expect(unknownDept?.total).toBe(1);
    });
  });

  describe('recordSimulationEvent', () => {
    it('should record a generic simulation event', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const userId = randomUUID();
      const db = getDatabaseClient(testConfig);

      await resultsService.recordSimulationEvent(
        simulationId,
        userId,
        'test_event',
        { key: 'value' },
        '192.168.1.1',
        'Mozilla/5.0',
        testConfig,
      );

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.simulationId, simulationId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('test_event');
      expect(events[0]?.userId).toBe(userId);
      expect(events[0]?.ipAddress).toBe('192.168.1.1');
      expect(events[0]?.userAgent).toBe('Mozilla/5.0');
      expect(events[0]?.eventData).toEqual({ key: 'value' });
    });

    it('should allow optional ipAddress and userAgent', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const userId = randomUUID();
      const db = getDatabaseClient(testConfig);

      await resultsService.recordSimulationEvent(
        simulationId,
        userId,
        'test_event',
        {},
        undefined,
        undefined,
        testConfig,
      );

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.simulationId, simulationId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.ipAddress).toBeNull();
      expect(events[0]?.userAgent).toBeNull();
    });
  });

  describe('recordLinkClick', () => {
    it('should record a link click and update result', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          simulationOutcome: 'pending',
        })
        .execute();

      await resultsService.recordLinkClick(
        simulationId,
        userId,
        '192.168.1.1',
        'Mozilla/5.0',
        testConfig,
      );

      const [result] = await db
        .select()
        .from(phishingSimulationResults)
        .where(eq(phishingSimulationResults.simulationId, simulationId))
        .execute();

      expect(result.linkClicked).toBe(true);
      expect(result.clickedAt).toBeInstanceOf(Date);
      expect(result.timeToClickSeconds).toBeGreaterThanOrEqual(0);
      expect(result.simulationOutcome).toBe('clicked');
    });

    it('should throw error when result not found', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const nonExistentUserId = randomUUID();

      await expect(
        resultsService.recordLinkClick(
          simulationId,
          nonExistentUserId,
          undefined,
          undefined,
          testConfig,
        ),
      ).rejects.toThrow('Simulation result not found');
    });

    it('should record link_clicked event', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          simulationOutcome: 'pending',
        })
        .execute();

      await resultsService.recordLinkClick(simulationId, userId, undefined, undefined, testConfig);

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.userId, userId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('link_clicked');
    });
  });

  describe('recordReport', () => {
    it('should record a phishing report and update result', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          simulationOutcome: 'pending',
        })
        .execute();

      await resultsService.recordReport(
        simulationId,
        userId,
        '192.168.1.1',
        'Mozilla/5.0',
        testConfig,
      );

      const [result] = await db
        .select()
        .from(phishingSimulationResults)
        .where(eq(phishingSimulationResults.userId, userId))
        .execute();

      expect(result.reported).toBe(true);
      expect(result.reportedAt).toBeInstanceOf(Date);
      expect(result.timeToReportSeconds).toBeGreaterThanOrEqual(0);
      expect(result.simulationOutcome).toBe('reported');
    });

    it('should preserve clicked outcome if user already clicked', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: true,
          clickedAt: new Date(),
          timeToClickSeconds: 60,
          reported: false,
          simulationOutcome: 'clicked',
        })
        .execute();

      await resultsService.recordReport(simulationId, userId, undefined, undefined, testConfig);

      const [result] = await db
        .select()
        .from(phishingSimulationResults)
        .where(eq(phishingSimulationResults.userId, userId))
        .execute();

      expect(result.reported).toBe(true);
      expect(result.simulationOutcome).toBe('clicked');
    });

    it('should throw error when result not found', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const nonExistentUserId = randomUUID();

      await expect(
        resultsService.recordReport(
          simulationId,
          nonExistentUserId,
          undefined,
          undefined,
          testConfig,
        ),
      ).rejects.toThrow('Simulation result not found');
    });

    it('should record simulation_reported event', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          simulationOutcome: 'pending',
        })
        .execute();

      await resultsService.recordReport(simulationId, userId, undefined, undefined, testConfig);

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.userId, userId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('simulation_reported');
    });
  });

  describe('recordTeachableMomentView', () => {
    it('should record teachable moment view and update result', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          teachableMomentViewed: false,
          simulationOutcome: 'ignored',
        })
        .execute();

      await resultsService.recordTeachableMomentView(simulationId, userId, testConfig);

      const [result] = await db
        .select()
        .from(phishingSimulationResults)
        .where(eq(phishingSimulationResults.userId, userId))
        .execute();

      expect(result.teachableMomentViewed).toBe(true);
      expect(result.teachableMomentViewedAt).toBeInstanceOf(Date);
    });

    it('should throw error when result not found', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const nonExistentUserId = randomUUID();

      await expect(
        resultsService.recordTeachableMomentView(simulationId, nonExistentUserId, testConfig),
      ).rejects.toThrow('Simulation result not found');
    });

    it('should record teachable_moment_viewed event', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          teachableMomentViewed: false,
          simulationOutcome: 'ignored',
        })
        .execute();

      await resultsService.recordTeachableMomentView(simulationId, userId, testConfig);

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.userId, userId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('teachable_moment_viewed');
    });
  });

  describe('recordMicroTrainingEnrollment', () => {
    it('should record micro training enrollment and update result', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          enrolledInMicroTraining: false,
          simulationOutcome: 'ignored',
        })
        .execute();

      await resultsService.recordMicroTrainingEnrollment(simulationId, userId, testConfig);

      const [result] = await db
        .select()
        .from(phishingSimulationResults)
        .where(eq(phishingSimulationResults.userId, userId))
        .execute();

      expect(result.enrolledInMicroTraining).toBe(true);
    });

    it('should throw error when result not found', async () => {
      const { simulationId } = await setupTenantAndSimulation();
      const nonExistentUserId = randomUUID();

      await expect(
        resultsService.recordMicroTrainingEnrollment(simulationId, nonExistentUserId, testConfig),
      ).rejects.toThrow('Simulation result not found');
    });

    it('should record micro_training_enrolled event', async () => {
      const { simulationId, userId } = await setupTenantAndSimulation();
      const db = getDatabaseClient(testConfig);

      await db
        .insert(phishingSimulationResults)
        .values({
          resultId: randomUUID(),
          simulationId,
          userId,
          emailDelivered: true,
          emailOpened: false,
          linkClicked: false,
          reported: false,
          enrolledInMicroTraining: false,
          simulationOutcome: 'ignored',
        })
        .execute();

      await resultsService.recordMicroTrainingEnrollment(simulationId, userId, testConfig);

      const events = await db
        .select()
        .from(phishingSimulationEvents)
        .where(eq(phishingSimulationEvents.userId, userId))
        .execute();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('micro_training_enrolled');
    });
  });
});
