import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type GameActionPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import {
  handleAckDayStart,
  handleLoadInbox,
  handleOpenEmail,
  handleMarkIndicator,
  handleRequestVerification,
  handleSubmitDecision,
  handleProcessThreats,
  handleResolveIncident,
  handleTriggerBreach,
  handlePayRansom,
  handleRefuseRansom,
  handleAdvanceRecovery,
  handlePurchaseUpgrade,
  handleAdjustResource,
  handleOnboardClient,
  handleEvictClient,
  handleProcessFacilityTick,
  handleUpgradeFacilityTier,
  handlePurchaseFacilityUpgrade,
  handlePauseSession,
  handleResumeSession,
  handleAbandonSession,
  handleAdvanceDay,
  handleFlagDiscrepancy,
  type DomainEvent,
} from './reducer-handlers.js';
import {
  canTransitionMacroState,
  canTransitionPhase,
  GameStateMachineError,
  type DayPhase,
  type SessionMacroState,
} from './state-machine.js';

export interface ActionResult {
  success: boolean;
  newState: GameState;
  events: DomainEvent[];
  error?: GameStateMachineError;
}

const createInitialState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed: number,
): GameState => ({
  sessionId,
  userId,
  tenantId,
  seed,
  currentDay: 1,
  currentMacroState: SESSION_MACRO_STATES.SESSION_INIT,
  currentPhase: DAY_PHASES.PHASE_DAY_START,
  funds: 1000,
  trustScore: 50,
  intelFragments: 0,
  playerLevel: 1,
  playerXP: 0,
  threatTier: 'low',
  facilityTier: 'outpost',
  facility: {
    tier: 'outpost',
    capacities: {
      rackCapacityU: 42,
      powerCapacityKw: 10,
      coolingCapacityTons: 5,
      bandwidthCapacityMbps: 100,
    },
    usage: {
      rackUsedU: 0,
      powerUsedKw: 0,
      coolingUsedTons: 0,
      bandwidthUsedMbps: 0,
    },
    clients: [],
    upgrades: [],
    maintenanceDebt: 0,
    facilityHealth: 100,
    operatingCostPerDay: 50,
    securityToolOpExPerDay: 0,
    attackSurfaceScore: 10,
    lastTickDay: 1,
  },
  inbox: [],
  emailInstances: {},
  verificationPackets: {},
  incidents: [],
  threats: [],
  breachState: createInitialBreachState(),
  narrativeState: {
    currentChapter: 1,
    activeTriggers: [],
    completedEvents: [],
  },
  factionRelations: {
    sovereign_compact: 50,
    nexion_industries: 50,
    librarians: 50,
    hacktivists: 50,
    criminals: 50,
  },
  blacklist: [],
  whitelist: [],
  analyticsState: {
    totalEmailsProcessed: 0,
    totalDecisions: 0,
    approvals: 0,
    denials: 0,
    flags: 0,
    verificationsRequested: 0,
    incidentsTriggered: 0,
    breaches: 0,
  },
  sequenceNumber: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createInitialGameState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed?: number,
): GameState => {
  const gameSeed = seed ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return createInitialState(sessionId, userId, tenantId, gameSeed);
};

export const reduce = (state: GameState, action: GameActionPayload): ActionResult => {
  const events: DomainEvent[] = [];
  const newState = { ...state, updatedAt: new Date().toISOString() };

  try {
    switch (action.type) {
      case 'ACK_DAY_START':
        handleAckDayStart(newState, action, events);
        break;

      case 'LOAD_INBOX':
        handleLoadInbox(newState, action, events);
        break;

      case 'OPEN_EMAIL':
        handleOpenEmail(newState, action, events);
        break;

      case 'MARK_INDICATOR':
        handleMarkIndicator(newState, action, events);
        break;

      case 'REQUEST_VERIFICATION':
        handleRequestVerification(newState, action, events);
        break;

      case 'SUBMIT_DECISION':
        handleSubmitDecision(newState, action, events);
        break;

      case 'PROCESS_THREATS':
        handleProcessThreats(newState, action, events);
        break;

      case 'RESOLVE_INCIDENT':
        handleResolveIncident(newState, action, events);
        break;

      case 'TRIGGER_BREACH':
        handleTriggerBreach(newState, action, events);
        break;

      case 'PAY_RANSOM':
        handlePayRansom(newState, action, events);
        break;

      case 'REFUSE_RANSOM':
        handleRefuseRansom(newState, action, events);
        break;

      case 'ADVANCE_RECOVERY':
        handleAdvanceRecovery(newState, action, events);
        break;

      case 'PURCHASE_UPGRADE':
        handlePurchaseUpgrade(newState, action, events);
        break;

      case 'ADJUST_RESOURCE':
        handleAdjustResource(newState, action, events);
        break;

      case 'ONBOARD_CLIENT':
        handleOnboardClient(newState, action, events);
        break;

      case 'EVICT_CLIENT':
        handleEvictClient(newState, action, events);
        break;

      case 'PROCESS_FACILITY_TICK':
        handleProcessFacilityTick(newState, action, events);
        break;

      case 'UPGRADE_FACILITY_TIER':
        handleUpgradeFacilityTier(newState, action, events);
        break;

      case 'PURCHASE_FACILITY_UPGRADE':
        handlePurchaseFacilityUpgrade(newState, action, events);
        break;

      case 'PAUSE_SESSION':
        handlePauseSession(newState, action, events);
        break;

      case 'RESUME_SESSION':
        handleResumeSession(newState, action, events);
        break;

      case 'ABANDON_SESSION':
        handleAbandonSession(newState, action, events);
        break;

      case 'ADVANCE_DAY':
        handleAdvanceDay(newState, action, events);
        break;

      case 'APPLY_CONSEQUENCES':
      case 'CLOSE_VERIFICATION':
      case 'OPEN_VERIFICATION':
        break;

      case 'FLAG_DISCREPANCY':
        handleFlagDiscrepancy(newState, action, events);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as GameActionPayload).type}`);
    }

    newState.sequenceNumber++;
    return { success: true, newState, events };
  } catch (error) {
    return {
      success: false,
      newState,
      events: [],
      error:
        error instanceof GameStateMachineError
          ? error
          : new GameStateMachineError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
            ),
    };
  }
};

export const transitionPhase = (state: GameState, newPhase: DayPhase): ActionResult => {
  if (!canTransitionPhase(state.currentPhase, newPhase)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid phase transition from ${state.currentPhase} to ${newPhase}`,
        'INVALID_PHASE_TRANSITION',
      ),
    };
  }

  const newState = { ...state, currentPhase: newPhase, updatedAt: new Date().toISOString() };
  return { success: true, newState, events: [] };
};

export const transitionMacroState = (
  state: GameState,
  newMacroState: SessionMacroState,
): ActionResult => {
  if (!canTransitionMacroState(state.currentMacroState, newMacroState)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid macro state transition from ${state.currentMacroState} to ${newMacroState}`,
        'INVALID_MACRO_TRANSITION',
      ),
    };
  }

  const newState = {
    ...state,
    currentMacroState: newMacroState,
    updatedAt: new Date().toISOString(),
  };
  return { success: true, newState, events: [] };
};
