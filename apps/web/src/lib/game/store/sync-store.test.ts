import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/api/game', () => ({
  bootstrapGameSession: vi.fn(),
  getGameSession: vi.fn(),
}));

import { bootstrapGameSession, getGameSession } from '$lib/api/game';

import { syncStore, isLoading, hasError } from './sync-store';

describe('syncStore', () => {
  beforeEach(() => {
    syncStore.reset();
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
      vi.mocked(bootstrapGameSession).mockResolvedValue({
        data: {
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
        },
      });

      const result = await syncStore.bootstrap();

      expect(result.error).toBeUndefined();
      expect(bootstrapGameSession).toHaveBeenCalled();

      const state = get(syncStore);
      expect(state.isInitialized).toBe(true);
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('handles bootstrap errors', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'UNKNOWN_ERROR',
          message: 'Failed',
          status: 500,
          retryable: false,
        },
      });

      const result = await syncStore.bootstrap();

      expect(result.error).toBeDefined();
      const state = get(syncStore);
      expect(state.error).toBeDefined();
      expect(state.isInitialized).toBe(false);
    });

    it('sets isLoading during bootstrap', async () => {
      let loadingDuringCall = false;
      vi.mocked(bootstrapGameSession).mockImplementation(() => {
        loadingDuringCall = get(syncStore).isLoading;
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            tenantId: 'tenant-1',
            sessionId: 'session-1',
            userId: 'user-1',
            day: 1,
            funds: 1000,
            clientCount: 5,
            threatLevel: 'low',
            facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
      });

      await syncStore.bootstrap();
      expect(loadingDuringCall).toBe(true);
    });

    it('updates isLoading derived', async () => {
      vi.mocked(bootstrapGameSession).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    schemaVersion: 1,
                    tenantId: 'tenant-1',
                    sessionId: 'session-1',
                    userId: 'user-1',
                    day: 1,
                    funds: 1000,
                    clientCount: 5,
                    threatLevel: 'low',
                    facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                  },
                }),
              10,
            ),
          ),
      );

      const promise = syncStore.bootstrap();
      expect(get(isLoading)).toBe(true);
      await promise;
      expect(get(isLoading)).toBe(false);
    });
  });

  describe('fetchState', () => {
    it('fetches state from server', async () => {
      vi.mocked(getGameSession).mockResolvedValue({
        data: {
          schemaVersion: 1,
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          userId: 'user-1',
          day: 5,
          funds: 2000,
          clientCount: 10,
          threatLevel: 'elevated' as const,
          facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      const result = await syncStore.fetchState();

      expect(result.error).toBeUndefined();
      expect(getGameSession).toHaveBeenCalled();

      const state = get(syncStore);
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('handles fetch errors', async () => {
      vi.mocked(getGameSession).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'NOT_FOUND',
          message: 'Not found',
          status: 404,
          retryable: false,
        },
      });

      const result = await syncStore.fetchState();

      expect(result.error).toBeDefined();
      const state = get(syncStore);
      expect(state.error).toBeDefined();
    });

    it('sets isLoading during fetch', async () => {
      let loadingDuringCall = false;
      vi.mocked(getGameSession).mockImplementation(() => {
        loadingDuringCall = get(syncStore).isLoading;
        return Promise.resolve({
          data: {
            schemaVersion: 1,
            tenantId: 'tenant-1',
            sessionId: 'session-1',
            userId: 'user-1',
            day: 1,
            funds: 1000,
            clientCount: 5,
            threatLevel: 'low' as const,
            facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
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
      vi.mocked(getGameSession).mockResolvedValue({
        data: {
          schemaVersion: 1,
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          userId: 'user-1',
          day: 1,
          funds: 1000,
          clientCount: 5,
          threatLevel: 'low' as const,
          facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await syncStore.rollback();

      expect(getGameSession).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears state', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({
        data: {
          schemaVersion: 1,
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          userId: 'user-1',
          day: 1,
          funds: 1000,
          clientCount: 5,
          threatLevel: 'low',
          facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await syncStore.bootstrap();
      syncStore.reset();

      const state = get(syncStore);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSyncAt).toBeNull();
    });

    it('resets hasError derived', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'UNKNOWN_ERROR',
          message: 'Failed',
          status: 500,
          retryable: false,
        },
      });

      await syncStore.bootstrap();
      expect(get(hasError)).toBe(true);

      syncStore.reset();
      expect(get(hasError)).toBe(false);
    });
  });

  describe('get', () => {
    it('returns current state', async () => {
      vi.mocked(bootstrapGameSession).mockResolvedValue({
        data: {
          schemaVersion: 1,
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          userId: 'user-1',
          day: 1,
          funds: 1000,
          clientCount: 5,
          threatLevel: 'low',
          facilityLoadout: { defenseLevel: 1, serverLevel: 1, networkLevel: 1 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

      await syncStore.bootstrap();

      const result = syncStore.get();
      expect(result.isInitialized).toBe(true);
    });
  });
});
