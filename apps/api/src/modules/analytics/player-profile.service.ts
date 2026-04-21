import { COMPETENCY_DOMAINS } from '@the-dmz/shared';
import type { CompetencyDomain } from '@the-dmz/shared';

import { getPayloadField } from '../../shared/utils/payload.js';

import type { PlayerProfile } from '../../db/schema/analytics/index.js';
import type { DomainEvent } from '../../shared/events/event-types.js';

interface CompetencyScore {
  score: number;
  evidenceCount: number;
  lastUpdated: string;
}

interface TrendData {
  slope: number;
  dataPoints: number;
  lastCalculated: string;
}

interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number;
}

interface EvidencePoint {
  timestamp: string;
  score: number;
  domain: string;
}

export class PlayerProfileService {
  private evidenceHistory: Map<string, EvidencePoint[]> = new Map();
  private readonly CALIBRATION_DAYS = 3;
  private readonly MIN_CALIBRATION_EVIDENCE = 20;
  private readonly MAX_HISTORY_POINTS = 1000;

  public computeInitialProfile(
    userId: string,
    tenantId: string,
  ): Omit<PlayerProfile, 'createdAt'> & { createdAt: Date } {
    const competencyScores: Record<string, CompetencyScore> = {};
    const confidenceIntervals: Record<string, ConfidenceInterval> = {};
    const trend30d: Record<string, TrendData> = {};
    const trend90d: Record<string, TrendData> = {};

    COMPETENCY_DOMAINS.forEach((domain) => {
      competencyScores[domain] = {
        score: 50,
        evidenceCount: 0,
        lastUpdated: new Date().toISOString(),
      };
      confidenceIntervals[domain] = {
        lower: 40,
        upper: 60,
        confidence: 0.5,
      };
      trend30d[domain] = {
        slope: 0,
        dataPoints: 0,
        lastCalculated: new Date().toISOString(),
      };
      trend90d[domain] = {
        slope: 0,
        dataPoints: 0,
        lastCalculated: new Date().toISOString(),
      };
    });

    return {
      userId,
      tenantId,
      totalSessions: 0,
      totalDaysPlayed: 0,
      phishingDetectionRate: 0.5,
      falsePositiveRate: 0.5,
      avgDecisionTimeSeconds: null,
      indicatorProficiency: {},
      competencyScores,
      skillRating: 1000,
      lastComputedAt: new Date(),
      createdAt: new Date(),
      calibrationPhase: 'active',
      calibrationStartDate: new Date(),
      trend30d,
      trend90d,
      recommendedFocus: [],
      confidenceIntervals,
      lastSnapshotAt: new Date(),
    };
  }

  public updateProfileFromEvent(
    currentProfile: PlayerProfile,
    event: DomainEvent,
  ): Partial<PlayerProfile> {
    const payload = event.payload as Record<string, unknown> | undefined;
    const update: Partial<PlayerProfile> = {};

    if (event.eventType === 'game.session.started') {
      update.totalSessions = currentProfile.totalSessions + 1;
      update.lastComputedAt = new Date();

      if (currentProfile.calibrationPhase === 'active') {
        const daysSinceStart = this.calculateDaysBetween(
          currentProfile.calibrationStartDate!,
          new Date(),
        );
        const totalEvidence = this.getTotalEvidenceCount(
          currentProfile.competencyScores as Record<string, CompetencyScore>,
        );

        if (
          daysSinceStart >= this.CALIBRATION_DAYS ||
          totalEvidence >= this.MIN_CALIBRATION_EVIDENCE
        ) {
          update.calibrationPhase = 'completed';
        }
      }
    }

    if (!payload) {
      return update;
    }

    const competencyTags = getPayloadField(payload, 'competency_tags') as
      | CompetencyDomain[]
      | undefined;
    const outcome = getPayloadField(payload, 'outcome') as
      | 'correct'
      | 'partial'
      | 'incorrect'
      | 'neutral'
      | undefined;
    const timeToDecisionMs = getPayloadField(payload, 'time_to_decision_ms') as number | undefined;

    if (competencyTags && outcome) {
      const currentScores = currentProfile.competencyScores as Record<string, CompetencyScore>;
      const newScores: Record<string, CompetencyScore> = { ...currentScores };

      const difficultyTier = getPayloadField(payload, 'difficulty_tier') as string | undefined;
      const threatTier = getPayloadField(payload, 'threat_tier') as string | undefined;
      const campaignPhase = getPayloadField(payload, 'campaign_phase') as string | undefined;
      const lastReviewedAt = getPayloadField(payload, 'last_reviewed_at') as string | undefined;

      competencyTags.forEach((domain) => {
        const current = newScores[domain] || {
          score: 50,
          evidenceCount: 0,
          lastUpdated: new Date().toISOString(),
        };

        const baseValue = outcome === 'correct' ? 1.0 : outcome === 'partial' ? 0.5 : 0;
        const difficultyFactor = this.getDifficultyFactor(difficultyTier);
        const contextFactor = this.getContextFactor(threatTier, campaignPhase);
        const freshnessFactor = this.getFreshnessFactor(lastReviewedAt, current.lastUpdated);

        let scoreDelta = baseValue * difficultyFactor * contextFactor * freshnessFactor * 10;

        if (currentProfile.calibrationPhase === 'active') {
          scoreDelta = Math.abs(scoreDelta);
        }

        const newScore = Math.min(100, Math.max(0, current.score + scoreDelta));

        newScores[domain] = {
          score: newScore,
          evidenceCount: current.evidenceCount + 1,
          lastUpdated: new Date().toISOString(),
        };

        this.addEvidencePoint(domain, newScore, event.timestamp);
      });

      update.competencyScores = newScores;

      update.confidenceIntervals = this.calculateConfidenceIntervals(
        newScores,
        (currentProfile.confidenceIntervals as Record<string, ConfidenceInterval>) || {},
      );

      update.trend30d = this.calculateTrendSlopes(
        30,
        (currentProfile.trend30d as Record<string, TrendData>) || {},
      );
      update.trend90d = this.calculateTrendSlopes(
        90,
        (currentProfile.trend90d as Record<string, TrendData>) || {},
      );

      update.recommendedFocus = this.calculateRecommendedFocus(
        newScores,
        (currentProfile.trend30d as Record<string, TrendData>) || {},
      );
    }

    if (timeToDecisionMs && timeToDecisionMs > 0) {
      const currentAvg = currentProfile.avgDecisionTimeSeconds;
      const newTime = timeToDecisionMs / 1000;

      if (currentAvg === null) {
        update.avgDecisionTimeSeconds = newTime;
      } else {
        update.avgDecisionTimeSeconds = currentAvg * 0.9 + newTime * 0.1;
      }
    }

    if (
      event.eventType === 'game.decision.approved' ||
      event.eventType === 'game.decision.denied'
    ) {
      const isPhishingDecision = (
        getPayloadField(payload, 'competency_tags') as string[]
      )?.includes('phishing_detection');

      if (isPhishingDecision && outcome) {
        const currentPhishingRate = currentProfile.phishingDetectionRate;
        const newOutcomeValue = outcome === 'correct' ? 1 : 0;

        update.phishingDetectionRate = currentPhishingRate * 0.95 + newOutcomeValue * 0.05;
      }
    }

    if (update.competencyScores) {
      const scores = update.competencyScores as Record<string, CompetencyScore>;
      const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
      const avgScore = totalScore / Object.keys(scores).length;

      update.skillRating = Math.round(1000 + (avgScore - 50) * 20);
    }

    return update;
  }

  private addEvidencePoint(domain: string, score: number, timestamp: string): void {
    const key = domain;
    const history = this.evidenceHistory.get(key) || [];

    history.push({
      timestamp,
      score,
      domain,
    });

    if (history.length > this.MAX_HISTORY_POINTS) {
      history.shift();
    }

    this.evidenceHistory.set(key, history);
  }

  private getFreshnessFactor(lastReviewedAt?: string, lastUpdated?: string): number {
    if (!lastReviewedAt && !lastUpdated) {
      return 1.0;
    }

    const lastDate = lastReviewedAt || lastUpdated;
    if (!lastDate) return 1.0;

    const daysSinceLastEvidence = this.calculateDaysBetween(new Date(lastDate), new Date());

    if (daysSinceLastEvidence <= 1) return 1.2;
    if (daysSinceLastEvidence <= 3) return 1.1;
    if (daysSinceLastEvidence <= 7) return 1.0;
    if (daysSinceLastEvidence <= 14) return 0.95;
    if (daysSinceLastEvidence <= 30) return 0.85;
    return 0.7;
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getTotalEvidenceCount(scores: Record<string, CompetencyScore>): number {
    return Object.values(scores).reduce((sum, s) => sum + s.evidenceCount, 0);
  }

  private calculateConfidenceIntervals(
    scores: Record<string, CompetencyScore>,
    _existingIntervals: Record<string, ConfidenceInterval>,
  ): Record<string, ConfidenceInterval> {
    const intervals: Record<string, ConfidenceInterval> = {};

    Object.entries(scores).forEach(([domain, data]) => {
      const evidenceCount = data.evidenceCount;
      const score = data.score;

      const confidence = Math.min(1, evidenceCount / 50);
      const margin = (1 - confidence) * 20;

      intervals[domain] = {
        lower: Math.max(0, score - margin),
        upper: Math.min(100, score + margin),
        confidence,
      };
    });

    return intervals;
  }

  private calculateTrendSlopes(
    days: number,
    existingTrends: Record<string, TrendData>,
  ): Record<string, TrendData> {
    const trends: Record<string, TrendData> = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    COMPETENCY_DOMAINS.forEach((domain) => {
      const history = this.evidenceHistory.get(domain) || [];
      const recentHistory = history.filter((p) => new Date(p.timestamp) >= cutoffDate);

      if (recentHistory.length < 2) {
        trends[domain] = existingTrends[domain] || {
          slope: 0,
          dataPoints: recentHistory.length,
          lastCalculated: new Date().toISOString(),
        };
        return;
      }

      const slope = this.calculateLinearRegressionSlope(
        recentHistory.map((p) => ({
          x: new Date(p.timestamp).getTime(),
          y: p.score,
        })),
      );

      trends[domain] = {
        slope: Math.round(slope * 100) / 100,
        dataPoints: recentHistory.length,
        lastCalculated: new Date().toISOString(),
      };
    });

    return trends;
  }

  private calculateLinearRegressionSlope(points: { x: number; y: number }[]): number {
    if (points.length < 2) return 0;

    const pointCount = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const denominator = pointCount * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    return (pointCount * sumXY - sumX * sumY) / denominator;
  }

  private calculateRecommendedFocus(
    scores: Record<string, CompetencyScore>,
    trends: Record<string, TrendData>,
  ): string[] {
    const domainPriorities: Array<{ domain: string; priority: number }> = [];

    COMPETENCY_DOMAINS.forEach((domain) => {
      const score = scores[domain]?.score ?? 50;
      const trend = trends[domain]?.slope ?? 0;
      const evidenceCount = scores[domain]?.evidenceCount ?? 0;

      let priority = 100 - score;

      if (trend < 0) {
        priority += 20;
      }

      if (evidenceCount < 10) {
        priority += 10;
      }

      domainPriorities.push({ domain, priority });
    });

    domainPriorities.sort((a, b) => b.priority - a.priority);

    return domainPriorities.slice(0, 3).map((d) => d.domain);
  }

  public isInCalibration(profile: PlayerProfile): boolean {
    return profile.calibrationPhase === 'active';
  }

  public shouldSuppressPenalty(profile: PlayerProfile): boolean {
    return profile.calibrationPhase === 'active';
  }

  public isCalibrationComplete(profile: PlayerProfile): boolean {
    if (profile.calibrationPhase === 'completed') return true;

    const daysSinceStart = this.calculateDaysBetween(profile.calibrationStartDate!, new Date());
    const totalEvidence = this.getTotalEvidenceCount(
      profile.competencyScores as Record<string, CompetencyScore>,
    );

    return (
      daysSinceStart >= this.CALIBRATION_DAYS || totalEvidence >= this.MIN_CALIBRATION_EVIDENCE
    );
  }

  private getDifficultyFactor(difficultyTier?: string): number {
    const factors: Record<string, number> = {
      tier_1: 0.8,
      tier_2: 0.9,
      tier_3: 1.0,
      tier_4: 1.2,
      tier_5: 1.5,
    };
    return factors[difficultyTier ?? ''] || 1.0;
  }

  private getThreatFactor(threatTier?: string): number {
    const factors: Record<string, number> = {
      low: 0.9,
      moderate: 1.0,
      high: 1.2,
      severe: 1.4,
    };
    return factors[threatTier ?? ''] || 1.0;
  }

  private getCampaignPhaseFactor(campaignPhase?: string): number {
    const factors: Record<string, number> = {
      preparation: 0.9,
      escalation: 1.1,
      peak: 1.3,
      resolution: 1.0,
      aftermath: 0.9,
    };
    return factors[campaignPhase ?? ''] || 1.0;
  }

  public getContextFactor(threatTier?: string, campaignPhase?: string): number {
    const threatFactor = this.getThreatFactor(threatTier);
    const phaseFactor = this.getCampaignPhaseFactor(campaignPhase);
    return threatFactor * phaseFactor;
  }

  public calculateSkillRating(competencyScores: Record<string, CompetencyScore>): number {
    const domains = Object.keys(competencyScores);
    if (domains.length === 0) {
      return 1000;
    }

    const totalScore = domains.reduce((sum, domain) => {
      return sum + (competencyScores[domain]?.score ?? 50);
    }, 0);

    const avgScore = totalScore / domains.length;
    return Math.round(1000 + (avgScore - 50) * 20);
  }

  public getScoreRange(score: number): string {
    if (score >= 90) return 'Mastery';
    if (score >= 70) return 'Consistent';
    if (score >= 40) return 'Operational';
    return 'Foundational';
  }

  public getScoreBand(score: number): { label: string; color: string } {
    if (score >= 90) return { label: 'Mastery', color: '#10b981' };
    if (score >= 70) return { label: 'Consistent', color: '#3b82f6' };
    if (score >= 40) return { label: 'Operational', color: '#f59e0b' };
    return { label: 'Foundational', color: '#ef4444' };
  }
}
