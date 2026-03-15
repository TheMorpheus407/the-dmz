import { COMPETENCY_DOMAINS, type CompetencyDomain } from '@the-dmz/shared';

import type { PlayerProfile } from '../../db/schema/analytics/index.js';
import type { DomainEvent } from '../../shared/events/event-types.js';

interface CompetencyScore {
  score: number;
  evidenceCount: number;
  lastUpdated: string;
}

function getPayloadField(payload: Record<string, unknown>, field: string): unknown {
  return payload[field];
}

export class PlayerProfileService {
  public computeInitialProfile(
    userId: string,
    tenantId: string,
  ): Omit<PlayerProfile, 'createdAt'> & { createdAt: Date } {
    const competencyScores: Record<string, CompetencyScore> = {};

    COMPETENCY_DOMAINS.forEach((domain) => {
      competencyScores[domain] = {
        score: 50,
        evidenceCount: 0,
        lastUpdated: new Date().toISOString(),
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

      competencyTags.forEach((domain) => {
        const current = newScores[domain] || {
          score: 50,
          evidenceCount: 0,
          lastUpdated: new Date().toISOString(),
        };

        const baseValue = outcome === 'correct' ? 1.0 : outcome === 'partial' ? 0.5 : 0;
        const difficultyFactor = this.getDifficultyFactor(difficultyTier);
        const threatFactor = this.getThreatFactor(threatTier);

        const newScore = Math.min(
          100,
          Math.max(0, current.score + baseValue * difficultyFactor * threatFactor * 10),
        );

        newScores[domain] = {
          score: newScore,
          evidenceCount: current.evidenceCount + 1,
          lastUpdated: new Date().toISOString(),
        };
      });

      update.competencyScores = newScores;
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
}
