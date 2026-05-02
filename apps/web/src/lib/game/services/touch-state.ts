import { writable } from 'svelte/store';

import { getDB } from '$lib/storage/idb';
import { generateId } from '$lib/utils/id';
import { logger } from '$lib/logger';
import { CLIENT_SYNC_INTERVAL_MS } from '@the-dmz/shared/constants';

import { browser } from '$app/environment';

export interface TouchInteraction {
  id: string;
  type: 'swipe' | 'pan' | 'pinch' | 'longpress' | 'tap';
  direction?: 'left' | 'right' | 'up' | 'down';
  targetElement?: string;
  timestamp: number;
  synced: boolean;
  metadata?: Record<string, unknown>;
}

export interface TouchState {
  interactions: TouchInteraction[];
  lastSyncAt: number | null;
  activeGestures: number;
}

const MAX_STORED_INTERACTIONS = 1000;

const initialState: TouchState = {
  interactions: [],
  lastSyncAt: null,
  activeGestures: 0,
};

function createTouchStateStore() {
  const { subscribe, set, update } = writable<TouchState>(initialState);

  let syncTimer: ReturnType<typeof setInterval> | null = null;

  function getState(): TouchState {
    let currentState: TouchState = initialState;
    const unsubscribe = subscribe((state) => {
      currentState = state;
    });
    unsubscribe();
    return currentState;
  }

  return {
    subscribe,

    getState,

    getTouchState(): TouchState {
      return { ...getState() };
    },

    async initTouchStatePersistence(): Promise<void> {
      if (!browser) return;

      await loadTouchState();
      this.startPeriodicSync();
    },

    recordTouchInteraction(
      type: TouchInteraction['type'],
      metadata?: Record<string, unknown>,
      direction?: TouchInteraction['direction'],
      targetElement?: string,
    ): void {
      if (!browser) return;

      const interaction: TouchInteraction = {
        id: generateId(),
        type,
        timestamp: Date.now(),
        synced: false,
        ...(direction !== undefined && { direction }),
        ...(targetElement !== undefined && { targetElement }),
        ...(metadata !== undefined && { metadata }),
      };

      update((state) => {
        const interactions = [...state.interactions, interaction].slice(-MAX_STORED_INTERACTIONS);
        return { ...state, interactions };
      });
    },

    recordSwipe(direction: TouchInteraction['direction'], targetElement?: string): void {
      void this.recordTouchInteraction('swipe', undefined, direction, targetElement);
    },

    recordPan(direction: 'prev' | 'next', targetElement?: string): void {
      void this.recordTouchInteraction(
        'pan',
        { panDirection: direction },
        undefined,
        targetElement,
      );
    },

    recordPinch(scale: number, targetElement?: string): void {
      void this.recordTouchInteraction('pinch', { scale }, undefined, targetElement);
    },

    recordLongPress(targetElement?: string): void {
      void this.recordTouchInteraction('longpress', undefined, undefined, targetElement);
    },

    recordTap(targetElement?: string): void {
      void this.recordTouchInteraction('tap', undefined, undefined, targetElement);
    },

    incrementActiveGestures(): void {
      update((state) => ({ ...state, activeGestures: state.activeGestures + 1 }));
    },

    decrementActiveGestures(): void {
      update((state) => ({
        ...state,
        activeGestures: Math.max(0, state.activeGestures - 1),
      }));
    },

    getUnsyncedTouchInteractions(): TouchInteraction[] {
      return getState().interactions.filter((i) => !i.synced);
    },

    async syncTouchState(): Promise<number> {
      if (!browser) return 0;

      try {
        await getDB();
        let unsyncedCount = 0;

        update((state) => {
          const interactions = state.interactions.map((i) => {
            if (!i.synced) {
              unsyncedCount++;
              return { ...i, synced: true };
            }
            return i;
          });

          return { ...state, interactions, lastSyncAt: Date.now() };
        });

        return unsyncedCount;
      } catch (error) {
        logger.error('Failed to sync touch state', { error });
        return 0;
      }
    },

    clearOldTouchInteractions(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
      const cutoff = Date.now() - olderThanMs;
      let clearedCount = 0;

      update((state) => {
        const before = state.interactions.length;
        const interactions = state.interactions.filter((i) => i.timestamp > cutoff || !i.synced);
        clearedCount = before - interactions.length;
        return { ...state, interactions };
      });

      return clearedCount;
    },

    startPeriodicSync(): void {
      if (syncTimer) return;

      syncTimer = setInterval(() => {
        void this.syncTouchState();
      }, CLIENT_SYNC_INTERVAL_MS as number);
    },

    stopPeriodicSync(): void {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
    },

    reset(): void {
      this.stopPeriodicSync();
      set(initialState);
    },
  };

  async function loadTouchState(): Promise<void> {
    if (!browser) return;

    try {
      const db = await getDB();
      const all = await db.getAll('events');
      const touchEvents = all.filter((e) => e.type && e.type.startsWith('touch_'));

      const interactions: TouchInteraction[] = touchEvents
        .slice(-MAX_STORED_INTERACTIONS)
        .map((e) => ({
          id: e.id,
          type: e.type?.replace('touch_', '') as TouchInteraction['type'],
          timestamp: e.timestamp,
          synced: e.synced,
          metadata: e.payload as Record<string, unknown>,
        }));

      const lastSyncAt =
        touchEvents.length > 0 ? Math.max(...touchEvents.map((e) => e.timestamp)) : null;

      update((state) => ({
        ...state,
        interactions,
        lastSyncAt,
      }));
    } catch (error) {
      logger.error('Failed to load touch state', { error });
    }
  }
}

export const touchStateStore = createTouchStateStore();
