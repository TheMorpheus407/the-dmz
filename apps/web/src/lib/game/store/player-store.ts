import { writable, derived, get } from 'svelte/store';

export interface PlayerState {
  trust: number;
  funds: number;
  intelFragments: number;
}

const initialState: PlayerState = {
  trust: 100,
  funds: 1000,
  intelFragments: 0,
};

function createPlayerStore() {
  const { subscribe, set, update } = writable<PlayerState>(initialState);

  return {
    subscribe,

    get(): PlayerState {
      return get({ subscribe });
    },

    setPlayer(trust: number, funds: number, intelFragments: number): void {
      update(() => ({
        trust,
        funds,
        intelFragments,
      }));
    },

    updatePlayer(partial: Partial<PlayerState>): void {
      update((state) => ({ ...state, ...partial }));
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const playerStore = createPlayerStore();

export const playerResources = derived(playerStore, ($player) => $player);
