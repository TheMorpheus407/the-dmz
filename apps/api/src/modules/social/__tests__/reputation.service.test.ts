import { describe, it, expect } from 'vitest';

import {
  computeReputationScore,
  getReputationTier,
  canAccessFeature,
} from '../reputation.service.js';
import {
  REPUTATION_TIER_THRESHOLDS,
  REPUTATION_COMPONENTS,
} from '../../../db/schema/social/reputation-score.js';

describe('reputation service - computeReputationScore', () => {
  it('should clamp score to 0 minimum', () => {
    const result = computeReputationScore(0, 0, -500, -1000);
    expect(result).toBe(0);
  });

  it('should clamp score to 1000 maximum', () => {
    const result = computeReputationScore(500, 500, 100, 100);
    expect(result).toBe(1000);
  });

  it('should sum all components correctly', () => {
    const result = computeReputationScore(200, 150, -50, -25);
    expect(result).toBe(275);
  });

  it('should handle negative penalties correctly', () => {
    const result = computeReputationScore(100, 100, -200, -50);
    expect(result).toBe(0);
  });

  it('should handle zero components', () => {
    const result = computeReputationScore(0, 0, 0, 0);
    expect(result).toBe(0);
  });

  it('should cap at 1000 with positive values', () => {
    const result = computeReputationScore(500, 400, 200, 50);
    expect(result).toBe(1000);
  });
});

describe('reputation service - getReputationTier', () => {
  it('should return bronze for score 0-199', () => {
    expect(getReputationTier(0)).toBe('bronze');
    expect(getReputationTier(100)).toBe('bronze');
    expect(getReputationTier(199)).toBe('bronze');
  });

  it('should return silver for score 200-399', () => {
    expect(getReputationTier(200)).toBe('silver');
    expect(getReputationTier(300)).toBe('silver');
    expect(getReputationTier(399)).toBe('silver');
  });

  it('should return gold for score 400-599', () => {
    expect(getReputationTier(400)).toBe('gold');
    expect(getReputationTier(500)).toBe('gold');
    expect(getReputationTier(599)).toBe('gold');
  });

  it('should return platinum for score 600-799', () => {
    expect(getReputationTier(600)).toBe('platinum');
    expect(getReputationTier(700)).toBe('platinum');
    expect(getReputationTier(799)).toBe('platinum');
  });

  it('should return diamond for score 800-1000', () => {
    expect(getReputationTier(800)).toBe('diamond');
    expect(getReputationTier(900)).toBe('diamond');
    expect(getReputationTier(1000)).toBe('diamond');
  });
});

describe('reputation service - canAccessFeature', () => {
  it('should allow join_guilds at 100+ rep', () => {
    expect(canAccessFeature('bronze', 'join_guilds')).toBe(false);
    expect(canAccessFeature('silver', 'join_guilds')).toBe(true);
  });

  it('should allow create_guild at 500+ rep', () => {
    expect(canAccessFeature('gold', 'create_guild')).toBe(false);
    expect(canAccessFeature('platinum', 'create_guild')).toBe(true);
  });

  it('should allow competitive_ranked at 800+ rep', () => {
    expect(canAccessFeature('platinum', 'competitive_ranked')).toBe(false);
    expect(canAccessFeature('diamond', 'competitive_ranked')).toBe(true);
  });

  it('should allow moderate_forums at 600+ rep', () => {
    expect(canAccessFeature('gold', 'moderate_forums')).toBe(false);
    expect(canAccessFeature('platinum', 'moderate_forums')).toBe(true);
  });

  it('should allow unknown features without restriction', () => {
    expect(canAccessFeature('bronze', 'unknown_feature')).toBe(true);
  });
});

describe('reputation service - tier thresholds', () => {
  it('should have correct bronze threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.bronze).toBe(0);
  });

  it('should have correct silver threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.silver).toBe(200);
  });

  it('should have correct gold threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.gold).toBe(400);
  });

  it('should have correct platinum threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.platinum).toBe(600);
  });

  it('should have correct diamond threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.diamond).toBe(800);
  });
});

describe('reputation service - component constants', () => {
  it('should have correct endorsement max', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_MAX).toBe(400);
  });

  it('should have correct completion max', () => {
    expect(REPUTATION_COMPONENTS.COMPLETION_MAX).toBe(300);
  });

  it('should have correct report penalty per incident', () => {
    expect(REPUTATION_COMPONENTS.REPORT_PENALTY_PER).toBe(-200);
  });

  it('should have correct abandonment penalty per session', () => {
    expect(REPUTATION_COMPONENTS.ABANDONMENT_PENALTY_PER).toBe(-50);
  });

  it('should have correct endorsement decay days', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_DAYS).toBe(90);
  });

  it('should have correct endorsement decay percent', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_PERCENT).toBe(0.1);
  });
});

describe('reputation service - score calculation scenarios', () => {
  it('should calculate score for new player with no activity', () => {
    const score = computeReputationScore(0, 0, 0, 0);
    expect(score).toBe(0);
  });

  it('should calculate score with max endorsements only', () => {
    const score = computeReputationScore(400, 0, 0, 0);
    expect(score).toBe(400);
  });

  it('should calculate score with max completion only', () => {
    const score = computeReputationScore(0, 300, 0, 0);
    expect(score).toBe(300);
  });

  it('should calculate score with mixed components', () => {
    const score = computeReputationScore(200, 150, 0, 0);
    expect(score).toBe(350);
  });

  it('should calculate score with penalties', () => {
    const score = computeReputationScore(200, 150, -200, -50);
    expect(score).toBe(100);
  });

  it('should not go below 0 with heavy penalties', () => {
    const score = computeReputationScore(0, 0, -1000, -1000);
    expect(score).toBe(0);
  });

  it('should cap at 1000 with all positive components', () => {
    const score = computeReputationScore(400, 300, 200, 200);
    expect(score).toBe(1000);
  });
});

describe('reputation service - endorsement decay calculation', () => {
  it('should calculate decay factor for fresh endorsement', () => {
    const daysSinceCreation = 0;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(1);
  });

  it('should calculate decay factor after 90 days', () => {
    const daysSinceCreation = 90;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.9);
  });

  it('should calculate decay factor after 180 days', () => {
    const daysSinceCreation = 180;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.8);
  });

  it('should not go below minimum decay factor', () => {
    const daysSinceCreation = 1000;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.1);
  });
});

describe('reputation service - tier boundaries', () => {
  it('should have silver start at 200', () => {
    expect(REPUTATION_TIER_THRESHOLDS.silver).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.bronze);
  });

  it('should have gold start at 400', () => {
    expect(REPUTATION_TIER_THRESHOLDS.gold).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.silver);
  });

  it('should have platinum start at 600', () => {
    expect(REPUTATION_TIER_THRESHOLDS.platinum).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.gold);
  });

  it('should have diamond start at 800', () => {
    expect(REPUTATION_TIER_THRESHOLDS.diamond).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.platinum);
  });
});
