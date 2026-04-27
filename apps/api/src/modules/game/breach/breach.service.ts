import {
  type BreachState,
  type BreachTriggerType,
  type BreachResult,
  BREACH_TRIGGER_CONDITIONS,
  BREACH_SEVERITY_CONFIG,
  createInitialBreachState,
  calculateRansomAmount,
  calculateRecoveryDays,
  calculateClientAttrition,
  calculateTrustPenalty,
  canPayRansom,
  determineBreachOutcome,
  BREACH_NARRATIVE_MESSAGES,
  RECOVERY_NARRATIVE_MESSAGES,
  POST_BREACH_EFFECTS_DEFAULT,
  SEVERITY_LEVEL_GAME_OVER,
  GAME_THREAT_TIERS,
} from '@the-dmz/shared/game';
import { rng } from '@the-dmz/shared/game';

export interface BreachServiceConfig {
  enableGameOverOnSevere: boolean;
}

const DEFAULT_CONFIG: BreachServiceConfig = {
  enableGameOverOnSevere: true,
};

export class BreachService {
  private config: BreachServiceConfig;

  constructor(config: Partial<BreachServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public evaluateBreachTrigger(
    sessionId: string,
    triggerType: BreachTriggerType,
    currentDay: number,
    totalLifetimeEarnings: number,
    threatTier: string,
    securityTools: string[],
    staffLevel: number,
  ): BreachResult {
    const trigger = BREACH_TRIGGER_CONDITIONS[triggerType];
    if (!trigger) {
      return {
        breachOccurred: false,
        severity: null,
        triggerType: null,
        trustPenalty: 0,
        clientAttritionPercent: 0,
        revenueDepressionDays: 0,
        revenueDepressionPercent: 0,
        recoveryDays: 0,
        ransomAmount: null,
        requiresRansomNote: false,
        canCauseGameOver: false,
        narrativeMessage: 'No breach triggered.',
      };
    }

    let severity = trigger.severity;

    if (severity === SEVERITY_LEVEL_GAME_OVER && threatTier !== GAME_THREAT_TIERS.SEVERE) {
      severity = 3;
    }

    const severityConfig = BREACH_SEVERITY_CONFIG[severity];
    const randomGenerator = rng.create(BigInt(currentDay * 1000 + sessionId.length));
    const random = () => {
      const val = randomGenerator.nextFloat();
      return val;
    };

    const trustPenalty = calculateTrustPenalty(severity, random);
    const clientAttrition = calculateClientAttrition(severity, random);
    const recoveryDays = calculateRecoveryDays(severity, securityTools, staffLevel);
    const ransomAmount = severityConfig.requiresRansomNote
      ? calculateRansomAmount(totalLifetimeEarnings)
      : null;

    const breachResult: BreachResult = {
      breachOccurred: severityConfig.isBreach,
      severity,
      triggerType,
      trustPenalty,
      clientAttritionPercent: clientAttrition,
      revenueDepressionDays: severityConfig.revenueDepressionDays,
      revenueDepressionPercent: severityConfig.revenueDepressionPercent,
      recoveryDays,
      ransomAmount,
      requiresRansomNote: severityConfig.requiresRansomNote,
      canCauseGameOver: this.config.enableGameOverOnSevere && severityConfig.canCauseGameOver,
      narrativeMessage: BREACH_NARRATIVE_MESSAGES[severity],
    };

    return breachResult;
  }

  public applyBreach(
    currentState: BreachState,
    result: BreachResult,
    currentDay: number,
    totalLifetimeEarnings: number,
  ): BreachState {
    const newState: BreachState = {
      ...currentState,
      hasActiveBreach: result.breachOccurred,
      currentSeverity: result.severity,
      ransomAmount: result.ransomAmount,
      ransomDeadline: result.requiresRansomNote ? currentDay + 3 : null,
      recoveryDaysRemaining: result.recoveryDays,
      recoveryStartDay: result.breachOccurred ? currentDay : null,
      totalLifetimeEarningsAtBreach: result.breachOccurred ? totalLifetimeEarnings : null,
      lastBreachDay: currentDay,
      postBreachEffectsActive: result.breachOccurred,
      revenueDepressionDaysRemaining: result.revenueDepressionDays,
      increasedScrutinyDaysRemaining: POST_BREACH_EFFECTS_DEFAULT.increasedScrutinyDays,
      reputationImpactDaysRemaining: POST_BREACH_EFFECTS_DEFAULT.reputationImpactDays,
      toolsRequireReverification: result.severity === SEVERITY_LEVEL_GAME_OVER,
      intelligenceRevealed: result.breachOccurred
        ? [...currentState.intelligenceRevealed, `breach_${result.triggerType}`]
        : currentState.intelligenceRevealed,
    };

    return newState;
  }

  public processRansomPayment(
    currentState: BreachState,
    currentFunds: number,
  ): { success: boolean; outcome: 'paid' | 'game_over'; remainingFunds: number } {
    if (!currentState.ransomAmount || !currentState.currentSeverity) {
      return { success: false, outcome: 'paid', remainingFunds: currentFunds };
    }

    const canPayResult = canPayRansom(currentFunds, currentState.ransomAmount);
    const severityConfig = BREACH_SEVERITY_CONFIG[currentState.currentSeverity];
    const canCauseGameOver = this.config.enableGameOverOnSevere && severityConfig.canCauseGameOver;

    const outcome = determineBreachOutcome(canPayResult, canCauseGameOver);

    if (outcome === 'paid') {
      const remainingFunds = currentFunds - currentState.ransomAmount;
      return { success: true, outcome: 'paid', remainingFunds };
    }

    return { success: false, outcome: 'game_over', remainingFunds: currentFunds };
  }

  public advanceRecovery(currentState: BreachState): {
    completed: boolean;
    narrativeMessage: string | null;
    newState: BreachState;
  } {
    if (!currentState.recoveryDaysRemaining || currentState.recoveryDaysRemaining <= 0) {
      return { completed: false, narrativeMessage: null, newState: currentState };
    }

    const newRecoveryDays = currentState.recoveryDaysRemaining - 1;

    const newState: BreachState = {
      ...currentState,
      recoveryDaysRemaining: newRecoveryDays,
      hasActiveBreach: newRecoveryDays > 0,
    };

    if (newRecoveryDays <= 0) {
      return { completed: true, narrativeMessage: RECOVERY_NARRATIVE_MESSAGES[7]!, newState };
    }

    const narrativeKey = Math.min(7, Math.max(1, 7 - newRecoveryDays));
    return {
      completed: false,
      narrativeMessage: RECOVERY_NARRATIVE_MESSAGES[narrativeKey] ?? null,
      newState,
    };
  }

  public getPostBreachEffectsStatus(currentState: BreachState): {
    revenueDepression: number | null;
    increasedScrutiny: number | null;
    reputationImpact: number | null;
    hasIntelligenceRevealed: boolean;
  } {
    return {
      revenueDepression: currentState.revenueDepressionDaysRemaining,
      increasedScrutiny: currentState.increasedScrutinyDaysRemaining,
      reputationImpact: currentState.reputationImpactDaysRemaining,
      hasIntelligenceRevealed: currentState.intelligenceRevealed.length > 0,
    };
  }

  public decayPostBreachEffects(currentState: BreachState): BreachState {
    if (!currentState.postBreachEffectsActive) {
      return currentState;
    }

    const newRevenueDepression =
      currentState.revenueDepressionDaysRemaining !== null
        ? Math.max(0, currentState.revenueDepressionDaysRemaining - 1)
        : null;
    const newIncreasedScrutiny =
      currentState.increasedScrutinyDaysRemaining !== null
        ? Math.max(0, currentState.increasedScrutinyDaysRemaining - 1)
        : null;
    const newReputationImpact =
      currentState.reputationImpactDaysRemaining !== null
        ? Math.max(0, currentState.reputationImpactDaysRemaining - 1)
        : null;

    const newState: BreachState = {
      ...currentState,
      revenueDepressionDaysRemaining: newRevenueDepression,
      increasedScrutinyDaysRemaining: newIncreasedScrutiny,
      reputationImpactDaysRemaining: newReputationImpact,
      postBreachEffectsActive:
        (newRevenueDepression !== null && newRevenueDepression > 0) ||
        (newIncreasedScrutiny !== null && newIncreasedScrutiny > 0) ||
        (newReputationImpact !== null && newReputationImpact > 0),
    };

    return newState;
  }

  public clearBreachState(_currentState?: BreachState): BreachState {
    return createInitialBreachState();
  }
}

export const breachService = new BreachService();
