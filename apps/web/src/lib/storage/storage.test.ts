import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

let generateIdCallCount = 0;
const generateIdMock = () => {
  generateIdCallCount++;
  return `test-id-${generateIdCallCount}`;
};
const resetGenerateIdCounter = () => {
  generateIdCallCount = 0;
};

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn(generateIdMock),
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
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    done: vi.fn().mockResolvedValue(undefined),
  }),
  getAll: vi.fn().mockResolvedValue([]),
  getAllFromIndex: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
};

vi.mock('$lib/storage/idb', () => ({
  getDB: vi.fn().mockResolvedValue(mockDB),
}));

describe('storage/idb', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetGenerateIdCounter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export getDB function', async () => {
    const { getDB } = await import('$lib/storage/idb');
    expect(getDB).toBeDefined();
    expect(typeof getDB).toBe('function');
  });

  it('should export clearDB function', async () => {
    const { clearDB } = await import('$lib/storage/idb');
    expect(clearDB).toBeDefined();
    expect(typeof clearDB).toBe('function');
  });

  it('should export getStorageUsage function', async () => {
    const { getStorageUsage } = await import('$lib/storage/idb');
    expect(getStorageUsage).toBeDefined();
    expect(typeof getStorageUsage).toBe('function');
  });

  it('should export MAX_IDB_STORAGE_MB constant', async () => {
    const { MAX_IDB_STORAGE_MB } = await import('$lib/storage/idb');
    expect(MAX_IDB_STORAGE_MB).toBe(100);
  });

  it('should return storage usage when navigator.storage.estimate is available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 1024 * 1024 * 50, quota: 100 * 1024 * 1024 }),
      },
      configurable: true,
    });

    const { getStorageUsage } = await import('$lib/storage/idb');
    const result = await getStorageUsage();

    expect(result.used).toBe(1024 * 1024 * 50);
    expect(result.quota).toBe(100 * 1024 * 1024);
  });

  it('should return zero usage when navigator.storage.estimate is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: undefined },
      configurable: true,
    });

    const { getStorageUsage } = await import('$lib/storage/idb');
    const result = await getStorageUsage();

    expect(result.used).toBe(0);
    expect(result.quota).toBe(0);
  });
});

describe('storage/event-queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetGenerateIdCounter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export saveEvent function', async () => {
    const { saveEvent } = await import('$lib/storage/event-queue');
    expect(saveEvent).toBeDefined();
    expect(typeof saveEvent).toBe('function');
  });

  it('should export getEvents function', async () => {
    const { getEvents } = await import('$lib/storage/event-queue');
    expect(getEvents).toBeDefined();
    expect(typeof getEvents).toBe('function');
  });

  it('should export getUnsyncedEvents function', async () => {
    const { getUnsyncedEvents } = await import('$lib/storage/event-queue');
    expect(getUnsyncedEvents).toBeDefined();
    expect(typeof getUnsyncedEvents).toBe('function');
  });

  it('should export markEventSynced function', async () => {
    const { markEventSynced } = await import('$lib/storage/event-queue');
    expect(markEventSynced).toBeDefined();
    expect(typeof markEventSynced).toBe('function');
  });

  it('should export clearOldEvents function', async () => {
    const { clearOldEvents } = await import('$lib/storage/event-queue');
    expect(clearOldEvents).toBeDefined();
    expect(typeof clearOldEvents).toBe('function');
  });

  it('should export resetSequenceGenerator function', async () => {
    const { resetSequenceGenerator } = await import('$lib/storage/event-queue');
    expect(resetSequenceGenerator).toBeDefined();
    expect(typeof resetSequenceGenerator).toBe('function');
  });

  it('should export getCurrentSequence function', async () => {
    const { getCurrentSequence } = await import('$lib/storage/event-queue');
    expect(getCurrentSequence).toBeDefined();
    expect(typeof getCurrentSequence).toBe('function');
  });

  it('should save event with correct structure', async () => {
    const { saveEvent } = await import('$lib/storage/event-queue');
    const event = await saveEvent('test-type', { data: 'test' });

    expect(event.id).toBe('test-id-1');
    expect(event.type).toBe('test-type');
    expect(event.payload).toEqual({ data: 'test' });
    expect(event.synced).toBe(false);
    expect(event.clientSequenceId).toBe(1);
    expect(mockDB.add).toHaveBeenCalledWith(
      'events',
      expect.objectContaining({
        type: 'test-type',
        synced: false,
      }),
    );
  });

  it('should increment sequence on each saveEvent', async () => {
    const { saveEvent, getCurrentSequence, resetSequenceGenerator } =
      await import('$lib/storage/event-queue');

    resetSequenceGenerator();
    expect(getCurrentSequence()).toBe(0);

    await saveEvent('event-1', { n: 1 });
    expect(getCurrentSequence()).toBe(1);

    await saveEvent('event-2', { n: 2 });
    expect(getCurrentSequence()).toBe(2);

    await saveEvent('event-3', { n: 3 });
    expect(getCurrentSequence()).toBe(3);
  });

  it('should reset sequence with resetSequenceGenerator', async () => {
    const { saveEvent, getCurrentSequence, resetSequenceGenerator } =
      await import('$lib/storage/event-queue');

    await saveEvent('event-1', { n: 1 });
    expect(getCurrentSequence()).toBe(1);

    resetSequenceGenerator();
    expect(getCurrentSequence()).toBe(0);
  });

  it('should get unsynced events', async () => {
    const mockEvents = [
      { id: '1', type: 'a', payload: {}, timestamp: 1000, clientSequenceId: 1, synced: false },
      { id: '2', type: 'b', payload: {}, timestamp: 2000, clientSequenceId: 2, synced: false },
    ];

    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(mockEvents),
        }),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { getUnsyncedEvents } = await import('$lib/storage/event-queue');
    const events = await getUnsyncedEvents();

    expect(events).toHaveLength(2);
    expect(events[0]!.synced).toBe(false);
  });

  it('should mark event as synced', async () => {
    const mockEvent = {
      id: 'test-id',
      type: 'test',
      payload: {},
      timestamp: 1000,
      clientSequenceId: 1,
      synced: false,
    };
    mockDB.get.mockResolvedValue(mockEvent);

    const { markEventSynced } = await import('$lib/storage/event-queue');
    await markEventSynced('test-id');

    expect(mockDB.put).toHaveBeenCalledWith(
      'events',
      expect.objectContaining({
        id: 'test-id',
        synced: true,
      }),
    );
  });

  it('should not delete unsynced events even if old', async () => {
    const oldUnsyncedEvent = {
      id: 'unsynced-old',
      type: 'test',
      payload: {},
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      clientSequenceId: 1,
      synced: false,
    };

    mockDB.getAllFromIndex.mockResolvedValue([oldUnsyncedEvent]);

    const { clearOldEvents } = await import('$lib/storage/event-queue');
    const deletedCount = await clearOldEvents();

    expect(deletedCount).toBe(0);
    expect(mockDB.delete).not.toHaveBeenCalled();
  });

  it('should delete synced events that are old', async () => {
    const oldSyncedEvent = {
      id: 'synced-old',
      type: 'test',
      payload: {},
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      clientSequenceId: 1,
      synced: true,
    };

    mockDB.getAllFromIndex.mockResolvedValue([oldSyncedEvent]);

    const { clearOldEvents } = await import('$lib/storage/event-queue');
    const deletedCount = await clearOldEvents();

    expect(deletedCount).toBe(1);
    expect(mockDB.delete).toHaveBeenCalledWith('events', 'synced-old');
  });

  it('should respect MAX_QUEUE_SIZE when queue overflows', async () => {
    const existingEvents = Array.from({ length: 100 }, (_, i) => ({
      id: `event-${i}`,
      type: 'existing',
      payload: {},
      timestamp: Date.now() - i * 1000,
      clientSequenceId: i + 1,
      synced: false,
    }));

    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(existingEvents),
        }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { saveEvent, resetSequenceGenerator } = await import('$lib/storage/event-queue');
    resetSequenceGenerator();

    await saveEvent('new-event', { data: 'new' });

    const deleteMock = mockDB.transaction().store.delete;
    expect(deleteMock).toHaveBeenCalled();
  });

  it('should delete oldest events first when queue overflows', async () => {
    const existingEvents = [
      {
        id: 'event-1',
        type: 'old',
        payload: {},
        timestamp: 1000,
        clientSequenceId: 1,
        synced: false,
      },
      {
        id: 'event-2',
        type: 'old',
        payload: {},
        timestamp: 2000,
        clientSequenceId: 2,
        synced: false,
      },
      {
        id: 'event-3',
        type: 'old',
        payload: {},
        timestamp: 3000,
        clientSequenceId: 3,
        synced: false,
      },
    ];

    const deleteMock = vi.fn().mockResolvedValue(undefined);

    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(existingEvents),
        }),
        delete: deleteMock,
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { saveEvent, resetSequenceGenerator } = await import('$lib/storage/event-queue');
    resetSequenceGenerator();

    await saveEvent('overflow-event', { data: 'test' });

    expect(deleteMock).toHaveBeenCalled();
    const deletedIds = deleteMock.mock.calls.map(([id]) => id);
    expect(deletedIds[0]).toBe('event-1');
    expect(deletedIds).toContain('event-1');
  });

  it('should export MAX_QUEUE_SIZE constant', async () => {
    const { MAX_QUEUE_SIZE } = await import('$lib/storage/event-queue');
    expect(MAX_QUEUE_SIZE).toBe(100);
  });

  it('should export markEventsSynced function', async () => {
    const { markEventsSynced } = await import('$lib/storage/event-queue');
    expect(markEventsSynced).toBeDefined();
    expect(typeof markEventsSynced).toBe('function');
  });

  it('should export deleteEvent function', async () => {
    const { deleteEvent } = await import('$lib/storage/event-queue');
    expect(deleteEvent).toBeDefined();
    expect(typeof deleteEvent).toBe('function');
  });

  it('should export getEventCount function', async () => {
    const { getEventCount } = await import('$lib/storage/event-queue');
    expect(getEventCount).toBeDefined();
    expect(typeof getEventCount).toBe('function');
  });

  it('should return correct event counts', async () => {
    mockDB.getAll.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue([{ id: '1' }]),
        }),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { getEventCount } = await import('$lib/storage/event-queue');
    const counts = await getEventCount();

    expect(counts.total).toBe(2);
    expect(counts.unsynced).toBe(1);
  });

  it('should get all events when includeSynced is true', async () => {
    const allEvents = [
      { id: '1', type: 'a', payload: {}, timestamp: 1000, clientSequenceId: 1, synced: true },
      { id: '2', type: 'b', payload: {}, timestamp: 2000, clientSequenceId: 2, synced: false },
    ];
    mockDB.getAllFromIndex.mockResolvedValue(allEvents);

    const { getEvents } = await import('$lib/storage/event-queue');
    const events = await getEvents(true);

    expect(events).toHaveLength(2);
    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('events', 'by-timestamp');
  });

  it('should get only unsynced events when includeSynced is false', async () => {
    const unsyncedEvents = [
      { id: '2', type: 'b', payload: {}, timestamp: 2000, clientSequenceId: 2, synced: false },
    ];
    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(unsyncedEvents),
        }),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { getEvents } = await import('$lib/storage/event-queue');
    const events = await getEvents(false);

    expect(events).toHaveLength(1);
    expect(events[0]!.synced).toBe(false);
  });

  it('should mark multiple events as synced', async () => {
    const mockTx = {
      store: {
        get: vi.fn().mockResolvedValue({ id: '1', synced: false }),
        put: vi.fn().mockResolvedValue(undefined),
      },
      done: vi.fn().mockResolvedValue(undefined),
    };
    mockDB.transaction.mockResolvedValue(mockTx);

    const { markEventsSynced } = await import('$lib/storage/event-queue');
    await markEventsSynced(['1', '2']);

    expect(mockTx.store.get).toHaveBeenCalledWith('1');
    expect(mockTx.store.get).toHaveBeenCalledWith('2');
    expect(mockTx.store.put).toHaveBeenCalledTimes(2);
  });

  it('should delete event by id', async () => {
    const { deleteEvent } = await import('$lib/storage/event-queue');
    await deleteEvent('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('events', 'test-id');
  });
});

describe('storage/session', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetGenerateIdCounter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export saveSessionSnapshot function', async () => {
    const { saveSessionSnapshot } = await import('$lib/storage/session');
    expect(saveSessionSnapshot).toBeDefined();
    expect(typeof saveSessionSnapshot).toBe('function');
  });

  it('should export getLatestSessionSnapshot function', async () => {
    const { getLatestSessionSnapshot } = await import('$lib/storage/session');
    expect(getLatestSessionSnapshot).toBeDefined();
    expect(typeof getLatestSessionSnapshot).toBe('function');
  });

  it('should export SESSION_SNAPSHOT_INTERVAL_MS constant', async () => {
    const { SESSION_SNAPSHOT_INTERVAL_MS } = await import('$lib/storage/session');
    expect(SESSION_SNAPSHOT_INTERVAL_MS).toBe(30000);
  });

  it('should export startSessionSnapshotTimer function', async () => {
    const { startSessionSnapshotTimer } = await import('$lib/storage/session');
    expect(startSessionSnapshotTimer).toBeDefined();
    expect(typeof startSessionSnapshotTimer).toBe('function');
  });

  it('should export stopSessionSnapshotTimer function', async () => {
    const { stopSessionSnapshotTimer } = await import('$lib/storage/session');
    expect(stopSessionSnapshotTimer).toBeDefined();
    expect(typeof stopSessionSnapshotTimer).toBe('function');
  });

  it('should save session snapshot with checksum', async () => {
    const { saveSessionSnapshot } = await import('$lib/storage/session');
    const state = { day: 1, phase: 'morning' };
    const snapshot = await saveSessionSnapshot(state);

    expect(snapshot).toBeDefined();
    expect(snapshot.id).toBe('test-id-1');
    expect(snapshot.state).toEqual(state);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.checksum).toBeDefined();
    expect(typeof snapshot.checksum).toBe('string');
    expect(mockDB.put).toHaveBeenCalledWith(
      'sessions',
      expect.objectContaining({
        state,
      }),
    );
  });

  it('should validate snapshot with correct schema version and checksum', async () => {
    const { isSnapshotValid, computeChecksum } = await import('$lib/storage/session');

    const state = { test: 'data' };
    const snapshot = {
      id: 'test-id',
      state,
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: computeChecksum(state),
    };

    expect(isSnapshotValid(snapshot)).toBe(true);
  });

  it('should reject snapshot with wrong schema version', async () => {
    const { isSnapshotValid, computeChecksum } = await import('$lib/storage/session');

    const state = { test: 'data' };
    const snapshot = {
      id: 'test-id',
      state,
      timestamp: Date.now(),
      schemaVersion: 999,
      checksum: computeChecksum(state),
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

  it('should export SCHEMA_VERSION constant', async () => {
    const { SCHEMA_VERSION } = await import('$lib/storage/session');
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('should export sessionSnapshotManager', async () => {
    const { sessionSnapshotManager } = await import('$lib/storage/session');
    expect(sessionSnapshotManager).toBeDefined();
    expect(typeof sessionSnapshotManager.saveSessionSnapshot).toBe('function');
    expect(typeof sessionSnapshotManager.getLatestSessionSnapshot).toBe('function');
  });

  it('should export deleteSessionSnapshot function', async () => {
    const { deleteSessionSnapshot } = await import('$lib/storage/session');
    expect(deleteSessionSnapshot).toBeDefined();
    expect(typeof deleteSessionSnapshot).toBe('function');
  });

  it('should export clearOldSnapshots function', async () => {
    const { clearOldSnapshots } = await import('$lib/storage/session');
    expect(clearOldSnapshots).toBeDefined();
    expect(typeof clearOldSnapshots).toBe('function');
  });

  it('should delete session snapshot by id', async () => {
    const { deleteSessionSnapshot } = await import('$lib/storage/session');
    await deleteSessionSnapshot('test-snapshot-id');

    expect(mockDB.delete).toHaveBeenCalledWith('sessions', 'test-snapshot-id');
  });

  it('should clear old snapshots keeping specified count', async () => {
    const oldSnapshots = [
      { id: 'snap-1', state: {}, timestamp: 1000, schemaVersion: 1, checksum: 'a' },
      { id: 'snap-2', state: {}, timestamp: 2000, schemaVersion: 1, checksum: 'b' },
      { id: 'snap-3', state: {}, timestamp: 3000, schemaVersion: 1, checksum: 'c' },
    ];

    mockDB.getAllFromIndex.mockResolvedValue(oldSnapshots);

    const { clearOldSnapshots } = await import('$lib/storage/session');
    const deletedCount = await clearOldSnapshots(2);

    expect(deletedCount).toBe(1);
  });

  it('should return 0 when not enough snapshots to clear', async () => {
    const snapshots = [
      { id: 'snap-1', state: {}, timestamp: 3000, schemaVersion: 1, checksum: 'a' },
    ];

    mockDB.getAllFromIndex.mockResolvedValue(snapshots);

    const { clearOldSnapshots } = await import('$lib/storage/session');
    const deletedCount = await clearOldSnapshots(10);

    expect(deletedCount).toBe(0);
  });

  it('should get latest session snapshot from cache', async () => {
    const { saveSessionSnapshot, getLatestSessionSnapshot } = await import('$lib/storage/session');
    const state = { day: 2, phase: 'afternoon' };
    const snapshot = await saveSessionSnapshot(state);

    const latest = await getLatestSessionSnapshot();
    expect(latest).toBeDefined();
    expect(latest?.id).toBe(snapshot.id);
    expect(latest?.state).toEqual(state);
  });

  it('should get session snapshot by id', async () => {
    const mockSnapshot = {
      id: 'snap-123',
      state: { day: 1 },
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: 'abc',
    };
    mockDB.get.mockResolvedValue(mockSnapshot);

    const { getSessionSnapshot } = await import('$lib/storage/session');
    const snapshot = await getSessionSnapshot('snap-123');

    expect(snapshot).toBeDefined();
    expect(snapshot?.id).toBe('snap-123');
    expect(mockDB.get).toHaveBeenCalledWith('sessions', 'snap-123');
  });

  it('should get all session snapshots', async () => {
    const snapshots = [
      { id: 'snap-1', state: {}, timestamp: 1000, schemaVersion: 1, checksum: 'a' },
      { id: 'snap-2', state: {}, timestamp: 2000, schemaVersion: 1, checksum: 'b' },
    ];
    mockDB.getAllFromIndex.mockResolvedValue(snapshots);

    const { getAllSessionSnapshots } = await import('$lib/storage/session');
    const result = await getAllSessionSnapshots();

    expect(result).toHaveLength(2);
    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('sessions', 'by-timestamp');
  });
});

describe('storage/content', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetGenerateIdCounter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export saveOfflineContent function', async () => {
    const { saveOfflineContent } = await import('$lib/storage/content');
    expect(saveOfflineContent).toBeDefined();
    expect(typeof saveOfflineContent).toBe('function');
  });

  it('should export getOfflineContent function', async () => {
    const { getOfflineContent } = await import('$lib/storage/content');
    expect(getOfflineContent).toBeDefined();
    expect(typeof getOfflineContent).toBe('function');
  });

  it('should export getAllOfflineContent function', async () => {
    const { getAllOfflineContent } = await import('$lib/storage/content');
    expect(getAllOfflineContent).toBeDefined();
    expect(typeof getAllOfflineContent).toBe('function');
  });

  it('should export DOCUMENT_TYPES array', async () => {
    const { DOCUMENT_TYPES } = await import('$lib/storage/content');
    expect(DOCUMENT_TYPES).toBeDefined();
    expect(Array.isArray(DOCUMENT_TYPES)).toBe(true);
    expect(DOCUMENT_TYPES).toContain('email');
    expect(DOCUMENT_TYPES).toContain('memo');
  });

  it('should export DIFFICULTY_TIERS array', async () => {
    const { DIFFICULTY_TIERS } = await import('$lib/storage/content');
    expect(DIFFICULTY_TIERS).toBeDefined();
    expect(Array.isArray(DIFFICULTY_TIERS)).toBe(true);
    expect(DIFFICULTY_TIERS).toContain('easy');
    expect(DIFFICULTY_TIERS).toContain('medium');
  });

  it('should save offline content with correct structure', async () => {
    const { saveOfflineContent } = await import('$lib/storage/content');
    const content = await saveOfflineContent('email', { subject: 'Test' }, 'easy');

    expect(content).toBeDefined();
    expect(content.id).toBe('test-id-1');
    expect(content.type).toBe('email');
    expect(content.data).toEqual({ subject: 'Test' });
    expect(content.difficulty).toBe('easy');
    expect(mockDB.put).toHaveBeenCalledWith(
      'offlineContent',
      expect.objectContaining({
        type: 'email',
        difficulty: 'easy',
      }),
    );
  });

  it('should get offline content by id', async () => {
    const mockContent = {
      id: 'test-id',
      type: 'memo',
      data: { text: 'Test memo' },
      difficulty: 'medium',
      createdAt: Date.now(),
    };
    mockDB.get.mockResolvedValue(mockContent);

    const { getOfflineContent } = await import('$lib/storage/content');
    const content = await getOfflineContent('test-id');

    expect(content).toBeDefined();
    expect(content?.id).toBe('test-id');
    expect(mockDB.get).toHaveBeenCalledWith('offlineContent', 'test-id');
  });

  it('should return undefined for non-existent content', async () => {
    mockDB.get.mockResolvedValue(undefined);

    const { getOfflineContent } = await import('$lib/storage/content');
    const content = await getOfflineContent('non-existent');

    expect(content).toBeUndefined();
  });

  it('should get all offline content', async () => {
    const mockContent = [
      { id: '1', type: 'email', data: {}, difficulty: 'easy', createdAt: 1000 },
      { id: '2', type: 'memo', data: {}, difficulty: 'medium', createdAt: 2000 },
    ];
    mockDB.getAll.mockResolvedValue(mockContent);

    const { getAllOfflineContent } = await import('$lib/storage/content');
    const content = await getAllOfflineContent();

    expect(content).toHaveLength(2);
    expect(mockDB.getAll).toHaveBeenCalledWith('offlineContent');
  });

  it('should get offline content by type', async () => {
    const mockContent = [
      { id: '1', type: 'email', data: {}, difficulty: 'easy', createdAt: 1000 },
      { id: '2', type: 'email', data: {}, difficulty: 'medium', createdAt: 2000 },
    ];

    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(mockContent),
        }),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { getOfflineContentByType } = await import('$lib/storage/content');
    const content = await getOfflineContentByType('email');

    expect(content).toHaveLength(2);
  });

  it('should get offline content by difficulty', async () => {
    const mockContent = [{ id: '1', type: 'email', data: {}, difficulty: 'hard', createdAt: 1000 }];

    mockDB.transaction.mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue(mockContent),
        }),
      },
      done: vi.fn().mockResolvedValue(undefined),
    });

    const { getOfflineContentByDifficulty } = await import('$lib/storage/content');
    const content = await getOfflineContentByDifficulty('hard');

    expect(content).toHaveLength(1);
    expect(content[0]!.difficulty).toBe('hard');
  });

  it('should delete offline content', async () => {
    const { deleteOfflineContent } = await import('$lib/storage/content');
    await deleteOfflineContent('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('offlineContent', 'test-id');
  });

  it('should clear all offline content', async () => {
    const { clearOfflineContent } = await import('$lib/storage/content');
    await clearOfflineContent();

    expect(mockDB.clear).toHaveBeenCalledWith('offlineContent');
  });

  it('should get offline content stats', async () => {
    const mockContent = [
      { id: '1', type: 'email', data: {}, difficulty: 'easy', createdAt: 1000 },
      { id: '2', type: 'email', data: {}, difficulty: 'medium', createdAt: 2000 },
      { id: '3', type: 'memo', data: {}, difficulty: 'hard', createdAt: 3000 },
    ];
    mockDB.getAll.mockResolvedValue(mockContent);

    const { getOfflineContentStats } = await import('$lib/storage/content');
    const stats = await getOfflineContentStats();

    expect(stats.total).toBe(3);
    expect(stats.byType.email).toBe(2);
    expect(stats.byType.memo).toBe(1);
    expect(stats.byDifficulty.easy).toBe(1);
    expect(stats.byDifficulty.medium).toBe(1);
    expect(stats.byDifficulty.hard).toBe(1);
  });

  it('should export getOfflineContentByType function', async () => {
    const { getOfflineContentByType } = await import('$lib/storage/content');
    expect(getOfflineContentByType).toBeDefined();
    expect(typeof getOfflineContentByType).toBe('function');
  });

  it('should export getOfflineContentByDifficulty function', async () => {
    const { getOfflineContentByDifficulty } = await import('$lib/storage/content');
    expect(getOfflineContentByDifficulty).toBeDefined();
    expect(typeof getOfflineContentByDifficulty).toBe('function');
  });

  it('should export deleteOfflineContent function', async () => {
    const { deleteOfflineContent } = await import('$lib/storage/content');
    expect(deleteOfflineContent).toBeDefined();
    expect(typeof deleteOfflineContent).toBe('function');
  });

  it('should export clearOfflineContent function', async () => {
    const { clearOfflineContent } = await import('$lib/storage/content');
    expect(clearOfflineContent).toBeDefined();
    expect(typeof clearOfflineContent).toBe('function');
  });

  it('should export getOfflineContentStats function', async () => {
    const { getOfflineContentStats } = await import('$lib/storage/content');
    expect(getOfflineContentStats).toBeDefined();
    expect(typeof getOfflineContentStats).toBe('function');
  });
});
