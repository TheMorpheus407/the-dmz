import { writable, derived, get } from 'svelte/store';

import type { GameThreatTier } from '@the-dmz/shared/game';

export interface ThreatState {
  level: GameThreatTier;
  activeIncidents: number;
}

const initialState: ThreatState = {
  level: 'low',
  activeIncidents: 0,
};

function createThreatStore() {
  const { subscribe, set, update } = writable<ThreatState>(initialState);

  return {
    subscribe,

    get(): ThreatState {
      return get({ subscribe });
    },

    setThreatLevel(level: GameThreatTier): void {
      update((state) => ({ ...state, level }));
    },

    setActiveIncidents(count: number): void {
      update((state) => ({ ...state, activeIncidents: count }));
    },

    updateThreat(partial: Partial<ThreatState>): void {
      update((state) => ({ ...state, ...partial }));
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const threatStore = createThreatStore();

export const threatLevel = derived(threatStore, ($threat) => $threat.level);
