import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type PauseSessionPayload,
  type ResumeSessionPayload,
  type AbandonSessionPayload,
  type AdvanceDayPayload,
} from '@the-dmz/shared';

import { canTransitionMacroState, isActionAllowedInPhase } from '../state-machine.js';

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
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.paused',
    timestamp: state.updatedAt,
    payload: {},
  });
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
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.resumed',
    timestamp: state.updatedAt,
    payload: {},
  });
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
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.abandoned',
    timestamp: state.updatedAt,
    payload: { reason: action.reason },
  });
}

export function handleAdvanceDay(
  state: GameState,
  _action: AdvanceDayPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADVANCE_DAY', state.currentPhase)) {
    throw new Error('ADVANCE_DAY not allowed in current phase');
  }
  state.currentDay++;
  state.currentPhase = DAY_PHASES.PHASE_DAY_START;

  const deferredEmails = state.inbox.filter((e) => e.status === 'deferred');
  const processedEmails = state.inbox.filter((e) => e.status !== 'deferred');

  state.inbox = deferredEmails.map((email) => ({
    ...email,
    status: 'pending' as const,
    timeSpentMs: 0,
  }));

  state.analyticsState.totalEmailsProcessed += processedEmails.length;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.day.ended',
    timestamp: state.updatedAt,
    payload: {
      day: state.currentDay - 1,
      emailsProcessed: processedEmails.length,
      emailsDeferred: deferredEmails.length,
    },
  });
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.day.started',
    timestamp: state.updatedAt,
    payload: {
      day: state.currentDay,
      deferredEmailsCarried: deferredEmails.length,
    },
  });
}
