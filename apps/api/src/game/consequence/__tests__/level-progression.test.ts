import { describe, it, expect } from 'vitest';

import {
  calculateXPForLevel,
  getLevelFromXP,
  getXPProgress,
  awardXPForDecision,
  awardXPForIncidentResolved,
  calculateLevelUp,
  getTitleForLevel,
  isLevelGatedContent,
  getTrustTierUnlockedByLevel,
} from '../level-progression.js';

describe('level-progression', () => {
  describe('calculateXPForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(calculateXPForLevel(1)).toBe(0);
    });

    it('should return base XP for level 2', () => {
      const xp = calculateXPForLevel(2);
      expect(xp).toBeGreaterThan(0);
    });

    it('should return increasing XP for higher levels', () => {
      const xp2 = calculateXPForLevel(2);
      const xp3 = calculateXPForLevel(3);
      expect(xp3).toBeGreaterThan(xp2);
    });
  });

  describe('getLevelFromXP', () => {
    it('should return level 1 for 0 XP', () => {
      expect(getLevelFromXP(0)).toBe(1);
    });

    it('should return level 1 for low XP', () => {
      expect(getLevelFromXP(50)).toBe(1);
    });

    it('should return higher levels for more XP', () => {
      const levelAtLowXP = getLevelFromXP(50);
      const xpForLevel3 = calculateXPForLevel(3);
      const levelAtHighXP = getLevelFromXP(xpForLevel3);
      expect(levelAtHighXP).toBeGreaterThanOrEqual(levelAtLowXP);
    });
  });

  describe('getXPProgress', () => {
    it('should return correct progress for 0 XP', () => {
      const progress = getXPProgress(0);
      expect(progress.currentLevel).toBe(1);
      expect(progress.currentLevelXP).toBe(0);
      expect(progress.isPrestige).toBe(false);
    });

    it('should return correct title for low level', () => {
      const progress = getXPProgress(0);
      expect(progress.title).toBe('Intern');
    });

    it('should calculate progress percentage', () => {
      const progress = getXPProgress(50);
      expect(progress.progressPercentage).toBeGreaterThan(0);
      expect(progress.progressPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('awardXPForDecision', () => {
    it('should return 0 for incorrect decision', () => {
      expect(awardXPForDecision(false, 3)).toBe(0);
    });

    it('should return positive XP for correct decision', () => {
      const xp = awardXPForDecision(true, 3);
      expect(xp).toBeGreaterThan(0);
    });

    it('should scale with difficulty', () => {
      const xpEasy = awardXPForDecision(true, 1);
      const xpHard = awardXPForDecision(true, 5);
      expect(xpHard).toBeGreaterThanOrEqual(xpEasy);
    });
  });

  describe('awardXPForIncidentResolved', () => {
    it('should return positive XP for resolved incident', () => {
      const xp = awardXPForIncidentResolved(5);
      expect(xp).toBeGreaterThan(0);
    });

    it('should scale with severity', () => {
      const xpLow = awardXPForIncidentResolved(1);
      const xpHigh = awardXPForIncidentResolved(10);
      expect(xpHigh).toBeGreaterThan(xpLow);
    });
  });

  describe('calculateLevelUp', () => {
    it('should not level up with 0 XP', () => {
      const result = calculateLevelUp(0, 0);
      expect(result.didLevelUp).toBe(false);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(1);
    });

    it('should level up when XP exceeds threshold', () => {
      const currentXP = 0;
      const xpToAdd = 200;
      const result = calculateLevelUp(currentXP, xpToAdd);
      expect(result.didLevelUp).toBe(true);
      expect(result.newLevel).toBeGreaterThan(result.previousLevel);
    });

    it('should handle multiple level ups', () => {
      const currentXP = 0;
      const largeXP = 10000;
      const result = calculateLevelUp(currentXP, largeXP);
      expect(result.newLevel).toBeGreaterThan(1);
    });
  });

  describe('getTitleForLevel', () => {
    it('should return Intern for level 1', () => {
      expect(getTitleForLevel(1)).toBe('Intern');
    });

    it('should return CISO for level 12', () => {
      expect(getTitleForLevel(12)).toBe('CISO');
    });

    it('should return Industry Legend for prestige levels', () => {
      expect(getTitleForLevel(31)).toBe('Industry Legend');
      expect(getTitleForLevel(50)).toBe('Industry Legend');
    });
  });

  describe('isLevelGatedContent', () => {
    it('should return true when player level is too low', () => {
      expect(isLevelGatedContent(1, 10)).toBe(true);
    });

    it('should return false when player has required level', () => {
      expect(isLevelGatedContent(15, 10)).toBe(false);
    });
  });

  describe('getTrustTierUnlockedByLevel', () => {
    it('should only return CRITICAL for level 1', () => {
      const tiers = getTrustTierUnlockedByLevel(1);
      expect(tiers).toHaveLength(1);
      expect(tiers[0]?.tier).toBe('CRITICAL');
    });

    it('should return more tiers for higher levels', () => {
      const tiersLow = getTrustTierUnlockedByLevel(5);
      const tiersHigh = getTrustTierUnlockedByLevel(20);
      expect(tiersHigh.length).toBeGreaterThan(tiersLow.length);
    });
  });
});
