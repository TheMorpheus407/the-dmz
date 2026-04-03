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
          [SoundCategory.Ambient]: {
            enabled:
              parsed.categories?.[SoundCategory.Ambient]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Ambient].enabled,
            volume:
              parsed.categories?.[SoundCategory.Ambient]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Ambient].volume,
          },
          [SoundCategory.UiFeedback]: {
            enabled:
              parsed.categories?.[SoundCategory.UiFeedback]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UiFeedback].enabled,
            volume:
              parsed.categories?.[SoundCategory.UiFeedback]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UiFeedback].volume,
          },
          [SoundCategory.Alerts]: {
            enabled:
              parsed.categories?.[SoundCategory.Alerts]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Alerts].enabled,
            volume:
              parsed.categories?.[SoundCategory.Alerts]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Alerts].volume,
          },
          [SoundCategory.Stamps]: {
            enabled:
              parsed.categories?.[SoundCategory.Stamps]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Stamps].enabled,
            volume:
              parsed.categories?.[SoundCategory.Stamps]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Stamps].volume,
          },
          [SoundCategory.Narrative]: {
            enabled:
              parsed.categories?.[SoundCategory.Narrative]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Narrative].enabled,
            volume:
              parsed.categories?.[SoundCategory.Narrative]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Narrative].volume,
          },
          [SoundCategory.Effects]: {
            enabled:
              parsed.categories?.[SoundCategory.Effects]?.enabled ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Effects].enabled,
            volume:
              parsed.categories?.[SoundCategory.Effects]?.volume ??
              DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Effects].volume,
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
