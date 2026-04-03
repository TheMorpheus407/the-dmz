import type { GamePhase } from '$lib/game/state/state-machine';
import type { ActivePanel } from '$lib/game/store/types';

export interface PhaseViewConfig {
  mainPanel: ActivePanel;
  showInbox: boolean;
  showEmail: boolean;
  showFacility: boolean;
  showWorksheet: boolean;
  showVerification: boolean;
  showDecision: boolean;
  showFeedback: boolean;
  showThreat: boolean;
  showDaySummary: boolean;
  showGameOver: boolean;
  transitionType: 'fade' | 'slide' | 'none';
}

export interface PhaseActionConfig {
  canSelectEmail: boolean;
  canOpenWorksheet: boolean;
  canRequestVerification: boolean;
  canMakeDecision: boolean;
  canViewResults: boolean;
  canContainThreat: boolean;
  canUpgradeFacility: boolean;
  canAdvanceDay: boolean;
  canRestart: boolean;
}

export interface PhaseKeyboardShortcutConfig {
  shortcuts: string[];
  description?: string;
}

export const phaseToViewMap: Record<GamePhase, PhaseViewConfig> = {
  DAY_START: {
    mainPanel: 'facility',
    showInbox: false,
    showEmail: false,
    showFacility: true,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  INBOX_INTAKE: {
    mainPanel: 'inbox',
    showInbox: true,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  EMAIL_TRIAGE: {
    mainPanel: 'inbox',
    showInbox: true,
    showEmail: true,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'slide',
  },
  VERIFICATION_REVIEW: {
    mainPanel: 'verification',
    showInbox: true,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: true,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'slide',
  },
  DECISION_RESOLUTION: {
    mainPanel: 'decision',
    showInbox: false,
    showEmail: true,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: true,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  CONSEQUENCE_APPLICATION: {
    mainPanel: 'feedback',
    showInbox: false,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: true,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  THREAT_PROCESSING: {
    mainPanel: 'threat',
    showInbox: false,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: true,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  INCIDENT_RESPONSE: {
    mainPanel: 'incident',
    showInbox: false,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: true,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'slide',
  },
  RESOURCE_MANAGEMENT: {
    mainPanel: 'facility',
    showInbox: false,
    showEmail: false,
    showFacility: true,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  UPGRADE_PHASE: {
    mainPanel: 'upgrades',
    showInbox: false,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: false,
    transitionType: 'fade',
  },
  DAY_END: {
    mainPanel: 'day-summary',
    showInbox: false,
    showEmail: false,
    showFacility: true,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: true,
    showGameOver: false,
    transitionType: 'fade',
  },
  GAME_OVER: {
    mainPanel: 'game-over',
    showInbox: false,
    showEmail: false,
    showFacility: false,
    showWorksheet: false,
    showVerification: false,
    showDecision: false,
    showFeedback: false,
    showThreat: false,
    showDaySummary: false,
    showGameOver: true,
    transitionType: 'fade',
  },
};

export const phaseToActionMap: Record<GamePhase, PhaseActionConfig> = {
  DAY_START: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: true,
    canAdvanceDay: true,
    canRestart: false,
  },
  INBOX_INTAKE: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  EMAIL_TRIAGE: {
    canSelectEmail: true,
    canOpenWorksheet: true,
    canRequestVerification: true,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  VERIFICATION_REVIEW: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: true,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  DECISION_RESOLUTION: {
    canSelectEmail: true,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: true,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  CONSEQUENCE_APPLICATION: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: true,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  THREAT_PROCESSING: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: true,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  INCIDENT_RESPONSE: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: true,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: false,
  },
  RESOURCE_MANAGEMENT: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: true,
    canAdvanceDay: false,
    canRestart: false,
  },
  UPGRADE_PHASE: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: false,
    canContainThreat: false,
    canUpgradeFacility: true,
    canAdvanceDay: false,
    canRestart: false,
  },
  DAY_END: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: true,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: true,
    canRestart: false,
  },
  GAME_OVER: {
    canSelectEmail: false,
    canOpenWorksheet: false,
    canRequestVerification: false,
    canMakeDecision: false,
    canViewResults: true,
    canContainThreat: false,
    canUpgradeFacility: false,
    canAdvanceDay: false,
    canRestart: true,
  },
};

export const phaseToShortcutsMap: Record<GamePhase, PhaseKeyboardShortcutConfig> = {
  DAY_START: {
    shortcuts: ['Enter', 'h', 'r'],
    description: 'Day start phase - view facility and advance',
  },
  INBOX_INTAKE: {
    shortcuts: ['r'],
    description: 'Inbox loading phase',
  },
  EMAIL_TRIAGE: {
    shortcuts: ['ArrowUp', 'ArrowDown', 'Enter', 'v', 'w', 'r', 'e', 'f', 'a', 'd', 'h'],
    description: 'Email triage phase - review and decide on emails',
  },
  VERIFICATION_REVIEW: {
    shortcuts: ['Tab', 'f', 'a', 'd', 'r', 'h'],
    description: 'Verification review phase',
  },
  DECISION_RESOLUTION: {
    shortcuts: ['a', 'd', 'f', 'Enter', 'h'],
    description: 'Decision resolution phase',
  },
  CONSEQUENCE_APPLICATION: {
    shortcuts: ['Enter', 'c', 'h'],
    description: 'Consequence application phase',
  },
  THREAT_PROCESSING: {
    shortcuts: ['i', 'c', 'r', 'h'],
    description: 'Threat processing phase',
  },
  INCIDENT_RESPONSE: {
    shortcuts: ['c', 'i', 'r', 'Escape', 'h'],
    description: 'Incident response phase',
  },
  RESOURCE_MANAGEMENT: {
    shortcuts: ['u', 'g', 'h', 'm', 'r'],
    description: 'Resource management phase',
  },
  UPGRADE_PHASE: {
    shortcuts: ['u', 'Enter', 'Escape', 'h', 'r'],
    description: 'Upgrade phase',
  },
  DAY_END: {
    shortcuts: ['Enter', 'd', 'n', 'h', 'r'],
    description: 'Day end phase - review and advance',
  },
  GAME_OVER: {
    shortcuts: ['r', 's', 'h'],
    description: 'Game over phase',
  },
};

export function getViewConfig(phase: GamePhase): PhaseViewConfig {
  return phaseToViewMap[phase] ?? phaseToViewMap.DAY_START;
}

export function getActionConfig(phase: GamePhase): PhaseActionConfig {
  return phaseToActionMap[phase] ?? phaseToActionMap.DAY_START;
}

export function getShortcutConfig(phase: GamePhase): PhaseKeyboardShortcutConfig {
  return phaseToShortcutsMap[phase] ?? phaseToShortcutsMap.DAY_START;
}
