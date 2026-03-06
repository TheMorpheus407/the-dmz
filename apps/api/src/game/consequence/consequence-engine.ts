import {
  calculateTrustFromDecisionEvaluation,
  clampTrustScore,
  isTrustAtWarning,
} from './trust-score.js';
import {
  calculateFundsChange,
  clampFunds,
  isFundsAtWarning,
  isFundsAtGameOver,
  calculateBreachPenalty,
  calculateOperationalCost,
} from './funds.js';
import {
  getFactionTier,
  calculateFactionChange,
  calculateBreachFactionImpact,
  clampFactionRelation,
} from './faction-relations.js';
import { calculateBacklogPressure, resolveBacklogPenalty } from './backlog.js';

import type {
  ConsequenceInput,
  ConsequenceResult,
  DaySummary,
  DomainEvent,
  BreachConsequenceInput,
  OperationalCostInput,
  BacklogState,
} from './types.js';

export const CONSEQUENCE_EVENTS = {
  TRUST_MODIFIED: 'game.trust.modified',
  FUNDS_MODIFIED: 'game.funds.modified',
  FACTION_MODIFIED: 'game.faction.modified',
  BACKLOG_PRESSURE_CHANGED: 'game.backlog.pressure_changed',
  BREACH_OCCURRED: 'game.breach.occurred',
  WARNING_EMITTED: 'game.warning.emitted',
} as const;

export class ConsequenceEngine {
  private currentTrust: number;
  private currentFunds: number;
  private factionRelations: Record<string, number>;
  private backlogPenalty: number;
  private events: DomainEvent[] = [];
  private warnings: string[] = [];

  constructor(
    initialTrust: number = 250,
    initialFunds: number = 10000,
    initialFactionRelations: Record<string, number> = {},
    initialBacklogPenalty: number = 0,
  ) {
    this.currentTrust = clampTrustScore(initialTrust);
    this.currentFunds = clampFunds(initialFunds);
    this.factionRelations = { ...initialFactionRelations };
    this.backlogPenalty = initialBacklogPenalty;
  }

  applyDecisionConsequence(input: ConsequenceInput): ConsequenceResult {
    const trustChange = calculateTrustFromDecisionEvaluation(
      input.trustImpact,
      input.wasCorrect,
      input.decision,
      input.emailDifficulty,
    );

    const fundsChange = calculateFundsChange(
      input.wasCorrect,
      input.decision,
      input.clientTier,
      input.fundsImpact,
    );

    const factionChange = calculateFactionChange(
      input.wasCorrect,
      input.decision,
      input.factionId,
      true,
    );

    const previousTrust = this.currentTrust;
    const previousFunds = this.currentFunds;

    this.currentTrust = clampTrustScore(this.currentTrust + trustChange);
    this.currentFunds = clampFunds(this.currentFunds + fundsChange);

    if (factionChange !== 0 && this.factionRelations[input.factionId] !== undefined) {
      this.factionRelations[input.factionId] = clampFactionRelation(
        (this.factionRelations[input.factionId] ?? 0) + factionChange,
      );
    }

    this.emitTrustEvent(previousTrust, this.currentTrust, trustChange);
    this.emitFundsEvent(previousFunds, this.currentFunds, fundsChange);

    if (factionChange !== 0) {
      this.emitFactionEvent(input.factionId, factionChange);
    }

    if (isTrustAtWarning(this.currentTrust)) {
      this.addWarning(`Trust score is at warning level: ${this.currentTrust}`);
    }

    if (isFundsAtWarning(this.currentFunds)) {
      this.addWarning(`Funds are at warning level: ${this.currentFunds}`);
    }

    return {
      trustChange,
      fundsChange,
      factionChanges: factionChange !== 0 ? { [input.factionId]: factionChange } : {},
      backlogPressure: this.backlogPenalty,
      events: this.events.slice(),
      warnings: this.warnings.slice(),
    };
  }

  applyBreachConsequence(input: BreachConsequenceInput): ConsequenceResult {
    const trustPenalty = Math.round(input.severity * -5);
    const fundsPenalty = calculateBreachPenalty(input.severity);
    const factionImpacts = calculateBreachFactionImpact(input.involvedFactions);

    const previousTrust = this.currentTrust;
    const previousFunds = this.currentFunds;

    this.currentTrust = clampTrustScore(this.currentTrust + trustPenalty);
    this.currentFunds = clampFunds(this.currentFunds + fundsPenalty);

    for (const [factionId, change] of Object.entries(factionImpacts)) {
      if (this.factionRelations[factionId] !== undefined) {
        this.factionRelations[factionId] = clampFactionRelation(
          (this.factionRelations[factionId] ?? 0) + change,
        );
      }
    }

    this.emitTrustEvent(previousTrust, this.currentTrust, trustPenalty);
    this.emitFundsEvent(previousFunds, this.currentFunds, fundsPenalty);

    this.events.push({
      type: CONSEQUENCE_EVENTS.BREACH_OCCURRED,
      payload: {
        severity: input.severity,
        trustPenalty,
        fundsPenalty,
        factionImpacts,
      },
      timestamp: new Date().toISOString(),
    });

    if (isFundsAtGameOver(this.currentFunds)) {
      this.addWarning('GAME OVER: Insufficient funds after breach');
    }

    return {
      trustChange: trustPenalty,
      fundsChange: fundsPenalty,
      factionChanges: factionImpacts,
      backlogPressure: this.backlogPenalty,
      events: this.events.slice(),
      warnings: this.warnings.slice(),
    };
  }

  applyOperationalCosts(input: OperationalCostInput): ConsequenceResult {
    const previousFunds = this.currentFunds;
    const cost = calculateOperationalCost(input.operatingCost, input.facilityTier);

    this.currentFunds = clampFunds(this.currentFunds + cost);

    this.emitFundsEvent(previousFunds, this.currentFunds, cost);

    if (isFundsAtWarning(this.currentFunds)) {
      this.addWarning(`Funds below warning threshold after operational costs`);
    }

    return {
      trustChange: 0,
      fundsChange: cost,
      factionChanges: {},
      backlogPressure: this.backlogPenalty,
      events: this.events.slice(),
      warnings: this.warnings.slice(),
    };
  }

  updateBacklog(unresolvedCount: number): BacklogState {
    const previousPenalty = this.backlogPenalty;
    const backlogState = calculateBacklogPressure(unresolvedCount, previousPenalty);

    this.backlogPenalty = backlogState.accumulatedPenalty;

    this.currentTrust = clampTrustScore(
      this.currentTrust + backlogState.accumulatedPenalty - previousPenalty,
    );

    this.emitBacklogEvent(backlogState);

    if (backlogState.shouldCreateIncident) {
      this.addWarning(`Backlog incident triggered: ${unresolvedCount} unresolved emails`);
    }

    return backlogState;
  }

  resolveBacklog(resolvedCount: number): number {
    const previousPenalty = this.backlogPenalty;
    this.backlogPenalty = resolveBacklogPenalty(resolvedCount, previousPenalty);

    const trustChange = this.backlogPenalty - previousPenalty;
    this.currentTrust = clampTrustScore(this.currentTrust + trustChange);

    return this.backlogPenalty;
  }

  computeDaySummary(_dayNumber: number, incidentsResolved: number = 0): DaySummary {
    const narrativeNotes: string[] = [];

    if (this.currentTrust < 100) {
      narrativeNotes.push(
        `Trust is critical at ${this.currentTrust}. Immediate improvement needed.`,
      );
    }

    if (this.currentFunds < 1000) {
      narrativeNotes.push(
        `Funds running low at ${this.currentFunds}. Consider operational efficiency.`,
      );
    }

    for (const [factionId, relation] of Object.entries(this.factionRelations)) {
      const tier = getFactionTier(relation);
      if (tier === 'HOSTILE') {
        narrativeNotes.push(`Warning: ${factionId} is now hostile.`);
      } else if (tier === 'ALLIED') {
        narrativeNotes.push(`Success: ${factionId} is now allied.`);
      }
    }

    return {
      trustDelta: 0,
      fundsDelta: 0,
      factionDeltas: { ...this.factionRelations },
      incidentsResolved,
      narrativeNotes,
    };
  }

  getState() {
    return {
      trust: this.currentTrust,
      funds: this.currentFunds,
      factionRelations: { ...this.factionRelations },
      backlogPenalty: this.backlogPenalty,
    };
  }

  private emitTrustEvent(previous: number, current: number, change: number): void {
    this.events.push({
      type: CONSEQUENCE_EVENTS.TRUST_MODIFIED,
      payload: {
        previous,
        current,
        change,
        tier: this.getTrustTier(current),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private emitFundsEvent(previous: number, current: number, change: number): void {
    this.events.push({
      type: CONSEQUENCE_EVENTS.FUNDS_MODIFIED,
      payload: {
        previous,
        current,
        change,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private emitFactionEvent(factionId: string, change: number): void {
    const current = this.factionRelations[factionId] ?? 0;
    this.events.push({
      type: CONSEQUENCE_EVENTS.FACTION_MODIFIED,
      payload: {
        factionId,
        previous: current - change,
        current,
        change,
        tier: getFactionTier(current),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private emitBacklogEvent(state: BacklogState): void {
    this.events.push({
      type: CONSEQUENCE_EVENTS.BACKLOG_PRESSURE_CHANGED,
      payload: {
        ...state,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private addWarning(warning: string): void {
    this.warnings.push(warning);
    this.events.push({
      type: CONSEQUENCE_EVENTS.WARNING_EMITTED,
      payload: { warning },
      timestamp: new Date().toISOString(),
    });
  }

  private getTrustTier(trust: number): string {
    if (trust <= 50) return 'LOCKED';
    if (trust <= 100) return 'CRITICAL';
    if (trust <= 200) return 'LOW';
    if (trust <= 350) return 'MODERATE';
    if (trust <= 450) return 'HIGH';
    return 'ELITE';
  }
}

export function createConsequenceEngine(
  initialTrust: number = 250,
  initialFunds: number = 10000,
  initialFactionRelations: Record<string, number> = {},
): ConsequenceEngine {
  return new ConsequenceEngine(initialTrust, initialFunds, initialFactionRelations);
}
