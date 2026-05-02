import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  GAME_ACTIONS,
  type GameState,
  type PauseSessionPayload,
  type ResumeSessionPayload,
  type AbandonSessionPayload,
  type AdvanceDayPayload,
} from '@the-dmz/shared';

import { canTransitionMacroState, isActionAllowedInPhase } from '../state-machine.js';
import { GAME_ENGINE_EVENTS } from '../events/shared-types.js';
import { breachService } from '../../breach/index.js';

import { createGameEvent } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

export function handlePauseSession(
  state: GameState,
  _action: PauseSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_PAUSED)) {
    throw new Error('Cannot pause from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_PAUSED;
  events.push(createGameEvent(GAME_ENGINE_EVENTS.SESSION_PAUSED, {}, state.updatedAt));
}

export function handleResumeSession(
  state: GameState,
  _action: ResumeSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ACTIVE)) {
    throw new Error('Cannot resume from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
  events.push(createGameEvent(GAME_ENGINE_EVENTS.SESSION_RESUMED, {}, state.updatedAt));
}

export function handleAbandonSession(
  state: GameState,
  action: AbandonSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ABANDONED)) {
    throw new Error('Cannot abandon from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_ABANDONED;
  events.push(createGameEvent(GAME_ENGINE_EVENTS.SESSION_ABANDONED, { reason: action.reason }, state.updatedAt));
}

export function handleAdvanceDay(
  state: GameState,
  _action: AdvanceDayPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.ADVANCE_DAY, state.currentPhase)) {
    throw new Error('ADVANCE_DAY not allowed in current phase');
  }
  state.currentDay++;
  state.currentPhase = DAY_PHASES.PHASE_DAY_START;

  if (state.breachState.postBreachEffectsActive) {
    state.breachState = breachService.decayPostBreachEffects(state.breachState);
  }

  const deferredEmails = state.inbox.filter((e) => e.status === 'deferred');
  const processedEmails = state.inbox.filter((e) => e.status !== 'deferred');

  state.inbox = deferredEmails.map((email) => ({
    ...email,
    status: 'pending' as const,
    timeSpentMs: 0,
  }));

  state.analyticsState.totalEmailsProcessed += processedEmails.length;

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.DAY_ENDED,
    {
      day: state.currentDay - 1,
      emailsProcessed: processedEmails.length,
      emailsDeferred: deferredEmails.length,
    },
    state.updatedAt,
  ));
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.DAY_STARTED,
    {
      day: state.currentDay,
      deferredEmailsCarried: deferredEmails.length,
    },
    state.updatedAt,
  ));
}
