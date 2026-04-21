import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import type { CategorizedApiError } from '$lib/api/types';
import type { GameSessionRepositoryInterface } from '$lib/game/repositories/game-session.repository';

import { createSyncStore, isLoading, hasError } from './sync-store';

const mockBootstrapSession: GameSessionBootstrap = {
  schemaVersion: 1,
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  userId: 'user-1',
  day: 1,
  funds: 1000,
  clientCount: 5,
  threatLevel: 'low',
  facilityLoadout: {
    defenseLevel: 1,
    serverLevel: 1,
    networkLevel: 1,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createMockRepository(overrides?: Partial<GameSessionRepositoryInterface>) {
  return {
    bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapSession }),
    fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapSession }),
    ...overrides,
  } as GameSessionRepositoryInterface;
}

describe('syncStore', () => {
  let mockRepository: GameSessionRepositoryInterface;
  let syncStore: ReturnType<typeof createSyncStore>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    syncStore = createSyncStore(mockRepository);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(syncStore);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSyncAt).toBeNull();
    });

    it('isLoading derived returns false', () => {
      expect(get(isLoading)).toBe(false);
    });

    it('hasError derived returns false', () => {
      expect(get(hasError)).toBe(false);
    });
  });

  describe('bootstrap', () => {
    it('loads session from server', async () => {
      const result = await syncStore.bootstrap();

      expect(result.error).toBeUndefined();
      expect(mockRepository.bootstrap).toHaveBeenCalled();

      const state = get(syncStore);
      expect(state.isInitialized).toBe(true);
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('handles bootstrap errors', async () => {
      const errorResponse: CategorizedApiError = {
        category: 'server',
        code: 'UNKNOWN_ERROR',
        message: 'Failed',
        status: 500,
        retryable: false,
      };
      mockRepository.bootstrap = vi.fn().mockResolvedValue({ error: errorResponse });

      const result = await syncStore.bootstrap();

      expect(result.error).toBeDefined();
      const state = get(syncStore);
      expect(state.error).toBeDefined();
      expect(state.isInitialized).toBe(false);
    });

    it('sets isLoading during bootstrap', async () => {
      let loadingDuringCall = false;
      mockRepository.bootstrap = vi.fn().mockImplementation(async () => {
        loadingDuringCall = get(syncStore).isLoading;
        return { data: mockBootstrapSession };
      });

      await syncStore.bootstrap();
      expect(loadingDuringCall).toBe(true);
    });

    it('updates isLoading derived', async () => {
      vi.useFakeTimers();

      mockRepository.bootstrap = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve({ data: mockBootstrapSession }), 10)),
        );

      const promise = syncStore.bootstrap();
      expect(get(isLoading)).toBe(true);
      vi.advanceTimersByTime(10);
      await promise;
      expect(get(isLoading)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('fetchState', () => {
    it('fetches state from server', async () => {
      const result = await syncStore.fetchState();

      expect(result.error).toBeUndefined();
      expect(mockRepository.fetchState).toHaveBeenCalled();

      const state = get(syncStore);
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('handles fetch errors', async () => {
      const errorResponse: CategorizedApiError = {
        category: 'server',
        code: 'NOT_FOUND',
        message: 'Not found',
        status: 404,
        retryable: false,
      };
      mockRepository.fetchState = vi.fn().mockResolvedValue({ error: errorResponse });

      const result = await syncStore.fetchState();

      expect(result.error).toBeDefined();
      const state = get(syncStore);
      expect(state.error).toBeDefined();
    });

    it('sets isLoading during fetch', async () => {
      let loadingDuringCall = false;
      mockRepository.fetchState = vi.fn().mockImplementation(async () => {
        loadingDuringCall = get(syncStore).isLoading;
        return { data: mockBootstrapSession };
      });

      await syncStore.fetchState();
      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('setInitialized', () => {
    it('sets isInitialized to true', () => {
      syncStore.setInitialized();

      const state = get(syncStore);
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('optimisticUpdate', () => {
    it('applies custom updater function', () => {
      syncStore.optimisticUpdate((state) => ({ ...state, isInitialized: true }));

      const state = get(syncStore);
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('rollback', () => {
    it('calls fetchState', async () => {
      await syncStore.rollback();

      expect(mockRepository.fetchState).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears state', async () => {
      await syncStore.bootstrap();
      syncStore.reset();

      const state = get(syncStore);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSyncAt).toBeNull();
    });

    it('resets hasError derived', async () => {
      const errorResponse: CategorizedApiError = {
        category: 'server',
        code: 'UNKNOWN_ERROR',
        message: 'Failed',
        status: 500,
        retryable: false,
      };
      mockRepository.bootstrap = vi.fn().mockResolvedValue({ error: errorResponse });

      await syncStore.bootstrap();
      expect(get(hasError)).toBe(true);

      syncStore.reset();
      expect(get(hasError)).toBe(false);
    });
  });

  describe('get', () => {
    it('returns current state', async () => {
      await syncStore.bootstrap();

      const result = syncStore.get();
      expect(result.isInitialized).toBe(true);
    });
  });
});
