import type { GameState } from "./reducer";

export const selectPhase = (state: GameState): GameState["phase"] => state.phase;
export const selectEventCount = (state: GameState): number => state.events.length;
export const selectLastEventId = (state: GameState): string | null => state.lastEventId;
