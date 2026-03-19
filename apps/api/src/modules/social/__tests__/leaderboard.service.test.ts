import { describe, expect, it } from 'vitest';

import { computeCompositeScore, filterEntriesByPrivacy } from '../leaderboard.service.js';
import {
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
  enterpriseScopes,
  privacyLevels,
  leaderboardTypes,
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

describe('leaderboard service - enterprise leaderboards', () => {
  describe('enterpriseScopes', () => {
    it('should have 3 enterprise scopes', () => {
      expect(enterpriseScopes).toHaveLength(3);
    });

    it('should include department scope', () => {
      expect(enterpriseScopes).toContain('department');
    });

    it('should include tenant scope', () => {
      expect(enterpriseScopes).toContain('tenant');
    });

    it('should include corporation scope', () => {
      expect(enterpriseScopes).toContain('corporation');
    });
  });

  describe('privacyLevels', () => {
    it('should have 3 privacy levels', () => {
      expect(privacyLevels).toHaveLength(3);
    });

    it('should include full_name privacy level', () => {
      expect(privacyLevels).toContain('full_name');
    });

    it('should include pseudonym privacy level', () => {
      expect(privacyLevels).toContain('pseudonym');
    });

    it('should include anonymous_aggregate privacy level', () => {
      expect(privacyLevels).toContain('anonymous_aggregate');
    });
  });

  describe('leaderboardTypes', () => {
    it('should have 5 leaderboard types', () => {
      expect(leaderboardTypes).toHaveLength(5);
    });

    it('should include accuracy type', () => {
      expect(leaderboardTypes).toContain('accuracy');
    });

    it('should include response_time type', () => {
      expect(leaderboardTypes).toContain('response_time');
    });

    it('should include incident_resolution type', () => {
      expect(leaderboardTypes).toContain('incident_resolution');
    });

    it('should include verification_discipline type', () => {
      expect(leaderboardTypes).toContain('verification_discipline');
    });

    it('should include composite type', () => {
      expect(leaderboardTypes).toContain('composite');
    });
  });

  describe('filterEntriesByPrivacy', () => {
    const mockEntries = [
      { playerId: 'player-1', displayName: 'Alice', score: 100, rank: 1 },
      { playerId: 'player-2', displayName: 'Bob', score: 90, rank: 2 },
      { playerId: 'player-3', displayName: 'Charlie', score: 80, rank: 3 },
    ];

    it('should return full names when privacy level is full_name', () => {
      const filtered = filterEntriesByPrivacy(mockEntries, 'full_name');
      expect(filtered[0]!.displayName).toBe('Alice');
      expect(filtered[1]!.displayName).toBe('Bob');
      expect(filtered[2]!.displayName).toBe('Charlie');
    });

    it('should return pseudonyms when privacy level is pseudonym', () => {
      const filtered = filterEntriesByPrivacy(mockEntries, 'pseudonym');
      expect(filtered[0]!.displayName).toBe('Player player-1');
      expect(filtered[1]!.displayName).toBe('Player player-2');
      expect(filtered[2]!.displayName).toBe('Player player-3');
    });

    it('should anonymize entries when privacy level is anonymous_aggregate', () => {
      const filtered = filterEntriesByPrivacy(mockEntries, 'anonymous_aggregate');
      expect(filtered[0]!.displayName).toBeUndefined();
      expect(filtered[0]!.playerId).toBe('anonymous');
      expect(filtered[1]!.displayName).toBeUndefined();
      expect(filtered[1]!.playerId).toBe('anonymous');
      expect(filtered[2]!.displayName).toBeUndefined();
      expect(filtered[2]!.playerId).toBe('anonymous');
    });

    it('should preserve other fields when filtering', () => {
      const filtered = filterEntriesByPrivacy(mockEntries, 'full_name');
      expect(filtered[0]!.score).toBe(100);
      expect(filtered[0]!.rank).toBe(1);
      expect(filtered[1]!.score).toBe(90);
      expect(filtered[1]!.rank).toBe(2);
    });
  });

  describe('TTL calculation for reset cadence', () => {
    const calculateTTL = (resetCadence: string): number => {
      const now = Date.now();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      const endOfSeason = new Date(now);
      endOfSeason.setDate(endOfSeason.getDate() + 90);

      switch (resetCadence) {
        case 'daily':
          return endOfDay.getTime() - now;
        case 'weekly':
          return endOfWeek.getTime() - now;
        case 'seasonal':
          return endOfSeason.getTime() - now;
        default:
          return 0;
      }
    };

    it('should calculate positive TTL for daily reset', () => {
      const ttl = calculateTTL('daily');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    it('should calculate positive TTL for weekly reset', () => {
      const ttl = calculateTTL('weekly');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
    });

    it('should calculate positive TTL for seasonal reset', () => {
      const ttl = calculateTTL('seasonal');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(90 * 24 * 60 * 60 * 1000);
    });

    it('should return 0 for unknown reset cadence', () => {
      const ttl = calculateTTL('unknown' as 'daily');
      expect(ttl).toBe(0);
    });
  });
});
