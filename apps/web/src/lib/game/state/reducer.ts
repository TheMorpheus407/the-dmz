import type { GameEvent } from './events';
import type { GamePhase } from './state-machine';

export interface GameState {
  phase: GamePhase;
  events: GameEvent[];
  lastEventId: string | null;
}

export const initialGameState: GameState = {
  phase: 'DAY_START',
  events: [],
  lastEventId: null,
};

export const reduceGameState = (state: GameState, event: GameEvent): GameState => ({
  ...state,
  events: [...state.events, event],
  lastEventId: event.id,
});
