import type { ThemeConfig, ThemeColors, ExportedTheme } from '@the-dmz/shared/types';

export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: {
    primary: '#0a0e14',
    secondary: '#141a22',
  },
  text: {
    primary: '#33ff33',
    secondary: '#88aa88',
    accent: '#33ff33',
  },
  border: '#334433',
  highlight: '#253040',
  semantic: {
    error: '#ff5555',
    warning: '#ffcc00',
    success: '#33cc66',
    info: '#3399ff',
  },
};

export const AMBER_THEME_COLORS: ThemeColors = {
  background: {
    primary: '#0a0e14',
    secondary: '#141a22',
  },
  text: {
    primary: '#ffb000',
    secondary: '#aa7700',
    accent: '#ffcc00',
  },
  border: '#443300',
  highlight: '#332800',
  semantic: {
    error: '#ff5555',
    warning: '#ffcc00',
    success: '#33cc66',
    info: '#3399ff',
  },
};

export const HIGH_CONTRAST_THEME_COLORS: ThemeColors = {
  background: {
    primary: '#000000',
    secondary: '#1a1a1a',
  },
  text: {
    primary: '#ffffff',
    secondary: '#cccccc',
    accent: '#ffff00',
  },
  border: '#ffffff',
  highlight: '#333333',
  semantic: {
    error: '#ff0000',
    warning: '#ffff00',
    success: '#00ff00',
    info: '#00ffff',
  },
};

export const COLOR_BLIND_SAFE_THEME_COLORS: ThemeColors = {
  background: {
    primary: '#0a0e14',
    secondary: '#141a22',
  },
  text: {
    primary: '#009E73',
    secondary: '#0072B2',
    accent: '#F0E442',
  },
  border: '#334433',
  highlight: '#253040',
  semantic: {
    error: '#D55E00',
    warning: '#F0E442',
    success: '#009E73',
    info: '#0072B2',
  },
};

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
  description: string;
}

export const BUILT_IN_THEMES: ThemePreset[] = [
  {
    id: 'green',
    name: 'Green (Classic)',
    colors: DEFAULT_THEME_COLORS,
    description: 'Classic terminal green phosphor look',
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: AMBER_THEME_COLORS,
    description: 'Warm amber terminal aesthetic',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    colors: HIGH_CONTRAST_THEME_COLORS,
    description: 'Maximum contrast for accessibility',
  },
  {
    id: 'color-blind-safe',
    name: 'Color-Blind Safe',
    colors: COLOR_BLIND_SAFE_THEME_COLORS,
    description: 'Designed for all types of color vision',
  },
];

export function getBuiltInTheme(id: string): ThemePreset | undefined {
  return BUILT_IN_THEMES.find((theme) => theme.id === id);
}

export function createCustomTheme(name: string, colors: ThemeColors, id?: string): ThemeConfig {
  const now = new Date().toISOString();
  return {
    id: id ?? `custom-${Date.now()}`,
    name,
    isBuiltIn: false,
    colors,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDefaultTheme(): ThemeConfig {
  const greenTheme = BUILT_IN_THEMES.find((t) => t.id === 'green');
  return {
    id: 'green',
    name: greenTheme?.name ?? 'Green (Classic)',
    isBuiltIn: true,
    colors: greenTheme?.colors ?? DEFAULT_THEME_COLORS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function exportThemeAsJson(theme: ThemeConfig, author: string = 'Player'): string {
  return JSON.stringify(
    {
      metadata: {
        name: theme.name,
        author,
        createdAt: theme.createdAt,
        version: '1.0',
      },
      config: theme,
    },
    null,
    2,
  );
}

export function importThemeFromJson(jsonString: string): ThemeConfig | null {
  try {
    const data = JSON.parse(jsonString) as Partial<ExportedTheme>;
    if (data.config && data.config.id && data.config.colors) {
      const now = new Date().toISOString();
      return {
        ...data.config,
        id: `imported-${Date.now()}`,
        isBuiltIn: false,
        createdAt: data.config.createdAt ?? now,
        updatedAt: now,
      };
    }
    return null;
  } catch {
    return null;
  }
}
