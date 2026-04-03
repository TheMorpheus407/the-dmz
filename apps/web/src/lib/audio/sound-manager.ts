import { SoundCategory, type SoundSettings, type SoundManager, SOUND_DEFINITIONS } from './types';
import { createAudioContextManager, type AudioContextManager } from './audio-context';
import { createVolumeController, type VolumeController } from './volume-control';
import { synthesizeSound } from './sound-synthesis';
import { loadSoundSettings, saveSoundSettings } from './settings-persistence';

import { browser } from '$app/environment';

export function createSoundManager(): SoundManager {
  const settings = loadSoundSettings();
  const audioContextManager: AudioContextManager = createAudioContextManager(settings);
  const volumeController: VolumeController = createVolumeController();
  volumeController.applySettings(settings);

  return {
    play(category: SoundCategory, variantId?: string): void {
      if (
        !browser ||
        !settings.categories[category].enabled ||
        volumeController.isMuted(category)
      ) {
        return;
      }

      try {
        const ctx = audioContextManager.getContext();
        const destination = audioContextManager.getCategoryGain(category);
        if (!destination) return;

        const definition = SOUND_DEFINITIONS[category];
        const variant = variantId
          ? definition.variants.find((v) => v.id === variantId)
          : definition.variants[Math.floor(Math.random() * definition.variants.length)];

        if (variant) {
          synthesizeSound(category, variant.id, ctx, destination);
        }
      } catch {
        // Silently fail if audio can't play
      }
    },

    stop(_category: SoundCategory): void {
      // Web Audio API oscillators are self-terminating
      // This is a no-op for our synthetic sounds
    },

    stopAll(): void {
      audioContextManager.close();
    },

    setVolume(category: SoundCategory, volume: number): void {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      volumeController.setCategoryVolume(category, clampedVolume);
      settings.categories[category].volume = clampedVolume;

      const gain = audioContextManager.getCategoryGain(category);
      volumeController.updateCategoryGain(category, gain, settings);
    },

    setMasterVolume(volume: number): void {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      volumeController.setMasterVolume(clampedVolume);
      settings.masterVolume = clampedVolume;

      const masterGain = audioContextManager.getMasterGain();
      volumeController.updateMasterGain(masterGain, settings);
    },

    mute(category?: SoundCategory): void {
      volumeController.mute(category);
      if (category) {
        const gain = audioContextManager.getCategoryGain(category);
        if (gain) {
          gain.gain.value = 0;
        }
      } else {
        const masterGain = audioContextManager.getMasterGain();
        if (masterGain) {
          masterGain.gain.value = 0;
        }
      }
    },

    unmute(category?: SoundCategory): void {
      volumeController.unmute(category);
      if (category) {
        const gain = audioContextManager.getCategoryGain(category);
        volumeController.updateCategoryGain(category, gain, settings);
      } else {
        const masterGain = audioContextManager.getMasterGain();
        volumeController.updateMasterGain(masterGain, settings);
      }
    },

    isEnabled(category: SoundCategory): boolean {
      return settings.categories[category].enabled;
    },

    isMuted(category?: SoundCategory): boolean {
      return volumeController.isMuted(category);
    },

    getVolume(category: SoundCategory): number {
      return volumeController.getCategoryVolume(category);
    },

    getMasterVolume(): number {
      return volumeController.getMasterVolume();
    },

    getSettings(): SoundSettings {
      return { ...settings };
    },

    setSettings(newSettings: SoundSettings): void {
      settings.masterVolume = newSettings.masterVolume;
      volumeController.applySettings(newSettings);

      Object.values(SoundCategory).forEach((category) => {
        settings.categories[category] = { ...newSettings.categories[category] };
        const gain = audioContextManager.getCategoryGain(category);
        volumeController.updateCategoryGain(category, gain, settings);
      });

      const masterGain = audioContextManager.getMasterGain();
      volumeController.updateMasterGain(masterGain, settings);

      saveSoundSettings(settings);
    },
  };
}

export const soundManager = createSoundManager();

export { loadSoundSettings, saveSoundSettings } from './settings-persistence';
