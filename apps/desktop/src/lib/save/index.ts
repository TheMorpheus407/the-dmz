import { invoke } from '@tauri-apps/api/core';

export interface LocalSave {
  version: string;
  timestamp: number;
  sessionId: string;
  dayNumber: number;
  phase: string;
  snapshot: unknown;
  events: unknown[];
  checksum: string;
}

export interface SaveSlot {
  slotId: number;
  save: LocalSave | null;
  metadata: SaveMetadata;
}

export interface SaveMetadata {
  slotId: number;
  sessionId: string;
  dayNumber: number;
  phase: string;
  timestamp: number;
  playTimeSeconds: number;
  screenshotPath: string | null;
}

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
  fullscreen: boolean;
}

export async function saveGame(
  sessionId: string,
  dayNumber: number,
  phase: string,
  snapshot: unknown,
  events: unknown[],
  slotId?: number,
): Promise<SaveSlot> {
  return invoke<SaveSlot>('save_game', {
    sessionId,
    dayNumber,
    phase,
    snapshot,
    events,
    slotId,
  });
}

export async function loadGame(slotId: number): Promise<SaveSlot> {
  return invoke<SaveSlot>('load_game', { slotId });
}

export async function listSaveSlots(): Promise<SaveSlot[]> {
  return invoke<SaveSlot[]>('list_save_slots');
}

export async function deleteSave(slotId: number): Promise<void> {
  return invoke<void>('delete_save', { slotId });
}

export async function exportSave(slotId: number, path: string): Promise<string> {
  return invoke<string>('export_save', { slotId, path });
}

export async function importSave(path: string, slotId: number): Promise<SaveSlot> {
  return invoke<SaveSlot>('import_save', { path, slotId });
}

export async function getWindowState(): Promise<WindowState> {
  return invoke<WindowState>('get_window_state');
}

export async function setFullscreen(fullscreen: boolean): Promise<void> {
  return invoke<void>('set_fullscreen', { fullscreen });
}

export async function minimizeToTray(): Promise<void> {
  return invoke<void>('minimize_to_tray');
}

export interface AutoSaveConfig {
  enabled: boolean;
  slotId: number;
  onSaveComplete?: (slot: SaveSlot) => void;
  onSaveError?: (error: unknown) => void;
}

const AUTO_SAVE_SLOT_ID = 0;
let autoSaveConfig: AutoSaveConfig = {
  enabled: true,
  slotId: AUTO_SAVE_SLOT_ID,
};

export function configureAutoSave(config: Partial<AutoSaveConfig>): void {
  autoSaveConfig = { ...autoSaveConfig, ...config };
}

export function getAutoSaveConfig(): AutoSaveConfig {
  return { ...autoSaveConfig };
}

export async function autoSaveAtEndOfDay(
  sessionId: string,
  dayNumber: number,
  phase: string,
  snapshot: unknown,
  events: unknown[],
): Promise<SaveSlot | null> {
  if (!autoSaveConfig.enabled) {
    console.info('[AutoSave] Auto-save is disabled');
    return null;
  }

  try {
    const slot = await saveGame(
      sessionId,
      dayNumber,
      phase,
      snapshot,
      events,
      autoSaveConfig.slotId,
    );
    console.info(`[AutoSave] Day ${dayNumber} auto-saved to slot ${autoSaveConfig.slotId}`);

    if (autoSaveConfig.onSaveComplete) {
      autoSaveConfig.onSaveComplete(slot);
    }

    return slot;
  } catch (error) {
    console.error('[AutoSave] Failed to auto-save:', error);

    if (autoSaveConfig.onSaveError) {
      autoSaveConfig.onSaveError(error);
    }

    return null;
  }
}

export async function getAutoSaveSlot(): Promise<SaveSlot> {
  return loadGame(autoSaveConfig.slotId);
}
