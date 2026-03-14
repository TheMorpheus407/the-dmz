import { writable, derived, get } from 'svelte/store';

import {
  connectivityStore,
  initializeConnectivityListeners,
  updatePendingEvents,
} from '$lib/stores/connectivity';
import { getUnsyncedEvents } from '$lib/storage/event-queue';
import { getLatestSessionSnapshot } from '$lib/storage/session';

import {
  getOfflineEngine,
  initializeOfflineGame,
  type OfflineGameEngine,
} from '../services/offline-engine';

import { browser } from '$app/environment';

export type OfflineModeStatus = 'offline' | 'online' | 'syncing';

export interface OfflineModeState {
  status: OfflineModeStatus;
  isOfflinePlay: boolean;
  lastSyncAt: string | null;
  hasSavedSession: boolean;
  pendingEventCount: number;
  offlineEmailCount: number;
}

const initialState: OfflineModeState = {
  status: 'online',
  isOfflinePlay: false,
  lastSyncAt: null,
  hasSavedSession: false,
  pendingEventCount: 0,
  offlineEmailCount: 50,
};

function createOfflineModeStore() {
  const { subscribe, set, update } = writable<OfflineModeState>(initialState);

  let engine: OfflineGameEngine | null = null;
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe,

    async initialize(): Promise<void> {
      if (!browser) return;

      await initializeConnectivityListeners();

      const snapshot = await getLatestSessionSnapshot();
      update((state) => ({
        ...state,
        hasSavedSession: snapshot !== null,
      }));

      const unsynced = await getUnsyncedEvents();
      updatePendingEvents(unsynced.length);
      update((state) => ({
        ...state,
        pendingEventCount: unsynced.length,
      }));

      connectivityStore.subscribe((connState) => {
        update((state) => ({
          ...state,
          status: connState.syncInProgress ? 'syncing' : connState.online ? 'online' : 'offline',
          isOfflinePlay: !connState.online,
        }));
      });
    },

    async startOfflinePlay(): Promise<void> {
      if (!browser) return;

      engine = await initializeOfflineGame();

      update((state) => ({
        ...state,
        isOfflinePlay: true,
        status: 'offline',
      }));

      this.startPeriodicSync();
    },

    async resumeFromSnapshot(): Promise<OfflineGameEngine | null> {
      if (!browser) return null;

      const snapshot = await getLatestSessionSnapshot();
      if (!snapshot) return null;

      engine = getOfflineEngine();
      await engine.initialize();

      update((state) => ({
        ...state,
        isOfflinePlay: true,
        status: 'offline',
        hasSavedSession: true,
      }));

      this.startPeriodicSync();

      return engine;
    },

    async sync(): Promise<void> {
      if (!engine) return;

      update((state) => ({ ...state, status: 'syncing' }));

      await engine.syncWithServer();

      const unsynced = await getUnsyncedEvents();
      updatePendingEvents(unsynced.length);
      update((state) => ({
        ...state,
        status: 'online',
        lastSyncAt: new Date().toISOString(),
        pendingEventCount: unsynced.length,
      }));
    },

    startPeriodicSync(): void {
      if (syncInterval) return;

      syncInterval = setInterval(() => {
        const connState = get(connectivityStore);
        if (connState.online && engine) {
          void this.sync();
        }
      }, 60000);
    },

    stopPeriodicSync(): void {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    },

    getEngine(): OfflineGameEngine | null {
      return engine;
    },

    reset(): void {
      this.stopPeriodicSync();
      engine = null;
      set(initialState);
    },
  };
}

export const offlineModeStore = createOfflineModeStore();

export const isOfflineMode = derived(offlineModeStore, ($offline) => $offline.isOfflinePlay);

export const hasOfflineSession = derived(offlineModeStore, ($offline) => $offline.hasSavedSession);

export const pendingOfflineEvents = derived(
  offlineModeStore,
  ($offline) => $offline.pendingEventCount,
);
