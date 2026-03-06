export type BreachSeverity = 1 | 2 | 3 | 4;

export type BreachTriggerType =
  | 'accepted_phishing_email'
  | 'undetected_supply_chain_malware'
  | 'successful_credential_harvest'
  | 'brute_force_success'
  | 'insider_compromise'
  | 'campaign_objective_achieved'
  | 'zero_day_exploit'
  | 'ddos_secondary_attack';

export const BREACH_TRIGGER_TYPES: BreachTriggerType[] = [
  'accepted_phishing_email',
  'undetected_supply_chain_malware',
  'successful_credential_harvest',
  'brute_force_success',
  'insider_compromise',
  'campaign_objective_achieved',
  'zero_day_exploit',
  'ddos_secondary_attack',
];

export interface BreachTriggerCondition {
  triggerType: BreachTriggerType;
  description: string;
  severity: BreachSeverity;
  attackDifficulty?: number;
}

export const BREACH_TRIGGER_CONDITIONS: Record<BreachTriggerType, BreachTriggerCondition> = {
  accepted_phishing_email: {
    triggerType: 'accepted_phishing_email',
    description: 'Player approved a malicious access request',
    severity: 3,
    attackDifficulty: 4,
  },
  undetected_supply_chain_malware: {
    triggerType: 'undetected_supply_chain_malware',
    description: 'Dormant malware in accepted data activates',
    severity: 3,
    attackDifficulty: 3,
  },
  successful_credential_harvest: {
    triggerType: 'successful_credential_harvest',
    description: 'Attacker uses stolen credentials to gain access',
    severity: 3,
    attackDifficulty: 3,
  },
  brute_force_success: {
    triggerType: 'brute_force_success',
    description: 'Automated attack succeeds against weak authentication',
    severity: 2,
    attackDifficulty: 2,
  },
  insider_compromise: {
    triggerType: 'insider_compromise',
    description: 'Compromised client exfiltrates data',
    severity: 3,
    attackDifficulty: 4,
  },
  campaign_objective_achieved: {
    triggerType: 'campaign_objective_achieved',
    description: 'APT campaign reaches Actions on Objective phase',
    severity: 4,
    attackDifficulty: 5,
  },
  zero_day_exploit: {
    triggerType: 'zero_day_exploit',
    description: 'Unpatched security tool vulnerability exploited',
    severity: 3,
    attackDifficulty: 5,
  },
  ddos_secondary_attack: {
    triggerType: 'ddos_secondary_attack',
    description: 'DDoS distracts while real attack succeeds',
    severity: 3,
    attackDifficulty: 4,
  },
};

export interface BreachSeverityConfig {
  severity: BreachSeverity;
  isBreach: boolean;
  trustPenaltyMin: number;
  trustPenaltyMax: number;
  clientAttritionMin: number;
  clientAttritionMax: number;
  revenueDepressionDays: number;
  revenueDepressionPercent: number;
  recoveryDaysBase: number;
  requiresRansomNote: boolean;
  canCauseGameOver: boolean;
}

export const BREACH_SEVERITY_CONFIG: Record<BreachSeverity, BreachSeverityConfig> = {
  1: {
    severity: 1,
    isBreach: false,
    trustPenaltyMin: -5,
    trustPenaltyMax: -10,
    clientAttritionMin: 0,
    clientAttritionMax: 0.05,
    revenueDepressionDays: 1,
    revenueDepressionPercent: 0.1,
    recoveryDaysBase: 0,
    requiresRansomNote: false,
    canCauseGameOver: false,
  },
  2: {
    severity: 2,
    isBreach: false,
    trustPenaltyMin: -15,
    trustPenaltyMax: -30,
    clientAttritionMin: 0.1,
    clientAttritionMax: 0.2,
    revenueDepressionDays: 7,
    revenueDepressionPercent: 0.25,
    recoveryDaysBase: 2,
    requiresRansomNote: false,
    canCauseGameOver: false,
  },
  3: {
    severity: 3,
    isBreach: true,
    trustPenaltyMin: -30,
    trustPenaltyMax: -60,
    clientAttritionMin: 0.1,
    clientAttritionMax: 0.4,
    revenueDepressionDays: 30,
    revenueDepressionPercent: 0.5,
    recoveryDaysBase: 7,
    requiresRansomNote: true,
    canCauseGameOver: false,
  },
  4: {
    severity: 4,
    isBreach: true,
    trustPenaltyMin: -30,
    trustPenaltyMax: -60,
    clientAttritionMin: 0.3,
    clientAttritionMax: 0.4,
    revenueDepressionDays: 30,
    revenueDepressionPercent: 0.5,
    recoveryDaysBase: 7,
    requiresRansomNote: true,
    canCauseGameOver: true,
  },
};

export const SECURITY_TOOL_RECOVERY_REDUCTIONS: Record<string, number> = {
  backup_system: -2,
  incident_response: -1,
  siem: -1,
  edr: -1,
};

export interface PostBreachEffects {
  trustPenalty: number;
  clientAttritionPercent: number;
  revenueDepressionDays: number;
  revenueDepressionPercent: number;
  increasedScrutinyDays: number;
  reputationImpactDays: number;
  threatLevelDeescalationDays: number;
}

export const POST_BREACH_EFFECTS_DEFAULT: PostBreachEffects = {
  trustPenalty: -45,
  clientAttritionPercent: 0.25,
  revenueDepressionDays: 30,
  revenueDepressionPercent: 0.5,
  increasedScrutinyDays: 14,
  reputationImpactDays: 30,
  threatLevelDeescalationDays: 3,
};

export interface BreachState {
  hasActiveBreach: boolean;
  currentSeverity: BreachSeverity | null;
  ransomAmount: number | null;
  ransomDeadline: number | null;
  recoveryDaysRemaining: number | null;
  recoveryStartDay: number | null;
  totalLifetimeEarningsAtBreach: number | null;
  lastBreachDay: number | null;
  postBreachEffectsActive: boolean;
  revenueDepressionDaysRemaining: number | null;
  increasedScrutinyDaysRemaining: number | null;
  reputationImpactDaysRemaining: number | null;
  toolsRequireReverification: boolean;
  intelligenceRevealed: string[];
}

export const createInitialBreachState = (): BreachState => ({
  hasActiveBreach: false,
  currentSeverity: null,
  ransomAmount: null,
  ransomDeadline: null,
  recoveryDaysRemaining: null,
  recoveryStartDay: null,
  totalLifetimeEarningsAtBreach: null,
  lastBreachDay: null,
  postBreachEffectsActive: false,
  revenueDepressionDaysRemaining: null,
  increasedScrutinyDaysRemaining: null,
  reputationImpactDaysRemaining: null,
  toolsRequireReverification: false,
  intelligenceRevealed: [],
});

export interface BreachResult {
  breachOccurred: boolean;
  severity: BreachSeverity | null;
  triggerType: BreachTriggerType | null;
  trustPenalty: number;
  clientAttritionPercent: number;
  revenueDepressionDays: number;
  revenueDepressionPercent: number;
  recoveryDays: number;
  ransomAmount: number | null;
  requiresRansomNote: boolean;
  canCauseGameOver: boolean;
  narrativeMessage: string;
}

export function calculateRansomAmount(totalLifetimeEarnings: number): number {
  return Math.max(1, Math.ceil(totalLifetimeEarnings / 10));
}

export function calculateRecoveryDays(
  severity: BreachSeverity,
  securityTools: string[],
  staffLevel: number,
): number {
  const baseRecovery = BREACH_SEVERITY_CONFIG[severity].recoveryDaysBase;

  let reductions = 0;

  for (const tool of securityTools) {
    const reduction = SECURITY_TOOL_RECOVERY_REDUCTIONS[tool];
    if (reduction) {
      reductions += reduction;
    }
  }

  if (staffLevel > 3) {
    reductions -= 1;
  }

  return Math.max(1, baseRecovery + reductions);
}

export function calculateClientAttrition(severity: BreachSeverity, random: () => number): number {
  const config = BREACH_SEVERITY_CONFIG[severity];
  const range = config.clientAttritionMax - config.clientAttritionMin;
  return config.clientAttritionMin + random() * range;
}

export function calculateTrustPenalty(severity: BreachSeverity, random: () => number): number {
  const config = BREACH_SEVERITY_CONFIG[severity];
  const range = config.trustPenaltyMax - config.trustPenaltyMin;
  return config.trustPenaltyMin + random() * range;
}

export function canPayRansom(currentFunds: number, ransomAmount: number): boolean {
  return currentFunds >= ransomAmount;
}

export function determineBreachOutcome(
  canPay: boolean,
  canCauseGameOver: boolean,
): 'paid' | 'game_over' {
  if (canCauseGameOver && !canPay) {
    return 'game_over';
  }
  return 'paid';
}

export const BREACH_NARRATIVE_MESSAGES: Record<BreachSeverity, string> = {
  1: 'We caught it fast, but the fact it got through at all is a concern. Review what happened.',
  2: "We've been hit. Systems are compromised. I need you to contain this NOW.",
  3: 'CRITICAL: A breach has occurred. All operations are locked. A ransom note has been displayed.',
  4: 'SEVERE: Total compromise detected. This is it. Everything we have built is on the line.',
};

export const RANSOM_NOTE_TEMPLATE = `
╔══════════════════════════════════════════════════════════╗
║                                                       ║
║    ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ║
║    ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗  ║
║    ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔██╗ ║
║    ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╗║
║    ███████║   ██║   ███████║   ██║   ███████╗██║ ╚██║║
║    ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═║
║              YOUR SYSTEMS ARE ENCRYPTED                 ║
║                                                       ║
║  All data center operations have been locked.           ║
║  Client data is encrypted and inaccessible.            ║
║                                                       ║
║  To restore operations, transfer:                       ║
║                                                       ║
║              ██  {RANSOM_AMOUNT} CR  ██               ║
║                                                       ║
║  Your facility earnings to date: {LIFETIME_EARNINGS}  ║
║  Ransom calculated: {LIFETIME_EARNINGS} / 10           ║
║                                                       ║
║  Failure to pay will result in permanent data loss     ║
║  and operational shutdown.                             ║
║                                                       ║
║  ┌──────────────────┐  ┌───────────────────┐         ║
║  │  [PAY: {X} CR]   │  │  [CANNOT PAY]     │         ║
║  └──────────────────┘  └───────────────────┘         ║
╚══════════════════════════════════════════════════════════╝
`;

export const RECOVERY_NARRATIVE_MESSAGES: Record<number, string> = {
  1: 'Systems assessment underway. Cataloging affected assets.',
  2: 'Malware identified and isolated. Beginning eradication.',
  3: 'Core systems restored. Verifying data integrity.',
  4: 'Client data verification in progress. Some data unrecoverable.',
  5: 'Security patches applied. Hardening entry points.',
  6: 'Monitoring systems restored. Enhanced surveillance active.',
  7: 'Full operations restored. Post-incident review initiated.',
};
