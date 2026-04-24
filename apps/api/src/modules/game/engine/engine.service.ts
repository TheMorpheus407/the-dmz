import {
  SESSION_MACRO_STATES,
  type DAY_PHASES,
  type GameState,
  type GameActionPayload,
} from '@the-dmz/shared';

import { createInitialGameState, reduce } from './reducer.js';
import { isActionAllowedInPhase } from './state-machine.js';
import { createSessionStartedEvent } from './engine.events.js';
import { GameEventMapper } from './game-event-mapper.js';
import { SessionLifecycleManager } from './session-lifecycle-manager.js';

import type { EventBus } from '../../../shared/events/event-types.js';
import type { InternalGameEvent } from './game-event-mapper.js';

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
  private readonly eventMapper: GameEventMapper;
  private readonly sessionManager: SessionLifecycleManager;

  constructor(private readonly eventBus: EventBus) {
    this.eventMapper = new GameEventMapper();
    this.sessionManager = new SessionLifecycleManager(this.eventMapper, this.eventBus);
  }

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

    const domainEvents = this.eventMapper.mapToDomainEvents(
      result.events as InternalGameEvent[],
      userId,
      tenantId,
    );

    this.eventMapper.publishEvents(this.eventBus, domainEvents);

    return {
      success: true,
      newState: result.newState,
      events: domainEvents,
    };
  }

  public pauseSession(state: GameState): ActionProcessingResult {
    return this.sessionManager.pauseSession(state);
  }

  public resumeSession(state: GameState): ActionProcessingResult {
    return this.sessionManager.resumeSession(state);
  }

  public completeSession(state: GameState, reason: string): ActionProcessingResult {
    return this.sessionManager.completeSession(state, reason);
  }

  public abandonSession(state: GameState, reason?: string): ActionProcessingResult {
    return this.sessionManager.abandonSession(state, reason);
  }

  public transitionToPhase(state: GameState, newPhase: string): ActionProcessingResult {
    return this.sessionManager.transitionToPhase(
      state,
      newPhase as (typeof DAY_PHASES)[keyof typeof DAY_PHASES],
    );
  }
}
