import { writable } from 'svelte/store';

import type { GamePhase } from '$lib/game/state/state-machine';
import { getViewConfig } from '$lib/game/state/phase-config';

import { navigationStore } from './navigation.store';
import { interactionStore } from './interaction.store';

interface PhaseState {
  currentPhase: GamePhase | null;
  previousPhase: GamePhase | null;
}

const initialState: PhaseState = {
  currentPhase: null,
  previousPhase: null,
};

function createPhaseStore() {
  const { subscribe, set, update } = writable<PhaseState>(initialState);

  return {
    subscribe,

    setPhase(phase: GamePhase) {
      update((state) => {
        const viewConfig = getViewConfig(phase);
        navigationStore.setActivePanel(viewConfig.mainPanel);
        interactionStore.setTransitioning(
          state.currentPhase !== null && state.currentPhase !== phase,
          viewConfig.transitionType,
        );
        return {
          previousPhase: state.currentPhase,
          currentPhase: phase,
        };
      });
    },

    clearPhase() {
      update((state) => ({
        previousPhase: state.currentPhase,
        currentPhase: null,
      }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const phaseStore = createPhaseStore();
