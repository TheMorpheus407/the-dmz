import { generateId } from '$lib/utils/id';

import {
  getDB,
  MAX_QUEUED_DECISIONS,
  SYNCED_DECISIONS_TO_KEEP,
  CLEANUP_AFTER_DAYS,
  type QueuedDecision,
} from './idb';

export interface DecisionInput {
  sessionId: string;
  emailId: string;
  decision: string;
  markedIndicators?: string[];
}

export async function queueDecision(decision: DecisionInput): Promise<QueuedDecision> {
  const db = await getDB();
  const count = await db.countFromIndex('decisions', 'by-synced', 0);

  if (count >= MAX_QUEUED_DECISIONS) {
    throw new Error(
      `Decision queue full. Maximum ${MAX_QUEUED_DECISIONS} pending decisions allowed.`,
    );
  }

  const queued: QueuedDecision = {
    id: generateId(),
    sessionId: decision.sessionId,
    emailId: decision.emailId,
    decision: decision.decision,
    markedIndicators: decision.markedIndicators || [],
    timestamp: Date.now(),
    synced: false,
  };

  await db.add('decisions', queued);
  return queued;
}

export async function getPendingDecisions(): Promise<QueuedDecision[]> {
  const db = await getDB();
  const tx = db.transaction('decisions', 'readonly');
  const index = tx.store.index('by-synced');
  return index.getAll(0);
}

export async function getPendingDecisionsBySession(sessionId: string): Promise<QueuedDecision[]> {
  const allPending = await getPendingDecisions();
  return allPending.filter((d) => d.sessionId === sessionId);
}

export async function markDecisionSynced(id: string): Promise<void> {
  const db = await getDB();
  const decision = await db.get('decisions', id);

  if (decision) {
    decision.synced = true;
    await db.put('decisions', decision);
  }
}

export async function markDecisionsSynced(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('decisions', 'readwrite');

  for (const id of ids) {
    const decision = await tx.store.get(id);
    if (decision) {
      decision.synced = true;
      await tx.store.put(decision);
    }
  }

  await tx.done;
}

export async function deleteDecision(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('decisions', id);
}

export async function getAllDecisions(): Promise<QueuedDecision[]> {
  const db = await getDB();
  return db.getAllFromIndex('decisions', 'by-timestamp');
}

export async function getDecisionCount(): Promise<{
  total: number;
  pending: number;
  synced: number;
}> {
  const db = await getDB();
  const all = await db.getAll('decisions');
  const pending = await getPendingDecisions();

  return {
    total: all.length,
    pending: pending.length,
    synced: all.length - pending.length,
  };
}

export async function clearSyncedData(): Promise<number> {
  const db = await getDB();
  const allDecisions = await db.getAllFromIndex('decisions', 'by-timestamp');
  const syncedDecisions = allDecisions
    .filter((d) => d.synced)
    .sort((a, b) => a.timestamp - b.timestamp);

  const toDelete = syncedDecisions.slice(
    0,
    Math.max(0, syncedDecisions.length - SYNCED_DECISIONS_TO_KEEP),
  );

  const tx = db.transaction('decisions', 'readwrite');
  for (const decision of toDelete) {
    await tx.store.delete(decision.id);
  }
  await tx.done;

  return toDelete.length;
}

export async function clearOldDecisions(olderThanDays?: number): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - (olderThanDays ?? CLEANUP_AFTER_DAYS) * 24 * 60 * 60 * 1000;
  const allDecisions = await db.getAllFromIndex('decisions', 'by-timestamp');
  const oldDecisions = allDecisions.filter((d) => d.timestamp < cutoff);

  const tx = db.transaction('decisions', 'readwrite');
  for (const decision of oldDecisions) {
    await tx.store.delete(decision.id);
  }
  await tx.done;

  return oldDecisions.length;
}

export async function clearAllDecisions(): Promise<void> {
  const db = await getDB();
  await db.clear('decisions');
}
