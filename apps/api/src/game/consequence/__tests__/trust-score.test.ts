import { describe, it, expect, vi } from 'vitest';

import {
  getTrustTier,
  calculateBacklogPenalty,
  clampTrustScore,
  isTrustAtWarning,
  calculateTrustFromDecisionEvaluation,
  calculateTrustChange,
} from '../trust-score.js';

describe('Trust Score Module', () => {
  describe('getTrustTier', () => {
    it('should return LOCKED for trust 0-50', () => {
      expect(getTrustTier(0)).toBe('LOCKED');
      expect(getTrustTier(25)).toBe('LOCKED');
      expect(getTrustTier(50)).toBe('LOCKED');
    });

    it('should return CRITICAL for trust 51-100', () => {
      expect(getTrustTier(51)).toBe('CRITICAL');
      expect(getTrustTier(75)).toBe('CRITICAL');
      expect(getTrustTier(100)).toBe('CRITICAL');
    });

    it('should return LOW for trust 101-200', () => {
      expect(getTrustTier(101)).toBe('LOW');
      expect(getTrustTier(150)).toBe('LOW');
      expect(getTrustTier(200)).toBe('LOW');
    });

    it('should return MODERATE for trust 201-350', () => {
      expect(getTrustTier(201)).toBe('MODERATE');
      expect(getTrustTier(275)).toBe('MODERATE');
      expect(getTrustTier(350)).toBe('MODERATE');
    });

    it('should return HIGH for trust 351-450', () => {
      expect(getTrustTier(351)).toBe('HIGH');
      expect(getTrustTier(400)).toBe('HIGH');
      expect(getTrustTier(450)).toBe('HIGH');
    });

    it('should return ELITE for trust 451+', () => {
      expect(getTrustTier(451)).toBe('ELITE');
      expect(getTrustTier(500)).toBe('ELITE');
      expect(getTrustTier(600)).toBe('ELITE');
    });
  });

  describe('clampTrustScore', () => {
    it('should clamp negative values to 0', () => {
      expect(clampTrustScore(-10)).toBe(0);
      expect(clampTrustScore(-100)).toBe(0);
    });

    it('should clamp values above 500 to 500', () => {
      expect(clampTrustScore(501)).toBe(500);
      expect(clampTrustScore(1000)).toBe(500);
    });

    it('should return values within range unchanged', () => {
      expect(clampTrustScore(250)).toBe(250);
      expect(clampTrustScore(0)).toBe(0);
      expect(clampTrustScore(500)).toBe(500);
    });
  });

  describe('isTrustAtWarning', () => {
    it('should return true for trust below 100', () => {
      expect(isTrustAtWarning(99)).toBe(true);
      expect(isTrustAtWarning(50)).toBe(true);
      expect(isTrustAtWarning(0)).toBe(true);
    });

    it('should return false for trust at or above 100', () => {
      expect(isTrustAtWarning(100)).toBe(false);
      expect(isTrustAtWarning(200)).toBe(false);
      expect(isTrustAtWarning(500)).toBe(false);
    });
  });

  describe('calculateBacklogPenalty', () => {
    it('should return 0 for backlog at or below threshold', () => {
      expect(calculateBacklogPenalty(0)).toBe(0);
      expect(calculateBacklogPenalty(3)).toBe(0);
    });

    it('should return negative penalty for backlog above threshold', () => {
      expect(calculateBacklogPenalty(4)).toBe(-1);
      expect(calculateBacklogPenalty(5)).toBe(-2);
      expect(calculateBacklogPenalty(10)).toBe(-7);
    });
  });

  describe('calculateTrustFromDecisionEvaluation', () => {
    it('should apply multiplier based on difficulty', () => {
      const result = calculateTrustFromDecisionEvaluation(5, true, 'approve', 3);
      expect(result).toBe(5);
    });

    it('should return -1 for defer decision', () => {
      const result = calculateTrustFromDecisionEvaluation(10, true, 'defer', 3);
      expect(result).toBe(-1);
    });

    it('should scale impact by difficulty', () => {
      const resultLow = calculateTrustFromDecisionEvaluation(4, true, 'approve', 1);
      const resultHigh = calculateTrustFromDecisionEvaluation(4, true, 'approve', 5);
      expect(resultLow).toBeLessThan(resultHigh);
    });
  });

  describe('calculateTrustChange', () => {
    it('should return -1 for defer with high urgency', () => {
      const result = calculateTrustChange(true, 'defer', 3, false, true, 0);
      expect(result).toBe(-1);
    });

    it('should return positive value for correct decisions', () => {
      const approveResult = calculateTrustChange(true, 'approve', 3, false, false, 0);
      const denyResult = calculateTrustChange(true, 'deny', 3, false, false, 0);
      const flagResult = calculateTrustChange(true, 'flag', 3, false, false, 0);

      expect(approveResult).toBeGreaterThan(0);
      expect(denyResult).toBeGreaterThan(0);
      expect(flagResult).toBeGreaterThan(0);
    });

    it('should apply difficulty multiplier', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const resultLow = calculateTrustChange(true, 'approve', 1, false, false, 0);
      const resultHigh = calculateTrustChange(true, 'approve', 5, false, false, 0);

      expect(resultLow).toBeLessThan(resultHigh);
    });

    it('should return negative for incorrect approve of malicious email', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = calculateTrustChange(false, 'approve', 3, true, false, 0);

      expect(result).toBeLessThan(0);
    });

    it('should return negative for incorrect deny of non-malicious email', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = calculateTrustChange(false, 'deny', 3, false, false, 0);

      expect(result).toBeLessThan(0);
    });

    it('should apply backlog penalty', () => {
      const resultNoBacklog = calculateTrustChange(true, 'approve', 3, false, false, 0);
      const resultWithBacklog = calculateTrustChange(true, 'approve', 3, false, false, 10);

      expect(resultWithBacklog).toBeLessThan(resultNoBacklog);
    });
  });
});
