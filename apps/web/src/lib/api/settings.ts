import { get } from 'svelte/store';

import type {
  ApiSettingsState,
  DisplaySettings,
  AccessibilitySettings,
  GameplaySettings,
  AudioSettings,
  AccountSettings,
  SettingsState,
} from '$lib/stores/settings';
import { performanceStore } from '$lib/stores/settings';

import { apiClient as client } from './client.js';

export type SettingsCategory = 'display' | 'accessibility' | 'gameplay' | 'audio' | 'account';

export async function fetchSettings(category?: SettingsCategory | 'all'): Promise<SettingsState> {
  const url = category ? `/api/v1/settings/${category}` : '/api/v1/settings/all';

  const response = await client.get(url);
  const apiSettings = response as ApiSettingsState;
  const performance = get(performanceStore);

  return {
    ...apiSettings,
    performance,
  };
}

export async function updateSettings(
  category: SettingsCategory,
  settings:
    | Partial<DisplaySettings>
    | Partial<AccessibilitySettings>
    | Partial<GameplaySettings>
    | Partial<AudioSettings>
    | Partial<AccountSettings>,
): Promise<{ success: boolean; settings: SettingsState }> {
  const response = await client.patch(`/api/v1/settings/${category}`, settings);
  return response as { success: boolean; settings: SettingsState };
}

export async function exportSettings(): Promise<{
  settings: SettingsState;
  exportedAt: string;
}> {
  const response = await client.get('/api/v1/settings/export');
  return response as { settings: SettingsState; exportedAt: string };
}

export async function requestDataExport(): Promise<{
  success: boolean;
  requestId: string;
  message: string;
}> {
  const response = await client.post('/api/v1/settings/account/data-export', {});
  return response as { success: boolean; requestId: string; message: string };
}

export async function requestAccountDeletion(): Promise<{
  success: boolean;
  requestId: string;
  message: string;
}> {
  const response = await client.post('/api/v1/settings/account/delete', {});
  return response as { success: boolean; requestId: string; message: string };
}
