import { eq, and, gt } from 'drizzle-orm';

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { coopSession } from '../../../db/schema/multiplayer/index.js';
import { gameEvents } from '../../../db/schema/game/index.js';

import type { AppConfig } from '../../../config.js';
import type { CoopEventMessage, WebSocketGateway } from '../../notification/websocket/index.js';

export interface ReconnectResult {
  currentSeq: number;
  lastSnapshotSeq: number;
  missedEvents: CoopEventMessage[];
  needsFullState: boolean;
}

export async function handleReconnect(
  config: AppConfig,
  gateway: WebSocketGateway,
  connectionId: string,
  tenantId: string,
  sessionId: string,
  lastSeq: number,
): Promise<ReconnectResult> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return {
      currentSeq: 0,
      lastSnapshotSeq: 0,
      missedEvents: [],
      needsFullState: true,
    };
  }

  const currentSeq = Number(session.sessionSeq);
  const lastSnapshotSeq = Number(session.lastSnapshotSeq);

  if (lastSeq < lastSnapshotSeq) {
    gateway.sendToConnection(connectionId, {
      type: 'RESYNC',
      payload: {
        currentSeq,
        lastSnapshotSeq,
        events: [],
      },
      timestamp: Date.now(),
      sequence: gateway.getNextSequence(),
    });

    return {
      currentSeq,
      lastSnapshotSeq,
      missedEvents: [],
      needsFullState: true,
    };
  }

  if (!session.gameSessionId) {
    return {
      currentSeq,
      lastSnapshotSeq,
      missedEvents: [],
      needsFullState: true,
    };
  }

  const missedEventsQuery = await db
    .select({
      eventId: gameEvents.eventId,
      eventType: gameEvents.eventType,
      eventData: gameEvents.eventData,
      sequenceNum: gameEvents.sequenceNum,
      serverTime: gameEvents.serverTime,
    })
    .from(gameEvents)
    .where(
      and(eq(gameEvents.sessionId, session.gameSessionId), gt(gameEvents.sequenceNum, lastSeq)),
    )
    .orderBy(gameEvents.sequenceNum);

  const missedEvents: CoopEventMessage[] = missedEventsQuery.map((event) => ({
    type: 'EVENT',
    seq: Number(event.sequenceNum),
    event: {
      eventId: event.eventId,
      eventType: event.eventType,
      ...(event.eventData as Record<string, unknown>),
    },
    timestamp: event.serverTime.toISOString(),
  }));

  return {
    currentSeq,
    lastSnapshotSeq,
    missedEvents,
    needsFullState: missedEvents.length === 0 && lastSeq < currentSeq,
  };
}

export async function getMissedEvents(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  fromSeq: number,
): Promise<CoopEventMessage[]> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session || !session.gameSessionId) {
    return [];
  }

  const eventsQuery = await db
    .select({
      eventId: gameEvents.eventId,
      eventType: gameEvents.eventType,
      eventData: gameEvents.eventData,
      sequenceNum: gameEvents.sequenceNum,
      serverTime: gameEvents.serverTime,
    })
    .from(gameEvents)
    .where(
      and(eq(gameEvents.sessionId, session.gameSessionId), gt(gameEvents.sequenceNum, fromSeq)),
    )
    .orderBy(gameEvents.sequenceNum);

  return eventsQuery.map((event) => ({
    type: 'EVENT',
    seq: Number(event.sequenceNum),
    event: {
      eventId: event.eventId,
      eventType: event.eventType,
      ...(event.eventData as Record<string, unknown>),
    },
    timestamp: event.serverTime.toISOString(),
  }));
}
