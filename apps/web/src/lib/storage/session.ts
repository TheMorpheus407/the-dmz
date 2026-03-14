import { generateId } from '$lib/utils/id';

import { getDB } from './idb';

export interface SessionSnapshot {
  id: string;
  state: unknown;
  timestamp: number;
}

const SESSION_SNAPSHOT_INTERVAL_MS = 30000;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
let currentSnapshot: SessionSnapshot | null = null;

export async function saveSessionSnapshot(state: unknown): Promise<SessionSnapshot> {
  const db = await getDB();
  const snapshot: SessionSnapshot = {
    id: generateId(),
    state,
    timestamp: Date.now(),
  };

  await db.put('sessions', snapshot);
  currentSnapshot = snapshot;

  return snapshot;
}

export async function getLatestSessionSnapshot(): Promise<SessionSnapshot | null> {
  if (currentSnapshot) {
    return currentSnapshot;
  }

  const db = await getDB();
  const tx = db.transaction('sessions', 'readonly');
  const index = tx.store.index('by-timestamp');
  const snapshots = await index.getAll();

  if (snapshots.length === 0) {
    return null;
  }

  currentSnapshot = snapshots[snapshots.length - 1] ?? null;
  return currentSnapshot;
}

export async function getSessionSnapshot(id: string): Promise<SessionSnapshot | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getAllSessionSnapshots(): Promise<SessionSnapshot[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-timestamp');
}

export async function deleteSessionSnapshot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

export async function clearOldSnapshots(keepCount: number = 10): Promise<number> {
  const db = await getDB();
  const snapshots = await db.getAllFromIndex('sessions', 'by-timestamp');

  if (snapshots.length <= keepCount) {
    return 0;
  }

  const toDelete = snapshots.slice(0, snapshots.length - keepCount);
  const tx = db.transaction('sessions', 'readwrite');

  for (const snapshot of toDelete) {
    await tx.store.delete(snapshot.id);
  }

  await tx.done;
  return toDelete.length;
}

export function startSessionSnapshotTimer(saveFn: () => unknown): void {
  if (snapshotTimer) {
    return;
  }

  snapshotTimer = setInterval(() => {
    void (async () => {
      try {
        const state = saveFn();
        if (state) {
          await saveSessionSnapshot(state);
        }
      } catch (error) {
        console.error('Failed to save session snapshot:', error);
      }
    })();
  }, SESSION_SNAPSHOT_INTERVAL_MS);
}

export function stopSessionSnapshotTimer(): void {
  if (snapshotTimer) {
    clearInterval(snapshotTimer);
    snapshotTimer = null;
  }
}

export { SESSION_SNAPSHOT_INTERVAL_MS };
