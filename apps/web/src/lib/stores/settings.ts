import { writable } from "svelte/store";

export interface SettingsState {
  reducedMotion: boolean;
  soundEnabled: boolean;
}

export const initialSettingsState: SettingsState = {
  reducedMotion: false,
  soundEnabled: true,
};

export const settingsStore = writable<SettingsState>(initialSettingsState);
