import type { GameEvent } from "../state/events";
import type { GameState } from "../state/reducer";
import { replayEvents } from "./replay";

export interface SyncResult {
  state: GameState;
  events: GameEvent[];
}

export const reconcileState = (serverEvents: GameEvent[]): SyncResult => ({
  state: replayEvents(serverEvents),
  events: serverEvents
});
