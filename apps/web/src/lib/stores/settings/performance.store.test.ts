import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { performanceStore } from './performance.store';
import { defaultPerformanceSettings } from './defaults';

describe('performanceStore', () => {
  beforeEach(() => {
    performanceStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(performanceStore);
      expect(state.tier).toBe('medium');
      expect(state.userOverride).toBe(false);
      expect(state.autoDetect).toBe(true);
      expect(state.enableVirtualization).toBe(true);
      expect(state.reduceAnimations).toBe(false);
    });
  });

  describe('setPerformanceTier', () => {
    it('sets tier to low', () => {
      performanceStore.setPerformanceTier('low');
      const state = get(performanceStore);
      expect(state.tier).toBe('low');
      expect(state.userOverride).toBe(true);
    });

    it('sets tier to high', () => {
      performanceStore.setPerformanceTier('high');
      const state = get(performanceStore);
      expect(state.tier).toBe('high');
      expect(state.userOverride).toBe(true);
    });

    it('enables user override when setting tier', () => {
      performanceStore.enableAutoPerformanceDetect();
      expect(get(performanceStore).userOverride).toBe(false);

      performanceStore.setPerformanceTier('high');
      expect(get(performanceStore).userOverride).toBe(true);
    });
  });

  describe('enableAutoPerformanceDetect', () => {
    it('enables auto detect', () => {
      performanceStore.enableAutoPerformanceDetect();
      const state = get(performanceStore);
      expect(state.autoDetect).toBe(true);
      expect(state.userOverride).toBe(false);
    });

    it('disables user override when enabling auto detect', () => {
      performanceStore.setPerformanceTier('low');
      expect(get(performanceStore).userOverride).toBe(true);

      performanceStore.enableAutoPerformanceDetect();
      expect(get(performanceStore).userOverride).toBe(false);
    });
  });

  describe('setVirtualization', () => {
    it('enables virtualization', () => {
      performanceStore.setVirtualization(true);
      const state = get(performanceStore);
      expect(state.enableVirtualization).toBe(true);
    });

    it('disables virtualization', () => {
      performanceStore.setVirtualization(false);
      const state = get(performanceStore);
      expect(state.enableVirtualization).toBe(false);
    });
  });

  describe('setReduceAnimations', () => {
    it('enables reduced animations', () => {
      performanceStore.setReduceAnimations(true);
      const state = get(performanceStore);
      expect(state.reduceAnimations).toBe(true);
    });

    it('disables reduced animations', () => {
      performanceStore.setReduceAnimations(false);
      const state = get(performanceStore);
      expect(state.reduceAnimations).toBe(false);
    });
  });

  describe('updatePerformance', () => {
    it('updates multiple settings at once', () => {
      performanceStore.updatePerformance({
        tier: 'high',
        enableVirtualization: false,
      });
      const state = get(performanceStore);
      expect(state.tier).toBe('high');
      expect(state.enableVirtualization).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      performanceStore.setPerformanceTier('low');
      performanceStore.setVirtualization(false);
      performanceStore.setReduceAnimations(true);

      performanceStore.resetToDefaults();

      const state = get(performanceStore);
      expect(state).toEqual(defaultPerformanceSettings);
    });
  });
});
