import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: () => 'test-id-123',
}));

describe('storage/idb', () => {
  beforeEach(() => {
    vi.resetModules();
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
});

describe('storage/event-queue', () => {
  beforeEach(() => {
    vi.resetModules();
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
});

describe('storage/session', () => {
  beforeEach(() => {
    vi.resetModules();
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
});

describe('storage/content', () => {
  beforeEach(() => {
    vi.resetModules();
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
});
