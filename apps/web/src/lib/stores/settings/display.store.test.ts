import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { displayStore } from './display.store';
import { defaultDisplaySettings } from './defaults';

describe('displayStore', () => {
  beforeEach(() => {
    displayStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(displayStore);
      expect(state.theme).toBe(defaultDisplaySettings.theme);
      expect(state.enableTerminalEffects).toBe(true);
      expect(state.fontSize).toBe(16);
    });
  });

  describe('setTheme', () => {
    it('changes theme', () => {
      displayStore.setTheme('amber');
      const state = get(displayStore);
      expect(state.theme).toBe('amber');
    });
  });

  describe('toggleEffect', () => {
    it('toggles scanlines from true to false', () => {
      displayStore.toggleEffect('scanlines');
      const state = get(displayStore);
      expect(state.effects.scanlines).toBe(false);
    });

    it('toggles scanlines from false to true', () => {
      displayStore.toggleEffect('scanlines');
      displayStore.toggleEffect('scanlines');
      const state = get(displayStore);
      expect(state.effects.scanlines).toBe(true);
    });

    it('toggles curvature effect', () => {
      displayStore.toggleEffect('curvature');
      const state = get(displayStore);
      expect(state.effects.curvature).toBe(false);
    });

    it('toggles glow effect', () => {
      displayStore.toggleEffect('glow');
      const state = get(displayStore);
      expect(state.effects.glow).toBe(false);
    });
  });

  describe('setEffectIntensity', () => {
    it('clamps intensity to 0 when negative', () => {
      displayStore.setEffectIntensity('scanlines', -10);
      const state = get(displayStore);
      expect(state.effectIntensity.scanlines).toBe(0);
    });

    it('clamps intensity to 100 when over 100', () => {
      displayStore.setEffectIntensity('glow', 150);
      const state = get(displayStore);
      expect(state.effectIntensity.glow).toBe(100);
    });

    it('accepts valid intensity values 0-100', () => {
      displayStore.setEffectIntensity('curvature', 75);
      const state = get(displayStore);
      expect(state.effectIntensity.curvature).toBe(75);
    });
  });

  describe('setFontSize', () => {
    it('clamps font size to minimum of 12', () => {
      displayStore.setFontSize(5);
      const state = get(displayStore);
      expect(state.fontSize).toBe(12);
    });

    it('clamps font size to maximum of 32', () => {
      displayStore.setFontSize(50);
      const state = get(displayStore);
      expect(state.fontSize).toBe(32);
    });

    it('accepts valid font size values', () => {
      displayStore.setFontSize(20);
      const state = get(displayStore);
      expect(state.fontSize).toBe(20);
    });
  });

  describe('updateDisplay', () => {
    it('updates multiple settings at once', () => {
      displayStore.updateDisplay({ fontSize: 24, enableTerminalEffects: false });
      const state = get(displayStore);
      expect(state.fontSize).toBe(24);
      expect(state.enableTerminalEffects).toBe(false);
    });

    it('preserves other settings when updating', () => {
      const initial = get(displayStore);
      displayStore.updateDisplay({ fontSize: 20 });
      const state = get(displayStore);
      expect(state.theme).toBe(initial.theme);
      expect(state.enableTerminalEffects).toBe(initial.enableTerminalEffects);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      displayStore.setEffectIntensity('scanlines', 100);
      displayStore.setFontSize(28);
      displayStore.toggleEffect('glow');

      displayStore.resetToDefaults();

      const state = get(displayStore);
      expect(state.effectIntensity.scanlines).toBe(
        defaultDisplaySettings.effectIntensity.scanlines,
      );
      expect(state.fontSize).toBe(defaultDisplaySettings.fontSize);
      expect(state.effects.glow).toBe(defaultDisplaySettings.effects.glow);
    });
  });
});
