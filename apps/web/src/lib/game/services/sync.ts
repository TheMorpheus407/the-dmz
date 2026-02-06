import { replayEvents } from "./replay";

import type { GameEvent } from "../state/events";
import type { GameState } from "../state/reducer";

export interface SyncResult {
  state: GameState;
  events: GameEvent[];
}

export const reconcileState = (serverEvents: GameEvent[]): SyncResult => ({
  state: replayEvents(serverEvents),
  events: serverEvents,
});
