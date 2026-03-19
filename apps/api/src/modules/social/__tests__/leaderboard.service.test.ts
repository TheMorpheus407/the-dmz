import { describe, expect, it } from 'vitest';

import { computeCompositeScore } from '../leaderboard.service.js';
import {
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
  type LeaderboardMetrics,
  type ScoreWeights,
} from '../../../db/schema/social/index.js';

describe('leaderboard service - score computation', () => {
  describe('SCORE_CAPS', () => {
    it('should have caps for all metrics', () => {
      expect(SCORE_CAPS.accuracy).toBe(100);
      expect(SCORE_CAPS.avgDecisionTime).toBe(300000);
      expect(SCORE_CAPS.incidentsResolved).toBe(1000);
      expect(SCORE_CAPS.resourceEfficiency).toBe(100);
      expect(SCORE_CAPS.riskyApprovalRate).toBe(100);
    });
  });

  describe('DEFAULT_SCORE_WEIGHTS', () => {
    it('should have weights that sum to 1', () => {
      const sum =
        DEFAULT_SCORE_WEIGHTS.accuracyWeight +
        DEFAULT_SCORE_WEIGHTS.timeWeight +
        DEFAULT_SCORE_WEIGHTS.incidentWeight +
        DEFAULT_SCORE_WEIGHTS.resourceWeight +
        DEFAULT_SCORE_WEIGHTS.penaltyWeight;
      expect(sum).toBeCloseTo(1, 2);
    });

    it('should have positive weights', () => {
      expect(DEFAULT_SCORE_WEIGHTS.accuracyWeight).toBeGreaterThan(0);
      expect(DEFAULT_SCORE_WEIGHTS.timeWeight).toBeGreaterThan(0);
      expect(DEFAULT_SCORE_WEIGHTS.incidentWeight).toBeGreaterThan(0);
      expect(DEFAULT_SCORE_WEIGHTS.resourceWeight).toBeGreaterThan(0);
      expect(DEFAULT_SCORE_WEIGHTS.penaltyWeight).toBeGreaterThan(0);
    });
  });

  describe('computeCompositeScore', () => {
    it('should compute score with perfect metrics', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 1000,
        resourceEfficiency: 100,
      };

      const score = computeCompositeScore(metrics, 0);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for zero metrics', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 0,
        avgDecisionTime: SCORE_CAPS.avgDecisionTime,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const score = computeCompositeScore(metrics, 0);
      expect(score).toBe(0);
    });

    it('should cap accuracy at 100', () => {
      const metricsAtCap: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const metricsOverCap: LeaderboardMetrics = {
        accuracy: 150,
        avgDecisionTime: 0,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const scoreAtCap = computeCompositeScore(metricsAtCap, 0);
      const scoreOverCap = computeCompositeScore(metricsOverCap, 0);

      expect(scoreAtCap).toBe(scoreOverCap);
    });

    it('should cap avgDecisionTime at maximum', () => {
      const metricsLow: LeaderboardMetrics = {
        accuracy: 0,
        avgDecisionTime: 0,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const metricsHigh: LeaderboardMetrics = {
        accuracy: 0,
        avgDecisionTime: SCORE_CAPS.avgDecisionTime + 10000,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const scoreLow = computeCompositeScore(metricsLow, 0);
      const scoreHigh = computeCompositeScore(metricsHigh, 0);

      expect(scoreLow).toBeGreaterThan(scoreHigh);
    });

    it('should apply penalty for risky approval rate', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 100,
        resourceEfficiency: 100,
      };

      const scoreNoPenalty = computeCompositeScore(metrics, 0);
      const scoreWithPenalty = computeCompositeScore(metrics, 50);

      expect(scoreWithPenalty).toBeLessThan(scoreNoPenalty);
    });

    it('should cap risky approval rate at 100', () => {
      const metricsAtCap: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 100,
        resourceEfficiency: 100,
      };

      const metricsOverCap: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 100,
        resourceEfficiency: 100,
      };

      const scoreAtCap = computeCompositeScore(metricsAtCap, 100);
      const scoreOverCap = computeCompositeScore(metricsOverCap, 150);

      expect(scoreAtCap).toBe(scoreOverCap);
    });

    it('should apply custom weights correctly', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 100,
        avgDecisionTime: 0,
        incidentsResolved: 100,
        resourceEfficiency: 100,
      };

      const customWeights: ScoreWeights = {
        accuracyWeight: 1,
        timeWeight: 0,
        incidentWeight: 0,
        resourceWeight: 0,
        penaltyWeight: 0,
      };

      const score = computeCompositeScore(metrics, 0, customWeights);
      expect(score).toBe(100);
    });

    it('should never return negative score', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 0,
        avgDecisionTime: SCORE_CAPS.avgDecisionTime,
        incidentsResolved: 0,
        resourceEfficiency: 0,
      };

      const score = computeCompositeScore(metrics, 100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should round score to integer', () => {
      const metrics: LeaderboardMetrics = {
        accuracy: 33.33,
        avgDecisionTime: 50000,
        incidentsResolved: 33.33,
        resourceEfficiency: 33.33,
      };

      const score = computeCompositeScore(metrics, 0);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('leaderboard key building', () => {
    const buildKey = (
      scope: string,
      region: string | null,
      seasonId: string,
      rankingCategory: string,
      timeFrame: string,
    ): string => {
      const regionPart = region ?? 'global';
      return `leaderboard:${scope}:${regionPart}:${seasonId}:${rankingCategory}:${timeFrame}`;
    };

    it('should build global leaderboard key correctly', () => {
      const key = buildKey('global', null, 'season-1', 'overall', 'seasonal');
      expect(key).toBe('leaderboard:global:global:season-1:overall:seasonal');
    });

    it('should build regional leaderboard key correctly', () => {
      const key = buildKey('regional', 'NA', 'season-1', 'overall', 'weekly');
      expect(key).toBe('leaderboard:regional:NA:season-1:overall:weekly');
    });

    it('should build friends leaderboard key correctly', () => {
      const key = buildKey('friends', null, 'season-1', 'overall', 'seasonal');
      expect(key).toBe('leaderboard:friends:global:season-1:overall:seasonal');
    });

    it('should build guild leaderboard key correctly', () => {
      const key = buildKey('guild', null, 'season-1', 'overall', 'seasonal');
      expect(key).toBe('leaderboard:guild:global:season-1:overall:seasonal');
    });

    it('should build tenant leaderboard key correctly', () => {
      const key = buildKey('tenant', null, 'season-1', 'accuracy', 'daily');
      expect(key).toBe('leaderboard:tenant:global:season-1:accuracy:daily');
    });
  });
});

describe('leaderboard service - leaderboard types', () => {
  const LEADERBOARD_SCOPES = ['global', 'regional', 'guild', 'tenant', 'friends'] as const;
  const RANKING_CATEGORIES = [
    'overall',
    'accuracy',
    'incident_response',
    'resource_efficiency',
    'speed',
  ] as const;
  const TIME_FRAMES = ['daily', 'weekly', 'seasonal'] as const;

  it('should have 5 leaderboard scopes', () => {
    expect(LEADERBOARD_SCOPES).toHaveLength(5);
  });

  it('should include global scope', () => {
    expect(LEADERBOARD_SCOPES).toContain('global');
  });

  it('should include regional scope', () => {
    expect(LEADERBOARD_SCOPES).toContain('regional');
  });

  it('should include friends scope', () => {
    expect(LEADERBOARD_SCOPES).toContain('friends');
  });

  it('should include guild scope', () => {
    expect(LEADERBOARD_SCOPES).toContain('guild');
  });

  it('should include tenant scope', () => {
    expect(LEADERBOARD_SCOPES).toContain('tenant');
  });

  it('should have 5 ranking categories', () => {
    expect(RANKING_CATEGORIES).toHaveLength(5);
  });

  it('should have 3 time frames', () => {
    expect(TIME_FRAMES).toHaveLength(3);
  });
});
