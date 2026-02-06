import { writable } from 'svelte/store';

export type ThemeName = 'green' | 'neutral';

export interface ThemeState {
  name: ThemeName;
  enableTerminalEffects: boolean;
}

export const initialThemeState: ThemeState = {
  name: 'green',
  enableTerminalEffects: false,
};

export const themeStore = writable<ThemeState>(initialThemeState);
