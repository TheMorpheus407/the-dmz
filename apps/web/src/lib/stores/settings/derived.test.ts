import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { displayStore } from './display.store';
import { accessibilityStore } from './accessibility.store';
import { performanceStore } from './performance.store';
import {
  effectiveTheme,
  effectiveEffects,
  effectiveFontSize,
  effectiveReducedMotion,
  effectiveColorBlindMode,
  effectivePerformanceTier,
  effectiveVirtualization,
  effectiveReduceAnimations,
} from './derived';

describe('derived stores', () => {
  beforeEach(() => {
    displayStore.resetToDefaults();
    accessibilityStore.resetToDefaults();
    performanceStore.resetToDefaults();
  });

  describe('effectiveTheme', () => {
    it('returns display theme when high contrast is disabled', () => {
      accessibilityStore.setHighContrast(false);
      displayStore.setTheme('amber');
      expect(get(effectiveTheme)).toBe('amber');
    });

    it('returns high-contrast when high contrast is enabled', () => {
      accessibilityStore.setHighContrast(true);
      displayStore.setTheme('green');
      expect(get(effectiveTheme)).toBe('high-contrast');
    });
  });

  describe('effectiveEffects', () => {
    it('returns display effects for normal themes', () => {
      displayStore.setTheme('green');
      displayStore.toggleEffect('scanlines');
      const effects = get(effectiveEffects);
      expect(effects.scanlines).toBe(false);
    });

    it('disables all effects for high-contrast theme', () => {
      displayStore.setTheme('high-contrast');
      const effects = get(effectiveEffects);
      expect(effects.scanlines).toBe(false);
      expect(effects.curvature).toBe(false);
      expect(effects.glow).toBe(false);
      expect(effects.noise).toBe(false);
      expect(effects.vignette).toBe(false);
    });

    it('disables all effects for enterprise theme', () => {
      displayStore.setTheme('enterprise');
      const effects = get(effectiveEffects);
      expect(effects.scanlines).toBe(false);
      expect(effects.curvature).toBe(false);
    });

    it('disables all effects for admin-light theme', () => {
      displayStore.setTheme('admin-light');
      const effects = get(effectiveEffects);
      expect(effects.scanlines).toBe(false);
    });

    it('disables all effects for admin-dark theme', () => {
      displayStore.setTheme('admin-dark');
      const effects = get(effectiveEffects);
      expect(effects.scanlines).toBe(false);
    });
  });

  describe('effectiveFontSize', () => {
    it('returns accessibility font size', () => {
      accessibilityStore.setFontSize(24);
      expect(get(effectiveFontSize)).toBe(24);
    });
  });

  describe('effectiveReducedMotion', () => {
    it('returns accessibility reduced motion setting', () => {
      accessibilityStore.setReducedMotion(true);
      expect(get(effectiveReducedMotion)).toBe(true);
    });

    it('returns false when reduced motion is disabled', () => {
      accessibilityStore.setReducedMotion(false);
      expect(get(effectiveReducedMotion)).toBe(false);
    });
  });

  describe('effectiveColorBlindMode', () => {
    it('returns accessibility color blind mode', () => {
      accessibilityStore.setColorBlindMode('protanopia');
      expect(get(effectiveColorBlindMode)).toBe('protanopia');
    });
  });

  describe('effectivePerformanceTier', () => {
    it('returns user-set tier when userOverride is true', () => {
      performanceStore.setPerformanceTier('high');
      expect(get(effectivePerformanceTier)).toBe('high');
    });

    it('returns medium when userOverride is false', () => {
      performanceStore.enableAutoPerformanceDetect();
      expect(get(effectivePerformanceTier)).toBe('medium');
    });
  });

  describe('effectiveVirtualization', () => {
    it('returns performance virtualization setting', () => {
      performanceStore.setVirtualization(true);
      expect(get(effectiveVirtualization)).toBe(true);
    });

    it('returns false when virtualization is disabled', () => {
      performanceStore.setVirtualization(false);
      expect(get(effectiveVirtualization)).toBe(false);
    });
  });

  describe('effectiveReduceAnimations', () => {
    it('returns true when accessibility reduced motion is enabled', () => {
      accessibilityStore.setReducedMotion(true);
      expect(get(effectiveReduceAnimations)).toBe(true);
    });

    it('returns true when performance reduceAnimations is enabled', () => {
      accessibilityStore.setReducedMotion(false);
      performanceStore.setReduceAnimations(true);
      expect(get(effectiveReduceAnimations)).toBe(true);
    });

    it('returns true when tier is low', () => {
      accessibilityStore.setReducedMotion(false);
      performanceStore.setPerformanceTier('low');
      expect(get(effectiveReduceAnimations)).toBe(true);
    });

    it('returns false when no animation reduction is needed', () => {
      accessibilityStore.setReducedMotion(false);
      performanceStore.setReduceAnimations(false);
      performanceStore.setPerformanceTier('high');
      expect(get(effectiveReduceAnimations)).toBe(false);
    });
  });
});
