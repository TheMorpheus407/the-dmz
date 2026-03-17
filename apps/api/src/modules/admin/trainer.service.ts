import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';

import { COMPETENCY_DOMAINS, type CompetencyDomain } from '@the-dmz/shared';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { playerProfiles, analyticsEvents } from '../../db/schema/analytics/index.js';
import { users } from '../../shared/database/schema/users.js';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface CompetencyDistribution {
  domain: string;
  averageScore: number;
  learnerCount: number;
  distribution: {
    foundational: number;
    operational: number;
    consistent: number;
    mastery: number;
  };
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  domain: string;
  recentOccurrences: string[];
}

export interface LearnerSummary {
  userId: string;
  email: string;
  displayName: string;
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  lastActivity: string;
}

export interface CampaignCompletion {
  campaignId: string;
  campaignName: string;
  totalLearners: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface TrainerDashboardData {
  competencies: CompetencyDistribution[];
  errorPatterns: ErrorPattern[];
  campaigns: CampaignCompletion[];
  totalLearners: number;
  averageScore: number;
}

interface CompetencyScore {
  score: number;
  evidenceCount: number;
  lastUpdated: string;
}

function getScoreTier(score: number): 'foundational' | 'operational' | 'consistent' | 'mastery' {
  if (score >= 90) return 'mastery';
  if (score >= 70) return 'consistent';
  if (score >= 40) return 'operational';
  return 'foundational';
}

export const getCompetencyDistribution = async (
  tenantId: string,
  dateRange?: DateRange,
  config: AppConfig = loadConfig(),
): Promise<CompetencyDistribution[]> => {
  const db = getDatabaseClient(config);

  const profiles = await db
    .select({
      userId: playerProfiles.userId,
      competencyScores: playerProfiles.competencyScores,
      lastComputedAt: playerProfiles.lastComputedAt,
    })
    .from(playerProfiles)
    .where(eq(playerProfiles.tenantId, tenantId))
    .execute();

  const filteredProfiles = profiles.filter((profile) => {
    if (!dateRange?.startDate && !dateRange?.endDate) return true;
    const lastComputed = profile.lastComputedAt;
    if (dateRange.startDate && lastComputed < dateRange.startDate) return false;
    if (dateRange.endDate && lastComputed > dateRange.endDate) return false;
    return true;
  });

  const distributions: CompetencyDistribution[] = COMPETENCY_DOMAINS.map((domain) => {
    let totalScore = 0;
    let learnerCount = 0;
    const tierCounts = {
      foundational: 0,
      operational: 0,
      consistent: 0,
      mastery: 0,
    };

    for (const profile of filteredProfiles) {
      const scores = profile.competencyScores as Record<string, CompetencyScore>;
      const domainScore = scores[domain];
      if (domainScore && domainScore.evidenceCount > 0) {
        totalScore += domainScore.score;
        learnerCount++;
        const tier = getScoreTier(domainScore.score);
        tierCounts[tier]++;
      }
    }

    return {
      domain,
      averageScore: learnerCount > 0 ? Math.round(totalScore / learnerCount) : 0,
      learnerCount,
      distribution: tierCounts,
    };
  });

  return distributions;
};

export const getErrorPatterns = async (
  tenantId: string,
  dateRange?: DateRange,
  config: AppConfig = loadConfig(),
): Promise<ErrorPattern[]> => {
  const db = getDatabaseClient(config);

  const conditions = [
    eq(analyticsEvents.tenantId, tenantId),
    sql`${analyticsEvents.eventProperties}->>'outcome' = 'incorrect'`,
  ];

  if (dateRange?.startDate) {
    conditions.push(gte(analyticsEvents.eventTime, dateRange.startDate));
  }

  if (dateRange?.endDate) {
    conditions.push(lte(analyticsEvents.eventTime, dateRange.endDate));
  }

  const events = await db
    .select({
      eventName: analyticsEvents.eventName,
      eventProperties: analyticsEvents.eventProperties,
      eventTime: analyticsEvents.eventTime,
    })
    .from(analyticsEvents)
    .where(and(...conditions))
    .orderBy(desc(analyticsEvents.eventTime))
    .limit(100)
    .execute();

  const typedEvents = events.map((e) => ({
    eventName: e.eventName,
    eventProperties: e.eventProperties as Record<string, unknown>,
    eventTime: e.eventTime,
  }));

  const patternCounts = new Map<string, { count: number; domain: string; timestamps: string[] }>();

  for (const event of typedEvents) {
    const competencyTags = event.eventProperties['competency_tags'] as string[] | undefined;
    const mechanic = event.eventProperties['mechanic'] as string | undefined;

    const pattern = mechanic || event.eventName;
    const domain = competencyTags?.[0] || 'unknown';

    const existing = patternCounts.get(pattern);
    if (existing) {
      existing.count++;
      if (existing.timestamps.length < 5) {
        existing.timestamps.push(event.eventTime.toISOString());
      }
    } else {
      patternCounts.set(pattern, {
        count: 1,
        domain,
        timestamps: [event.eventTime.toISOString()],
      });
    }
  }

  const patterns: ErrorPattern[] = [];
  for (const [pattern, data] of patternCounts) {
    patterns.push({
      pattern,
      count: data.count,
      domain: data.domain,
      recentOccurrences: data.timestamps,
    });
  }

  patterns.sort((a, b) => b.count - a.count);
  return patterns.slice(0, 10);
};

export const getLearnersByDomain = async (
  tenantId: string,
  domain: CompetencyDomain,
  threshold: number = 50,
  config: AppConfig = loadConfig(),
): Promise<LearnerSummary[]> => {
  const db = getDatabaseClient(config);

  const profiles = await db
    .select({
      userId: playerProfiles.userId,
      competencyScores: playerProfiles.competencyScores,
      trend30d: playerProfiles.trend30d,
      lastComputedAt: playerProfiles.lastComputedAt,
    })
    .from(playerProfiles)
    .where(eq(playerProfiles.tenantId, tenantId))
    .execute();

  const userIds = profiles.map((p) => p.userId);

  const userRecords = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(sql`${users.userId} IN ${userIds}`)
    .execute();

  const userMap = new Map(userRecords.map((u) => [u.userId, u]));

  const learners: LearnerSummary[] = [];

  for (const profile of profiles) {
    const scores = profile.competencyScores as Record<string, CompetencyScore>;
    const domainScore = scores[domain];

    if (!domainScore || domainScore.evidenceCount === 0) continue;
    if (domainScore.score >= threshold) continue;

    const user = userMap.get(profile.userId);
    const trends = profile.trend30d as Record<string, { slope: number }>;
    const trendData = trends?.[domain];

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (trendData) {
      if (trendData.slope > 0.01) trend = 'improving';
      else if (trendData.slope < -0.01) trend = 'declining';
    }

    learners.push({
      userId: profile.userId,
      email: user?.email || '',
      displayName: user?.displayName || 'Unknown',
      score: domainScore.score,
      trend,
      lastActivity: profile.lastComputedAt.toISOString(),
    });
  }

  learners.sort((a, b) => a.score - b.score);
  return learners.slice(0, 50);
};

export const getCampaignCompletion = async (
  _tenantId: string,
  _config: AppConfig = loadConfig(),
): Promise<CampaignCompletion[]> => {
  return [];
};

export const getTrainerDashboardData = async (
  tenantId: string,
  dateRange?: DateRange,
  config: AppConfig = loadConfig(),
): Promise<TrainerDashboardData> => {
  const [competencies, errorPatterns, campaigns] = await Promise.all([
    getCompetencyDistribution(tenantId, dateRange, config),
    getErrorPatterns(tenantId, dateRange, config),
    getCampaignCompletion(tenantId, config),
  ]);

  const profiles = await getDatabaseClient(config)
    .select({ count: count() })
    .from(playerProfiles)
    .where(eq(playerProfiles.tenantId, tenantId))
    .execute();

  const totalLearners = profiles[0]?.count ?? 0;

  const totalScore = competencies.reduce((sum, c) => sum + c.averageScore * c.learnerCount, 0);
  const totalLearnersWithScores = competencies.reduce((sum, c) => sum + c.learnerCount, 0);
  const averageScore =
    totalLearnersWithScores > 0 ? Math.round(totalScore / totalLearnersWithScores) : 0;

  return {
    competencies,
    errorPatterns,
    campaigns,
    totalLearners,
    averageScore,
  };
};
