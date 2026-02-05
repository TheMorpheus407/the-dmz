export type GameEventType = "session_started" | "action_submitted" | "state_reconciled";

export interface GameEvent {
  id: string;
  type: GameEventType;
  occurredAt: string;
  payload: Record<string, unknown>;
}
