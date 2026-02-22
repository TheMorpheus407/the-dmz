import type { DomainEvent } from '../../../shared/events/event-types.js';

export const GAME_EVENTS = {
  SESSION_STARTED: 'game.session.started',
} as const;

export type GameEventType = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];

export interface GameSessionStartedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  day: number;
  funds: number;
}

export type GameEventPayloadMap = {
  [GAME_EVENTS.SESSION_STARTED]: GameSessionStartedPayload;
};

export type GameDomainEvent<T extends GameEventType = GameEventType> = DomainEvent<
  GameEventPayloadMap[T]
>;

interface BaseGameEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export const createGameSessionStartedEvent = (
  params: BaseGameEventParams & { payload: GameSessionStartedPayload },
): GameDomainEvent<typeof GAME_EVENTS.SESSION_STARTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_EVENTS.SESSION_STARTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
