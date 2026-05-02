import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  GAME_ACTIONS,
  type GameState,
  type BreachTriggerType,
  type ResolveIncidentPayload,
  type TriggerBreachPayload,
  type PayRansomPayload,
  type RefuseRansomPayload,
  type AdvanceRecoveryPayload,
  SEVERITY_LEVEL_GAME_OVER,
} from '@the-dmz/shared';

import { breachService } from '../../breach/index.js';
import { GAME_ENGINE_EVENTS } from '../events/index.js';

import { isActionAllowedInPhase, createGameEvent } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

export function handleResolveIncident(
  state: GameState,
  action: ResolveIncidentPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.RESOLVE_INCIDENT, state.currentPhase)) {
    throw new Error('RESOLVE_INCIDENT not allowed in current phase');
  }
  const incident = state.incidents.find((i) => i.incidentId === action.incidentId);
  if (incident) {
    incident.status = 'resolved';
    incident.resolvedDay = state.currentDay;
    incident.responseActions = action.responseActions;
  }
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.INCIDENT_RESOLVED,
    { incidentId: action.incidentId, responseActions: action.responseActions },
    state.updatedAt,
  ));
}

export function handleTriggerBreach(
  state: GameState,
  action: TriggerBreachPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.PROCESS_THREATS, state.currentPhase)) {
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
    state.breachState,
    breachResult,
    state.currentDay,
    totalLifetimeEarnings,
  );
  state.breachState = breachState;

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.BREACH_OCCURRED,
    {
      triggerType: action.triggerType,
      severity,
      isBreach,
      trustPenalty: breachResult.trustPenalty,
    },
    state.updatedAt,
  ));

  if (isBreach) {
    events.push(createGameEvent(
      GAME_ENGINE_EVENTS.BREACH_RANSOM_DISPLAYED,
      {
        severity,
        currentFunds: state.funds,
        ransomAmount: breachResult.ransomAmount,
      },
      state.updatedAt,
    ));
  }
}

export function handlePayRansom(
  state: GameState,
  _action: PayRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.PAY_RANSOM, state.currentPhase)) {
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

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.BREACH_RANSOM_PAID,
    {
      amount: breachState.ransomAmount,
      remainingFunds: state.funds,
    },
    state.updatedAt,
  ));

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.BREACH_RECOVERY_STARTED,
    {
      recoveryDays: breachState.recoveryDaysRemaining,
    },
    state.updatedAt,
  ));

  state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
}

export function handleRefuseRansom(
  state: GameState,
  _action: RefuseRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.REFUSE_RANSOM, state.currentPhase)) {
    throw new Error('REFUSE_RANSOM only allowed in RANSOM phase');
  }

  const breachState = state.breachState;
  const canCauseGameOver = breachState.currentSeverity === SEVERITY_LEVEL_GAME_OVER;

  if (canCauseGameOver) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_COMPLETED;
    state.currentPhase = DAY_PHASES.PHASE_DAY_END;

    events.push(createGameEvent(
      GAME_ENGINE_EVENTS.SESSION_GAME_OVER,
      {
        reason: 'Unable to pay ransom',
        daysSurvived: state.currentDay,
        totalEarnings: breachState.totalLifetimeEarningsAtBreach ?? state.funds,
        breaches: state.analyticsState.breaches,
      },
      state.updatedAt,
    ));
  } else {
    state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
  }

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.BREACH_RANSOM_REFUSED,
    {
      severity: breachState.currentSeverity,
    },
    state.updatedAt,
  ));
}

export function handleAdvanceRecovery(
  state: GameState,
  _action: AdvanceRecoveryPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.ADVANCE_RECOVERY, state.currentPhase)) {
    throw new Error('ADVANCE_RECOVERY only allowed in RECOVERY phase');
  }

  const breachState = state.breachState;
  if (!breachState.recoveryDaysRemaining || breachState.recoveryDaysRemaining <= 0) {
    throw new Error('No recovery to advance');
  }

  const result = breachService.advanceRecovery(breachState);

  if (result.completed) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
    state.currentPhase = DAY_PHASES.PHASE_RESOURCE_MANAGEMENT;
    state.breachState = {
      ...result.newState,
      postBreachEffectsActive: true,
      revenueDepressionDaysRemaining: 30,
      increasedScrutinyDaysRemaining: 14,
      reputationImpactDaysRemaining: 30,
    };

    events.push(createGameEvent(
      GAME_ENGINE_EVENTS.BREACH_RECOVERY_COMPLETED,
      {
        daysInRecovery: breachState.recoveryDaysRemaining,
      },
      state.updatedAt,
    ));

    events.push(createGameEvent(
      GAME_ENGINE_EVENTS.BREACH_POST_EFFECTS_STARTED,
      {
        revenueDepressionDays: 30,
        increasedScrutinyDays: 14,
        reputationImpactDays: 30,
      },
      state.updatedAt,
    ));
  } else {
    state.breachState = result.newState;

    events.push(createGameEvent(
      GAME_ENGINE_EVENTS.DAY_STARTED,
      {
        day: state.currentDay,
        recoveryDaysRemaining: result.newState.recoveryDaysRemaining,
        narrativeMessage: result.narrativeMessage ?? undefined,
      },
      state.updatedAt,
    ));
  }
}
