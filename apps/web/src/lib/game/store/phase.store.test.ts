import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { phaseStore } from './phase.store';
import { navigationStore } from './navigation.store';
import { interactionStore } from './interaction.store';

describe('phaseStore', () => {
  beforeEach(() => {
    phaseStore.reset();
    navigationStore.reset();
    interactionStore.reset();
  });

  describe('setPhase', () => {
    it('should have null current and previous phase initially', () => {
      const state = get(phaseStore);
      expect(state.currentPhase).toBe(null);
      expect(state.previousPhase).toBe(null);
    });

    it('should set current phase', () => {
      phaseStore.setPhase('DAY_START');
      const state = get(phaseStore);
      expect(state.currentPhase).toBe('DAY_START');
    });

    it('should set previous phase when changing phases', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.setPhase('EMAIL_TRIAGE');
      const state = get(phaseStore);
      expect(state.currentPhase).toBe('EMAIL_TRIAGE');
      expect(state.previousPhase).toBe('DAY_START');
    });

    it('should call navigationStore.setActivePanel on phase change', () => {
      phaseStore.setPhase('DAY_START');
      const navState = get(navigationStore);
      expect(navState.activePanel).toBe('facility');
    });

    it('should call navigationStore.setActivePanel for EMAIL_TRIAGE', () => {
      phaseStore.setPhase('EMAIL_TRIAGE');
      const navState = get(navigationStore);
      expect(navState.activePanel).toBe('inbox');
    });

    it('should call navigationStore.setActivePanel for DAY_END', () => {
      phaseStore.setPhase('DAY_END');
      const navState = get(navigationStore);
      expect(navState.activePanel).toBe('day-summary');
    });

    it('should set transitioning state on phase change', () => {
      phaseStore.setPhase('DAY_START');
      const intState = get(interactionStore);
      expect(intState.animationState.isTransitioning).toBe(false);

      phaseStore.setPhase('EMAIL_TRIAGE');
      const intState2 = get(interactionStore);
      expect(intState2.animationState.isTransitioning).toBe(true);
      expect(intState2.animationState.transitionType).toBe('slide');
    });

    it('should not set transitioning when setting same phase', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.setPhase('DAY_START');
      const intState = get(interactionStore);
      expect(intState.animationState.isTransitioning).toBe(false);
    });

    it('should preserve transitioning with slide type for EMAIL_TRIAGE', () => {
      phaseStore.setPhase('EMAIL_TRIAGE');
      const intState = get(interactionStore);
      expect(intState.animationState.transitionType).toBe('slide');
    });

    it('should preserve transitioning with fade type for DAY_START', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.setPhase('DAY_END');
      const intState = get(interactionStore);
      expect(intState.animationState.transitionType).toBe('fade');
    });
  });

  describe('clearPhase', () => {
    it('should clear current phase but preserve previous', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.setPhase('EMAIL_TRIAGE');
      phaseStore.clearPhase();
      const state = get(phaseStore);
      expect(state.currentPhase).toBe(null);
      expect(state.previousPhase).toBe('EMAIL_TRIAGE');
    });

    it('should set previous phase to current when clearing', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.clearPhase();
      const state = get(phaseStore);
      expect(state.previousPhase).toBe('DAY_START');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      phaseStore.setPhase('DAY_START');
      phaseStore.setPhase('EMAIL_TRIAGE');
      phaseStore.reset();
      const state = get(phaseStore);
      expect(state.currentPhase).toBe(null);
      expect(state.previousPhase).toBe(null);
    });
  });

  describe('cross-store coordination', () => {
    it('should reset interaction store when phase is reset', () => {
      phaseStore.setPhase('EMAIL_TRIAGE');
      phaseStore.reset();
      const intState = get(interactionStore);
      expect(intState.animationState.isTransitioning).toBe(false);
    });
  });
});
