import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  MACRO_STATE_TRANSITIONS,
  PHASE_TRANSITIONS,
  PHASE_LEGAL_ACTIONS,
  type SessionMacroState,
  type DayPhase,
  type GameActionType,
} from '@the-dmz/shared';

export {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  MACRO_STATE_TRANSITIONS,
  PHASE_TRANSITIONS,
  PHASE_LEGAL_ACTIONS,
  type SessionMacroState,
  type DayPhase,
  type GameActionType,
};

export class GameStateMachineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly fromState?: string,
    public readonly toState?: string,
  ) {
    super(message);
    this.name = 'GameStateMachineError';
  }
}

export const canTransitionMacroState = (
  from: SessionMacroState,
  to: SessionMacroState,
): boolean => {
  const allowedTransitions = MACRO_STATE_TRANSITIONS[from];
  return allowedTransitions.includes(to);
};

export const canTransitionPhase = (from: DayPhase, to: DayPhase): boolean => {
  const allowedTransitions = PHASE_TRANSITIONS[from];
  return allowedTransitions.includes(to);
};

export const isActionAllowedInPhase = (action: GameActionType, phase: DayPhase): boolean => {
  const legalActions = PHASE_LEGAL_ACTIONS[phase];
  return legalActions.includes(action);
};

export const getNextPhase = (currentPhase: DayPhase): DayPhase => {
  const transitions = PHASE_TRANSITIONS[currentPhase];
  if (transitions.length === 0) {
    throw new GameStateMachineError(
      `No transitions available from phase ${currentPhase}`,
      'NO_TRANSITIONS',
    );
  }
  return transitions[0] as DayPhase;
};

export const getInitialMacroState = (): SessionMacroState => {
  return SESSION_MACRO_STATES.SESSION_INIT;
};

export const getInitialPhase = (): DayPhase => {
  return DAY_PHASES.PHASE_DAY_START;
};

export const validateTransition = (
  macroState: SessionMacroState,
  newMacroState: SessionMacroState,
  phase: DayPhase,
  newPhase: DayPhase,
): void => {
  if (macroState !== newMacroState && !canTransitionMacroState(macroState, newMacroState)) {
    throw new GameStateMachineError(
      `Invalid macro state transition from ${macroState} to ${newMacroState}`,
      'INVALID_MACRO_TRANSITION',
      macroState,
      newMacroState,
    );
  }

  if (phase !== newPhase && !canTransitionPhase(phase, newPhase)) {
    throw new GameStateMachineError(
      `Invalid phase transition from ${phase} to ${newPhase}`,
      'INVALID_PHASE_TRANSITION',
      phase,
      newPhase,
    );
  }
};

export const getPhaseExitCondition = (phase: DayPhase): string => {
  switch (phase) {
    case DAY_PHASES.PHASE_TRIAGE:
      return 'All emails have explicit outcomes (approve, deny, flag, request_verification, or defer)';
    case DAY_PHASES.PHASE_DECISION:
      return 'All decisions validated';
    case DAY_PHASES.PHASE_CONSEQUENCES:
      return 'Consequences applied';
    case DAY_PHASES.PHASE_THREAT_PROCESSING:
      return 'Threats applied';
    case DAY_PHASES.PHASE_INCIDENT_RESPONSE:
      return 'No active incidents';
    case DAY_PHASES.PHASE_RESOURCE_MANAGEMENT:
      return 'Player exits dashboard';
    case DAY_PHASES.PHASE_UPGRADE:
      return 'Player exits catalog';
    case DAY_PHASES.PHASE_DAY_END:
      return 'Player confirms advance';
    case DAY_PHASES.PHASE_DAY_START:
      return 'Brief acknowledged';
    default:
      return 'Phase complete';
  }
};
