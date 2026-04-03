import { SoundCategory, type SoundSettings } from './types';

export interface VolumeController {
  setMasterVolume(volume: number): void;
  setCategoryVolume(category: SoundCategory, volume: number): void;
  mute(category?: SoundCategory): void;
  unmute(category?: SoundCategory): void;
  isMuted(category?: SoundCategory): boolean;
  getMasterVolume(): number;
  getCategoryVolume(category: SoundCategory): number;
  isEnabled(category: SoundCategory): boolean;
  applySettings(settings: SoundSettings): void;
  updateCategoryGain(category: SoundCategory, gain: GainNode | null, settings: SoundSettings): void;
  updateMasterGain(gain: GainNode | null, settings: SoundSettings): void;
}

export function createVolumeController(): VolumeController {
  let masterVolume = 80;
  const categoryVolumes: Map<SoundCategory, number> = new Map();
  const mutedCategories: Set<SoundCategory> = new Set();
  let isGloballyMuted = false;

  Object.values(SoundCategory).forEach((category) => {
    categoryVolumes.set(category, 80);
  });

  return {
    setMasterVolume(volume: number): void {
      masterVolume = Math.max(0, Math.min(100, volume));
    },

    setCategoryVolume(category: SoundCategory, volume: number): void {
      categoryVolumes.set(category, Math.max(0, Math.min(100, volume)));
    },

    mute(category?: SoundCategory): void {
      if (category) {
        mutedCategories.add(category);
      } else {
        isGloballyMuted = true;
      }
    },

    unmute(category?: SoundCategory): void {
      if (category) {
        mutedCategories.delete(category);
      } else {
        isGloballyMuted = false;
      }
    },

    isMuted(category?: SoundCategory): boolean {
      if (category) {
        return isGloballyMuted || mutedCategories.has(category);
      }
      return isGloballyMuted;
    },

    getMasterVolume(): number {
      return masterVolume;
    },

    getCategoryVolume(category: SoundCategory): number {
      return categoryVolumes.get(category) ?? 80;
    },

    isEnabled(category: SoundCategory): boolean {
      return categoryVolumes.has(category);
    },

    applySettings(settings: SoundSettings): void {
      masterVolume = settings.masterVolume;
      Object.values(SoundCategory).forEach((category) => {
        categoryVolumes.set(category, settings.categories[category].volume);
      });
    },

    updateCategoryGain(
      category: SoundCategory,
      gain: GainNode | null,
      settings: SoundSettings,
    ): void {
      if (!gain) return;
      const isMuted = isGloballyMuted || mutedCategories.has(category);
      gain.gain.value =
        settings.categories[category].enabled && !isMuted
          ? categoryVolumes.get(category)! / 100
          : 0;
    },

    updateMasterGain(gain: GainNode | null, _settings: SoundSettings): void {
      if (gain) {
        gain.gain.value = isGloballyMuted ? 0 : masterVolume / 100;
      }
    },
  };
}
