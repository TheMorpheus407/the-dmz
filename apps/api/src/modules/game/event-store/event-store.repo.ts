import { eq, and, desc, sql, max } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import {
  gameEvents,
  type GameEvent,
  type NewGameEvent,
  gameStateSnapshots,
  type GameStateSnapshot,
  type NewGameStateSnapshot,
} from '../../../db/schema/game/index.js';

export type { GameEvent, NewGameEvent };
export type { GameStateSnapshot, NewGameStateSnapshot };

export const appendEvent = async (
  db: DB,
  event: Omit<NewGameEvent, 'eventId' | 'sequenceNum' | 'serverTime'>,
): Promise<GameEvent> => {
  const [latestEvent] = await db
    .select({ sequenceNum: gameEvents.sequenceNum })
    .from(gameEvents)
    .where(eq(gameEvents.sessionId, event.sessionId))
    .orderBy(desc(gameEvents.sequenceNum))
    .limit(1);

  const nextSequenceNum = (latestEvent?.sequenceNum ?? 0) + 1;

  const [created] = await db
    .insert(gameEvents)
    .values({
      sessionId: event['sessionId'],
      userId: event['userId'],
      tenantId: event['tenantId'],
      eventType: event['eventType'],
      eventData: event['eventData'],
      eventVersion: event['eventVersion'] ?? 1,
      sequenceNum: nextSequenceNum,
      clientTime: event['clientTime'] ?? null,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to append event');
  }

  return created;
};

export const getEvents = async (
  db: DB,
  sessionId: string,
  options?: {
    fromSequence?: number;
    toSequence?: number;
    limit?: number;
  },
): Promise<GameEvent[]> => {
  const conditions = [eq(gameEvents.sessionId, sessionId)];

  if (options?.fromSequence !== undefined) {
    conditions.push(sql`${gameEvents.sequenceNum} >= ${options.fromSequence}`);
  }

  if (options?.toSequence !== undefined) {
    conditions.push(sql`${gameEvents.sequenceNum} <= ${options.toSequence}`);
  }

  const query = db
    .select()
    .from(gameEvents)
    .where(and(...conditions))
    .orderBy(gameEvents.sequenceNum);

  if (options?.limit) {
    query.limit(options.limit);
  }

  return query;
};

export const getLatestSequenceNum = async (db: DB, sessionId: string): Promise<number | null> => {
  const [result] = await db
    .select({ sequenceNum: max(gameEvents.sequenceNum) })
    .from(gameEvents)
    .where(eq(gameEvents.sessionId, sessionId));

  return result?.sequenceNum ?? null;
};

export const createSnapshot = async (
  db: DB,
  snapshot: Omit<NewGameStateSnapshot, 'snapshotId' | 'createdAt'>,
): Promise<GameStateSnapshot> => {
  const [created] = await db
    .insert(gameStateSnapshots)
    .values({
      sessionId: snapshot['sessionId'],
      tenantId: snapshot['tenantId'],
      sequenceNum: snapshot['sequenceNum'],
      stateJson: snapshot['stateJson'],
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create snapshot');
  }

  return created;
};

export const getLatestSnapshot = async (
  db: DB,
  sessionId: string,
): Promise<GameStateSnapshot | null> => {
  const [snapshot] = await db
    .select()
    .from(gameStateSnapshots)
    .where(eq(gameStateSnapshots.sessionId, sessionId))
    .orderBy(desc(gameStateSnapshots.sequenceNum))
    .limit(1);

  return snapshot ?? null;
};

export const deleteSnapshotsAfter = async (
  db: DB,
  sessionId: string,
  sequenceNum: number,
): Promise<void> => {
  await db
    .delete(gameStateSnapshots)
    .where(
      and(
        eq(gameStateSnapshots.sessionId, sessionId),
        sql`${gameStateSnapshots.sequenceNum} > ${sequenceNum}`,
      ),
    );
};
