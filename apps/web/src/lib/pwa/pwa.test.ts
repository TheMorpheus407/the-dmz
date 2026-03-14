import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/stores/connectivity', () => ({
  updatePendingEvents: vi.fn(),
  getUnsyncedEvents: vi.fn().mockResolvedValue([]),
}));

describe('pwa/index', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export initializePWA function', async () => {
    const { initializePWA } = await import('$lib/pwa');
    expect(initializePWA).toBeDefined();
    expect(typeof initializePWA).toBe('function');
  });

  it('should export getPWAState function', async () => {
    const { getPWAState } = await import('$lib/pwa');
    expect(getPWAState).toBeDefined();
    expect(typeof getPWAState).toBe('function');
  });

  it('should export handleServiceWorkerUpdate function', async () => {
    const { handleServiceWorkerUpdate } = await import('$lib/pwa');
    expect(handleServiceWorkerUpdate).toBeDefined();
    expect(typeof handleServiceWorkerUpdate).toBe('function');
  });

  it('should export clearOldData function', async () => {
    const { clearOldData } = await import('$lib/pwa');
    expect(clearOldData).toBeDefined();
    expect(typeof clearOldData).toBe('function');
  });

  it('should export getCacheStatus function', async () => {
    const { getCacheStatus } = await import('$lib/pwa');
    expect(getCacheStatus).toBeDefined();
    expect(typeof getCacheStatus).toBe('function');
  });

  it('should export push notification functions', async () => {
    const { isPushSupported, subscribeToPush, unsubscribeFromPush } = await import('$lib/pwa');
    expect(isPushSupported).toBeDefined();
    expect(typeof isPushSupported).toBe('function');
    expect(subscribeToPush).toBeDefined();
    expect(typeof subscribeToPush).toBe('function');
    expect(unsubscribeFromPush).toBeDefined();
    expect(typeof unsubscribeFromPush).toBe('function');
  });

  it('should return initial PWA state', async () => {
    const { getPWAState } = await import('$lib/pwa');
    const state = getPWAState();
    expect(state.installed).toBe(false);
    expect(state.updateAvailable).toBe(false);
    expect(state.updateVersion).toBeNull();
  });
});
