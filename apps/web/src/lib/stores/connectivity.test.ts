import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/environment', () => ({
  browser: true,
  dev: false,
}));

vi.mock('$lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('connectivity manager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export connectivity manager', async () => {
    const { connectivityManager } = await import('$lib/stores/connectivity');
    expect(connectivityManager).toBeDefined();
    expect(typeof connectivityManager.setSyncCallback).toBe('function');
    expect(typeof connectivityManager.triggerSync).toBe('function');
    expect(typeof connectivityManager.cancelSync).toBe('function');
    expect(typeof connectivityManager.destroy).toBe('function');
  });

  it('should export setSyncCallback function', async () => {
    const { setSyncCallback } = await import('$lib/stores/connectivity');
    expect(typeof setSyncCallback).toBe('function');
  });

  it('should export connectivityStore', async () => {
    const { connectivityStore } = await import('$lib/stores/connectivity');
    const state = get(connectivityStore);
    expect(state).toBeDefined();
    expect(typeof state.online).toBe('boolean');
  });

  it('should reset retry count on triggerSync when online', async () => {
    const { connectivityManager, connectivityStore } = await import('$lib/stores/connectivity');

    connectivityStore.update((s) => ({ ...s, online: true, syncInProgress: false }));

    let callbackInvoked = false;
    connectivityManager.setSyncCallback(async () => {
      callbackInvoked = true;
    });

    await connectivityManager.triggerSync();

    expect(callbackInvoked).toBe(true);

    const state = get(connectivityStore);
    expect(state.retryCount).toBe(0);

    connectivityManager.destroy();
  });

  it('should cancel sync and reset state', async () => {
    const { connectivityManager, connectivityStore } = await import('$lib/stores/connectivity');

    connectivityStore.update((s) => ({ ...s, syncInProgress: true, retryCount: 2 }));

    connectivityManager.cancelSync();

    const state = get(connectivityStore);
    expect(state.syncInProgress).toBe(false);
    expect(state.retryCount).toBe(0);
    expect(state.syncError).toBe(null);

    connectivityManager.destroy();
  });

  it('should clean up resources on destroy', async () => {
    const { connectivityManager } = await import('$lib/stores/connectivity');

    let callbackInvoked = false;
    connectivityManager.setSyncCallback(async () => {
      callbackInvoked = true;
    });

    connectivityManager.destroy();

    expect(callbackInvoked).toBe(false);
  });
});
