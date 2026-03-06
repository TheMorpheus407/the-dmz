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
  private breachStates: Map<string, BreachState> = new Map();

  constructor(config: Partial<BreachServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public getBreachState(sessionId: string): BreachState {
    let state = this.breachStates.get(sessionId);
    if (!state) {
      state = createInitialBreachState();
      this.breachStates.set(sessionId, state);
    }
    return state;
  }

  public setBreachState(sessionId: string, state: BreachState): void {
    this.breachStates.set(sessionId, state);
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

    if (severity === 4 && threatTier !== 'severe') {
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
    sessionId: string,
    result: BreachResult,
    currentDay: number,
    totalLifetimeEarnings: number,
  ): BreachState {
    const state = this.getBreachState(sessionId);

    const newState: BreachState = {
      ...state,
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
      toolsRequireReverification: result.severity === 4,
      intelligenceRevealed: result.breachOccurred
        ? [...state.intelligenceRevealed, `breach_${result.triggerType}`]
        : state.intelligenceRevealed,
    };

    this.setBreachState(sessionId, newState);
    return newState;
  }

  public processRansomPayment(
    sessionId: string,
    currentFunds: number,
  ): { success: boolean; outcome: 'paid' | 'game_over'; remainingFunds: number } {
    const state = this.getBreachState(sessionId);

    if (!state.ransomAmount || !state.currentSeverity) {
      return { success: false, outcome: 'paid', remainingFunds: currentFunds };
    }

    const canPayResult = canPayRansom(currentFunds, state.ransomAmount);
    const severityConfig = BREACH_SEVERITY_CONFIG[state.currentSeverity];
    const canCauseGameOver = this.config.enableGameOverOnSevere && severityConfig.canCauseGameOver;

    const outcome = determineBreachOutcome(canPayResult, canCauseGameOver);

    if (outcome === 'paid') {
      const remainingFunds = currentFunds - state.ransomAmount;
      return { success: true, outcome: 'paid', remainingFunds };
    }

    return { success: false, outcome: 'game_over', remainingFunds: currentFunds };
  }

  public advanceRecovery(sessionId: string): {
    completed: boolean;
    narrativeMessage: string | null;
  } {
    const state = this.getBreachState(sessionId);

    if (!state.recoveryDaysRemaining || state.recoveryDaysRemaining <= 0) {
      return { completed: false, narrativeMessage: null };
    }

    const newRecoveryDays = state.recoveryDaysRemaining - 1;

    const newState: BreachState = {
      ...state,
      recoveryDaysRemaining: newRecoveryDays,
    };

    this.setBreachState(sessionId, newState);

    if (newRecoveryDays <= 0) {
      return { completed: true, narrativeMessage: RECOVERY_NARRATIVE_MESSAGES[7]! };
    }

    const narrativeKey = Math.min(7, Math.max(1, 7 - newRecoveryDays));
    return {
      completed: false,
      narrativeMessage: RECOVERY_NARRATIVE_MESSAGES[narrativeKey] ?? null,
    };
  }

  public getPostBreachEffectsStatus(sessionId: string): {
    revenueDepression: number | null;
    increasedScrutiny: number | null;
    reputationImpact: number | null;
    hasIntelligenceRevealed: boolean;
  } {
    const state = this.getBreachState(sessionId);

    return {
      revenueDepression: state.revenueDepressionDaysRemaining,
      increasedScrutiny: state.increasedScrutinyDaysRemaining,
      reputationImpact: state.reputationImpactDaysRemaining,
      hasIntelligenceRevealed: state.intelligenceRevealed.length > 0,
    };
  }

  public decayPostBreachEffects(sessionId: string): BreachState {
    const state = this.getBreachState(sessionId);

    if (!state.postBreachEffectsActive) {
      return state;
    }

    const newState: BreachState = {
      ...state,
      revenueDepressionDaysRemaining:
        state.revenueDepressionDaysRemaining !== null
          ? Math.max(0, state.revenueDepressionDaysRemaining - 1)
          : null,
      increasedScrutinyDaysRemaining:
        state.increasedScrutinyDaysRemaining !== null
          ? Math.max(0, state.increasedScrutinyDaysRemaining - 1)
          : null,
      reputationImpactDaysRemaining:
        state.reputationImpactDaysRemaining !== null
          ? Math.max(0, state.reputationImpactDaysRemaining - 1)
          : null,
      postBreachEffectsActive:
        state.revenueDepressionDaysRemaining !== null ||
        state.increasedScrutinyDaysRemaining !== null ||
        state.reputationImpactDaysRemaining !== null,
    };

    this.setBreachState(sessionId, newState);
    return newState;
  }

  public clearBreachState(sessionId: string): void {
    this.breachStates.delete(sessionId);
  }
}

export const breachService = new BreachService();
