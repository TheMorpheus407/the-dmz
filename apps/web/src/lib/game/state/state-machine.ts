export const gamePhases = [
  "DAY_START",
  "INBOX_INTAKE",
  "EMAIL_TRIAGE",
  "VERIFICATION_REVIEW",
  "DECISION_RESOLUTION",
  "CONSEQUENCE_APPLICATION",
  "THREAT_PROCESSING",
  "INCIDENT_RESPONSE",
  "RESOURCE_MANAGEMENT",
  "UPGRADE_PHASE",
  "DAY_END",
] as const;

export type GamePhase = (typeof gamePhases)[number];

export interface GameStateMachine {
  phase: GamePhase;
  canAdvance: boolean;
}

export const isTerminalPhase = (phase: GamePhase): boolean =>
  phase === "DAY_END";
