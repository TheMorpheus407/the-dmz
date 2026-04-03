import { writable, derived, get } from 'svelte/store';

import type { GamePhase } from '$lib/game/state/state-machine';

export interface SessionState {
  id: string | null;
  day: number;
  phase: GamePhase;
  startedAt: string | null;
}

const initialState: SessionState = {
  id: null,
  day: 0,
  phase: 'DAY_START' as GamePhase,
  startedAt: null,
};

function createSessionStore() {
  const { subscribe, set, update } = writable<SessionState>(initialState);

  return {
    subscribe,

    get(): SessionState {
      return get({ subscribe });
    },

    setSession(id: string, day: number, startedAt: string): void {
      update((state) => ({
        ...state,
        id,
        day,
        startedAt,
      }));
    },

    setPhase(phase: GamePhase): void {
      update((state) => ({ ...state, phase }));
    },

    advanceDay(): void {
      update((state) => ({
        ...state,
        day: state.day + 1,
        phase: 'DAY_START' as GamePhase,
      }));
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const sessionStore = createSessionStore();

export const currentPhase = derived(sessionStore, ($session) => $session.phase ?? null);

export const currentDay = derived(sessionStore, ($session) => $session.day ?? 0);
