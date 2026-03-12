import { soundCaptionStore } from '$lib/stores/sound-caption';

import {
  SoundCategory,
  type SoundSettings,
  type SoundManager,
  DEFAULT_SOUND_SETTINGS,
  SOUND_DEFINITIONS,
} from './types';

import { browser } from '$app/environment';

const STORAGE_KEY = 'dmz-sound-settings';

function generateSyntheticSound(
  category: SoundCategory,
  variantId: string,
  audioContext: AudioContext,
  destination: GainNode,
): void {
  const now = audioContext.currentTime;

  switch (category) {
    case SoundCategory.Ambient:
      if (variantId === 'severeDrone') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.linearRampToValueAtTime(45, now + 3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 3);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 3);
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
      break;

    case SoundCategory.UiFeedback:
      if (variantId === 'keyClick') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (variantId === 'panelSwitch') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
      break;

    case SoundCategory.Alerts:
      if (variantId === 'newEmail') {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
          osc.connect(gain).connect(destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.15);
        });
      } else if (variantId === 'threatEscalation') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.4);
        osc.frequency.linearRampToValueAtTime(400, now + 0.8);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.frequency.value = 20;
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 1);
      }
      break;

    case SoundCategory.Stamps:
      if (variantId === 'approveStamp') {
        const noise = audioContext.createBufferSource();
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 0.3,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.1));
        }
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(filter).connect(gain).connect(destination);
        noise.start(now);

        const thump = audioContext.createOscillator();
        const thumpGain = audioContext.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(80, now);
        thump.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        thumpGain.gain.setValueAtTime(0.5, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        thump.connect(thumpGain).connect(destination);
        thump.start(now);
        thump.stop(now + 0.2);
      } else {
        const noise = audioContext.createBufferSource();
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 0.25,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.08));
        }
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noise.connect(filter).connect(gain).connect(destination);
        noise.start(now);

        const thump = audioContext.createOscillator();
        const thumpGain = audioContext.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(100, now);
        thump.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        thumpGain.gain.setValueAtTime(0.45, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        thump.connect(thumpGain).connect(destination);
        thump.start(now);
        thump.stop(now + 0.15);
      }
      break;

    case SoundCategory.Narrative:
      if (variantId === 'morpheusMessage') {
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(110, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(165, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
        gain.gain.setValueAtTime(0.08, now + 2.5);
        gain.gain.linearRampToValueAtTime(0, now + 3);
        osc1.connect(gain).connect(destination);
        osc2.connect(gain).connect(destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 3);
        osc2.stop(now + 3);
      } else {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(277.18, now + 0.5);
        osc.frequency.setValueAtTime(329.63, now + 1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.setValueAtTime(0.1, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 2);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 2);
      }
      break;

    case SoundCategory.Effects:
      if (variantId === 'crtPowerOn') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(30, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.setValueAtTime(0.15, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain).connect(destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } else {
        const noise = audioContext.createBufferSource();
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 0.4,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        noise.connect(filter).connect(gain).connect(destination);
        noise.start(now);
        noise.stop(now + 0.4);
      }
      break;
  }
}

export function createSoundManager(): SoundManager {
  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let settings: SoundSettings = { ...DEFAULT_SOUND_SETTINGS };
  const categoryGains: Map<SoundCategory, GainNode> = new Map();
  const mutedCategories: Set<SoundCategory> = new Set();
  let isGloballyMuted = false;

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
    play(category: SoundCategory, variantId?: string): void {
      if (
        !browser ||
        !settings.categories[category].enabled ||
        isGloballyMuted ||
        mutedCategories.has(category)
      ) {
        return;
      }

      try {
        const ctx = ensureAudioContext();
        const destination = categoryGains.get(category);
        if (!destination) return;

        const definition = SOUND_DEFINITIONS[category];
        const variant = variantId
          ? definition.variants.find((v) => v.id === variantId)
          : definition.variants[Math.floor(Math.random() * definition.variants.length)];

        if (variant) {
          generateSyntheticSound(category, variant.id, ctx, destination);
          if (browser) {
            soundCaptionStore.showCaption(variant.id);
          }
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
      if (audioContext) {
        void audioContext.close();
        audioContext = null;
        masterGain = null;
        categoryGains.clear();
      }
    },

    setVolume(category: SoundCategory, volume: number): void {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      settings.categories[category].volume = clampedVolume;

      if (audioContext && categoryGains.has(category)) {
        const gain = categoryGains.get(category)!;
        const isMuted = isGloballyMuted || mutedCategories.has(category);
        gain.gain.value =
          settings.categories[category].enabled && !isMuted ? clampedVolume / 100 : 0;
      }
    },

    setMasterVolume(volume: number): void {
      settings.masterVolume = Math.max(0, Math.min(100, volume));
      if (masterGain) {
        masterGain.gain.value = settings.masterVolume / 100;
      }
    },

    mute(category?: SoundCategory): void {
      if (category) {
        mutedCategories.add(category);
        if (categoryGains.has(category)) {
          const gain = categoryGains.get(category)!;
          gain.gain.value = 0;
        }
      } else {
        isGloballyMuted = true;
        if (masterGain) {
          masterGain.gain.value = 0;
        }
      }
    },

    unmute(category?: SoundCategory): void {
      if (category) {
        mutedCategories.delete(category);
        if (categoryGains.has(category) && settings.categories[category].enabled) {
          const gain = categoryGains.get(category)!;
          gain.gain.value = settings.categories[category].volume / 100;
        }
      } else {
        isGloballyMuted = false;
        if (masterGain) {
          masterGain.gain.value = settings.masterVolume / 100;
        }
      }
    },

    isEnabled(category: SoundCategory): boolean {
      return settings.categories[category].enabled;
    },

    isMuted(category?: SoundCategory): boolean {
      if (category) {
        return isGloballyMuted || mutedCategories.has(category);
      }
      return isGloballyMuted;
    },

    getVolume(category: SoundCategory): number {
      return settings.categories[category].volume;
    },

    getMasterVolume(): number {
      return settings.masterVolume;
    },

    getSettings(): SoundSettings {
      return { ...settings };
    },

    setSettings(newSettings: SoundSettings): void {
      settings = { ...newSettings };
      if (masterGain) {
        masterGain.gain.value = settings.masterVolume / 100;
      }
      Object.values(SoundCategory).forEach((category) => {
        const gain = categoryGains.get(category);
        if (gain) {
          const isMuted = isGloballyMuted || mutedCategories.has(category);
          gain.gain.value =
            settings.categories[category].enabled && !isMuted
              ? settings.categories[category].volume / 100
              : 0;
        }
      });
    },
  };
}

export const soundManager = createSoundManager();

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
