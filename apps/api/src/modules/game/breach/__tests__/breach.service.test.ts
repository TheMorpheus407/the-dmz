import { describe, it, expect, beforeEach } from 'vitest';

import {
  calculateRansomAmount,
  calculateRecoveryDays,
  calculateClientAttrition,
  calculateTrustPenalty,
  canPayRansom,
  determineBreachOutcome,
  BREACH_SEVERITY_CONFIG,
  type BreachState,
} from '@the-dmz/shared/game';

import { BreachService } from '../breach.service.js';

describe('BreachService', () => {
  let breachService: BreachService;

  beforeEach(() => {
    breachService = new BreachService({ enableGameOverOnSevere: true });
  });

  describe('evaluateBreachTrigger', () => {
    it('should evaluate accepted_phishing_email trigger correctly', () => {
      const result = breachService.evaluateBreachTrigger(
        'session-1',
        'accepted_phishing_email',
        5,
        1000,
        'elevated',
        ['siem', 'edr'],
        2,
      );

      expect(result.breachOccurred).toBe(true);
      expect(result.severity).toBe(3);
      expect(result.triggerType).toBe('accepted_phishing_email');
      expect(result.requiresRansomNote).toBe(true);
      expect(result.ransomAmount).toBeGreaterThan(0);
      expect(result.recoveryDays).toBeGreaterThan(0);
    });

    it('should return non-breach for minor triggers', () => {
      const result = breachService.evaluateBreachTrigger(
        'session-1',
        'brute_force_success',
        5,
        1000,
        'guarded',
        [],
        1,
      );

      expect(result.breachOccurred).toBe(false);
      expect(result.severity).toBe(2);
      expect(result.requiresRansomNote).toBe(false);
      expect(result.ransomAmount).toBeNull();
    });

    it('should downgrade severity 4 to 3 when not at severe threat tier', () => {
      const result = breachService.evaluateBreachTrigger(
        'session-1',
        'campaign_objective_achieved',
        15,
        5000,
        'high',
        ['siem', 'edr', 'backup_system'],
        4,
      );

      expect(result.severity).toBe(3);
      expect(result.canCauseGameOver).toBe(false);
    });

    it('should allow severity 4 at severe threat tier', () => {
      const result = breachService.evaluateBreachTrigger(
        'session-1',
        'campaign_objective_achieved',
        30,
        10000,
        'severe',
        ['siem', 'edr', 'backup_system'],
        5,
      );

      expect(result.severity).toBe(4);
      expect(result.canCauseGameOver).toBe(true);
    });
  });

  describe('calculateRansomAmount', () => {
    it('should calculate 10% of lifetime earnings', () => {
      expect(calculateRansomAmount(100)).toBe(10);
      expect(calculateRansomAmount(500)).toBe(50);
      expect(calculateRansomAmount(1000)).toBe(100);
    });

    it('should round up to next whole number', () => {
      expect(calculateRansomAmount(101)).toBe(11);
      expect(calculateRansomAmount(105)).toBe(11);
    });

    it('should have minimum of 1 CR', () => {
      expect(calculateRansomAmount(1)).toBe(1);
      expect(calculateRansomAmount(5)).toBe(1);
      expect(calculateRansomAmount(9)).toBe(1);
    });
  });

  describe('calculateRecoveryDays', () => {
    it('should use base recovery days for severity', () => {
      const days = calculateRecoveryDays(3, [], 1);
      expect(days).toBe(7);
    });

    it('should reduce recovery days with security tools', () => {
      const days = calculateRecoveryDays(3, ['backup_system'], 1);
      expect(days).toBe(5);

      const days2 = calculateRecoveryDays(3, ['backup_system', 'siem', 'edr'], 1);
      expect(days2).toBe(3);
    });

    it('should reduce recovery days with high staff level', () => {
      const days = calculateRecoveryDays(3, [], 4);
      expect(days).toBe(6);
    });

    it('should not go below minimum 1 day', () => {
      const days = calculateRecoveryDays(
        3,
        ['backup_system', 'incident_response', 'siem', 'edr'],
        5,
      );
      expect(days).toBe(1);
    });
  });

  describe('calculateClientAttrition', () => {
    it('should calculate attrition within severity range', () => {
      const random = () => 0.5;
      const attrition = calculateClientAttrition(3, random);
      const config = BREACH_SEVERITY_CONFIG[3];
      expect(attrition).toBe(
        config.clientAttritionMin + (config.clientAttritionMax - config.clientAttritionMin) * 0.5,
      );
    });

    it('should return 0 for severity 1', () => {
      const random = () => 0.5;
      const attrition = calculateClientAttrition(1, random);
      expect(attrition).toBe(0.025);
    });
  });

  describe('calculateTrustPenalty', () => {
    it('should calculate trust penalty within severity range', () => {
      const random = () => 0.5;
      const penalty = calculateTrustPenalty(3, random);
      const config = BREACH_SEVERITY_CONFIG[3];
      expect(penalty).toBe(
        config.trustPenaltyMin + (config.trustPenaltyMax - config.trustPenaltyMin) * 0.5,
      );
    });
  });

  describe('canPayRansom', () => {
    it('should return true when funds sufficient', () => {
      expect(canPayRansom(100, 50)).toBe(true);
      expect(canPayRansom(100, 100)).toBe(true);
    });

    it('should return false when funds insufficient', () => {
      expect(canPayRansom(50, 100)).toBe(false);
      expect(canPayRansom(0, 100)).toBe(false);
    });
  });

  describe('determineBreachOutcome', () => {
    it('should return paid when can pay', () => {
      expect(determineBreachOutcome(true, true)).toBe('paid');
      expect(determineBreachOutcome(true, false)).toBe('paid');
    });

    it('should return game_over when cannot pay and can cause game over', () => {
      expect(determineBreachOutcome(false, true)).toBe('game_over');
    });

    it('should return paid when cannot pay but cannot cause game over', () => {
      expect(determineBreachOutcome(false, false)).toBe('paid');
    });
  });

  describe('processRansomPayment', () => {
    it('should process successful payment', () => {
      const currentState: BreachState = {
        hasActiveBreach: true,
        currentSeverity: 3,
        ransomAmount: 100,
        ransomDeadline: 5,
        recoveryDaysRemaining: 7,
        recoveryStartDay: 3,
        totalLifetimeEarningsAtBreach: 1000,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 30,
        increasedScrutinyDaysRemaining: 14,
        reputationImpactDaysRemaining: 30,
        toolsRequireReverification: false,
        intelligenceRevealed: ['test'],
      };

      const result = breachService.processRansomPayment(currentState, 200);
      expect(result.success).toBe(true);
      expect(result.outcome).toBe('paid');
      expect(result.remainingFunds).toBe(100);
    });

    it('should return game_over when cannot pay', () => {
      const currentState: BreachState = {
        hasActiveBreach: true,
        currentSeverity: 4,
        ransomAmount: 500,
        ransomDeadline: 5,
        recoveryDaysRemaining: 7,
        recoveryStartDay: 3,
        totalLifetimeEarningsAtBreach: 5000,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 30,
        increasedScrutinyDaysRemaining: 14,
        reputationImpactDaysRemaining: 30,
        toolsRequireReverification: true,
        intelligenceRevealed: ['test'],
      };

      const result = breachService.processRansomPayment(currentState, 100);
      expect(result.success).toBe(false);
      expect(result.outcome).toBe('game_over');
    });
  });

  describe('advanceRecovery', () => {
    it('should advance recovery days', () => {
      const currentState: BreachState = {
        hasActiveBreach: true,
        currentSeverity: 3,
        ransomAmount: 100,
        ransomDeadline: null,
        recoveryDaysRemaining: 5,
        recoveryStartDay: 3,
        totalLifetimeEarningsAtBreach: 1000,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 30,
        increasedScrutinyDaysRemaining: 14,
        reputationImpactDaysRemaining: 30,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      };

      const result = breachService.advanceRecovery(currentState);
      expect(result.completed).toBe(false);
      expect(result.narrativeMessage).toBeTruthy();
      expect(result.newState.recoveryDaysRemaining).toBe(4);
    });

    it('should complete recovery when last day', () => {
      const currentState: BreachState = {
        hasActiveBreach: true,
        currentSeverity: 3,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: 1,
        recoveryStartDay: 3,
        totalLifetimeEarningsAtBreach: 1000,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 30,
        increasedScrutinyDaysRemaining: 14,
        reputationImpactDaysRemaining: 30,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      };

      const result = breachService.advanceRecovery(currentState);
      expect(result.completed).toBe(true);
    });
  });

  describe('getPostBreachEffectsStatus', () => {
    it('should return current post-breach effects', () => {
      const currentState: BreachState = {
        hasActiveBreach: true,
        currentSeverity: 3,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: 1000,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 25,
        increasedScrutinyDaysRemaining: 10,
        reputationImpactDaysRemaining: 20,
        toolsRequireReverification: false,
        intelligenceRevealed: ['attack_ttp_1'],
      };

      const status = breachService.getPostBreachEffectsStatus(currentState);
      expect(status.revenueDepression).toBe(25);
      expect(status.increasedScrutiny).toBe(10);
      expect(status.reputationImpact).toBe(20);
      expect(status.hasIntelligenceRevealed).toBe(true);
    });
  });

  describe('decayPostBreachEffects', () => {
    it('should decay post-breach effects', () => {
      const currentState: BreachState = {
        hasActiveBreach: false,
        currentSeverity: null,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: null,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 5,
        increasedScrutinyDaysRemaining: 3,
        reputationImpactDaysRemaining: 10,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      };

      const newState = breachService.decayPostBreachEffects(currentState);
      expect(newState.revenueDepressionDaysRemaining).toBe(4);
      expect(newState.increasedScrutinyDaysRemaining).toBe(2);
      expect(newState.reputationImpactDaysRemaining).toBe(9);
    });

    it('should not go below zero', () => {
      const currentState: BreachState = {
        hasActiveBreach: false,
        currentSeverity: null,
        ransomAmount: null,
        ransomDeadline: null,
        recoveryDaysRemaining: null,
        recoveryStartDay: null,
        totalLifetimeEarningsAtBreach: null,
        lastBreachDay: 3,
        postBreachEffectsActive: true,
        revenueDepressionDaysRemaining: 0,
        increasedScrutinyDaysRemaining: 0,
        reputationImpactDaysRemaining: 0,
        toolsRequireReverification: false,
        intelligenceRevealed: [],
      };

      const newState = breachService.decayPostBreachEffects(currentState);
      expect(newState.revenueDepressionDaysRemaining).toBe(0);
      expect(newState.increasedScrutinyDaysRemaining).toBe(0);
      expect(newState.reputationImpactDaysRemaining).toBe(0);
    });
  });
});
