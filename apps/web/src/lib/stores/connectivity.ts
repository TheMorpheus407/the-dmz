import { writable, get } from 'svelte/store';

import { browser } from '$app/environment';

export interface ConnectivityState {
  online: boolean;
  lastChange: string | null;
  syncInProgress: boolean;
  pendingEvents: number;
}

export const initialConnectivityState: ConnectivityState = {
  online: true,
  lastChange: null,
  syncInProgress: false,
  pendingEvents: 0,
};

export const connectivityStore = writable<ConnectivityState>(initialConnectivityState);

let syncCallback: (() => Promise<void>) | null = null;

export function setSyncCallback(callback: () => Promise<void>): void {
  syncCallback = callback;
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
      void triggerSync();
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

  connectivityStore.update((s) => ({ ...s, syncInProgress: true }));

  try {
    if (syncCallback) {
      await syncCallback();
    }
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    connectivityStore.update((s) => ({ ...s, syncInProgress: false }));
  }
}

export function updatePendingEvents(count: number): void {
  connectivityStore.update((state) => ({
    ...state,
    pendingEvents: count,
  }));
}
