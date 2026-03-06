import {
  SESSION_MACRO_STATES,
  type DAY_PHASES,
  type GameState,
  type GameActionPayload,
} from '@the-dmz/shared';

import {
  createInitialGameState,
  reduce,
  transitionPhase,
  transitionMacroState,
} from './reducer.js';
import {
  createSessionStartedEvent,
  createSessionPausedEvent,
  createSessionResumedEvent,
  createSessionCompletedEvent,
  createSessionAbandonedEvent,
  createDayStartedEvent,
  createDayPhaseChangedEvent,
  createDayEndedEvent,
  createEmailOpenedEvent,
  createEmailDecisionSubmittedEvent,
  createIncidentCreatedEvent,
  createIncidentResolvedEvent,
  createBreachOccurredEvent,
} from './engine.events.js';
import { isActionAllowedInPhase, canTransitionMacroState } from './state-machine.js';

import type { IEventBus, DomainEvent } from '../../../shared/events/event-types.js';

export interface ProcessActionParams {
  sessionId: string;
  userId: string;
  tenantId: string;
  action: GameActionPayload;
  currentState: GameState;
}

export interface ActionProcessingResult {
  success: boolean;
  newState: GameState;
  events: unknown[];
  error?: string;
}

export interface InitializeSessionParams {
  sessionId: string;
  userId: string;
  tenantId: string;
  seed?: number;
}

export class GameEngineService {
  constructor(private readonly eventBus: IEventBus) {}

  public initializeSession(params: InitializeSessionParams): GameState {
    const { sessionId, userId, tenantId, seed } = params;

    const state = createInitialGameState(sessionId, userId, tenantId, seed);

    const event = createSessionStartedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId,
      userId,
      version: 1,
      payload: {
        sessionId,
        userId,
        tenantId,
        day: state.currentDay,
        seed: state.seed,
      },
    });

    this.eventBus.publish(event);

    return state;
  }

  public processAction(params: ProcessActionParams): ActionProcessingResult {
    const { userId, tenantId, action, currentState } = params;

    if (
      currentState.currentMacroState !== SESSION_MACRO_STATES.SESSION_ACTIVE &&
      action.type !== 'RESUME_SESSION' &&
      action.type !== 'PAUSE_SESSION' &&
      action.type !== 'ABANDON_SESSION'
    ) {
      return {
        success: false,
        newState: currentState,
        events: [],
        error: 'Session is not active',
      };
    }

    if (!isActionAllowedInPhase(action.type, currentState.currentPhase)) {
      return {
        success: false,
        newState: currentState,
        events: [],
        error: `Action ${action.type} is not allowed in phase ${currentState.currentPhase}`,
      };
    }

    const result = reduce(currentState, action);

    if (!result.success) {
      return {
        success: false,
        newState: currentState,
        events: [],
        error: result.error?.message ?? 'Unknown error',
      };
    }

    const domainEvents = this.mapToDomainEvents(result.events, userId, tenantId);

    for (const event of domainEvents) {
      this.eventBus.publish(event as DomainEvent<unknown>);
    }

    return {
      success: true,
      newState: result.newState,
      events: domainEvents,
    };
  }

  public pauseSession(state: GameState): ActionProcessingResult {
    if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_PAUSED)) {
      return {
        success: false,
        newState: state,
        events: [],
        error: 'Cannot pause session in current state',
      };
    }

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_PAUSED);

    const event = createSessionPausedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId: state.tenantId,
      userId: state.userId,
      version: 1,
      payload: {
        sessionId: state.sessionId,
        userId: state.userId,
      },
    });

    this.eventBus.publish(event);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public resumeSession(state: GameState): ActionProcessingResult {
    if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ACTIVE)) {
      return {
        success: false,
        newState: state,
        events: [],
        error: 'Cannot resume session in current state',
      };
    }

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_ACTIVE);

    const event = createSessionResumedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId: state.tenantId,
      userId: state.userId,
      version: 1,
      payload: {
        sessionId: state.sessionId,
        userId: state.userId,
      },
    });

    this.eventBus.publish(event);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public completeSession(state: GameState, reason: string): ActionProcessingResult {
    if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_COMPLETED)) {
      return {
        success: false,
        newState: state,
        events: [],
        error: 'Cannot complete session in current state',
      };
    }

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_COMPLETED);

    const event = createSessionCompletedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId: state.tenantId,
      userId: state.userId,
      version: 1,
      payload: {
        sessionId: state.sessionId,
        userId: state.userId,
        reason,
      },
    });

    this.eventBus.publish(event);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public abandonSession(state: GameState, reason?: string): ActionProcessingResult {
    if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ABANDONED)) {
      return {
        success: false,
        newState: state,
        events: [],
        error: 'Cannot abandon session in current state',
      };
    }

    const result = transitionMacroState(state, SESSION_MACRO_STATES.SESSION_ABANDONED);

    const event = createSessionAbandonedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId: state.tenantId,
      userId: state.userId,
      version: 1,
      payload: {
        sessionId: state.sessionId,
        userId: state.userId,
        reason: reason ?? '',
      },
    });

    this.eventBus.publish(event);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public transitionToPhase(state: GameState, newPhase: string): ActionProcessingResult {
    const result = transitionPhase(state, newPhase as (typeof DAY_PHASES)[keyof typeof DAY_PHASES]);

    if (!result.success) {
      return {
        success: false,
        newState: state,
        events: [],
        error: result.error?.message ?? 'Unknown error',
      };
    }

    const event = createDayPhaseChangedEvent({
      source: 'game-engine',
      correlationId: crypto.randomUUID(),
      tenantId: state.tenantId,
      userId: state.userId,
      version: 1,
      payload: {
        sessionId: state.sessionId,
        day: state.currentDay,
        oldPhase: state.currentPhase,
        newPhase: result.newState.currentPhase,
      },
    });

    this.eventBus.publish(event);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  private mapToDomainEvents(
    events: Array<{
      eventId: string;
      eventType: string;
      timestamp: string;
      payload: Record<string, unknown>;
    }>,
    userId: string,
    tenantId: string,
  ): unknown[] {
    return events
      .map((event) => {
        switch (event.eventType) {
          case 'game.session.started':
            return createSessionStartedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.session.paused':
            return createSessionPausedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.session.resumed':
            return createSessionResumedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.session.abandoned':
            return createSessionAbandonedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.day.started':
            return createDayStartedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.day.ended':
            return createDayEndedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.email.opened':
            return createEmailOpenedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.email.decision_submitted':
            return createEmailDecisionSubmittedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.incident.created':
            return createIncidentCreatedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.incident.resolved':
            return createIncidentResolvedEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          case 'game.breach.occurred':
            return createBreachOccurredEvent({
              source: 'game-engine',
              correlationId: crypto.randomUUID(),
              tenantId,
              userId,
              version: 1,
              payload: event.payload as never,
            });
          default:
            return null;
        }
      })
      .filter(Boolean);
  }
}
