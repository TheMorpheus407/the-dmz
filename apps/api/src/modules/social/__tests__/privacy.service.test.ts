import { describe, it, expect } from 'vitest';

import {
  generatePseudonym,
  isValidSocialProfileMode,
  applyPrivacyMode,
  shouldHidePresence,
  shouldHideProfile,
  shouldHideAchievements,
  shouldUsePseudonymOnLeaderboard,
  shouldShowAnonymousAggregate,
  getPrivacyLevel,
  type SocialProfileMode,
} from '../privacy.service.js';

const PSEUDONYM_REGEX = /^Operator-[A-Z0-9]{4}[A-Z0-9]{4}$/;

describe('privacy service - pseudonym generation', () => {
  it('should generate pseudonym matching expected format', () => {
    const pseudonym = generatePseudonym('player-123');
    expect(pseudonym).toMatch(PSEUDONYM_REGEX);
    expect(pseudonym.startsWith('Operator-')).toBe(true);
  });

  it('should generate different pseudonyms for different players', () => {
    const pseudonym1 = generatePseudonym('player-1');
    const pseudonym2 = generatePseudonym('player-2');
    expect(pseudonym1).not.toBe(pseudonym2);
  });

  it('should generate consistent pseudonym for same player', () => {
    const pseudonym1 = generatePseudonym('player-same');
    const pseudonym2 = generatePseudonym('player-same');
    expect(pseudonym1).toBe(pseudonym2);
  });

  it('should generate pseudonyms with correct character set', () => {
    for (let i = 0; i < 10; i++) {
      const pseudonym = generatePseudonym(`player-${i}`);
      const suffix = pseudonym.replace('Operator-', '');
      expect(suffix).toMatch(/^[A-Z0-9]+$/);
    }
  });
});

describe('privacy service - isValidSocialProfileMode', () => {
  it('should accept valid social profile modes', () => {
    expect(isValidSocialProfileMode('anonymous_tenant')).toBe(true);
    expect(isValidSocialProfileMode('pseudonymous_tenant')).toBe(true);
    expect(isValidSocialProfileMode('employee_identifiable')).toBe(true);
  });

  it('should reject invalid modes', () => {
    expect(isValidSocialProfileMode('public')).toBe(false);
    expect(isValidSocialProfileMode('private')).toBe(false);
    expect(isValidSocialProfileMode('invalid')).toBe(false);
    expect(isValidSocialProfileMode('')).toBe(false);
  });
});

describe('privacy service - applyPrivacyMode', () => {
  it('should pseudonymize display name for anonymous_tenant mode', () => {
    const result = applyPrivacyMode('John Doe', 'John Doe', 'anonymous_tenant', 'player-123');
    expect(result.isPseudonymized).toBe(true);
    expect(result.displayName).toMatch(PSEUDONYM_REGEX);
  });

  it('should pseudonymize display name for pseudonymous_tenant mode', () => {
    const result = applyPrivacyMode('John Doe', 'John Doe', 'pseudonymous_tenant', 'player-123');
    expect(result.isPseudonymized).toBe(true);
    expect(result.displayName).toMatch(PSEUDONYM_REGEX);
  });

  it('should use real name for employee_identifiable mode when available', () => {
    const result = applyPrivacyMode('John Doe', 'John Real', 'employee_identifiable', 'player-123');
    expect(result.isPseudonymized).toBe(false);
    expect(result.displayName).toBe('John Real');
  });

  it('should fallback to display name when real name is null for employee_identifiable mode', () => {
    const result = applyPrivacyMode('John Doe', null, 'employee_identifiable', 'player-123');
    expect(result.isPseudonymized).toBe(false);
    expect(result.displayName).toBe('John Doe');
  });

  it('should return original display name for unknown mode', () => {
    const result = applyPrivacyMode(
      'John Doe',
      'John Real',
      'unknown' as SocialProfileMode,
      'player-123',
    );
    expect(result.isPseudonymized).toBe(false);
    expect(result.displayName).toBe('John Doe');
  });
});

describe('privacy service - privacy helper functions', () => {
  describe('shouldHidePresence', () => {
    it('should return true for anonymous_tenant', () => {
      expect(shouldHidePresence('anonymous_tenant')).toBe(true);
    });

    it('should return false for pseudonymous_tenant', () => {
      expect(shouldHidePresence('pseudonymous_tenant')).toBe(false);
    });

    it('should return false for employee_identifiable', () => {
      expect(shouldHidePresence('employee_identifiable')).toBe(false);
    });
  });

  describe('shouldHideProfile', () => {
    it('should return true for anonymous_tenant', () => {
      expect(shouldHideProfile('anonymous_tenant')).toBe(true);
    });

    it('should return false for pseudonymous_tenant', () => {
      expect(shouldHideProfile('pseudonymous_tenant')).toBe(false);
    });

    it('should return false for employee_identifiable', () => {
      expect(shouldHideProfile('employee_identifiable')).toBe(false);
    });
  });

  describe('shouldHideAchievements', () => {
    it('should return true for anonymous_tenant', () => {
      expect(shouldHideAchievements('anonymous_tenant')).toBe(true);
    });

    it('should return false for pseudonymous_tenant', () => {
      expect(shouldHideAchievements('pseudonymous_tenant')).toBe(false);
    });

    it('should return false for employee_identifiable', () => {
      expect(shouldHideAchievements('employee_identifiable')).toBe(false);
    });
  });

  describe('shouldUsePseudonymOnLeaderboard', () => {
    it('should return true for anonymous_tenant', () => {
      expect(shouldUsePseudonymOnLeaderboard('anonymous_tenant')).toBe(true);
    });

    it('should return true for pseudonymous_tenant', () => {
      expect(shouldUsePseudonymOnLeaderboard('pseudonymous_tenant')).toBe(true);
    });

    it('should return false for employee_identifiable', () => {
      expect(shouldUsePseudonymOnLeaderboard('employee_identifiable')).toBe(false);
    });
  });

  describe('shouldShowAnonymousAggregate', () => {
    it('should return true for anonymous_tenant', () => {
      expect(shouldShowAnonymousAggregate('anonymous_tenant')).toBe(true);
    });

    it('should return false for pseudonymous_tenant', () => {
      expect(shouldShowAnonymousAggregate('pseudonymous_tenant')).toBe(false);
    });

    it('should return false for employee_identifiable', () => {
      expect(shouldShowAnonymousAggregate('employee_identifiable')).toBe(false);
    });
  });

  describe('getPrivacyLevel', () => {
    it('should return anonymous_aggregate for anonymous_tenant', () => {
      expect(getPrivacyLevel('anonymous_tenant')).toBe('anonymous_aggregate');
    });

    it('should return pseudonym for pseudonymous_tenant', () => {
      expect(getPrivacyLevel('pseudonymous_tenant')).toBe('pseudonym');
    });

    it('should return full_name for employee_identifiable', () => {
      expect(getPrivacyLevel('employee_identifiable')).toBe('full_name');
    });

    it('should return full_name for unknown mode', () => {
      expect(getPrivacyLevel('unknown' as SocialProfileMode)).toBe('full_name');
    });
  });
});

describe('privacy service - pseudonymization uniqueness', () => {
  it('should not produce duplicate pseudonyms in same tenant for different players', () => {
    const pseudonyms = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const pseudonym = generatePseudonym(`player-${i}`);
      expect(pseudonyms).not.toContain(pseudonym);
      pseudonyms.add(pseudonym);
    }
  });

  it('should always generate unique pseudonyms within reasonable player count', () => {
    const pseudonyms = new Set<string>();
    const playerIds = Array.from({ length: 1000 }, (_, i) => `player-${i}-test-account`);

    for (const playerId of playerIds) {
      const pseudonym = generatePseudonym(playerId);
      pseudonyms.add(pseudonym);
    }

    expect(pseudonyms.size).toBe(1000);
  });
});
