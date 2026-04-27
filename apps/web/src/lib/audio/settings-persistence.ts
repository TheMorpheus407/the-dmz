import { SoundCategory, type SoundSettings, DEFAULT_SOUND_SETTINGS } from './types';

import { browser } from '$app/environment';

const STORAGE_KEY = 'dmz-sound-settings';

export function loadSoundSettings(): SoundSettings {
  if (!browser) return DEFAULT_SOUND_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SoundSettings>;
      return {
        masterVolume: parsed.masterVolume ?? DEFAULT_SOUND_SETTINGS.masterVolume,
        categories: {
          [SoundCategory.AMBIENT]: {
            enabled:
              parsed.categories?.[SoundCategory.AMBIENT]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.AMBIENT].enabled,
            volume:
              parsed.categories?.[SoundCategory.AMBIENT]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.AMBIENT].volume,
          },
          [SoundCategory.UI_FEEDBACK]: {
            enabled:
              parsed.categories?.[SoundCategory.UI_FEEDBACK]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UI_FEEDBACK].enabled,
            volume:
              parsed.categories?.[SoundCategory.UI_FEEDBACK]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UI_FEEDBACK].volume,
          },
          [SoundCategory.ALERTS]: {
            enabled:
              parsed.categories?.[SoundCategory.ALERTS]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.ALERTS].enabled,
            volume:
              parsed.categories?.[SoundCategory.ALERTS]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.ALERTS].volume,
          },
          [SoundCategory.STAMPS]: {
            enabled:
              parsed.categories?.[SoundCategory.STAMPS]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.STAMPS].enabled,
            volume:
              parsed.categories?.[SoundCategory.STAMPS]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.STAMPS].volume,
          },
          [SoundCategory.NARRATIVE]: {
            enabled:
              parsed.categories?.[SoundCategory.NARRATIVE]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.NARRATIVE].enabled,
            volume:
              parsed.categories?.[SoundCategory.NARRATIVE]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.NARRATIVE].volume,
          },
          [SoundCategory.EFFECTS]: {
            enabled:
              parsed.categories?.[SoundCategory.EFFECTS]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.EFFECTS].enabled,
            volume:
              parsed.categories?.[SoundCategory.EFFECTS]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.EFFECTS].volume,
          },
        },
      };
    }
  } catch {
    // Invalid stored data
  }

  return DEFAULT_SOUND_SETTINGS;
}

export function saveSoundSettings(settings: SoundSettings): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable
  }
}
