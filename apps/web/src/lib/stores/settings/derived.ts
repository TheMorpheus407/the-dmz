import { derived } from 'svelte/store';

import type { ThemeId } from '@the-dmz/shared/constants';

import { displayStore } from './display.store';
import { accessibilityStore } from './accessibility.store';
import { performanceStore } from './performance.store';

export const effectiveTheme = derived(
  [displayStore, accessibilityStore],
  ([$display, $accessibility]) => {
    if ($accessibility.highContrast) {
      return 'high-contrast' as ThemeId;
    }
    return $display.theme;
  },
);

export const effectiveEffects = derived([displayStore, accessibilityStore], ([$display]) => {
  const theme = $display.theme;
  if (
    theme === 'high-contrast' ||
    theme === 'enterprise' ||
    theme === 'admin-light' ||
    theme === 'admin-dark'
  ) {
    return {
      scanlines: false,
      curvature: false,
      glow: false,
      noise: false,
      vignette: false,
      flicker: false,
    };
  }
  return $display.effects;
});

export const effectiveFontSize = derived(
  [displayStore, accessibilityStore],
  ([, $accessibility]) => {
    return $accessibility.fontSize;
  },
);

export const effectiveReducedMotion = derived(accessibilityStore, ($accessibility) => {
  return $accessibility.reducedMotion;
});

export const effectiveColorBlindMode = derived(accessibilityStore, ($accessibility) => {
  return $accessibility.colorBlindMode;
});

export const effectivePerformanceTier = derived(performanceStore, ($performance) => {
  if ($performance.userOverride) {
    return $performance.tier;
  }
  return 'medium';
});

export const effectiveVirtualization = derived(performanceStore, ($performance) => {
  return $performance.enableVirtualization;
});

export const effectiveReduceAnimations = derived(
  [accessibilityStore, performanceStore],
  ([$accessibility, $performance]) => {
    if ($accessibility.reducedMotion) {
      return true;
    }
    return $performance.reduceAnimations || $performance.tier === 'low';
  },
);
