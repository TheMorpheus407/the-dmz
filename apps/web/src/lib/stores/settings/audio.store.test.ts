import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { audioSettingsStore } from './audio.store';
import { defaultAudioSettings } from './defaults';

describe('audioSettingsStore', () => {
  beforeEach(() => {
    audioSettingsStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(audioSettingsStore);
      expect(state.masterVolume).toBe(80);
      expect(state.muteAll).toBe(false);
      expect(state.textToSpeechEnabled).toBe(false);
      expect(state.textToSpeechSpeed).toBe(100);
    });
  });

  describe('setMasterVolume', () => {
    it('clamps volume to 0 when negative', () => {
      audioSettingsStore.setMasterVolume(-10);
      expect(get(audioSettingsStore).masterVolume).toBe(0);
    });

    it('clamps volume to 100 when over 100', () => {
      audioSettingsStore.setMasterVolume(150);
      expect(get(audioSettingsStore).masterVolume).toBe(100);
    });

    it('accepts valid volume values 0-100', () => {
      audioSettingsStore.setMasterVolume(75);
      expect(get(audioSettingsStore).masterVolume).toBe(75);
    });
  });

  describe('setMuteAll', () => {
    it('mutes all audio', () => {
      audioSettingsStore.setMuteAll(true);
      expect(get(audioSettingsStore).muteAll).toBe(true);
    });

    it('unmutes all audio', () => {
      audioSettingsStore.setMuteAll(true);
      audioSettingsStore.setMuteAll(false);
      expect(get(audioSettingsStore).muteAll).toBe(false);
    });
  });

  describe('setAudioCategoryVolume', () => {
    it('updates alerts category volume', () => {
      audioSettingsStore.setAudioCategoryVolume('alerts', 90);
      expect(get(audioSettingsStore).categoryVolumes.alerts).toBe(90);
    });

    it('updates ui category volume', () => {
      audioSettingsStore.setAudioCategoryVolume('ui', 70);
      expect(get(audioSettingsStore).categoryVolumes.ui).toBe(70);
    });

    it('updates ambient category volume', () => {
      audioSettingsStore.setAudioCategoryVolume('ambient', 60);
      expect(get(audioSettingsStore).categoryVolumes.ambient).toBe(60);
    });

    it('updates narrative category volume', () => {
      audioSettingsStore.setAudioCategoryVolume('narrative', 80);
      expect(get(audioSettingsStore).categoryVolumes.narrative).toBe(80);
    });

    it('updates effects category volume', () => {
      audioSettingsStore.setAudioCategoryVolume('effects', 85);
      expect(get(audioSettingsStore).categoryVolumes.effects).toBe(85);
    });

    it('clamps category volume to valid range', () => {
      audioSettingsStore.setAudioCategoryVolume('alerts', -5);
      expect(get(audioSettingsStore).categoryVolumes.alerts).toBe(0);
    });
  });

  describe('setTextToSpeechEnabled', () => {
    it('enables TTS', () => {
      audioSettingsStore.setTextToSpeechEnabled(true);
      expect(get(audioSettingsStore).textToSpeechEnabled).toBe(true);
    });

    it('disables TTS', () => {
      audioSettingsStore.setTextToSpeechEnabled(false);
      expect(get(audioSettingsStore).textToSpeechEnabled).toBe(false);
    });
  });

  describe('setTextToSpeechSpeed', () => {
    it('clamps speed to minimum of 50', () => {
      audioSettingsStore.setTextToSpeechSpeed(20);
      expect(get(audioSettingsStore).textToSpeechSpeed).toBe(50);
    });

    it('clamps speed to maximum of 200', () => {
      audioSettingsStore.setTextToSpeechSpeed(250);
      expect(get(audioSettingsStore).textToSpeechSpeed).toBe(200);
    });

    it('accepts valid speed values 50-200', () => {
      audioSettingsStore.setTextToSpeechSpeed(150);
      expect(get(audioSettingsStore).textToSpeechSpeed).toBe(150);
    });
  });

  describe('updateAudio', () => {
    it('updates multiple settings at once', () => {
      audioSettingsStore.updateAudio({
        masterVolume: 60,
        muteAll: true,
      });
      const state = get(audioSettingsStore);
      expect(state.masterVolume).toBe(60);
      expect(state.muteAll).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      audioSettingsStore.updateAudio({
        masterVolume: 100,
        muteAll: true,
        textToSpeechEnabled: true,
      });

      audioSettingsStore.resetToDefaults();

      const state = get(audioSettingsStore);
      expect(state).toEqual(defaultAudioSettings);
    });
  });
});
