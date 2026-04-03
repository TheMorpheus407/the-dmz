import { writable } from 'svelte/store';

import type { HoverState, FocusState, AnimationState } from './types';

interface InteractionState {
  hoverState: HoverState;
  focusState: FocusState;
  animationState: AnimationState;
  keyboardShortcutsEnabled: boolean;
}

const initialState: InteractionState = {
  hoverState: { emailId: null, buttonId: null },
  focusState: { elementId: null },
  animationState: { isTransitioning: false, transitionType: 'none' },
  keyboardShortcutsEnabled: true,
};

function createInteractionStore() {
  const { subscribe, set, update } = writable<InteractionState>(initialState);

  return {
    subscribe,

    setHoverEmail(emailId: string | null) {
      update((state) => ({
        ...state,
        hoverState: { ...state.hoverState, emailId },
      }));
    },

    setHoverButton(buttonId: string | null) {
      update((state) => ({
        ...state,
        hoverState: { ...state.hoverState, buttonId },
      }));
    },

    clearHover() {
      update((state) => ({
        ...state,
        hoverState: { emailId: null, buttonId: null },
      }));
    },

    setFocus(elementId: string | null) {
      update((state) => ({
        ...state,
        focusState: { elementId },
      }));
    },

    clearFocus() {
      update((state) => ({
        ...state,
        focusState: { elementId: null },
      }));
    },

    setTransitioning(
      isTransitioning: boolean,
      transitionType: AnimationState['transitionType'] = 'none',
    ) {
      update((state) => ({
        ...state,
        animationState: { isTransitioning, transitionType },
      }));
    },

    setKeyboardShortcutsEnabled(enabled: boolean) {
      update((state) => ({
        ...state,
        keyboardShortcutsEnabled: enabled,
      }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const interactionStore = createInteractionStore();
