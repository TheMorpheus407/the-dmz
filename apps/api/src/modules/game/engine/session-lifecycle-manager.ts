import { SESSION_MACRO_STATES, type DAY_PHASES, type GameState } from '@the-dmz/shared';

import { transitionPhase, transitionMacroState } from './reducer.js';
import {
  createSessionPausedEvent,
  createSessionResumedEvent,
  createSessionCompletedEvent,
  createSessionAbandonedEvent,
  createDayPhaseChangedEvent,
} from './engine.events.js';
import { canTransitionMacroState } from './state-machine.js';
import { type GameEventMapper } from './game-event-mapper.js';

import type { IEventBus } from '../../../shared/events/event-types.js';

export interface SessionTransitionResult {
  success: boolean;
  newState: GameState;
  events: unknown[];
  error?: string;
}

export class SessionLifecycleManager {
  constructor(
    private readonly eventMapper: GameEventMapper,
    private readonly eventBus?: IEventBus,
  ) {}

  public pauseSession(state: GameState): SessionTransitionResult {
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

    this.eventMapper.publishEvents(this.eventBus, [event]);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public resumeSession(state: GameState): SessionTransitionResult {
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

    this.eventMapper.publishEvents(this.eventBus, [event]);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public completeSession(state: GameState, reason: string): SessionTransitionResult {
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

    this.eventMapper.publishEvents(this.eventBus, [event]);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public abandonSession(state: GameState, reason?: string): SessionTransitionResult {
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

    this.eventMapper.publishEvents(this.eventBus, [event]);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }

  public transitionToPhase(state: GameState, newPhase: string): SessionTransitionResult {
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

    this.eventMapper.publishEvents(this.eventBus, [event]);

    return {
      success: true,
      newState: result.newState,
      events: [event],
    };
  }
}
