import { describe, expect, it } from 'vitest';

import {
  BREACH_SEVERITY_CONFIG,
  createInitialBreachState,
  calculateRansomAmount,
  calculateRecoveryDays,
  calculateClientAttrition,
  calculateTrustPenalty,
  canPayRansom,
  determineBreachOutcome,
  type BreachSeverity,
} from '../breach.js';

describe('breach', () => {
  describe('createInitialBreachState', () => {
    it('should return a BreachState object with all properties set to falsy/null values', () => {
      const state = createInitialBreachState();

      expect(state.hasActiveBreach).toBe(false);
      expect(state.currentSeverity).toBe(null);
      expect(state.ransomAmount).toBe(null);
      expect(state.ransomDeadline).toBe(null);
      expect(state.recoveryDaysRemaining).toBe(null);
      expect(state.recoveryStartDay).toBe(null);
      expect(state.totalLifetimeEarningsAtBreach).toBe(null);
      expect(state.lastBreachDay).toBe(null);
      expect(state.postBreachEffectsActive).toBe(false);
      expect(state.revenueDepressionDaysRemaining).toBe(null);
      expect(state.increasedScrutinyDaysRemaining).toBe(null);
      expect(state.reputationImpactDaysRemaining).toBe(null);
      expect(state.toolsRequireReverification).toBe(false);
      expect(state.intelligenceRevealed).toEqual([]);
    });

    it('should return a new object each time (not shared reference)', () => {
      const state1 = createInitialBreachState();
      const state2 = createInitialBreachState();

      expect(state1).not.toBe(state2);
    });
  });

  describe('calculateRansomAmount', () => {
    it('should return 1 when totalLifetimeEarnings is 0 (minimum enforced)', () => {
      expect(calculateRansomAmount(0)).toBe(1);
    });

    it('should return 1 when totalLifetimeEarnings is less than 10', () => {
      expect(calculateRansomAmount(1)).toBe(1);
      expect(calculateRansomAmount(5)).toBe(1);
      expect(calculateRansomAmount(9)).toBe(1);
    });

    it('should return 1 when totalLifetimeEarnings is negative (minimum enforced)', () => {
      expect(calculateRansomAmount(-100)).toBe(1);
    });

    it('should return Math.ceil(earnings / 10) for normal positive values', () => {
      expect(calculateRansomAmount(10)).toBe(1);
      expect(calculateRansomAmount(100)).toBe(10);
      expect(calculateRansomAmount(1000)).toBe(100);
      expect(calculateRansomAmount(999)).toBe(100);
    });

    it('should round up fractional results with Math.ceil', () => {
      expect(calculateRansomAmount(11)).toBe(2);
      expect(calculateRansomAmount(15)).toBe(2);
      expect(calculateRansomAmount(99)).toBe(10);
      expect(calculateRansomAmount(101)).toBe(11);
    });

    it('should handle large numbers correctly', () => {
      expect(calculateRansomAmount(1000000)).toBe(100000);
      expect(calculateRansomAmount(9999999)).toBe(1000000);
    });
  });

  describe('calculateRecoveryDays', () => {
    it('should return 1 for severity 1 (minimum enforced even with 0 base)', () => {
      const result = calculateRecoveryDays(1, [], 1);
      expect(result).toBe(1);
    });

    it('should return base recovery days for severity 2 with no tools and staff <= 3', () => {
      const result = calculateRecoveryDays(2, [], 1);
      expect(result).toBe(2);
    });

    it('should return base recovery days for severity 3 with no tools and staff <= 3', () => {
      const result = calculateRecoveryDays(3, [], 1);
      expect(result).toBe(7);
    });

    it('should return base recovery days for severity 4 with no tools and staff <= 3', () => {
      const result = calculateRecoveryDays(4, [], 1);
      expect(result).toBe(7);
    });

    it('should apply backup_system reduction of -2 days', () => {
      const result = calculateRecoveryDays(3, ['backup_system'], 1);
      expect(result).toBe(5);
    });

    it('should apply incident_response reduction of -1 day', () => {
      const result = calculateRecoveryDays(3, ['incident_response'], 1);
      expect(result).toBe(6);
    });

    it('should apply siem reduction of -1 day', () => {
      const result = calculateRecoveryDays(3, ['siem'], 1);
      expect(result).toBe(6);
    });

    it('should apply edr reduction of -1 day', () => {
      const result = calculateRecoveryDays(3, ['edr'], 1);
      expect(result).toBe(6);
    });

    it('should stack multiple tool reductions', () => {
      const result = calculateRecoveryDays(
        3,
        ['backup_system', 'incident_response', 'siem', 'edr'],
        1,
      );
      expect(result).toBe(2);
    });

    it('should apply -1 reduction for staff level > 3', () => {
      const result = calculateRecoveryDays(3, [], 4);
      expect(result).toBe(6);
    });

    it('should combine tool reductions and staff reduction', () => {
      const result = calculateRecoveryDays(3, ['backup_system'], 4);
      expect(result).toBe(4);
    });

    it('should enforce minimum of 1 even with cumulative reductions', () => {
      const result = calculateRecoveryDays(
        1,
        ['backup_system', 'incident_response', 'siem', 'edr'],
        4,
      );
      expect(result).toBe(1);
    });

    it('should ignore unknown tools', () => {
      const result = calculateRecoveryDays(3, ['unknown_tool', 'backup_system'], 1);
      expect(result).toBe(5);
    });

    it('should return base days with empty tools array', () => {
      const result = calculateRecoveryDays(3, [], 1);
      expect(result).toBe(7);
    });
  });

  describe('calculateClientAttrition', () => {
    it('should return clientAttritionMin for severity 1 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const result = calculateClientAttrition(1, () => 0);
      expect(result).toBe(config.clientAttritionMin);
    });

    it('should return clientAttritionMax for severity 1 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const result = calculateClientAttrition(1, () => 1);
      expect(result).toBe(config.clientAttritionMax);
    });

    it('should return midpoint for severity 1 when random returns 0.5', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const midpoint =
        config.clientAttritionMin + 0.5 * (config.clientAttritionMax - config.clientAttritionMin);
      const result = calculateClientAttrition(1, () => 0.5);
      expect(result).toBe(midpoint);
    });

    it('should return clientAttritionMin for severity 2 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[2];
      const result = calculateClientAttrition(2, () => 0);
      expect(result).toBe(config.clientAttritionMin);
    });

    it('should return clientAttritionMax for severity 2 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[2];
      const result = calculateClientAttrition(2, () => 1);
      expect(result).toBe(config.clientAttritionMax);
    });

    it('should return clientAttritionMin for severity 3 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[3];
      const result = calculateClientAttrition(3, () => 0);
      expect(result).toBe(config.clientAttritionMin);
    });

    it('should return clientAttritionMax for severity 3 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[3];
      const result = calculateClientAttrition(3, () => 1);
      expect(result).toBe(config.clientAttritionMax);
    });

    it('should return clientAttritionMin for severity 4 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[4];
      const result = calculateClientAttrition(4, () => 0);
      expect(result).toBe(config.clientAttritionMin);
    });

    it('should return clientAttritionMax for severity 4 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[4];
      const result = calculateClientAttrition(4, () => 1);
      expect(result).toBe(config.clientAttritionMax);
    });

    it('should interpolate linearly across all severity levels', () => {
      const randomValue = 0.25;
      for (const severity of [1, 2, 3, 4] as BreachSeverity[]) {
        const config = BREACH_SEVERITY_CONFIG[severity];
        const expected =
          config.clientAttritionMin +
          randomValue * (config.clientAttritionMax - config.clientAttritionMin);
        const result = calculateClientAttrition(severity, () => randomValue);
        expect(result).toBe(expected);
      }
    });
  });

  describe('calculateTrustPenalty', () => {
    it('should return trustPenaltyMin for severity 1 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const result = calculateTrustPenalty(1, () => 0);
      expect(result).toBe(config.trustPenaltyMin);
    });

    it('should return trustPenaltyMax for severity 1 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const result = calculateTrustPenalty(1, () => 1);
      expect(result).toBe(config.trustPenaltyMax);
    });

    it('should return midpoint for severity 1 when random returns 0.5', () => {
      const config = BREACH_SEVERITY_CONFIG[1];
      const midpoint =
        config.trustPenaltyMin + 0.5 * (config.trustPenaltyMax - config.trustPenaltyMin);
      const result = calculateTrustPenalty(1, () => 0.5);
      expect(result).toBe(midpoint);
    });

    it('should return trustPenaltyMin for severity 2 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[2];
      const result = calculateTrustPenalty(2, () => 0);
      expect(result).toBe(config.trustPenaltyMin);
    });

    it('should return trustPenaltyMax for severity 2 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[2];
      const result = calculateTrustPenalty(2, () => 1);
      expect(result).toBe(config.trustPenaltyMax);
    });

    it('should return trustPenaltyMin for severity 3 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[3];
      const result = calculateTrustPenalty(3, () => 0);
      expect(result).toBe(config.trustPenaltyMin);
    });

    it('should return trustPenaltyMax for severity 3 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[3];
      const result = calculateTrustPenalty(3, () => 1);
      expect(result).toBe(config.trustPenaltyMax);
    });

    it('should return trustPenaltyMin for severity 4 when random returns 0', () => {
      const config = BREACH_SEVERITY_CONFIG[4];
      const result = calculateTrustPenalty(4, () => 0);
      expect(result).toBe(config.trustPenaltyMin);
    });

    it('should return trustPenaltyMax for severity 4 when random returns 1', () => {
      const config = BREACH_SEVERITY_CONFIG[4];
      const result = calculateTrustPenalty(4, () => 1);
      expect(result).toBe(config.trustPenaltyMax);
    });

    it('should interpolate linearly across all severity levels', () => {
      const randomValue = 0.75;
      for (const severity of [1, 2, 3, 4] as BreachSeverity[]) {
        const config = BREACH_SEVERITY_CONFIG[severity];
        const expected =
          config.trustPenaltyMin + randomValue * (config.trustPenaltyMax - config.trustPenaltyMin);
        const result = calculateTrustPenalty(severity, () => randomValue);
        expect(result).toBe(expected);
      }
    });
  });

  describe('canPayRansom', () => {
    it('should return true when currentFunds equals ransomAmount (exact match)', () => {
      expect(canPayRansom(100, 100)).toBe(true);
    });

    it('should return true when currentFunds is greater than ransomAmount', () => {
      expect(canPayRansom(150, 100)).toBe(true);
      expect(canPayRansom(1000, 100)).toBe(true);
    });

    it('should return false when currentFunds is less than ransomAmount', () => {
      expect(canPayRansom(99, 100)).toBe(false);
      expect(canPayRansom(0, 100)).toBe(false);
    });

    it('should return false when currentFunds is 0 and ransomAmount is greater than 0', () => {
      expect(canPayRansom(0, 1)).toBe(false);
      expect(canPayRansom(0, 1000)).toBe(false);
    });

    it('should return true when currentFunds is greater than 0 and ransomAmount is 0', () => {
      expect(canPayRansom(100, 0)).toBe(true);
    });

    it('should return true when both currentFunds and ransomAmount are 0', () => {
      expect(canPayRansom(0, 0)).toBe(true);
    });
  });

  describe('determineBreachOutcome', () => {
    it('should return "paid" when canCauseGameOver is false and canPay is true', () => {
      expect(determineBreachOutcome(true, false)).toBe('paid');
    });

    it('should return "paid" when canCauseGameOver is false and canPay is false', () => {
      expect(determineBreachOutcome(false, false)).toBe('paid');
    });

    it('should return "paid" when canCauseGameOver is true and canPay is true', () => {
      expect(determineBreachOutcome(true, true)).toBe('paid');
    });

    it('should return "game_over" when canCauseGameOver is true and canPay is false', () => {
      expect(determineBreachOutcome(false, true)).toBe('game_over');
    });

    it('should return "paid" for severity 1 breach regardless of payment ability', () => {
      const config1 = BREACH_SEVERITY_CONFIG[1];
      expect(determineBreachOutcome(true, config1.canCauseGameOver)).toBe('paid');
      expect(determineBreachOutcome(false, config1.canCauseGameOver)).toBe('paid');
    });

    it('should return "paid" for severity 2 breach regardless of payment ability', () => {
      const config2 = BREACH_SEVERITY_CONFIG[2];
      expect(determineBreachOutcome(true, config2.canCauseGameOver)).toBe('paid');
      expect(determineBreachOutcome(false, config2.canCauseGameOver)).toBe('paid');
    });

    it('should return "paid" for severity 3 breach regardless of payment ability', () => {
      const config3 = BREACH_SEVERITY_CONFIG[3];
      expect(determineBreachOutcome(true, config3.canCauseGameOver)).toBe('paid');
      expect(determineBreachOutcome(false, config3.canCauseGameOver)).toBe('paid');
    });

    it('should handle severity 4 breach (game-over capable) correctly', () => {
      const config4 = BREACH_SEVERITY_CONFIG[4];
      expect(config4.canCauseGameOver).toBe(true);
      expect(determineBreachOutcome(true, config4.canCauseGameOver)).toBe('paid');
      expect(determineBreachOutcome(false, config4.canCauseGameOver)).toBe('game_over');
    });
  });
});
