import { get } from 'svelte/store';

import { uiStore } from '$lib/game/store/ui-store';
import { connectivityStore } from '$lib/stores/connectivity';

let lastSyncNotification: { time: number; type: 'success' | 'error' } | null = null;
const NOTIFICATION_COOLDOWN_MS = 5000;

export function showSyncCompleteNotification(syncedCount: number, conflictCount: number): void {
  const now = Date.now();
  if (lastSyncNotification && now - lastSyncNotification.time < NOTIFICATION_COOLDOWN_MS) {
    return;
  }

  lastSyncNotification = { time: now, type: 'success' };

  let message = `Synced ${syncedCount} event${syncedCount !== 1 ? 's' : ''}`;

  if (conflictCount > 0) {
    message += ` (${conflictCount} conflict${conflictCount !== 1 ? 's' : ''} resolved)`;
  }

  uiStore.addNotification(message, 'success', 5000, { source: 'SYNC' });
}

export function showSyncFailedNotification(errorMessage: string): void {
  const now = Date.now();
  if (lastSyncNotification && now - lastSyncNotification.time < NOTIFICATION_COOLDOWN_MS) {
    return;
  }

  lastSyncNotification = { time: now, type: 'error' };

  uiStore.addNotification(`Sync failed: ${errorMessage}`, 'error', 8000, { source: 'SYNC' });
}

export function showOfflineNotification(): void {
  const conn = get(connectivityStore);
  if (!conn.online) {
    uiStore.addNotification(
      'You are now offline. Changes will be synced when reconnected.',
      'warning',
      5000,
      {
        source: 'SYNC',
      },
    );
  }
}

export function showReconnectedNotification(): void {
  uiStore.addNotification('Connection restored. Syncing...', 'info', 3000, { source: 'SYNC' });
}

export function initializeSyncNotifications(): void {
  let previousOnlineState: boolean | null = null;

  connectivityStore.subscribe((state) => {
    if (previousOnlineState === null) {
      previousOnlineState = state.online;
      return;
    }

    if (previousOnlineState === false && state.online) {
      showReconnectedNotification();
    } else if (previousOnlineState === true && !state.online) {
      showOfflineNotification();
    }

    previousOnlineState = state.online;
  });
}
