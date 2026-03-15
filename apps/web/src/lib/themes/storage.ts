import type { ThemeConfig } from '@the-dmz/shared/types';
import { getDB } from '$lib/storage/idb';
import { validateThemeColors } from '$lib/themes/validation';

import { browser } from '$app/environment';

const MAX_CUSTOM_THEMES = 5;
const THEME_STORE_NAME = 'customThemes';

export async function getCustomThemes(): Promise<ThemeConfig[]> {
  if (!browser) return [];

  try {
    const db = await getDB();
    const themes = await db.getAll(THEME_STORE_NAME);
    return themes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function getCustomTheme(id: string): Promise<ThemeConfig | undefined> {
  if (!browser) return undefined;

  try {
    const db = await getDB();
    return await db.get(THEME_STORE_NAME, id);
  } catch {
    return undefined;
  }
}

export async function saveCustomTheme(
  theme: ThemeConfig,
  allowInvalid: boolean = false,
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  if (!browser) {
    return { success: false, error: 'Cannot save theme on server' };
  }

  const validation = validateThemeColors(theme.colors);

  if (!allowInvalid && !validation.isValid) {
    return {
      success: false,
      error: validation.errors.join('; '),
      warnings: validation.warnings,
    };
  }

  try {
    const existingThemes = await getCustomThemes();
    const existingTheme = existingThemes.find((t) => t.id === theme.id);

    if (!existingTheme && existingThemes.length >= MAX_CUSTOM_THEMES) {
      return {
        success: false,
        error: `Maximum of ${MAX_CUSTOM_THEMES} custom themes allowed. Delete an existing theme first.`,
      };
    }

    const db = await getDB();
    const updatedTheme: ThemeConfig = {
      ...theme,
      updatedAt: new Date().toISOString(),
    };

    await db.put(THEME_STORE_NAME, updatedTheme);

    return {
      success: true,
      warnings: validation.warnings,
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to save theme: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

export async function deleteCustomTheme(id: string): Promise<boolean> {
  if (!browser) return false;

  try {
    const db = await getDB();
    await db.delete(THEME_STORE_NAME, id);
    return true;
  } catch {
    return false;
  }
}

export async function canAddMoreThemes(): Promise<boolean> {
  if (!browser) return false;

  const themes = await getCustomThemes();
  return themes.length < MAX_CUSTOM_THEMES;
}

export async function getCustomThemeCount(): Promise<number> {
  if (!browser) return 0;

  const themes = await getCustomThemes();
  return themes.length;
}

export async function importTheme(theme: ThemeConfig): Promise<{
  success: boolean;
  error?: string;
  theme?: ThemeConfig;
}> {
  if (theme.isBuiltIn) {
    return { success: false, error: 'Cannot import built-in themes' };
  }

  const canAdd = await canAddMoreThemes();
  if (!canAdd) {
    return {
      success: false,
      error: `Maximum of ${MAX_CUSTOM_THEMES} custom themes allowed`,
    };
  }

  const result = await saveCustomTheme(theme, false);

  if (!result.success) {
    return { success: false, error: result.error ?? 'Unknown error' };
  }

  return { success: true, theme };
}

export async function clearAllCustomThemes(): Promise<void> {
  if (!browser) return;

  const db = await getDB();
  await db.clear(THEME_STORE_NAME);
}
