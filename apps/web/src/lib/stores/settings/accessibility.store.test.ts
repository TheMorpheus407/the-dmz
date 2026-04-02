import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { accessibilityStore } from './accessibility.store';
import { defaultAccessibilitySettings } from './defaults';

describe('accessibilityStore', () => {
  beforeEach(() => {
    accessibilityStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(accessibilityStore);
      expect(state.reducedMotion).toBe(false);
      expect(state.highContrast).toBe(false);
      expect(state.fontSize).toBe(16);
      expect(state.colorBlindMode).toBe('none');
      expect(state.screenReaderAnnouncements).toBe(true);
      expect(state.keyboardNavigationHints).toBe(true);
      expect(state.focusIndicatorStyle).toBe('subtle');
    });
  });

  describe('setReducedMotion', () => {
    it('enables reduced motion', () => {
      accessibilityStore.setReducedMotion(true);
      expect(get(accessibilityStore).reducedMotion).toBe(true);
    });

    it('disables reduced motion', () => {
      accessibilityStore.setReducedMotion(true);
      accessibilityStore.setReducedMotion(false);
      expect(get(accessibilityStore).reducedMotion).toBe(false);
    });
  });

  describe('setHighContrast', () => {
    it('enables high contrast', () => {
      accessibilityStore.setHighContrast(true);
      expect(get(accessibilityStore).highContrast).toBe(true);
    });

    it('disables high contrast', () => {
      accessibilityStore.setHighContrast(false);
      expect(get(accessibilityStore).highContrast).toBe(false);
    });
  });

  describe('setFontSize', () => {
    it('clamps font size to minimum of 12', () => {
      accessibilityStore.setFontSize(5);
      expect(get(accessibilityStore).fontSize).toBe(12);
    });

    it('clamps font size to maximum of 32', () => {
      accessibilityStore.setFontSize(50);
      expect(get(accessibilityStore).fontSize).toBe(32);
    });

    it('accepts valid font size values', () => {
      accessibilityStore.setFontSize(20);
      expect(get(accessibilityStore).fontSize).toBe(20);
    });
  });

  describe('setColorBlindMode', () => {
    it('sets protanopia mode', () => {
      accessibilityStore.setColorBlindMode('protanopia');
      expect(get(accessibilityStore).colorBlindMode).toBe('protanopia');
    });

    it('sets deuteranopia mode', () => {
      accessibilityStore.setColorBlindMode('deuteranopia');
      expect(get(accessibilityStore).colorBlindMode).toBe('deuteranopia');
    });

    it('sets tritanopia mode', () => {
      accessibilityStore.setColorBlindMode('tritanopia');
      expect(get(accessibilityStore).colorBlindMode).toBe('tritanopia');
    });

    it('sets none mode', () => {
      accessibilityStore.setColorBlindMode('protanopia');
      accessibilityStore.setColorBlindMode('none');
      expect(get(accessibilityStore).colorBlindMode).toBe('none');
    });
  });

  describe('setFocusIndicatorStyle', () => {
    it('sets focus indicator style', () => {
      accessibilityStore.setFocusIndicatorStyle('strong');
      expect(get(accessibilityStore).focusIndicatorStyle).toBe('strong');
    });
  });

  describe('updateAccessibility', () => {
    it('updates multiple settings at once', () => {
      accessibilityStore.updateAccessibility({
        reducedMotion: true,
        fontSize: 24,
      });
      const state = get(accessibilityStore);
      expect(state.reducedMotion).toBe(true);
      expect(state.fontSize).toBe(24);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      accessibilityStore.updateAccessibility({
        reducedMotion: true,
        fontSize: 28,
        colorBlindMode: 'protanopia',
      });

      accessibilityStore.resetToDefaults();

      const state = get(accessibilityStore);
      expect(state).toEqual(defaultAccessibilitySettings);
    });
  });
});
