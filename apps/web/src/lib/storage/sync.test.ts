import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn((i) => `test-id-${i}`),
}));

vi.mock('$lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockDB = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  transaction: vi.fn().mockReturnValue({
    store: {
      index: vi.fn().mockReturnValue({
        getAll: vi.fn().mockResolvedValue([]),
      }),
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    done: vi.fn().mockResolvedValue(undefined),
  }),
  getAll: vi.fn().mockResolvedValue([]),
  getAllFromIndex: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
};

vi.mock('$lib/storage/idb', () => ({
  getDB: vi.fn().mockResolvedValue(mockDB),
}));

describe('sequence generator', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export resetSequenceGenerator function', async () => {
    const { resetSequenceGenerator } = await import('$lib/storage/event-queue');
    expect(typeof resetSequenceGenerator).toBe('function');
  });

  it('should export getCurrentSequence function', async () => {
    const { getCurrentSequence } = await import('$lib/storage/event-queue');
    expect(typeof getCurrentSequence).toBe('function');
  });

  it('should increment sequence on saveEvent', async () => {
    const { saveEvent, getCurrentSequence } = await import('$lib/storage/event-queue');

    await saveEvent('test-event-1', { data: 1 });
    expect(getCurrentSequence()).toBe(1);

    await saveEvent('test-event-2', { data: 2 });
    expect(getCurrentSequence()).toBe(2);

    await saveEvent('test-event-3', { data: 3 });
    expect(getCurrentSequence()).toBe(3);
  });

  it('should reset sequence with resetSequenceGenerator', async () => {
    const { saveEvent, getCurrentSequence, resetSequenceGenerator } =
      await import('$lib/storage/event-queue');

    await saveEvent('test-event-1', { data: 1 });
    expect(getCurrentSequence()).toBe(1);

    resetSequenceGenerator();
    expect(getCurrentSequence()).toBe(0);
  });
});

describe('event-queue', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export MAX_QUEUE_SIZE constant', async () => {
    const { MAX_QUEUE_SIZE } = await import('$lib/storage/event-queue');
    expect(MAX_QUEUE_SIZE).toBe(100);
  });

  it('should export isSnapshotValid function', async () => {
    const { isSnapshotValid } = await import('$lib/storage/session');
    expect(isSnapshotValid).toBeDefined();
    expect(typeof isSnapshotValid).toBe('function');
  });

  it('should export clearStaleSnapshots function', async () => {
    const { clearStaleSnapshots } = await import('$lib/storage/session');
    expect(clearStaleSnapshots).toBeDefined();
    expect(typeof clearStaleSnapshots).toBe('function');
  });
});

describe('session validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export SCHEMA_VERSION constant', async () => {
    const { SCHEMA_VERSION } = await import('$lib/storage/session');
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('should validate snapshot with correct schema version and checksum', async () => {
    const { isSnapshotValid } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: '-32c5f2ea',
    };

    expect(isSnapshotValid(snapshot)).toBe(true);
  });

  it('should reject snapshot with wrong schema version', async () => {
    const { isSnapshotValid } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 999,
      checksum: '-32c5f2ea',
    };

    expect(isSnapshotValid(snapshot)).toBe(false);
  });

  it('should reject snapshot with wrong checksum', async () => {
    const { isSnapshotValid } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: 'wrong-checksum',
    };

    expect(isSnapshotValid(snapshot)).toBe(false);
  });
});

describe('connectivity store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export SYNC_BACKOFF_DELAYS constant', async () => {
    const { SYNC_BACKOFF_DELAYS } = await import('$lib/stores/connectivity');
    expect(SYNC_BACKOFF_DELAYS).toEqual([1000, 2000, 4000, 8000, 30000]);
  });

  it('should export MAX_RETRY_ATTEMPTS constant', async () => {
    const { MAX_RETRY_ATTEMPTS } = await import('$lib/stores/connectivity');
    expect(MAX_RETRY_ATTEMPTS).toBe(3);
  });

  it('should export cancelSync function', async () => {
    const { cancelSync } = await import('$lib/stores/connectivity');
    expect(cancelSync).toBeDefined();
    expect(typeof cancelSync).toBe('function');
  });
});

describe('sync service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export sync service functions', async () => {
    const sync = await import('$lib/game/services/sync-service');

    expect(sync.syncEvents).toBeDefined();
    expect(sync.performFullSync).toBeDefined();
    expect(sync.getQueueDepth).toBeDefined();
    expect(sync.fetchServerSnapshot).toBeDefined();
  });
});

describe('sync notifications', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export notification functions', async () => {
    const notifications = await import('$lib/game/services/sync-notifications');

    expect(notifications.showSyncCompleteNotification).toBeDefined();
    expect(notifications.showSyncFailedNotification).toBeDefined();
    expect(notifications.showOfflineNotification).toBeDefined();
    expect(notifications.showReconnectedNotification).toBeDefined();
    expect(notifications.initializeSyncNotifications).toBeDefined();
  });
});
