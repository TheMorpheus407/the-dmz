import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type BreachTriggerType,
  type ResolveIncidentPayload,
  type TriggerBreachPayload,
  type PayRansomPayload,
  type RefuseRansomPayload,
  type AdvanceRecoveryPayload,
} from '@the-dmz/shared';

import { breachService } from '../../breach/index.js';

import { isActionAllowedInPhase } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

export function handleResolveIncident(
  state: GameState,
  action: ResolveIncidentPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('RESOLVE_INCIDENT', state.currentPhase)) {
    throw new Error('RESOLVE_INCIDENT not allowed in current phase');
  }
  const incident = state.incidents.find((i) => i.incidentId === action.incidentId);
  if (incident) {
    incident.status = 'resolved';
    incident.resolvedDay = state.currentDay;
    incident.responseActions = action.responseActions;
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.incident.resolved',
    timestamp: state.updatedAt,
    payload: { incidentId: action.incidentId, responseActions: action.responseActions },
  });
}

export function handleTriggerBreach(
  state: GameState,
  action: TriggerBreachPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PROCESS_THREATS', state.currentPhase)) {
    throw new Error('TRIGGER_BREACH only allowed during threat processing');
  }

  const securityTools = state.facility.upgrades
    .filter((u) => u.isCompleted && u.securityDelta)
    .map((u) => u.upgradeType);

  const totalLifetimeEarnings = state.funds + state.analyticsState.totalDecisions * 10;

  const breachResult = breachService.evaluateBreachTrigger(
    state.sessionId,
    action.triggerType as BreachTriggerType,
    state.currentDay,
    totalLifetimeEarnings,
    state.threatTier,
    securityTools,
    1,
  );

  const isBreach = breachResult.breachOccurred;
  const severity = breachResult.severity!;

  if (isBreach) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY;
    state.currentPhase = DAY_PHASES.PHASE_RANSOM;
  }

  state.analyticsState.breaches += isBreach ? 1 : 0;

  state.trustScore = Math.max(0, state.trustScore + breachResult.trustPenalty);

  const breachState = breachService.applyBreach(
    state.sessionId,
    breachResult,
    state.currentDay,
    totalLifetimeEarnings,
  );
  state.breachState = breachState;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.occurred',
    timestamp: state.updatedAt,
    payload: {
      triggerType: action.triggerType,
      severity,
      isBreach,
      trustPenalty: breachResult.trustPenalty,
    },
  });

  if (isBreach) {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.ransom_displayed',
      timestamp: state.updatedAt,
      payload: {
        severity,
        currentFunds: state.funds,
        ransomAmount: breachResult.ransomAmount,
      },
    });
  }
}

export function handlePayRansom(
  state: GameState,
  _action: PayRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PAY_RANSOM', state.currentPhase)) {
    throw new Error('PAY_RANSOM only allowed in RANSOM phase');
  }
  const breachState = state.breachState;
  if (!breachState.ransomAmount) {
    throw new Error('No active ransom to pay');
  }
  if (state.funds < breachState.ransomAmount) {
    throw new Error('Insufficient funds to pay ransom');
  }

  state.funds -= breachState.ransomAmount;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.ransom_paid',
    timestamp: state.updatedAt,
    payload: {
      amount: breachState.ransomAmount,
      remainingFunds: state.funds,
    },
  });

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.recovery_started',
    timestamp: state.updatedAt,
    payload: {
      recoveryDays: breachState.recoveryDaysRemaining,
    },
  });

  state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
}

export function handleRefuseRansom(
  state: GameState,
  _action: RefuseRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('REFUSE_RANSOM', state.currentPhase)) {
    throw new Error('REFUSE_RANSOM only allowed in RANSOM phase');
  }

  const breachState = state.breachState;
  const canCauseGameOver = breachState.currentSeverity === 4;

  if (canCauseGameOver) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_COMPLETED;
    state.currentPhase = DAY_PHASES.PHASE_DAY_END;

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.session.game_over',
      timestamp: state.updatedAt,
      payload: {
        reason: 'Unable to pay ransom',
        daysSurvived: state.currentDay,
        totalEarnings: breachState.totalLifetimeEarningsAtBreach ?? state.funds,
        breaches: state.analyticsState.breaches,
      },
    });
  } else {
    state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
  }

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.ransom_refused',
    timestamp: state.updatedAt,
    payload: {
      severity: breachState.currentSeverity,
    },
  });
}

export function handleAdvanceRecovery(
  state: GameState,
  _action: AdvanceRecoveryPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADVANCE_RECOVERY', state.currentPhase)) {
    throw new Error('ADVANCE_RECOVERY only allowed in RECOVERY phase');
  }

  const breachState = state.breachState;
  if (!breachState.recoveryDaysRemaining || breachState.recoveryDaysRemaining <= 0) {
    throw new Error('No recovery to advance');
  }

  const newRecoveryDays = breachState.recoveryDaysRemaining - 1;
  state.breachState = {
    ...breachState,
    recoveryDaysRemaining: newRecoveryDays,
  };

  if (newRecoveryDays <= 0) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
    state.currentPhase = DAY_PHASES.PHASE_RESOURCE_MANAGEMENT;

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.recovery_completed',
      timestamp: state.updatedAt,
      payload: {
        daysInRecovery: breachState.recoveryDaysRemaining,
      },
    });

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.post_effects_started',
      timestamp: state.updatedAt,
      payload: {
        revenueDepressionDays: 30,
        increasedScrutinyDays: 14,
        reputationImpactDays: 30,
      },
    });
  } else {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.day.started',
      timestamp: state.updatedAt,
      payload: {
        day: state.currentDay,
        recoveryDaysRemaining: newRecoveryDays,
        narrativeMessage: `Recovery day ${breachState.recoveryDaysRemaining - newRecoveryDays} complete.`,
      },
    });
  }
}
