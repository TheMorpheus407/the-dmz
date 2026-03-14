import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn((i) => `test-id-${i}`),
}));

describe('event-queue', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export MAX_QUEUE_SIZE constant', async () => {
    const { MAX_QUEUE_SIZE } = await import('$lib/storage/event-queue');
    expect(MAX_QUEUE_SIZE).toBe(100);
  });

  it('should export validateSnapshot function', async () => {
    const { validateSnapshot } = await import('$lib/storage/session');
    expect(validateSnapshot).toBeDefined();
    expect(typeof validateSnapshot).toBe('function');
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
    const { validateSnapshot } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: '-32c5f2ea',
    };

    expect(validateSnapshot(snapshot)).toBe(true);
  });

  it('should reject snapshot with wrong schema version', async () => {
    const { validateSnapshot } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 999,
      checksum: '-32c5f2ea',
    };

    expect(validateSnapshot(snapshot)).toBe(false);
  });

  it('should reject snapshot with wrong checksum', async () => {
    const { validateSnapshot } = await import('$lib/storage/session');

    const snapshot = {
      id: 'test-id',
      state: { test: 'data' },
      timestamp: Date.now(),
      schemaVersion: 1,
      checksum: 'wrong-checksum',
    };

    expect(validateSnapshot(snapshot)).toBe(false);
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
