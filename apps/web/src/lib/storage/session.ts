import { generateId } from '$lib/utils/id';

import { getDB } from './idb';

export const SCHEMA_VERSION = 1;

export interface SessionSnapshot {
  id: string;
  state: unknown;
  timestamp: number;
  schemaVersion: number;
  checksum: string;
}

function computeChecksum(data: unknown): string {
  const jsonString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function validateSnapshot(snapshot: SessionSnapshot): boolean {
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    console.warn(
      `[Session] Invalid snapshot: schema version mismatch (expected ${SCHEMA_VERSION}, got ${snapshot.schemaVersion})`,
    );
    return false;
  }

  const computedChecksum = computeChecksum(snapshot.state);
  if (computedChecksum !== snapshot.checksum) {
    console.warn(
      `[Session] Invalid snapshot: checksum mismatch (expected ${snapshot.checksum}, got ${computedChecksum})`,
    );
    return false;
  }

  return true;
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
    schemaVersion: SCHEMA_VERSION,
    checksum: computeChecksum(state),
  };

  await db.put('sessions', snapshot);
  currentSnapshot = snapshot;

  return snapshot;
}

export async function getLatestSessionSnapshot(): Promise<SessionSnapshot | null> {
  if (currentSnapshot && validateSnapshot(currentSnapshot)) {
    return currentSnapshot;
  }

  const db = await getDB();
  const tx = db.transaction('sessions', 'readonly');
  const index = tx.store.index('by-timestamp');
  const snapshots = await index.getAll();

  if (snapshots.length === 0) {
    return null;
  }

  for (let i = snapshots.length - 1; i >= 0; i--) {
    const snapshot = snapshots[i] as SessionSnapshot;
    if (validateSnapshot(snapshot)) {
      currentSnapshot = snapshot;
      return snapshot;
    }
    console.warn(`[Session] Invalid snapshot ${snapshot.id}, skipping`);
  }

  return null;
}

export async function getSessionSnapshot(id: string): Promise<SessionSnapshot | undefined> {
  const db = await getDB();
  const snapshot = (await db.get('sessions', id)) as SessionSnapshot | undefined;
  return snapshot;
}

export async function getAllSessionSnapshots(): Promise<SessionSnapshot[]> {
  const db = await getDB();
  const snapshots = (await db.getAllFromIndex('sessions', 'by-timestamp')) as SessionSnapshot[];
  return snapshots;
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

export async function clearStaleSnapshots(
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000,
): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - maxAgeMs;
  const snapshots = await db.getAllFromIndex('sessions', 'by-timestamp');

  const staleSnapshots = snapshots.filter((s) => s.timestamp < cutoff);
  if (staleSnapshots.length === 0) {
    return 0;
  }

  const tx = db.transaction('sessions', 'readwrite');
  for (const snapshot of staleSnapshots) {
    await tx.store.delete(snapshot.id);
  }

  await tx.done;

  if (currentSnapshot && currentSnapshot.timestamp < cutoff) {
    currentSnapshot = null;
  }

  console.log(`[Session] Cleared ${staleSnapshots.length} stale snapshots (>7 days old)`);
  return staleSnapshots.length;
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
