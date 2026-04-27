import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { offlineModeStore } from './offline-mode';

vi.mock('$lib/stores/connectivity', () => ({
  connectivityStore: {
    subscribe: vi.fn((callback) => {
      callback({ online: true, syncInProgress: false });
      return () => {};
    }),
  },
  initializeConnectivityListeners: vi.fn(),
  updatePendingEvents: vi.fn(),
  setSyncCallback: vi.fn(),
}));

vi.mock('$lib/storage/event-queue', () => ({
  getUnsyncedEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('$lib/storage/session', () => ({
  getLatestSessionSnapshot: vi.fn().mockResolvedValue(null),
  clearStaleSnapshots: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('../services/offline-engine', () => {
  const mockSyncWithServer = vi.fn().mockResolvedValue(undefined);
  const mockInitialize = vi.fn().mockResolvedValue(undefined);
  return {
    getOfflineEngine: vi.fn(() => ({
      syncWithServer: mockSyncWithServer,
      initialize: mockInitialize,
      getState: vi.fn().mockReturnValue({}),
    })),
    initializeOfflineGame: vi.fn().mockResolvedValue({
      syncWithServer: mockSyncWithServer,
      initialize: mockInitialize,
      getState: vi.fn().mockReturnValue({}),
    }),
  };
});

describe('offline-mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    offlineModeStore.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    offlineModeStore.reset();
  });

  describe('startPeriodicSync', () => {
    it('should call sync with correct this binding using self reference', async () => {
      await offlineModeStore.startOfflinePlay();

      const syncSpy = vi.spyOn(offlineModeStore, 'sync' as keyof typeof offlineModeStore);

      offlineModeStore.startPeriodicSync();

      vi.advanceTimersByTime(60000);

      expect(syncSpy).toHaveBeenCalledTimes(1);
    });

    it('should call sync periodically every 60 seconds', async () => {
      await offlineModeStore.startOfflinePlay();

      const syncSpy = vi.spyOn(offlineModeStore, 'sync' as keyof typeof offlineModeStore);

      offlineModeStore.startPeriodicSync();

      vi.advanceTimersByTime(60000);
      expect(syncSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60000);
      expect(syncSpy).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(60000);
      expect(syncSpy).toHaveBeenCalledTimes(3);
    });

    it('should not start multiple intervals', async () => {
      await offlineModeStore.startOfflinePlay();

      const syncSpy = vi.spyOn(offlineModeStore, 'sync' as keyof typeof offlineModeStore);

      offlineModeStore.startPeriodicSync();
      offlineModeStore.startPeriodicSync();
      offlineModeStore.startPeriodicSync();

      vi.advanceTimersByTime(60000);

      expect(syncSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopPeriodicSync', () => {
    it('should stop the periodic sync interval', async () => {
      await offlineModeStore.startOfflinePlay();

      const syncSpy = vi.spyOn(offlineModeStore, 'sync' as keyof typeof offlineModeStore);

      offlineModeStore.startPeriodicSync();
      offlineModeStore.stopPeriodicSync();

      vi.advanceTimersByTime(60000);
      vi.advanceTimersByTime(60000);

      expect(syncSpy).not.toHaveBeenCalled();
    });
  });

  describe('this binding regression test', () => {
    it('should fail with this.sync() but pass with self.sync() - verifies the fix', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callHistory: any[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackingSync = async function (this: any): Promise<void> {
        callHistory.push(this);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalSync = (offlineModeStore as any).sync;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (offlineModeStore as any).sync = trackingSync;

      await offlineModeStore.startOfflinePlay();

      offlineModeStore.startPeriodicSync();

      vi.advanceTimersByTime(60000);

      expect(callHistory.length).toBe(1);
      expect(callHistory[0]).toBe(offlineModeStore);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (offlineModeStore as any).sync = originalSync;
    });
  });
});
