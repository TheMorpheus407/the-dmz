import { describe, it, expect } from 'vitest';

import {
  calculateRevenue,
  calculateBreachPenalty,
  calculateOperationalCost,
  calculateFundsChange,
  clampFunds,
  isFundsAtWarning,
  isFundsAtGameOver,
} from '../funds.js';

describe('Funds Module', () => {
  describe('calculateRevenue', () => {
    it('should return 0 for incorrect decisions', () => {
      expect(calculateRevenue(false, 'approve', 1)).toBe(0);
      expect(calculateRevenue(true, 'deny', 1)).toBe(0);
    });

    it('should return tier-based revenue for correct approvals', () => {
      expect(calculateRevenue(true, 'approve', 1)).toBe(50);
      expect(calculateRevenue(true, 'approve', 2)).toBe(150);
      expect(calculateRevenue(true, 'approve', 3)).toBe(300);
      expect(calculateRevenue(true, 'approve', 4)).toBe(500);
    });
  });

  describe('calculateBreachPenalty', () => {
    it('should return negative penalty based on severity', () => {
      const penalty = calculateBreachPenalty(5);
      expect(penalty).toBeLessThan(0);
      expect(penalty).toBeGreaterThanOrEqual(-10000);
      expect(penalty).toBeLessThanOrEqual(-1000);
    });

    it('should scale with severity', () => {
      const lowSeverity = calculateBreachPenalty(1);
      const highSeverity = calculateBreachPenalty(10);
      expect(lowSeverity).toBeGreaterThan(highSeverity);
    });
  });

  describe('calculateOperationalCost', () => {
    it('should return negative cost', () => {
      const cost = calculateOperationalCost(50, 'basic');
      expect(cost).toBeLessThan(0);
    });

    it('should apply tier multipliers', () => {
      const basic = calculateOperationalCost(50, 'basic');
      const elite = calculateOperationalCost(50, 'elite');
      expect(elite).toBeLessThan(basic);
    });
  });

  describe('calculateFundsChange', () => {
    it('should return client tier revenue for correct approval', () => {
      expect(calculateFundsChange(true, 'approve', 3, 0)).toBe(300);
    });

    it('should return fundsImpact for other cases', () => {
      expect(calculateFundsChange(false, 'approve', 3, -100)).toBe(-100);
      expect(calculateFundsChange(true, 'deny', 3, -50)).toBe(-50);
    });
  });

  describe('clampFunds', () => {
    it('should clamp negative values to 0', () => {
      expect(clampFunds(-10)).toBe(0);
      expect(clampFunds(-1000)).toBe(0);
    });

    it('should return positive values unchanged', () => {
      expect(clampFunds(100)).toBe(100);
      expect(clampFunds(10000)).toBe(10000);
    });
  });

  describe('isFundsAtWarning', () => {
    it('should return true for funds below 1000', () => {
      expect(isFundsAtWarning(999)).toBe(true);
      expect(isFundsAtWarning(500)).toBe(true);
    });

    it('should return false for funds at or above 1000', () => {
      expect(isFundsAtWarning(1000)).toBe(false);
      expect(isFundsAtWarning(5000)).toBe(false);
    });
  });

  describe('isFundsAtGameOver', () => {
    it('should return true for funds at or below 0', () => {
      expect(isFundsAtGameOver(0)).toBe(true);
      expect(isFundsAtGameOver(-10)).toBe(true);
    });

    it('should return false for funds above 0', () => {
      expect(isFundsAtGameOver(1)).toBe(false);
      expect(isFundsAtGameOver(1000)).toBe(false);
    });
  });
});
