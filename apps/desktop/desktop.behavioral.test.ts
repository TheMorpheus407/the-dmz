import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('desktop/platform', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInvoke.mockReset().mockResolvedValue(undefined);
  });

  it('should return unknown when window is undefined', async () => {
    delete (global as Record<string, unknown>).window;
    const { detectPlatform } = await import('./src/lib/platform');
    expect(detectPlatform()).toBe('unknown');
  });

  it('should return browser when window exists without __TAURI__', async () => {
    global.window = { localStorage: {} } as typeof global.window & {
      localStorage: Record<string, unknown>;
    };
    const { detectPlatform } = await import('./src/lib/platform');
    expect(detectPlatform()).toBe('browser');
  });

  it('should return tauri when window.__TAURI__ is set', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { detectPlatform } = await import('./src/lib/platform');
    expect(detectPlatform()).toBe('tauri');
  });

  it('isTauri should return true when window.__TAURI__ is set', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { isTauri } = await import('./src/lib/platform');
    expect(isTauri()).toBe(true);
  });

  it('isBrowser should return true when in browser without __TAURI__', async () => {
    global.window = { localStorage: {} } as typeof global.window & {
      localStorage: Record<string, unknown>;
    };
    const { isBrowser } = await import('./src/lib/platform');
    expect(isBrowser()).toBe(true);
  });

  it('isTauri should return false when not in tauri environment', async () => {
    global.window = { localStorage: {} } as typeof global.window & {
      localStorage: Record<string, unknown>;
    };
    const { isTauri } = await import('./src/lib/platform');
    expect(isTauri()).toBe(false);
  });

  it('isBrowser should return false when in tauri environment', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { isBrowser } = await import('./src/lib/platform');
    expect(isBrowser()).toBe(false);
  });

  it('getCapabilities returns correct values for tauri platform', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { getCapabilities } = await import('./src/lib/platform');
    const capabilities = getCapabilities();
    expect(capabilities.localStorage).toBe(true);
    expect(capabilities.fileSystem).toBe(true);
    expect(capabilities.systemTray).toBe(true);
    expect(capabilities.steamApi).toBe(true);
    expect(capabilities.autoSave).toBe(true);
  });

  it('getCapabilities returns correct values for browser platform', async () => {
    global.window = { localStorage: {} } as typeof global.window & {
      localStorage: Record<string, unknown>;
    };
    const { getCapabilities } = await import('./src/lib/platform');
    const capabilities = getCapabilities();
    expect(capabilities.localStorage).toBe(true);
    expect(capabilities.fileSystem).toBe(false);
    expect(capabilities.systemTray).toBe(false);
    expect(capabilities.steamApi).toBe(false);
  });
});

describe('desktop/steam', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isSteamAvailable returns false when not initialized', async () => {
    const { isSteamAvailable } = await import('./src/lib/steam');
    expect(isSteamAvailable()).toBe(false);
  });

  it('initializeSteam returns false when window is undefined', async () => {
    delete (global as Record<string, unknown>).window;
    const { initializeSteam } = await import('./src/lib/steam');
    const result = await initializeSteam();
    expect(result).toBe(false);
  });

  it('initializeSteam returns false when __TAURI__ is not set', async () => {
    global.window = { localStorage: {} } as typeof global.window & {
      localStorage: Record<string, unknown>;
    };
    const { initializeSteam } = await import('./src/lib/steam');
    const result = await initializeSteam();
    expect(result).toBe(false);
  });

  it('initializeSteam returns true when in tauri environment', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { initializeSteam, isSteamAvailable } = await import('./src/lib/steam');
    const result = await initializeSteam();
    expect(result).toBe(true);
    expect(isSteamAvailable()).toBe(true);
  });

  it('getCurrentUser returns null when not initialized', async () => {
    const { getCurrentUser } = await import('./src/lib/steam');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('unlockAchievement returns false when not initialized', async () => {
    const { unlockAchievement } = await import('./src/lib/steam');
    const result = await unlockAchievement('FIRST_EMAIL');
    expect(result).toBe(false);
  });

  it('getAchievements returns empty array when not initialized', async () => {
    const { getAchievements } = await import('./src/lib/steam');
    const achievements = await getAchievements();
    expect(achievements).toEqual([]);
  });

  it('clearAchievement returns false when not initialized', async () => {
    const { clearAchievement } = await import('./src/lib/steam');
    const result = await clearAchievement('FIRST_EMAIL');
    expect(result).toBe(false);
  });

  it('unlockAchievement returns true when initialized', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { initializeSteam, unlockAchievement } = await import('./src/lib/steam');
    await initializeSteam();
    const result = await unlockAchievement('FIRST_EMAIL');
    expect(result).toBe(true);
  });

  it('getAchievements returns array when initialized', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { initializeSteam, getAchievements } = await import('./src/lib/steam');
    await initializeSteam();
    const achievements = await getAchievements();
    expect(Array.isArray(achievements)).toBe(true);
  });

  it('clearAchievement returns true when initialized', async () => {
    global.window = { __TAURI__: {} } as typeof global.window & {
      __TAURI__: Record<string, unknown>;
    };
    const { initializeSteam, clearAchievement } = await import('./src/lib/steam');
    await initializeSteam();
    const result = await clearAchievement('FIRST_EMAIL');
    expect(result).toBe(true);
  });
});

describe('desktop/save - invoke mocking', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInvoke.mockReset().mockResolvedValue(undefined);
  });

  it('saveGame calls invoke with correct arguments', async () => {
    const mockSaveSlot = {
      slotId: 1,
      save: {
        version: '1.0',
        timestamp: 123,
        sessionId: 'sess1',
        dayNumber: 1,
        phase: 'morning',
        snapshot: {},
        events: [],
        checksum: 'abc',
      },
      metadata: {
        slotId: 1,
        sessionId: 'sess1',
        dayNumber: 1,
        phase: 'morning',
        timestamp: 123,
        playTimeSeconds: 0,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const { saveGame } = await import('./src/lib/save');
    const result = await saveGame('session-123', 5, 'evening', { test: 'snapshot' }, [], 1);

    expect(mockInvoke).toHaveBeenCalledWith('save_game', {
      sessionId: 'session-123',
      dayNumber: 5,
      phase: 'evening',
      snapshot: { test: 'snapshot' },
      events: [],
      slotId: 1,
    });
    expect(result).toEqual(mockSaveSlot);
  });

  it('loadGame calls invoke with correct slotId', async () => {
    const mockSaveSlot = {
      slotId: 2,
      save: {
        version: '1.0',
        timestamp: 456,
        sessionId: 'sess2',
        dayNumber: 3,
        phase: 'afternoon',
        snapshot: {},
        events: [],
        checksum: 'def',
      },
      metadata: {
        slotId: 2,
        sessionId: 'sess2',
        dayNumber: 3,
        phase: 'afternoon',
        timestamp: 456,
        playTimeSeconds: 100,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const { loadGame } = await import('./src/lib/save');
    const result = await loadGame(2);

    expect(mockInvoke).toHaveBeenCalledWith('load_game', { slotId: 2 });
    expect(result).toEqual(mockSaveSlot);
  });

  it('listSaveSlots calls invoke without arguments', async () => {
    const mockSlots = [
      {
        slotId: 0,
        save: null,
        metadata: {
          slotId: 0,
          sessionId: '',
          dayNumber: 0,
          phase: '',
          timestamp: 0,
          playTimeSeconds: 0,
          screenshotPath: null,
        },
      },
      {
        slotId: 1,
        save: {
          version: '1.0',
          timestamp: 123,
          sessionId: 'sess1',
          dayNumber: 1,
          phase: 'morning',
          snapshot: {},
          events: [],
          checksum: 'abc',
        },
        metadata: {
          slotId: 1,
          sessionId: 'sess1',
          dayNumber: 1,
          phase: 'morning',
          timestamp: 123,
          playTimeSeconds: 0,
          screenshotPath: null,
        },
      },
    ];
    mockInvoke.mockResolvedValue(mockSlots);

    const { listSaveSlots } = await import('./src/lib/save');
    const result = await listSaveSlots();

    expect(mockInvoke).toHaveBeenCalledWith('list_save_slots');
    expect(result).toEqual(mockSlots);
  });

  it('deleteSave calls invoke with correct slotId', async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { deleteSave } = await import('./src/lib/save');
    await deleteSave(3);

    expect(mockInvoke).toHaveBeenCalledWith('delete_save', { slotId: 3 });
  });

  it('exportSave calls invoke with slotId and path', async () => {
    mockInvoke.mockResolvedValue('/path/to/exported.save');

    const { exportSave } = await import('./src/lib/save');
    const result = await exportSave(1, '/path/to/export.save');

    expect(mockInvoke).toHaveBeenCalledWith('export_save', {
      slotId: 1,
      path: '/path/to/export.save',
    });
    expect(result).toEqual('/path/to/exported.save');
  });

  it('importSave calls invoke with path and slotId', async () => {
    const mockSaveSlot = {
      slotId: 5,
      save: {
        version: '1.0',
        timestamp: 789,
        sessionId: 'sess5',
        dayNumber: 7,
        phase: 'night',
        snapshot: {},
        events: [],
        checksum: 'ghi',
      },
      metadata: {
        slotId: 5,
        sessionId: 'sess5',
        dayNumber: 7,
        phase: 'night',
        timestamp: 789,
        playTimeSeconds: 500,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const { importSave } = await import('./src/lib/save');
    const result = await importSave('/path/to/import.save', 5);

    expect(mockInvoke).toHaveBeenCalledWith('import_save', {
      path: '/path/to/import.save',
      slotId: 5,
    });
    expect(result).toEqual(mockSaveSlot);
  });

  it('getWindowState calls invoke and returns window state', async () => {
    const mockWindowState = {
      width: 1920,
      height: 1080,
      x: 0,
      y: 0,
      maximized: true,
      fullscreen: false,
    };
    mockInvoke.mockResolvedValue(mockWindowState);

    const { getWindowState } = await import('./src/lib/save');
    const result = await getWindowState();

    expect(mockInvoke).toHaveBeenCalledWith('get_window_state');
    expect(result).toEqual(mockWindowState);
  });

  it('setFullscreen calls invoke with fullscreen boolean true', async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { setFullscreen } = await import('./src/lib/save');
    await setFullscreen(true);

    expect(mockInvoke).toHaveBeenCalledWith('set_fullscreen', { fullscreen: true });
  });

  it('setFullscreen calls invoke with fullscreen boolean false', async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { setFullscreen } = await import('./src/lib/save');
    await setFullscreen(false);

    expect(mockInvoke).toHaveBeenCalledWith('set_fullscreen', { fullscreen: false });
  });

  it('minimizeToTray calls invoke without arguments', async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { minimizeToTray } = await import('./src/lib/save');
    await minimizeToTray();

    expect(mockInvoke).toHaveBeenCalledWith('minimize_to_tray');
  });
});

describe('desktop/save - auto-save behavior', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockInvoke.mockReset().mockResolvedValue(undefined);
    const { configureAutoSave } = await import('./src/lib/save');
    configureAutoSave({
      enabled: true,
      slotId: 0,
      onSaveComplete: undefined,
      onSaveError: undefined,
    });
  });

  it('autoSaveAtEndOfDay returns null when auto-save is disabled', async () => {
    const { configureAutoSave, autoSaveAtEndOfDay } = await import('./src/lib/save');
    configureAutoSave({ enabled: false });

    const result = await autoSaveAtEndOfDay('session', 1, 'morning', {}, []);

    expect(result).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('autoSaveAtEndOfDay calls saveGame with correct arguments when enabled', async () => {
    const mockSaveSlot = {
      slotId: 0,
      save: {
        version: '1.0',
        timestamp: 123,
        sessionId: 'sess',
        dayNumber: 1,
        phase: 'morning',
        snapshot: {},
        events: [],
        checksum: 'abc',
      },
      metadata: {
        slotId: 0,
        sessionId: 'sess',
        dayNumber: 1,
        phase: 'morning',
        timestamp: 123,
        playTimeSeconds: 0,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const { autoSaveAtEndOfDay } = await import('./src/lib/save');
    const result = await autoSaveAtEndOfDay('session-xyz', 3, 'afternoon', { data: 'snapshot' }, [
      { type: 'event' },
    ]);

    expect(mockInvoke).toHaveBeenCalledWith('save_game', {
      sessionId: 'session-xyz',
      dayNumber: 3,
      phase: 'afternoon',
      snapshot: { data: 'snapshot' },
      events: [{ type: 'event' }],
      slotId: 0,
    });
    expect(result).toEqual(mockSaveSlot);
  });

  it('autoSaveAtEndOfDay calls onSaveComplete callback on success', async () => {
    const mockSaveSlot = {
      slotId: 0,
      save: {
        version: '1.0',
        timestamp: 123,
        sessionId: 'sess',
        dayNumber: 1,
        phase: 'morning',
        snapshot: {},
        events: [],
        checksum: 'abc',
      },
      metadata: {
        slotId: 0,
        sessionId: 'sess',
        dayNumber: 1,
        phase: 'morning',
        timestamp: 123,
        playTimeSeconds: 0,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const callback = vi.fn();
    const { configureAutoSave, autoSaveAtEndOfDay } = await import('./src/lib/save');
    configureAutoSave({ onSaveComplete: callback });

    await autoSaveAtEndOfDay('session', 1, 'morning', {}, []);

    expect(callback).toHaveBeenCalledWith(mockSaveSlot);
  });

  it('autoSaveAtEndOfDay calls onSaveError callback on failure', async () => {
    const error = new Error('Save failed');
    mockInvoke.mockRejectedValue(error);

    const errorCallback = vi.fn();
    const { configureAutoSave, autoSaveAtEndOfDay } = await import('./src/lib/save');
    configureAutoSave({ onSaveError: errorCallback });

    const result = await autoSaveAtEndOfDay('session', 1, 'morning', {}, []);

    expect(result).toBeNull();
    expect(errorCallback).toHaveBeenCalledWith(error);
  });

  it('autoSaveAtEndOfDay uses configured slotId', async () => {
    mockInvoke.mockResolvedValue({
      slotId: 5,
      save: null,
      metadata: {
        slotId: 5,
        sessionId: '',
        dayNumber: 0,
        phase: '',
        timestamp: 0,
        playTimeSeconds: 0,
        screenshotPath: null,
      },
    });

    const { configureAutoSave, autoSaveAtEndOfDay } = await import('./src/lib/save');
    configureAutoSave({ slotId: 5 });

    await autoSaveAtEndOfDay('session', 1, 'morning', {}, []);

    expect(mockInvoke).toHaveBeenCalledWith('save_game', expect.objectContaining({ slotId: 5 }));
  });

  it('getAutoSaveSlot calls loadGame with configured slotId', async () => {
    const mockSaveSlot = {
      slotId: 3,
      save: null,
      metadata: {
        slotId: 3,
        sessionId: '',
        dayNumber: 0,
        phase: '',
        timestamp: 0,
        playTimeSeconds: 0,
        screenshotPath: null,
      },
    };
    mockInvoke.mockResolvedValue(mockSaveSlot);

    const { configureAutoSave, getAutoSaveSlot } = await import('./src/lib/save');
    configureAutoSave({ slotId: 3 });

    const result = await getAutoSaveSlot();

    expect(mockInvoke).toHaveBeenCalledWith('load_game', { slotId: 3 });
    expect(result).toEqual(mockSaveSlot);
  });

  it('configureAutoSave updates the enabled flag', async () => {
    const { configureAutoSave, getAutoSaveConfig } = await import('./src/lib/save');
    configureAutoSave({ enabled: false });
    expect(getAutoSaveConfig().enabled).toBe(false);
    configureAutoSave({ enabled: true });
    expect(getAutoSaveConfig().enabled).toBe(true);
  });

  it('configureAutoSave updates the slotId', async () => {
    const { configureAutoSave, getAutoSaveConfig } = await import('./src/lib/save');
    configureAutoSave({ slotId: 10 });
    expect(getAutoSaveConfig().slotId).toBe(10);
  });

  it('getAutoSaveConfig returns a copy of the config', async () => {
    const { getAutoSaveConfig } = await import('./src/lib/save');
    const config1 = getAutoSaveConfig();
    const config2 = getAutoSaveConfig();
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});
