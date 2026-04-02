import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn(() => 'test-engine-id'),
}));

vi.mock('$lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('$lib/storage/session', () => ({
  getLatestSessionSnapshot: vi.fn().mockResolvedValue(null),
  saveSessionSnapshot: vi.fn().mockResolvedValue({
    id: 'test-snapshot-id',
    state: {},
    timestamp: Date.now(),
    schemaVersion: 1,
    checksum: 'test-checksum',
  }),
}));

vi.mock('$lib/storage/event-queue', () => ({
  saveEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('$lib/game/services/sync-service', () => ({
  performFullSync: vi.fn().mockResolvedValue({
    success: true,
    syncedEvents: 0,
  }),
}));

describe('offline engine', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export resetOfflineEngine function', async () => {
    const { resetOfflineEngine } = await import('$lib/game/services/offline-engine');
    expect(typeof resetOfflineEngine).toBe('function');
  });

  it('should export createOfflineEngine function', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');
    expect(typeof createOfflineEngine).toBe('function');
    const engine = createOfflineEngine();
    expect(engine).toBeDefined();
  });

  it('should create new engine instance with createOfflineEngine', async () => {
    const { createOfflineEngine } = await import('$lib/game/services/offline-engine');

    const engine1 = createOfflineEngine({ emailsPerDay: 5 });
    const engine2 = createOfflineEngine({ emailsPerDay: 10 });

    expect(engine1).not.toBe(engine2);
  });

  it('should reset engine with resetOfflineEngine', async () => {
    const { getOfflineEngine, resetOfflineEngine } =
      await import('$lib/game/services/offline-engine');

    const engine1 = getOfflineEngine();
    resetOfflineEngine();
    const engine2 = getOfflineEngine();

    expect(engine1).not.toBe(engine2);
  });
});
