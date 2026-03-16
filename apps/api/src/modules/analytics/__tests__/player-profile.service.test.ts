import { describe, it, expect, beforeEach } from 'vitest';

import { PlayerProfileService } from '../player-profile.service.js';

import type { DomainEvent } from '../../../shared/events/event-types.js';

describe('PlayerProfileService', () => {
  let playerProfileService: PlayerProfileService;

  beforeEach(() => {
    playerProfileService = new PlayerProfileService();
  });

  describe('computeInitialProfile', () => {
    it('should create profile with default values', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const tenantId = '550e8400-e29b-41d4-a716-446655440001';

      const profile = playerProfileService.computeInitialProfile(userId, tenantId);

      expect(profile.userId).toBe(userId);
      expect(profile.tenantId).toBe(tenantId);
      expect(profile.totalSessions).toBe(0);
      expect(profile.totalDaysPlayed).toBe(0);
      expect(profile.phishingDetectionRate).toBe(0.5);
      expect(profile.skillRating).toBe(1000);
      const compScores = profile.competencyScores as Record<string, unknown>;
      expect(Object.keys(compScores).length).toBe(7);
    });

    it('should initialize all competency domains with score 50', () => {
      const profile = playerProfileService.computeInitialProfile('user-1', 'tenant-1');

      expect(profile.competencyScores).toHaveProperty('phishing_detection');
      expect(profile.competencyScores).toHaveProperty('password_security');
      expect(profile.competencyScores).toHaveProperty('data_handling');
      expect(profile.competencyScores).toHaveProperty('social_engineering_resistance');
      expect(profile.competencyScores).toHaveProperty('incident_response');
      expect(profile.competencyScores).toHaveProperty('physical_security');
      expect(profile.competencyScores).toHaveProperty('compliance_awareness');

      const scores = profile.competencyScores as Record<string, { score: number }>;
      const keys = Object.keys(scores) as Array<keyof typeof scores>;
      expect(keys.length).toBe(7);
      for (const key of keys) {
        expect(scores[key]!.score).toBe(50);
      }
    });
  });

  describe('calculateSkillRating', () => {
    it('should return 1000 for empty scores', () => {
      const rating = playerProfileService.calculateSkillRating({});
      expect(rating).toBe(1000);
    });

    it('should return 1000 for average score of 50', () => {
      const scores: Record<string, { score: number; evidenceCount: number; lastUpdated: string }> =
        {
          domain1: { score: 50, evidenceCount: 1, lastUpdated: '' },
          domain2: { score: 50, evidenceCount: 1, lastUpdated: '' },
        };
      const rating = playerProfileService.calculateSkillRating(scores);
      expect(rating).toBe(1000);
    });

    it('should increase rating for above average scores', () => {
      const scores: Record<string, { score: number; evidenceCount: number; lastUpdated: string }> =
        {
          domain1: { score: 70, evidenceCount: 1, lastUpdated: '' },
          domain2: { score: 70, evidenceCount: 1, lastUpdated: '' },
        };
      const rating = playerProfileService.calculateSkillRating(scores);
      expect(rating).toBeGreaterThan(1000);
    });

    it('should decrease rating for below average scores', () => {
      const scores: Record<string, { score: number; evidenceCount: number; lastUpdated: string }> =
        {
          domain1: { score: 30, evidenceCount: 1, lastUpdated: '' },
          domain2: { score: 30, evidenceCount: 1, lastUpdated: '' },
        };
      const rating = playerProfileService.calculateSkillRating(scores);
      expect(rating).toBeLessThan(1000);
    });
  });

  describe('getScoreRange', () => {
    it('should return Mastery for scores >= 90', () => {
      expect(playerProfileService.getScoreRange(90)).toBe('Mastery');
      expect(playerProfileService.getScoreRange(100)).toBe('Mastery');
    });

    it('should return Consistent for scores >= 70 and < 90', () => {
      expect(playerProfileService.getScoreRange(70)).toBe('Consistent');
      expect(playerProfileService.getScoreRange(89)).toBe('Consistent');
    });

    it('should return Operational for scores >= 40 and < 70', () => {
      expect(playerProfileService.getScoreRange(40)).toBe('Operational');
      expect(playerProfileService.getScoreRange(69)).toBe('Operational');
    });

    it('should return Foundational for scores < 40', () => {
      expect(playerProfileService.getScoreRange(0)).toBe('Foundational');
      expect(playerProfileService.getScoreRange(39)).toBe('Foundational');
    });
  });

  describe('updateProfileFromEvent', () => {
    it('should increment session count on session start', () => {
      const currentProfile = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        totalSessions: 5,
        totalDaysPlayed: 3,
        phishingDetectionRate: 0.5,
        falsePositiveRate: 0.5,
        avgDecisionTimeSeconds: null,
        indicatorProficiency: {} as Record<string, unknown>,
        competencyScores: {} as Record<
          string,
          { score: number; evidenceCount: number; lastUpdated: string }
        >,
        skillRating: 1000,
        lastComputedAt: new Date(),
        createdAt: new Date(),
        calibrationPhase: 'active' as const,
        calibrationStartDate: new Date(),
        trend30d: {} as Record<
          string,
          { slope: number; dataPoints: number; lastCalculated: string }
        >,
        trend90d: {} as Record<
          string,
          { slope: number; dataPoints: number; lastCalculated: string }
        >,
        recommendedFocus: [] as string[],
        confidenceIntervals: {} as Record<
          string,
          { lower: number; upper: number; confidence: number }
        >,
        lastSnapshotAt: new Date(),
      };

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'game.session.started',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'game',
        payload: {},
        version: 1,
      };

      const update = playerProfileService.updateProfileFromEvent(currentProfile, event);
      expect(update.totalSessions).toBe(6);
    });

    it('should update competency scores based on outcome', () => {
      const currentProfile = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        totalSessions: 1,
        totalDaysPlayed: 1,
        phishingDetectionRate: 0.5,
        falsePositiveRate: 0.5,
        avgDecisionTimeSeconds: null,
        indicatorProficiency: {} as Record<string, unknown>,
        competencyScores: {
          phishing_detection: { score: 50, evidenceCount: 0, lastUpdated: '' },
        },
        skillRating: 1000,
        lastComputedAt: new Date(),
        createdAt: new Date(),
        calibrationPhase: 'active' as const,
        calibrationStartDate: new Date(),
        trend30d: {} as Record<
          string,
          { slope: number; dataPoints: number; lastCalculated: string }
        >,
        trend90d: {} as Record<
          string,
          { slope: number; dataPoints: number; lastCalculated: string }
        >,
        recommendedFocus: [] as string[],
        confidenceIntervals: {} as Record<
          string,
          { lower: number; upper: number; confidence: number }
        >,
        lastSnapshotAt: new Date(),
      };

      const event: DomainEvent = {
        eventId: 'event-1',
        eventType: 'game.decision.approved',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'game',
        payload: {
          competency_tags: ['phishing_detection'],
          outcome: 'correct',
          difficulty_tier: 'tier_3',
        },
        version: 1,
      };

      const update = playerProfileService.updateProfileFromEvent(currentProfile, event);
      expect(update.competencyScores).toBeDefined();
      const scores = update.competencyScores as Record<
        string,
        { score: number; evidenceCount: number }
      >;
      const phishingScore = scores['phishing_detection'];
      expect(phishingScore).toBeDefined();
      expect(phishingScore!.score).toBeGreaterThan(50);
      expect(phishingScore!.evidenceCount).toBe(1);
    });
  });

  describe('getContextFactor', () => {
    it('should multiply threat and phase factors', () => {
      const contextFactor = playerProfileService.getContextFactor('high', 'peak');
      expect(contextFactor).toBe(1.2 * 1.3);
    });

    it('should return 1.0 when both are undefined', () => {
      const contextFactor = playerProfileService.getContextFactor(undefined, undefined);
      expect(contextFactor).toBe(1.0);
    });

    it('should return threat factor when phase is undefined', () => {
      const contextFactor = playerProfileService.getContextFactor('severe', undefined);
      expect(contextFactor).toBe(1.4);
    });

    it('should return phase factor when threat is undefined', () => {
      const contextFactor = playerProfileService.getContextFactor(undefined, 'peak');
      expect(contextFactor).toBe(1.3);
    });
  });
});
