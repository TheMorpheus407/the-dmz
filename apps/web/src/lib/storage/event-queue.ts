import { generateId } from '$lib/utils/id';
import { logger } from '$lib/logger';

import { getDB } from './idb';

export const MAX_QUEUE_SIZE = 100;

export interface QueuedEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  clientSequenceId: number;
  synced: boolean;
}

class SequenceGenerator {
  private counter = 0;

  next(): number {
    return ++this.counter;
  }

  reset(): void {
    this.counter = 0;
  }

  get current(): number {
    return this.counter;
  }
}

const sequenceGenerator = new SequenceGenerator();

async function enforceQueueLimit(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('events', 'readwrite');
  const index = tx.store.index('by-synced');
  const unsyncedEvents = await index.getAll(0);

  if (unsyncedEvents.length >= MAX_QUEUE_SIZE) {
    const eventsToRemove = unsyncedEvents
      .sort((a, b) => a.clientSequenceId - b.clientSequenceId)
      .slice(0, unsyncedEvents.length - MAX_QUEUE_SIZE + 1);

    logger.warn(`[EventQueue] Queue overflow: dropping ${eventsToRemove.length} oldest events`);

    for (const event of eventsToRemove) {
      await tx.store.delete(event.id);
    }
  }

  await tx.done;
}

export async function saveEvent(type: string, payload: unknown): Promise<QueuedEvent> {
  await enforceQueueLimit();

  const db = await getDB();
  const event: QueuedEvent = {
    id: generateId(),
    type,
    payload,
    timestamp: Date.now(),
    clientSequenceId: sequenceGenerator.next(),
    synced: false,
  };

  await db.add('events', event);
  return event;
}

export function resetSequenceGenerator(): void {
  sequenceGenerator.reset();
}

export function getCurrentSequence(): number {
  return sequenceGenerator.current;
}

export async function getEvents(includeSynced = false): Promise<QueuedEvent[]> {
  const db = await getDB();

  if (includeSynced) {
    return db.getAllFromIndex('events', 'by-timestamp');
  }

  const tx = db.transaction('events', 'readonly');
  const index = tx.store.index('by-synced');
  return index.getAll(0);
}

export async function getUnsyncedEvents(): Promise<QueuedEvent[]> {
  const db = await getDB();
  const tx = db.transaction('events', 'readonly');
  const index = tx.store.index('by-synced');
  return index.getAll(0);
}

export async function markEventSynced(id: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', id);

  if (event) {
    event.synced = true;
    await db.put('events', event);
  }
}

export async function markEventsSynced(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('events', 'readwrite');

  for (const id of ids) {
    const event = await tx.store.get(id);
    if (event) {
      event.synced = true;
      await tx.store.put(event);
    }
  }

  await tx.done;
}

export async function clearOldEvents(
  olderThanMs: number = 7 * 24 * 60 * 60 * 1000,
): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - olderThanMs;
  const allEvents = await db.getAllFromIndex('events', 'by-timestamp');
  const oldEvents = allEvents.filter((event) => event.timestamp < cutoff);

  for (const event of oldEvents) {
    if (event.synced) {
      await db.delete('events', event.id);
    }
  }

  return oldEvents.length;
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('events', id);
}

export async function getEventCount(): Promise<{ total: number; unsynced: number }> {
  const db = await getDB();
  const all = await db.getAll('events');
  const unsynced = await getUnsyncedEvents();

  return {
    total: all.length,
    unsynced: unsynced.length,
  };
}
