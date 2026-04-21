import { writable, derived, get } from 'svelte/store';

import type { CategorizedApiError } from '$lib/api/types';
import type { GameSessionRepositoryInterface } from '$lib/game/repositories/game-session.repository';
import { GameSessionRepository } from '$lib/game/repositories/game-session.repository';

export interface SyncState {
  isLoading: boolean;
  isInitialized: boolean;
  error: CategorizedApiError | null;
  lastSyncAt: string | null;
}

const initialState: SyncState = {
  isLoading: false,
  isInitialized: false,
  error: null,
  lastSyncAt: null,
};

function createSyncStore(repository: GameSessionRepositoryInterface) {
  const { subscribe, set, update } = writable<SyncState>(initialState);

  return {
    subscribe,

    get(): SyncState {
      return get({ subscribe });
    },

    async bootstrap(): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await repository.bootstrap();

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      update((state) => ({
        ...state,
        isLoading: false,
        isInitialized: true,
        lastSyncAt: new Date().toISOString(),
      }));
      return {};
    },

    async fetchState(): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await repository.fetchState();

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      update((state) => ({
        ...state,
        isLoading: false,
        lastSyncAt: new Date().toISOString(),
      }));
      return {};
    },

    setInitialized(): void {
      update((state) => ({ ...state, isInitialized: true }));
    },

    optimisticUpdate(updater: (state: SyncState) => SyncState): void {
      update(updater);
    },

    rollback(): void {
      void this.fetchState();
    },

    reset(): void {
      set(initialState);
    },
  };
}

const defaultRepository = new GameSessionRepository();

export const syncStore = createSyncStore(defaultRepository);

export { createSyncStore };

export const isLoading = derived(syncStore, ($sync) => $sync.isLoading);

export const hasError = derived(syncStore, ($sync) => $sync.error !== null);
