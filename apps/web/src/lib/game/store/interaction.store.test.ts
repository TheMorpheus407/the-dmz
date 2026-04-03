import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { interactionStore } from './interaction.store';

describe('interactionStore', () => {
  beforeEach(() => {
    interactionStore.reset();
  });

  describe('hover state', () => {
    it('should have default hover state with null values', () => {
      const state = get(interactionStore);
      expect(state.hoverState.emailId).toBe(null);
      expect(state.hoverState.buttonId).toBe(null);
    });

    it('should set hover email', () => {
      interactionStore.setHoverEmail('email-1');
      const state = get(interactionStore);
      expect(state.hoverState.emailId).toBe('email-1');
    });

    it('should set hover email to null', () => {
      interactionStore.setHoverEmail('email-1');
      interactionStore.setHoverEmail(null);
      const state = get(interactionStore);
      expect(state.hoverState.emailId).toBe(null);
    });

    it('should set hover button', () => {
      interactionStore.setHoverButton('approve-btn');
      const state = get(interactionStore);
      expect(state.hoverState.buttonId).toBe('approve-btn');
    });

    it('should set hover button to null', () => {
      interactionStore.setHoverButton('approve-btn');
      interactionStore.setHoverButton(null);
      const state = get(interactionStore);
      expect(state.hoverState.buttonId).toBe(null);
    });

    it('should clear hover state', () => {
      interactionStore.setHoverEmail('email-1');
      interactionStore.setHoverButton('btn');
      interactionStore.clearHover();
      const state = get(interactionStore);
      expect(state.hoverState.emailId).toBe(null);
      expect(state.hoverState.buttonId).toBe(null);
    });
  });

  describe('focus state', () => {
    it('should have default focus state with null elementId', () => {
      const state = get(interactionStore);
      expect(state.focusState.elementId).toBe(null);
    });

    it('should set focus', () => {
      interactionStore.setFocus('email-input');
      const state = get(interactionStore);
      expect(state.focusState.elementId).toBe('email-input');
    });

    it('should set focus to null', () => {
      interactionStore.setFocus('email-input');
      interactionStore.setFocus(null);
      const state = get(interactionStore);
      expect(state.focusState.elementId).toBe(null);
    });

    it('should clear focus', () => {
      interactionStore.setFocus('email-input');
      interactionStore.clearFocus();
      const state = get(interactionStore);
      expect(state.focusState.elementId).toBe(null);
    });
  });

  describe('animation state', () => {
    it('should have default animation state', () => {
      const state = get(interactionStore);
      expect(state.animationState.isTransitioning).toBe(false);
      expect(state.animationState.transitionType).toBe('none');
    });

    it('should set transitioning state', () => {
      interactionStore.setTransitioning(true, 'fade');
      const state = get(interactionStore);
      expect(state.animationState.isTransitioning).toBe(true);
      expect(state.animationState.transitionType).toBe('fade');
    });

    it('should set slide transition', () => {
      interactionStore.setTransitioning(true, 'slide');
      const state = get(interactionStore);
      expect(state.animationState.transitionType).toBe('slide');
    });

    it('should set transitioning to false', () => {
      interactionStore.setTransitioning(true, 'fade');
      interactionStore.setTransitioning(false);
      const state = get(interactionStore);
      expect(state.animationState.isTransitioning).toBe(false);
    });

    it('should default transition type to none when not provided', () => {
      interactionStore.setTransitioning(true);
      const state = get(interactionStore);
      expect(state.animationState.transitionType).toBe('none');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should have keyboard shortcuts enabled by default', () => {
      const state = get(interactionStore);
      expect(state.keyboardShortcutsEnabled).toBe(true);
    });

    it('should disable keyboard shortcuts', () => {
      interactionStore.setKeyboardShortcutsEnabled(false);
      const state = get(interactionStore);
      expect(state.keyboardShortcutsEnabled).toBe(false);
    });

    it('should re-enable keyboard shortcuts', () => {
      interactionStore.setKeyboardShortcutsEnabled(false);
      interactionStore.setKeyboardShortcutsEnabled(true);
      const state = get(interactionStore);
      expect(state.keyboardShortcutsEnabled).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      interactionStore.setHoverEmail('email-1');
      interactionStore.setFocus('input');
      interactionStore.setTransitioning(true, 'fade');
      interactionStore.setKeyboardShortcutsEnabled(false);

      interactionStore.reset();

      const state = get(interactionStore);
      expect(state.hoverState.emailId).toBe(null);
      expect(state.hoverState.buttonId).toBe(null);
      expect(state.focusState.elementId).toBe(null);
      expect(state.animationState.isTransitioning).toBe(false);
      expect(state.animationState.transitionType).toBe('none');
      expect(state.keyboardShortcutsEnabled).toBe(true);
    });
  });
});
