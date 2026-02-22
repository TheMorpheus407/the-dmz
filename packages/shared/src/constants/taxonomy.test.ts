import { describe, expect, it } from 'vitest';

import {
  THREAT_TIERS,
  THREAT_TIER_RANKS,
  THREAT_TIER_METADATA,
  THEME_IDS,
  THEME_METADATA,
  SURFACE_IDS,
  isThreatTier,
  isThemeId,
  isSurfaceId,
  getThreatTierRank,
  compareThreatTiers,
} from './taxonomy.js';

describe('THREAT_TIERS', () => {
  it('exports all five threat tiers', () => {
    expect(THREAT_TIERS).toHaveLength(5);
    expect(THREAT_TIERS).toContain('LOW');
    expect(THREAT_TIERS).toContain('GUARDED');
    expect(THREAT_TIERS).toContain('ELEVATED');
    expect(THREAT_TIERS).toContain('HIGH');
    expect(THREAT_TIERS).toContain('SEVERE');
  });
});

describe('THREAT_TIER_RANKS', () => {
  it('has sequential ranks from 1 to 5', () => {
    expect(THREAT_TIER_RANKS.LOW).toBe(1);
    expect(THREAT_TIER_RANKS.GUARDED).toBe(2);
    expect(THREAT_TIER_RANKS.ELEVATED).toBe(3);
    expect(THREAT_TIER_RANKS.HIGH).toBe(4);
    expect(THREAT_TIER_RANKS.SEVERE).toBe(5);
  });
});

describe('THREAT_TIER_METADATA', () => {
  it('has metadata for all threat tiers', () => {
    THREAT_TIERS.forEach((tier) => {
      expect(THREAT_TIER_METADATA[tier]).toBeDefined();
      expect(THREAT_TIER_METADATA[tier].label).toBe(tier);
      expect(THREAT_TIER_METADATA[tier].rank).toBe(THREAT_TIER_RANKS[tier]);
      expect(typeof THREAT_TIER_METADATA[tier].narrativeContext).toBe('string');
      expect(THREAT_TIER_METADATA[tier].minDay).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('THEME_IDS', () => {
  it('exports all four theme IDs', () => {
    expect(THEME_IDS).toHaveLength(4);
    expect(THEME_IDS).toContain('green');
    expect(THEME_IDS).toContain('amber');
    expect(THEME_IDS).toContain('high-contrast');
    expect(THEME_IDS).toContain('enterprise');
  });
});

describe('THEME_METADATA', () => {
  it('has metadata for all theme IDs', () => {
    THEME_IDS.forEach((theme) => {
      expect(THEME_METADATA[theme]).toBeDefined();
      expect(typeof THEME_METADATA[theme].label).toBe('string');
      expect(typeof THEME_METADATA[theme].effectsEnabled).toBe('boolean');
      expect(typeof THEME_METADATA[theme].isAccessibility).toBe('boolean');
      expect(Array.isArray(THEME_METADATA[theme].defaultForSurfaces)).toBe(true);
    });
  });

  it('green theme has effects enabled and is not accessibility', () => {
    expect(THEME_METADATA.green.effectsEnabled).toBe(true);
    expect(THEME_METADATA.green.isAccessibility).toBe(false);
  });

  it('high-contrast theme is accessibility', () => {
    expect(THEME_METADATA['high-contrast'].effectsEnabled).toBe(false);
    expect(THEME_METADATA['high-contrast'].isAccessibility).toBe(true);
  });

  it('enterprise theme is not accessibility and has no effects', () => {
    expect(THEME_METADATA.enterprise.effectsEnabled).toBe(false);
    expect(THEME_METADATA.enterprise.isAccessibility).toBe(false);
  });
});

describe('SURFACE_IDS', () => {
  it('exports all four surface IDs', () => {
    expect(SURFACE_IDS).toHaveLength(4);
    expect(SURFACE_IDS).toContain('game');
    expect(SURFACE_IDS).toContain('admin');
    expect(SURFACE_IDS).toContain('auth');
    expect(SURFACE_IDS).toContain('public');
  });
});

describe('isThreatTier', () => {
  it('returns true for valid threat tiers', () => {
    expect(isThreatTier('LOW')).toBe(true);
    expect(isThreatTier('GUARDED')).toBe(true);
    expect(isThreatTier('ELEVATED')).toBe(true);
    expect(isThreatTier('HIGH')).toBe(true);
    expect(isThreatTier('SEVERE')).toBe(true);
  });

  it('returns false for invalid threat tiers', () => {
    expect(isThreatTier('INVALID')).toBe(false);
    expect(isThreatTier('lowercase')).toBe(false);
    expect(isThreatTier(1)).toBe(false);
    expect(isThreatTier(null)).toBe(false);
    expect(isThreatTier(undefined)).toBe(false);
  });
});

describe('isThemeId', () => {
  it('returns true for valid theme IDs', () => {
    expect(isThemeId('green')).toBe(true);
    expect(isThemeId('amber')).toBe(true);
    expect(isThemeId('high-contrast')).toBe(true);
    expect(isThemeId('enterprise')).toBe(true);
  });

  it('returns false for invalid theme IDs', () => {
    expect(isThemeId('blue')).toBe(false);
    expect(isThemeId('dark')).toBe(false);
    expect(isThemeId(1)).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});

describe('isSurfaceId', () => {
  it('returns true for valid surface IDs', () => {
    expect(isSurfaceId('game')).toBe(true);
    expect(isSurfaceId('admin')).toBe(true);
    expect(isSurfaceId('auth')).toBe(true);
    expect(isSurfaceId('public')).toBe(true);
  });

  it('returns false for invalid surface IDs', () => {
    expect(isSurfaceId('unknown')).toBe(false);
    expect(isSurfaceId(1)).toBe(false);
    expect(isSurfaceId(null)).toBe(false);
  });
});

describe('getThreatTierRank', () => {
  it('returns correct rank for each tier', () => {
    expect(getThreatTierRank('LOW')).toBe(1);
    expect(getThreatTierRank('GUARDED')).toBe(2);
    expect(getThreatTierRank('ELEVATED')).toBe(3);
    expect(getThreatTierRank('HIGH')).toBe(4);
    expect(getThreatTierRank('SEVERE')).toBe(5);
  });
});

describe('compareThreatTiers', () => {
  it('returns negative when a < b', () => {
    expect(compareThreatTiers('LOW', 'HIGH')).toBeLessThan(0);
  });

  it('returns zero when a === b', () => {
    expect(compareThreatTiers('ELEVATED', 'ELEVATED')).toBe(0);
  });

  it('returns positive when a > b', () => {
    expect(compareThreatTiers('SEVERE', 'LOW')).toBeGreaterThan(0);
  });

  it('correctly sorts tiers in ascending order', () => {
    const tiers: Array<'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'SEVERE'> = [
      'SEVERE',
      'LOW',
      'HIGH',
      'GUARDED',
      'ELEVATED',
    ];
    const sorted = [...tiers].sort(compareThreatTiers);
    expect(sorted).toEqual(['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE']);
  });
});
