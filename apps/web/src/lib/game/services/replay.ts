import { initialGameState, reduceGameState } from "../state/reducer";

import type { GameEvent } from "../state/events";
import type { GameState } from "../state/reducer";

export const replayEvents = (events: GameEvent[]): GameState =>
  events.reduce(reduceGameState, initialGameState);
