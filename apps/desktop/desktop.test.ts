import { describe, it, expect } from 'vitest';

describe('desktop/platform', () => {
  it('should export detectPlatform function', async () => {
    const { detectPlatform } = await import('./src/lib/platform');
    expect(detectPlatform).toBeDefined();
    expect(typeof detectPlatform).toBe('function');
  });

  it('should export isTauri function', async () => {
    const { isTauri } = await import('./src/lib/platform');
    expect(isTauri).toBeDefined();
    expect(typeof isTauri).toBe('function');
  });

  it('should export isBrowser function', async () => {
    const { isBrowser } = await import('./src/lib/platform');
    expect(isBrowser).toBeDefined();
    expect(typeof isBrowser).toBe('function');
  });

  it('should export getCapabilities function', async () => {
    const { getCapabilities } = await import('./src/lib/platform');
    expect(getCapabilities).toBeDefined();
    expect(typeof getCapabilities).toBe('function');
  });

  it('should return a valid platform in test environment', async () => {
    const { detectPlatform, getCapabilities } = await import('./src/lib/platform');
    const platform = detectPlatform();
    const capabilities = getCapabilities();

    expect(['browser', 'tauri', 'unknown']).toContain(platform);
    expect(capabilities.localStorage).toBeDefined();
    expect(typeof capabilities.localStorage).toBe('boolean');
    expect(typeof capabilities.fileSystem).toBe('boolean');
    expect(typeof capabilities.systemTray).toBe('boolean');
  });
});

describe('desktop/steam', () => {
  it('should export ACHIEVEMENTS constant', async () => {
    const { ACHIEVEMENTS } = await import('./src/lib/steam');
    expect(ACHIEVEMENTS).toBeDefined();
    expect(ACHIEVEMENTS.FIRST_EMAIL).toBe('FIRST_EMAIL');
    expect(ACHIEVEMENTS.FIRST_DAY_COMPLETE).toBe('FIRST_DAY_COMPLETE');
  });

  it('should export initializeSteam function', async () => {
    const { initializeSteam } = await import('./src/lib/steam');
    expect(initializeSteam).toBeDefined();
    expect(typeof initializeSteam).toBe('function');
  });

  it('should export unlockAchievement function', async () => {
    const { unlockAchievement } = await import('./src/lib/steam');
    expect(unlockAchievement).toBeDefined();
    expect(typeof unlockAchievement).toBe('function');
  });

  it('should return false when unlocking achievement without initialization', async () => {
    const { unlockAchievement } = await import('./src/lib/steam');
    const result = await unlockAchievement('TEST_ACHIEVEMENT');
    expect(result).toBe(false);
  });

  it('should return empty achievements when not initialized', async () => {
    const { getAchievements } = await import('./src/lib/steam');
    const achievements = await getAchievements();
    expect(achievements).toEqual([]);
  });

  it('should return null user when not initialized', async () => {
    const { getCurrentUser } = await import('./src/lib/steam');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('desktop/save', () => {
  it('should export saveGame function', async () => {
    const { saveGame } = await import('./src/lib/save');
    expect(saveGame).toBeDefined();
    expect(typeof saveGame).toBe('function');
  });

  it('should export loadGame function', async () => {
    const { loadGame } = await import('./src/lib/save');
    expect(loadGame).toBeDefined();
    expect(typeof loadGame).toBe('function');
  });

  it('should export listSaveSlots function', async () => {
    const { listSaveSlots } = await import('./src/lib/save');
    expect(listSaveSlots).toBeDefined();
    expect(typeof listSaveSlots).toBe('function');
  });

  it('should export deleteSave function', async () => {
    const { deleteSave } = await import('./src/lib/save');
    expect(deleteSave).toBeDefined();
    expect(typeof deleteSave).toBe('function');
  });

  it('should export window management functions', async () => {
    const { getWindowState, setFullscreen, minimizeToTray } = await import('./src/lib/save');
    expect(getWindowState).toBeDefined();
    expect(typeof getWindowState).toBe('function');
    expect(setFullscreen).toBeDefined();
    expect(typeof setFullscreen).toBe('function');
    expect(minimizeToTray).toBeDefined();
    expect(typeof minimizeToTray).toBe('function');
  });

  it('should export import and export functions', async () => {
    const { exportSave, importSave } = await import('./src/lib/save');
    expect(exportSave).toBeDefined();
    expect(typeof exportSave).toBe('function');
    expect(importSave).toBeDefined();
    expect(typeof importSave).toBe('function');
  });

  it('should export auto-save functions', async () => {
    const { configureAutoSave, getAutoSaveConfig, autoSaveAtEndOfDay, getAutoSaveSlot } =
      await import('./src/lib/save');
    expect(configureAutoSave).toBeDefined();
    expect(typeof configureAutoSave).toBe('function');
    expect(getAutoSaveConfig).toBeDefined();
    expect(typeof getAutoSaveConfig).toBe('function');
    expect(autoSaveAtEndOfDay).toBeDefined();
    expect(typeof autoSaveAtEndOfDay).toBe('function');
    expect(getAutoSaveSlot).toBeDefined();
    expect(typeof getAutoSaveSlot).toBe('function');
  });

  it('should have auto-save enabled by default', async () => {
    const { getAutoSaveConfig } = await import('./src/lib/save');
    const config = getAutoSaveConfig();
    expect(config.enabled).toBe(true);
    expect(config.slotId).toBe(0);
  });

  it('should allow configuring auto-save', async () => {
    const { configureAutoSave, getAutoSaveConfig } = await import('./src/lib/save');
    configureAutoSave({ enabled: false, slotId: 5 });
    const config = getAutoSaveConfig();
    expect(config.enabled).toBe(false);
    expect(config.slotId).toBe(5);
    configureAutoSave({ enabled: true, slotId: 0 });
  });
});
