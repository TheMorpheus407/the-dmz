import { generateId } from '$lib/utils/id';

import { getDB } from './idb';

export interface QueuedEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  clientSequenceId: number;
  synced: boolean;
}

let clientSequenceId = 0;

export async function saveEvent(type: string, payload: unknown): Promise<QueuedEvent> {
  const db = await getDB();
  const event: QueuedEvent = {
    id: generateId(),
    type,
    payload,
    timestamp: Date.now(),
    clientSequenceId: ++clientSequenceId,
    synced: false,
  };

  await db.add('events', event);
  return event;
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
