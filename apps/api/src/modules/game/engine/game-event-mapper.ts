import {
  GAME_ENGINE_EVENTS,
  createSessionStartedEvent,
  createSessionPausedEvent,
  createSessionResumedEvent,
  createSessionCompletedEvent,
  createSessionAbandonedEvent,
  createDayStartedEvent,
  createDayEndedEvent,
  createEmailOpenedEvent,
  createEmailDecisionSubmittedEvent,
  createIncidentCreatedEvent,
  createIncidentResolvedEvent,
  createBreachOccurredEvent,
} from './engine.events.js';

import type { IEventBus, DomainEvent } from '../../../shared/events/event-types.js';

export interface InternalGameEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

type GameEngineEventCreator = (params: {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
  payload: unknown;
}) => unknown;

const EVENT_CREATOR_MAP: Record<string, GameEngineEventCreator> = {
  [GAME_ENGINE_EVENTS.SESSION_STARTED]: (p) =>
    createSessionStartedEvent(p as Parameters<typeof createSessionStartedEvent>[0]),
  [GAME_ENGINE_EVENTS.SESSION_PAUSED]: (p) =>
    createSessionPausedEvent(p as Parameters<typeof createSessionPausedEvent>[0]),
  [GAME_ENGINE_EVENTS.SESSION_RESUMED]: (p) =>
    createSessionResumedEvent(p as Parameters<typeof createSessionResumedEvent>[0]),
  [GAME_ENGINE_EVENTS.SESSION_COMPLETED]: (p) =>
    createSessionCompletedEvent(p as Parameters<typeof createSessionCompletedEvent>[0]),
  [GAME_ENGINE_EVENTS.SESSION_ABANDONED]: (p) =>
    createSessionAbandonedEvent(p as Parameters<typeof createSessionAbandonedEvent>[0]),
  [GAME_ENGINE_EVENTS.DAY_STARTED]: (p) =>
    createDayStartedEvent(p as Parameters<typeof createDayStartedEvent>[0]),
  [GAME_ENGINE_EVENTS.DAY_ENDED]: (p) =>
    createDayEndedEvent(p as Parameters<typeof createDayEndedEvent>[0]),
  [GAME_ENGINE_EVENTS.EMAIL_OPENED]: (p) =>
    createEmailOpenedEvent(p as Parameters<typeof createEmailOpenedEvent>[0]),
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED]: (p) =>
    createEmailDecisionSubmittedEvent(p as Parameters<typeof createEmailDecisionSubmittedEvent>[0]),
  [GAME_ENGINE_EVENTS.INCIDENT_CREATED]: (p) =>
    createIncidentCreatedEvent(p as Parameters<typeof createIncidentCreatedEvent>[0]),
  [GAME_ENGINE_EVENTS.INCIDENT_RESOLVED]: (p) =>
    createIncidentResolvedEvent(p as Parameters<typeof createIncidentResolvedEvent>[0]),
  [GAME_ENGINE_EVENTS.BREACH_OCCURRED]: (p) =>
    createBreachOccurredEvent(p as Parameters<typeof createBreachOccurredEvent>[0]),
};

export class GameEventMapper {
  public mapToDomainEvents(
    events: InternalGameEvent[],
    userId: string,
    tenantId: string,
  ): unknown[] {
    return events
      .map((event) => {
        const creator = EVENT_CREATOR_MAP[event.eventType];
        if (!creator) {
          return null;
        }
        return creator({
          source: 'game-engine',
          correlationId: crypto.randomUUID(),
          tenantId,
          userId,
          version: 1,
          payload: event.payload,
        });
      })
      .filter(Boolean);
  }

  public publishEvents(eventBus: IEventBus | undefined, events: unknown[]): void {
    if (!eventBus) {
      return;
    }
    for (const event of events) {
      eventBus.publish(event as DomainEvent<unknown>);
    }
  }
}
