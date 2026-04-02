import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn((i) => `test-snapshot-id-${i}`),
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

describe('session snapshot manager', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export sessionSnapshotManager', async () => {
    const { sessionSnapshotManager } = await import('$lib/storage/session');
    expect(sessionSnapshotManager).toBeDefined();
    expect(typeof sessionSnapshotManager.saveSessionSnapshot).toBe('function');
    expect(typeof sessionSnapshotManager.getLatestSessionSnapshot).toBe('function');
    expect(typeof sessionSnapshotManager.startSessionSnapshotTimer).toBe('function');
    expect(typeof sessionSnapshotManager.stopSessionSnapshotTimer).toBe('function');
    expect(typeof sessionSnapshotManager.clearStaleSnapshots).toBe('function');
    expect(typeof sessionSnapshotManager.reset).toBe('function');
  });

  it('should save session snapshot', async () => {
    const { sessionSnapshotManager } = await import('$lib/storage/session');

    const state = { test: 'data' };
    const snapshot = await sessionSnapshotManager.saveSessionSnapshot(state);

    expect(snapshot).toBeDefined();
    expect(snapshot.id).toBeDefined();
    expect(snapshot.state).toEqual(state);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.checksum).toBeDefined();
    expect(mockDB.put).toHaveBeenCalledWith(
      'sessions',
      expect.objectContaining({
        state,
      }),
    );
  });

  it('should return cached snapshot if valid', async () => {
    const { sessionSnapshotManager } = await import('$lib/storage/session');

    const state = { test: 'cached data' };
    await sessionSnapshotManager.saveSessionSnapshot(state);

    const result = await sessionSnapshotManager.getLatestSessionSnapshot();

    expect(result).toBeDefined();
    expect(result?.state).toEqual(state);
  });

  it('should reset manager state', async () => {
    const { sessionSnapshotManager } = await import('$lib/storage/session');

    await sessionSnapshotManager.saveSessionSnapshot({ test: 'data' });
    sessionSnapshotManager.reset();

    const result = await sessionSnapshotManager.getLatestSessionSnapshot();
    expect(result).toBeNull();
  });

  it('should export deprecated functions for backwards compatibility', async () => {
    const {
      saveSessionSnapshot,
      getLatestSessionSnapshot,
      startSessionSnapshotTimer,
      stopSessionSnapshotTimer,
      clearStaleSnapshots,
    } = await import('$lib/storage/session');

    expect(typeof saveSessionSnapshot).toBe('function');
    expect(typeof getLatestSessionSnapshot).toBe('function');
    expect(typeof startSessionSnapshotTimer).toBe('function');
    expect(typeof stopSessionSnapshotTimer).toBe('function');
    expect(typeof clearStaleSnapshots).toBe('function');
  });
});
