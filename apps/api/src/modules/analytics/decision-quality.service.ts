import { eq, and, gte, lte, desc, count } from 'drizzle-orm';

import { COMPETENCY_DOMAINS, type CompetencyDomain } from '@the-dmz/shared';

import { analyticsEvents, playerProfiles } from '../../db/schema/analytics/index.js';

import type { DB } from '../../shared/database/connection.js';

export interface ScoringInput {
  tenantId: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DecisionQualityScore {
  overallScore: number;
  weightedCorrectness: number;
  difficultyAdjustedScore: number;
  contextWeightedScore: number;
  competencyBreakdown: Record<CompetencyDomain, number>;
  experienceLevel: 'new' | 'intermediate' | 'experienced' | 'expert';
  evidenceCount: number;
}

export interface PlayerScoreResult {
  userId: string;
  scores: DecisionQualityScore;
  percentileRank?: number | undefined;
  trend?: 'improving' | 'declining' | 'stable' | undefined;
  previousScore?: number | undefined;
}

export interface ScoringTrendsResult {
  weeklyTrends: TrendPeriod[];
  monthlyTrends: TrendPeriod[];
  improvementRate: number;
  decliningRate: number;
  stableRate: number;
}

export interface TrendPeriod {
  period: string;
  averageScore: number;
  playerCount: number;
  weekOverWeekChange?: number | undefined;
  monthOverMonthChange?: number | undefined;
}

export interface HistoricalDataPoint {
  date: string;
  averageScore: number;
  playerCount: number;
}

export class DecisionQualityService {
  private readonly db: DB;

  public constructor(db: DB) {
    this.db = db;
  }

  public async computePlayerScore(input: ScoringInput): Promise<PlayerScoreResult | null> {
    if (!input.userId) {
      return null;
    }

    const conditions = [
      eq(analyticsEvents.tenantId, input.tenantId),
      eq(analyticsEvents.userId, input.userId),
    ];

    if (input.startDate) {
      conditions.push(gte(analyticsEvents.eventTime, input.startDate));
    }

    if (input.endDate) {
      conditions.push(lte(analyticsEvents.eventTime, input.endDate));
    }

    const events = await this.db
      .select()
      .from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(analyticsEvents.eventTime))
      .execute();

    const typedEvents = events.map((e) => ({
      ...e,
      eventProperties: e.eventProperties as Record<string, unknown>,
    }));

    const profile = await this.db
      .select()
      .from(playerProfiles)
      .where(
        and(eq(playerProfiles.userId, input.userId), eq(playerProfiles.tenantId, input.tenantId)),
      )
      .limit(1)
      .execute();

    const competencyScores = profile[0]?.competencyScores as
      | Record<string, { score: number; evidenceCount: number }>
      | undefined;

    const score = this.calculateDecisionQualityScore(typedEvents, competencyScores);

    const previousScore = await this.getPreviousPeriodScore(input);

    let percentileRank: number | undefined;
    if (score.evidenceCount > 0) {
      percentileRank = await this.computePercentileRank(input.tenantId, score.overallScore);
    }

    let trend: 'improving' | 'declining' | 'stable' | undefined;
    if (previousScore && previousScore > 0) {
      const changePercent = ((score.overallScore - previousScore) / previousScore) * 100;
      if (changePercent > 5) {
        trend = 'improving';
      } else if (changePercent < -5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    const result: PlayerScoreResult = {
      userId: input.userId,
      scores: score,
      percentileRank: percentileRank ?? undefined,
      trend: trend ?? undefined,
      previousScore: previousScore ?? undefined,
    };

    return result;
  }

  public async computeAllPlayerScores(tenantId: string): Promise<PlayerScoreResult[]> {
    const profiles = await this.db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.tenantId, tenantId))
      .execute();

    const results: PlayerScoreResult[] = [];

    for (const profile of profiles) {
      const result = await this.computePlayerScore({
        tenantId,
        userId: profile.userId,
      });

      if (result && result.scores.evidenceCount > 0) {
        results.push(result);
      }
    }

    return results;
  }

  public async computeTrends(
    tenantId: string,
    weeks: number = 4,
    months: number = 3,
  ): Promise<ScoringTrendsResult> {
    const now = new Date();
    const weeklyTrends: TrendPeriod[] = [];
    const monthlyTrends: TrendPeriod[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const averageScore = await this.getAverageScoreForPeriod(tenantId, weekStart, weekEnd);
      const playerCount = await this.getPlayerCountForPeriod(tenantId, weekStart, weekEnd);

      weeklyTrends.push({
        period: weekStart.toISOString().split('T')[0] ?? '',
        averageScore,
        playerCount,
        weekOverWeekChange:
          i > 0
            ? averageScore - weeklyTrends[i - 1]!.averageScore
            : (undefined as number | undefined),
      });
    }

    for (let i = 0; i < months; i++) {
      const monthEnd = new Date(now);
      monthEnd.setMonth(monthEnd.getMonth() - i);
      const monthStart = new Date(monthEnd);
      monthStart.setMonth(monthStart.getMonth() - 1);

      const averageScore = await this.getAverageScoreForPeriod(tenantId, monthStart, monthEnd);
      const playerCount = await this.getPlayerCountForPeriod(tenantId, monthStart, monthEnd);

      monthlyTrends.push({
        period: monthStart.toISOString().split('T')[0] ?? '',
        averageScore,
        playerCount,
        monthOverMonthChange:
          i > 0
            ? averageScore - monthlyTrends[i - 1]!.averageScore
            : (undefined as number | undefined),
      });
    }

    const allScores = await this.computeAllPlayerScores(tenantId);
    const improvingCount = allScores.filter((s) => s.trend === 'improving').length;
    const decliningCount = allScores.filter((s) => s.trend === 'declining').length;
    const stableCount = allScores.filter((s) => s.trend === 'stable').length;
    const totalPlayers = allScores.length;

    return {
      weeklyTrends: weeklyTrends.reverse(),
      monthlyTrends: monthlyTrends.reverse(),
      improvementRate: totalPlayers > 0 ? improvingCount / totalPlayers : 0,
      decliningRate: totalPlayers > 0 ? decliningCount / totalPlayers : 0,
      stableRate: totalPlayers > 0 ? stableCount / totalPlayers : 0,
    };
  }

  private calculateDecisionQualityScore(
    events: Array<{
      eventName: string;
      eventProperties: Record<string, unknown>;
    }>,
    competencyScores?: Record<string, { score: number; evidenceCount: number }>,
  ): DecisionQualityScore {
    const decisionEvents = events.filter(
      (e) =>
        e.eventName === 'game.decision.approved' ||
        e.eventName === 'game.decision.denied' ||
        e.eventName === 'game.decision.flagged',
    );

    if (decisionEvents.length === 0) {
      return {
        overallScore: 50,
        weightedCorrectness: 0.5,
        difficultyAdjustedScore: 50,
        contextWeightedScore: 50,
        competencyBreakdown: this.getDefaultCompetencyBreakdown(),
        experienceLevel: 'new',
        evidenceCount: 0,
      };
    }

    let totalCorrectness = 0;
    let totalDifficultyAdjusted = 0;
    let evidenceCount = 0;

    for (const event of decisionEvents) {
      const outcome = event.eventProperties['outcome'] as string | undefined;
      const difficultyTier = event.eventProperties['difficulty_tier'] as string | undefined;
      const threatTier = event.eventProperties['threat_tier'] as string | undefined;

      const baseValue = outcome === 'correct' ? 1.0 : outcome === 'partial' ? 0.5 : 0;
      totalCorrectness += baseValue;
      evidenceCount++;

      const difficultyFactor = this.getDifficultyFactor(difficultyTier);
      const threatFactor = this.getThreatFactor(threatTier);
      totalDifficultyAdjusted += baseValue * difficultyFactor * threatFactor;
    }

    const weightedCorrectness = totalCorrectness / Math.max(evidenceCount, 1);
    const difficultyAdjustedScore = (totalDifficultyAdjusted / Math.max(evidenceCount, 1)) * 100;

    const contextWeightedScore = this.calculateContextWeightedScore(
      competencyScores,
      evidenceCount,
    );

    const competencyBreakdown = this.calculateCompetencyBreakdown(competencyScores);

    const experienceLevel = this.determineExperienceLevel(evidenceCount, competencyScores);

    const overallScore =
      weightedCorrectness * 0.4 + difficultyAdjustedScore * 0.3 + contextWeightedScore * 0.3;

    return {
      overallScore,
      weightedCorrectness,
      difficultyAdjustedScore,
      contextWeightedScore,
      competencyBreakdown,
      experienceLevel,
      evidenceCount,
    };
  }

  private calculateContextWeightedScore(
    competencyScores?: Record<string, { score: number; evidenceCount: number }>,
    evidenceCount?: number,
  ): number {
    if (!competencyScores || Object.keys(competencyScores).length === 0) {
      return 50;
    }

    const totalScore = Object.values(competencyScores).reduce((sum, s) => sum + s.score, 0);
    const avgScore = totalScore / Object.keys(competencyScores).length;

    const experienceBonus = Math.min((evidenceCount ?? 0) / 100, 0.2);

    return Math.min(100, avgScore * (1 + experienceBonus));
  }

  private calculateCompetencyBreakdown(
    competencyScores?: Record<string, { score: number; evidenceCount: number }>,
  ): Record<CompetencyDomain, number> {
    const breakdown = this.getDefaultCompetencyBreakdown();

    if (!competencyScores) {
      return breakdown;
    }

    for (const domain of COMPETENCY_DOMAINS) {
      const domainScore = competencyScores[domain];
      if (domainScore) {
        breakdown[domain] = domainScore.score;
      }
    }

    return breakdown;
  }

  private getDefaultCompetencyBreakdown(): Record<CompetencyDomain, number> {
    return {
      phishing_detection: 50,
      password_security: 50,
      data_handling: 50,
      social_engineering_resistance: 50,
      incident_response: 50,
      physical_security: 50,
      compliance_awareness: 50,
    };
  }

  private determineExperienceLevel(
    evidenceCount: number,
    competencyScores?: Record<string, { score: number; evidenceCount: number }>,
  ): 'new' | 'intermediate' | 'experienced' | 'expert' {
    if (evidenceCount < 10) {
      return 'new';
    }

    if (!competencyScores) {
      return 'intermediate';
    }

    const totalEvidence = Object.values(competencyScores).reduce(
      (sum, s) => sum + s.evidenceCount,
      0,
    );

    if (totalEvidence >= 100) {
      return 'expert';
    }
    if (totalEvidence >= 50) {
      return 'experienced';
    }

    return 'intermediate';
  }

  private getDifficultyFactor(difficultyTier?: string): number {
    const factors: Record<string, number> = {
      tier_1: 0.8,
      tier_2: 0.9,
      tier_3: 1.0,
      tier_4: 1.2,
      tier_5: 1.5,
    };
    return factors[difficultyTier ?? ''] ?? 1.0;
  }

  private getThreatFactor(threatTier?: string): number {
    const factors: Record<string, number> = {
      low: 0.9,
      moderate: 1.0,
      high: 1.2,
      severe: 1.4,
    };
    return factors[threatTier ?? ''] ?? 1.0;
  }

  private async getPreviousPeriodScore(input: ScoringInput): Promise<number | undefined> {
    if (!input.userId || !input.endDate) {
      return undefined;
    }

    const periodLength =
      input.endDate.getTime() - (input.startDate?.getTime() ?? input.endDate.getTime());
    const previousEnd = new Date((input.startDate?.getTime() ?? input.endDate.getTime()) - 1);
    const previousStart = new Date(previousEnd.getTime() - periodLength);

    const previousScore = await this.computePlayerScore({
      ...input,
      startDate: previousStart,
      endDate: previousEnd,
    });

    return previousScore?.scores.overallScore;
  }

  private async computePercentileRank(tenantId: string, score: number): Promise<number> {
    const allScores = await this.computeAllPlayerScores(tenantId);

    if (allScores.length === 0) {
      return 50;
    }

    const sortedScores = allScores.map((s) => s.scores.overallScore).sort((a, b) => a - b);
    const rank = sortedScores.filter((s) => s < score).length;

    return Math.round((rank / sortedScores.length) * 100);
  }

  private async getAverageScoreForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const profiles = await this.db
      .select()
      .from(playerProfiles)
      .where(
        and(
          eq(playerProfiles.tenantId, tenantId),
          gte(playerProfiles.lastComputedAt, startDate),
          lte(playerProfiles.lastComputedAt, endDate),
        ),
      )
      .execute();

    if (profiles.length === 0) {
      return 50;
    }

    const totalScore = profiles.reduce((sum, p) => {
      const scores = p.competencyScores as Record<string, { score: number }>;
      const domainScores = Object.values(scores);
      const avg =
        domainScores.length > 0
          ? domainScores.reduce((s, domain) => s + domain.score, 0) / domainScores.length
          : 50;
      return sum + avg;
    }, 0);

    return totalScore / profiles.length;
  }

  private async getPlayerCountForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(playerProfiles)
      .where(
        and(
          eq(playerProfiles.tenantId, tenantId),
          gte(playerProfiles.lastComputedAt, startDate),
          lte(playerProfiles.lastComputedAt, endDate),
        ),
      )
      .execute();

    return result[0]?.count ?? 0;
  }
}
