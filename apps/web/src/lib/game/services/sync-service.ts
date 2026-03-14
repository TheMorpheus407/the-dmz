import { apiClient } from '$lib/api/client';
import {
  getUnsyncedEvents,
  markEventsSynced,
  clearOldEvents,
  type QueuedEvent,
} from '$lib/storage/event-queue';
import { getLatestSessionSnapshot, saveSessionSnapshot } from '$lib/storage/session';
import { connectivityStore, updatePendingEvents } from '$lib/stores/connectivity';

export interface SyncResult {
  success: boolean;
  syncedEvents: number;
  conflicts: number;
  error?: string;
}

export interface ServerSnapshot {
  sessionId: string;
  state: unknown;
  serverTimestamp: number;
  version: number;
}

interface BatchSyncRequest {
  events: Array<{
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
    clientSequenceId: number;
  }>;
  lastKnownVersion?: number;
}

interface BatchSyncResponse {
  success: boolean;
  syncedEventIds: string[];
  serverSnapshot?: ServerSnapshot;
  conflicts: Array<{
    eventId: string;
    serverTimestamp: number;
  }>;
}

async function sendBeaconSync(events: QueuedEvent[]): Promise<void> {
  if (events.length === 0 || typeof navigator === 'undefined') {
    return;
  }

  const payload = JSON.stringify({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      timestamp: e.timestamp,
      clientSequenceId: e.clientSequenceId,
    })),
  });

  try {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/v1/game/sync', blob);
  } catch (error) {
    console.warn('[SyncService] Beacon sync failed:', error);
  }
}

export async function syncEvents(): Promise<SyncResult> {
  const unsyncedEvents = await getUnsyncedEvents();

  if (unsyncedEvents.length === 0) {
    return { success: true, syncedEvents: 0, conflicts: 0 };
  }

  const latestSnapshot = await getLatestSessionSnapshot();
  const request: BatchSyncRequest = {
    events: unsyncedEvents.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      timestamp: e.timestamp,
      clientSequenceId: e.clientSequenceId,
    })),
  };

  if (latestSnapshot && 'version' in latestSnapshot) {
    request.lastKnownVersion = (latestSnapshot as { version: number }).version;
  }

  const result = await apiClient.post<BatchSyncResponse>('/game/sync', request, {
    retry: { maxAttempts: 1 },
  });

  if (result.error) {
    const errorMessage = result.error.message || 'Unknown sync error';
    console.error('[SyncService] Sync failed:', errorMessage);

    if (result.error.category === 'network') {
      void sendBeaconSync(unsyncedEvents);
    }

    return {
      success: false,
      syncedEvents: 0,
      conflicts: 0,
      error: errorMessage,
    };
  }

  const response = result.data;
  if (!response) {
    return {
      success: false,
      syncedEvents: 0,
      conflicts: 0,
      error: 'No response from server',
    };
  }

  if (response.conflicts && response.conflicts.length > 0) {
    console.log(`[SyncService] ${response.conflicts.length} conflicts detected`);
    logConflictAnalytics(response.conflicts);

    await handleConflictResolution(response.serverSnapshot, unsyncedEvents);

    return {
      success: true,
      syncedEvents: response.syncedEventIds.length,
      conflicts: response.conflicts.length,
    };
  }

  const eventIds = response.syncedEventIds;
  await markEventsSynced(eventIds);

  const remainingEvents = await getUnsyncedEvents();
  updatePendingEvents(remainingEvents.length);

  return {
    success: true,
    syncedEvents: eventIds.length,
    conflicts: 0,
  };
}

async function handleConflictResolution(
  serverSnapshot: ServerSnapshot | undefined,
  localEvents: QueuedEvent[],
): Promise<void> {
  if (!serverSnapshot) {
    console.warn('[SyncService] No server snapshot available for conflict resolution');
    return;
  }

  console.log('[SyncService] Applying server-authoritative state');

  await saveSessionSnapshot(serverSnapshot.state);

  const serverTimestamp = serverSnapshot.serverTimestamp;

  const sortedLocalEvents = localEvents
    .filter((e) => e.timestamp > serverTimestamp)
    .sort((a, b) => a.clientSequenceId - b.clientSequenceId);

  console.log(
    `[SyncService] Replaying ${sortedLocalEvents.length} local events after server state`,
  );
}

function logConflictAnalytics(
  conflicts: Array<{ eventId: string; serverTimestamp: number }>,
): void {
  console.info('[SyncService:Analytics]', {
    type: 'conflict',
    conflictCount: conflicts.length,
    timestamp: Date.now(),
    eventIds: conflicts.map((c) => c.eventId),
  });
}

export async function performFullSync(): Promise<SyncResult> {
  connectivityStore.update((s) => ({ ...s, syncInProgress: true, syncError: null }));

  try {
    await clearOldEvents();

    const syncResult = await syncEvents();

    if (syncResult.success) {
      connectivityStore.update((s) => ({
        ...s,
        syncInProgress: false,
        syncError: null,
      }));
    } else {
      connectivityStore.update((s) => ({
        ...s,
        syncInProgress: false,
        syncError: syncResult.error || 'Sync failed',
      }));
    }

    return syncResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    connectivityStore.update((s) => ({
      ...s,
      syncInProgress: false,
      syncError: errorMessage,
    }));

    return {
      success: false,
      syncedEvents: 0,
      conflicts: 0,
      error: errorMessage,
    };
  }
}

export async function getQueueDepth(): Promise<number> {
  const events = await getUnsyncedEvents();
  return events.length;
}

export async function fetchServerSnapshot(): Promise<ServerSnapshot | null> {
  const result = await apiClient.get<{ data: ServerSnapshot }>('/game/snapshot');

  if (result.error || !result.data) {
    console.error('[SyncService] Failed to fetch server snapshot:', result.error);
    return null;
  }

  return result.data.data;
}
