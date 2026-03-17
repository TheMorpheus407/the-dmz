import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabasePool,
  getDatabaseClient,
} from '../../../shared/database/connection.js';
import { tenants, users } from '../../../shared/database/schema/index.js';
import { playerProfiles } from '../../../db/schema/analytics/index.js';
import * as trainerService from '../trainer.service.js';

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
    analytics.analytics_events,
    analytics.analytics_player_profiles,
    auth.sessions,
    auth.user_roles,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('trainer-service', () => {
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

  describe('getCompetencyDistribution', () => {
    it('should return empty distribution for tenant with no profiles', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const result = await trainerService.getCompetencyDistribution(
        tenantId,
        undefined,
        testConfig,
      );

      expect(result).toHaveLength(7);
      expect(result[0]?.domain).toBe('phishing_detection');
      expect(result[0]?.learnerCount).toBe(0);
      expect(result[0]?.averageScore).toBe(0);
    });

    it('should calculate competency distribution from player profiles', async () => {
      const db = getDatabaseClient(testConfig);

      const tenantId = '00000000-0000-0000-0000-000000000001';

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

      const userId = '00000000-0000-0000-0000-000000000001';
      await db
        .insert(users)
        .values({
          userId,
          tenantId,
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .execute();

      await db
        .insert(playerProfiles)
        .values({
          userId,
          tenantId,
          competencyScores: {
            phishing_detection: {
              score: 85,
              evidenceCount: 10,
              lastUpdated: new Date().toISOString(),
            },
            password_security: {
              score: 45,
              evidenceCount: 5,
              lastUpdated: new Date().toISOString(),
            },
            data_handling: { score: 30, evidenceCount: 3, lastUpdated: new Date().toISOString() },
          },
        })
        .execute();

      const result = await trainerService.getCompetencyDistribution(
        tenantId,
        undefined,
        testConfig,
      );

      const phishingResult = result.find((r) => r.domain === 'phishing_detection');
      expect(phishingResult?.learnerCount).toBe(1);
      expect(phishingResult?.averageScore).toBe(85);
      expect(phishingResult?.distribution.consistent).toBe(1);

      const dataHandlingResult = result.find((r) => r.domain === 'data_handling');
      expect(dataHandlingResult?.learnerCount).toBe(1);
      expect(dataHandlingResult?.averageScore).toBe(30);
      expect(dataHandlingResult?.distribution.foundational).toBe(1);
    });

    it('should filter by date range', async () => {
      const db = getDatabaseClient(testConfig);

      const tenantId = '00000000-0000-0000-0000-000000000001';

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

      const userId = '00000000-0000-0000-0000-000000000001';
      await db
        .insert(users)
        .values({
          userId,
          tenantId,
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .execute();

      await db
        .insert(playerProfiles)
        .values({
          userId,
          tenantId,
          competencyScores: {
            phishing_detection: {
              score: 85,
              evidenceCount: 10,
              lastUpdated: new Date().toISOString(),
            },
          },
          lastComputedAt: new Date('2024-01-01'),
        })
        .execute();

      const result = await trainerService.getCompetencyDistribution(
        tenantId,
        { startDate: new Date('2024-06-01'), endDate: new Date('2024-12-31') },
        testConfig,
      );

      const phishingResult = result.find((r) => r.domain === 'phishing_detection');
      expect(phishingResult?.learnerCount).toBe(0);
    });
  });

  describe('getErrorPatterns', () => {
    it('should return empty array when no errors exist', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const result = await trainerService.getErrorPatterns(tenantId, undefined, testConfig);

      expect(result).toHaveLength(0);
    });
  });

  describe('getLearnersByDomain', () => {
    it('should return learners below threshold for a domain', async () => {
      const db = getDatabaseClient(testConfig);

      const tenantId = '00000000-0000-0000-0000-000000000001';

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

      const userId1 = '00000000-0000-0000-0000-000000000001';
      const userId2 = '00000000-0000-0000-0000-000000000002';

      await db
        .insert(users)
        .values([
          {
            userId: userId1,
            tenantId,
            email: 'user1@example.com',
            displayName: 'User One',
            passwordHash: 'hash',
            role: 'learner',
            isActive: true,
          },
          {
            userId: userId2,
            tenantId,
            email: 'user2@example.com',
            displayName: 'User Two',
            passwordHash: 'hash',
            role: 'learner',
            isActive: true,
          },
        ])
        .execute();

      await db
        .insert(playerProfiles)
        .values([
          {
            userId: userId1,
            tenantId,
            competencyScores: {
              phishing_detection: {
                score: 30,
                evidenceCount: 5,
                lastUpdated: new Date().toISOString(),
              },
            },
          },
          {
            userId: userId2,
            tenantId,
            competencyScores: {
              phishing_detection: {
                score: 80,
                evidenceCount: 10,
                lastUpdated: new Date().toISOString(),
              },
            },
          },
        ])
        .execute();

      const result = await trainerService.getLearnersByDomain(
        tenantId,
        'phishing_detection',
        50,
        testConfig,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.email).toBe('user1@example.com');
      expect(result[0]?.score).toBe(30);
    });

    it('should return empty array when all learners are above threshold', async () => {
      const db = getDatabaseClient(testConfig);

      const tenantId = '00000000-0000-0000-0000-000000000001';

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

      const userId = '00000000-0000-0000-0000-000000000001';
      await db
        .insert(users)
        .values({
          userId,
          tenantId,
          email: 'user@example.com',
          displayName: 'User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .execute();

      await db
        .insert(playerProfiles)
        .values({
          userId,
          tenantId,
          competencyScores: {
            phishing_detection: {
              score: 85,
              evidenceCount: 10,
              lastUpdated: new Date().toISOString(),
            },
          },
        })
        .execute();

      const result = await trainerService.getLearnersByDomain(
        tenantId,
        'phishing_detection',
        50,
        testConfig,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getCampaignCompletion', () => {
    it('should return empty array when no campaigns exist', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const result = await trainerService.getCampaignCompletion(tenantId, testConfig);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTrainerDashboardData', () => {
    it('should return complete dashboard data', async () => {
      const db = getDatabaseClient(testConfig);

      const tenantId = '00000000-0000-0000-0000-000000000001';

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

      const userId = '00000000-0000-0000-0000-000000000001';
      await db
        .insert(users)
        .values({
          userId,
          tenantId,
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash: 'hash',
          role: 'learner',
          isActive: true,
        })
        .execute();

      await db
        .insert(playerProfiles)
        .values({
          userId,
          tenantId,
          competencyScores: {
            phishing_detection: {
              score: 75,
              evidenceCount: 10,
              lastUpdated: new Date().toISOString(),
            },
          },
        })
        .execute();

      const result = await trainerService.getTrainerDashboardData(tenantId, undefined, testConfig);

      expect(result.totalLearners).toBe(1);
      expect(result.competencies).toHaveLength(7);
      expect(result.errorPatterns).toHaveLength(0);
      expect(result.campaigns).toHaveLength(0);
    });
  });
});
