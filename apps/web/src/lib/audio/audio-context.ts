import { SoundCategory, type SoundSettings } from './types';

import { browser } from '$app/environment';

export interface AudioContextManager {
  getContext(): AudioContext;
  getMasterGain(): GainNode | null;
  getCategoryGain(category: SoundCategory): GainNode | null;
  close(): void;
}

export function createAudioContextManager(settings: SoundSettings): AudioContextManager {
  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  const categoryGains: Map<SoundCategory, GainNode> = new Map();

  function ensureAudioContext(): AudioContext {
    if (!browser) {
      throw new Error('Audio not available on server');
    }

    if (!audioContext) {
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = settings.masterVolume / 100;

      Object.values(SoundCategory).forEach((category) => {
        const gain = audioContext!.createGain();
        gain.connect(masterGain!);
        const categorySettings = settings.categories[category];
        gain.gain.value = categorySettings.enabled ? categorySettings.volume / 100 : 0;
        categoryGains.set(category, gain);
      });
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    return audioContext;
  }

  return {
    getContext(): AudioContext {
      return ensureAudioContext();
    },

    getMasterGain(): GainNode | null {
      return masterGain;
    },

    getCategoryGain(category: SoundCategory): GainNode | null {
      return categoryGains.get(category) ?? null;
    },

    close(): void {
      if (audioContext) {
        void audioContext.close();
        audioContext = null;
        masterGain = null;
        categoryGains.clear();
      }
    },
  };
}
