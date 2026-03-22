import { writable, get } from 'svelte/store';

import { logger } from '$lib/logger';

import { browser } from '$app/environment';

export interface ConnectivityState {
  online: boolean;
  lastChange: string | null;
  syncInProgress: boolean;
  pendingEvents: number;
  syncError: string | null;
  retryCount: number;
}

export const initialConnectivityState: ConnectivityState = {
  online: true,
  lastChange: null,
  syncInProgress: false,
  pendingEvents: 0,
  syncError: null,
  retryCount: 0,
};

export const connectivityStore = writable<ConnectivityState>(initialConnectivityState);

export const SYNC_BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 30000];
export const MAX_RETRY_ATTEMPTS = 3;

let syncCallback: (() => Promise<void>) | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let currentRetryCount = 0;

export function setSyncCallback(callback: () => Promise<void>): void {
  syncCallback = callback;
}

function clearRetryTimeout(): void {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

function getBackoffDelay(attempt: number): number {
  return SYNC_BACKOFF_DELAYS[Math.min(attempt, SYNC_BACKOFF_DELAYS.length - 1)] ?? 30000;
}

async function executeSyncWithRetry(): Promise<void> {
  const state = get(connectivityStore);

  if (!state.online || state.syncInProgress) {
    return;
  }

  clearRetryTimeout();
  connectivityStore.update((s) => ({
    ...s,
    syncInProgress: true,
    syncError: null,
    retryCount: currentRetryCount,
  }));

  try {
    if (syncCallback) {
      await syncCallback();
    }

    currentRetryCount = 0;
    connectivityStore.update((s) => ({
      ...s,
      syncInProgress: false,
      retryCount: 0,
      syncError: null,
    }));
  } catch (error) {
    logger.error('Sync failed', { error });

    currentRetryCount++;

    if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      connectivityStore.update((s) => ({
        ...s,
        syncInProgress: false,
        syncError: `Sync failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`,
        retryCount: currentRetryCount,
      }));
      currentRetryCount = 0;
    } else {
      const delay = getBackoffDelay(currentRetryCount - 1);
      logger.debug(
        `Sync failed, retrying in ${delay}ms (attempt ${currentRetryCount}/${MAX_RETRY_ATTEMPTS})`,
      );

      connectivityStore.update((s) => ({
        ...s,
        syncInProgress: false,
        retryCount: currentRetryCount,
      }));

      retryTimeout = setTimeout(() => {
        void executeSyncWithRetry();
      }, delay);
    }
  }
}

export async function initializeConnectivityListeners(): Promise<void> {
  if (!browser) {
    return;
  }

  const updateOnlineStatus = (online: boolean) => {
    connectivityStore.update((state) => ({
      ...state,
      online,
      lastChange: new Date().toISOString(),
    }));

    if (online && syncCallback) {
      currentRetryCount = 0;
      void executeSyncWithRetry();
    }
  };

  window.addEventListener('online', () => updateOnlineStatus(true));
  window.addEventListener('offline', () => updateOnlineStatus(false));

  if (!navigator.onLine) {
    updateOnlineStatus(false);
  }
}

export async function triggerSync(): Promise<void> {
  if (!browser) {
    return;
  }

  const state = get(connectivityStore);
  if (!state.online || state.syncInProgress) {
    return;
  }

  currentRetryCount = 0;
  await executeSyncWithRetry();
}

export function cancelSync(): void {
  clearRetryTimeout();
  currentRetryCount = 0;
  connectivityStore.update((s) => ({
    ...s,
    syncInProgress: false,
    syncError: null,
    retryCount: 0,
  }));
}

export function updatePendingEvents(count: number): void {
  connectivityStore.update((state) => ({
    ...state,
    pendingEvents: count,
  }));
}
