import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type GameActionPayload,
  type EmailState,
} from '@the-dmz/shared';

import {
  canTransitionMacroState,
  canTransitionPhase,
  isActionAllowedInPhase,
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

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
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
  trustScore: 100,
  intelFragments: 0,
  playerLevel: 1,
  playerXP: 0,
  threatTier: 'low',
  facilityTier: 'outpost',
  inbox: [],
  incidents: [],
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
        if (!isActionAllowedInPhase('ACK_DAY_START', state.currentPhase)) {
          throw new Error('ACK_DAY_START not allowed in current phase');
        }
        newState.currentPhase = DAY_PHASES.PHASE_EMAIL_INTAKE;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.started',
          timestamp: newState.updatedAt,
          payload: { day: newState.currentDay },
        });
        break;

      case 'OPEN_EMAIL': {
        if (!isActionAllowedInPhase('OPEN_EMAIL', state.currentPhase)) {
          throw new Error('OPEN_EMAIL not allowed in current phase');
        }
        const email = newState.inbox.find((e) => e.emailId === action.emailId);
        if (!email) {
          throw new Error('Email not found');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.opened',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId },
        });
        break;
      }

      case 'MARK_INDICATOR': {
        if (!isActionAllowedInPhase('MARK_INDICATOR', state.currentPhase)) {
          throw new Error('MARK_INDICATOR not allowed in current phase');
        }
        const targetEmail = newState.inbox.find((e) => e.emailId === action.emailId);
        if (targetEmail) {
          if (!targetEmail.indicators.includes(action.indicatorType)) {
            targetEmail.indicators.push(action.indicatorType);
          }
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.indicator_marked',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId, indicatorType: action.indicatorType },
        });
        break;
      }

      case 'REQUEST_VERIFICATION': {
        if (!isActionAllowedInPhase('REQUEST_VERIFICATION', state.currentPhase)) {
          throw new Error('REQUEST_VERIFICATION not allowed in current phase');
        }
        const emailToVerify = newState.inbox.find((e) => e.emailId === action.emailId);
        if (emailToVerify) {
          emailToVerify.verificationRequested = true;
          emailToVerify.status = 'request_verification';
        }
        newState.analyticsState.verificationsRequested++;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.verification_requested',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId },
        });
        break;
      }

      case 'SUBMIT_DECISION': {
        if (!isActionAllowedInPhase('SUBMIT_DECISION', state.currentPhase)) {
          throw new Error('SUBMIT_DECISION not allowed in current phase');
        }
        const emailToDecide = newState.inbox.find((e) => e.emailId === action.emailId);
        if (emailToDecide) {
          const statusMap: Record<string, EmailState['status']> = {
            approve: 'approved',
            deny: 'denied',
            flag: 'flagged',
            request_verification: 'request_verification',
            defer: 'deferred',
          };
          emailToDecide.status = statusMap[action.decision] ?? 'pending';
          emailToDecide.timeSpentMs = action.timeSpentMs;
        }
        newState.analyticsState.totalDecisions++;
        if (action.decision === 'approve') {
          newState.analyticsState.approvals++;
        } else if (action.decision === 'deny') {
          newState.analyticsState.denials++;
        } else if (action.decision === 'flag') {
          newState.analyticsState.flags++;
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.decision_submitted',
          timestamp: newState.updatedAt,
          payload: {
            emailId: action.emailId,
            decision: action.decision,
            timeSpentMs: action.timeSpentMs,
          },
        });
        break;
      }

      case 'PROCESS_THREATS':
        if (!isActionAllowedInPhase('PROCESS_THREATS', state.currentPhase)) {
          throw new Error('PROCESS_THREATS not allowed in current phase');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.threats.generated',
          timestamp: newState.updatedAt,
          payload: { day: action.dayNumber },
        });
        break;

      case 'RESOLVE_INCIDENT': {
        if (!isActionAllowedInPhase('RESOLVE_INCIDENT', state.currentPhase)) {
          throw new Error('RESOLVE_INCIDENT not allowed in current phase');
        }
        const incident = newState.incidents.find((i) => i.incidentId === action.incidentId);
        if (incident) {
          incident.status = 'resolved';
          incident.resolvedDay = newState.currentDay;
          incident.responseActions = action.responseActions;
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.incident.resolved',
          timestamp: newState.updatedAt,
          payload: { incidentId: action.incidentId, responseActions: action.responseActions },
        });
        break;
      }

      case 'PURCHASE_UPGRADE':
        if (!isActionAllowedInPhase('PURCHASE_UPGRADE', state.currentPhase)) {
          throw new Error('PURCHASE_UPGRADE not allowed in current phase');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.upgrade.purchased',
          timestamp: newState.updatedAt,
          payload: { upgradeId: action.upgradeId },
        });
        break;

      case 'ADJUST_RESOURCE':
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('ADJUST_RESOURCE not allowed in current phase');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.resource.adjusted',
          timestamp: newState.updatedAt,
          payload: { resourceId: action.resourceId, delta: action.delta },
        });
        break;

      case 'PAUSE_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_PAUSED)
        ) {
          throw new Error('Cannot pause from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_PAUSED;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.paused',
          timestamp: newState.updatedAt,
          payload: {},
        });
        break;

      case 'RESUME_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ACTIVE)
        ) {
          throw new Error('Cannot resume from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.resumed',
          timestamp: newState.updatedAt,
          payload: {},
        });
        break;

      case 'ABANDON_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ABANDONED)
        ) {
          throw new Error('Cannot abandon from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_ABANDONED;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.abandoned',
          timestamp: newState.updatedAt,
          payload: { reason: action.reason },
        });
        break;

      case 'ADVANCE_DAY':
        if (!isActionAllowedInPhase('ADVANCE_DAY', state.currentPhase)) {
          throw new Error('ADVANCE_DAY not allowed in current phase');
        }
        newState.currentDay++;
        newState.currentPhase = DAY_PHASES.PHASE_DAY_START;
        newState.inbox = [];
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.ended',
          timestamp: newState.updatedAt,
          payload: { day: newState.currentDay - 1 },
        });
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.started',
          timestamp: newState.updatedAt,
          payload: { day: newState.currentDay },
        });
        break;

      case 'APPLY_CONSEQUENCES':
      case 'CLOSE_VERIFICATION':
      case 'OPEN_VERIFICATION':
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
