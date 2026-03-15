import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DecisionQualityService } from '../decision-quality.service.js';

describe('DecisionQualityService', () => {
  let decisionQualityService: DecisionQualityService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };
    decisionQualityService = new DecisionQualityService(mockDb as never);
  });

  describe('calculateDecisionQualityScore', () => {
    it('should return default score for empty events', () => {
      const result = decisionQualityService['calculateDecisionQualityScore']([], undefined);

      expect(result.overallScore).toBe(50);
      expect(result.weightedCorrectness).toBe(0.5);
      expect(result.difficultyAdjustedScore).toBe(50);
      expect(result.contextWeightedScore).toBe(50);
      expect(result.experienceLevel).toBe('new');
      expect(result.evidenceCount).toBe(0);
    });

    it('should calculate weighted correctness correctly for correct outcome', () => {
      const events = [
        {
          eventName: 'game.decision.approved',
          eventProperties: { outcome: 'correct' },
        },
      ];

      const result = decisionQualityService['calculateDecisionQualityScore'](
        events as never,
        undefined,
      );

      expect(result.weightedCorrectness).toBe(1);
      expect(result.evidenceCount).toBe(1);
    });

    it('should calculate weighted correctness correctly for partial outcome', () => {
      const events = [
        {
          eventName: 'game.decision.approved',
          eventProperties: { outcome: 'partial' },
        },
      ];

      const result = decisionQualityService['calculateDecisionQualityScore'](
        events as never,
        undefined,
      );

      expect(result.weightedCorrectness).toBe(0.5);
    });

    it('should calculate weighted correctness correctly for incorrect outcome', () => {
      const events = [
        {
          eventName: 'game.decision.denied',
          eventProperties: { outcome: 'incorrect' },
        },
      ];

      const result = decisionQualityService['calculateDecisionQualityScore'](
        events as never,
        undefined,
      );

      expect(result.weightedCorrectness).toBe(0);
    });

    it('should apply difficulty adjustment factor', () => {
      const events = [
        {
          eventName: 'game.decision.approved',
          eventProperties: { outcome: 'correct', difficulty_tier: 'tier_5' },
        },
      ];

      const result = decisionQualityService['calculateDecisionQualityScore'](
        events as never,
        undefined,
      );

      expect(result.difficultyAdjustedScore).toBeGreaterThan(50);
    });

    it('should apply threat factor', () => {
      const events = [
        {
          eventName: 'game.decision.approved',
          eventProperties: { outcome: 'correct', threat_tier: 'severe' },
        },
      ];

      const result = decisionQualityService['calculateDecisionQualityScore'](
        events as never,
        undefined,
      );

      expect(result.difficultyAdjustedScore).toBeGreaterThan(50);
    });

    it('should determine experience level based on evidence count', () => {
      const events: Array<{ eventName: string; eventProperties: Record<string, unknown> }> = [];

      for (let i = 0; i < 15; i++) {
        events.push({
          eventName: 'game.decision.approved',
          eventProperties: { outcome: 'correct' },
        });
      }

      const result = decisionQualityService['calculateDecisionQualityScore'](events, undefined);

      expect(result.experienceLevel).toBe('intermediate');
    });
  });

  describe('determineExperienceLevel', () => {
    it('should return "new" for evidence count < 10', () => {
      const result = decisionQualityService['determineExperienceLevel'](5, {});
      expect(result).toBe('new');
    });

    it('should return "intermediate" for evidence count 10-49', () => {
      const result = decisionQualityService['determineExperienceLevel'](25, {
        domain1: { score: 50, evidenceCount: 30 },
      });
      expect(result).toBe('intermediate');
    });

    it('should return "experienced" for evidence count 50-99', () => {
      const result = decisionQualityService['determineExperienceLevel'](60, {
        domain1: { score: 50, evidenceCount: 60 },
      });
      expect(result).toBe('experienced');
    });

    it('should return "expert" for evidence count >= 100', () => {
      const result = decisionQualityService['determineExperienceLevel'](110, {
        domain1: { score: 50, evidenceCount: 110 },
      });
      expect(result).toBe('expert');
    });
  });

  describe('getDifficultyFactor', () => {
    it('should return correct factors for each tier', () => {
      const getDifficultyFactor = (tier: string) => {
        const factors: Record<string, number> = {
          tier_1: 0.8,
          tier_2: 0.9,
          tier_3: 1.0,
          tier_4: 1.2,
          tier_5: 1.5,
        };
        return factors[tier] ?? 1.0;
      };

      expect(getDifficultyFactor('tier_1')).toBe(0.8);
      expect(getDifficultyFactor('tier_3')).toBe(1.0);
      expect(getDifficultyFactor('tier_5')).toBe(1.5);
      expect(getDifficultyFactor('unknown')).toBe(1.0);
    });
  });

  describe('getThreatFactor', () => {
    it('should return correct factors for each threat tier', () => {
      const getThreatFactor = (tier: string) => {
        const factors: Record<string, number> = {
          low: 0.9,
          moderate: 1.0,
          high: 1.2,
          severe: 1.4,
        };
        return factors[tier] ?? 1.0;
      };

      expect(getThreatFactor('low')).toBe(0.9);
      expect(getThreatFactor('moderate')).toBe(1.0);
      expect(getThreatFactor('severe')).toBe(1.4);
      expect(getThreatFactor('unknown')).toBe(1.0);
    });
  });
});
