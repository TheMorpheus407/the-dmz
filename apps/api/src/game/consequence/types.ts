export type DecisionType = 'approve' | 'deny' | 'flag' | 'verify' | 'defer';

export type EmailDifficulty = 1 | 2 | 3 | 4 | 5;

export type ClientTier = 1 | 2 | 3 | 4;

export type TrustTier = 'LOCKED' | 'CRITICAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'ELITE';

export type PlayerLevel =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50;

export type PlayerTitle =
  | 'Intern'
  | 'Junior Analyst'
  | 'Analyst'
  | 'Senior Analyst'
  | 'Team Lead'
  | 'Security Engineer'
  | 'Senior Security Engineer'
  | 'Security Manager'
  | 'Senior Security Manager'
  | 'Security Director'
  | 'VP of Security'
  | 'CISO'
  | 'Chief Security Architect'
  | 'Security Partner'
  | 'Executive Security Advisor'
  | 'Security Visionary'
  | 'Industry Legend';

export type FactionTier = 'HOSTILE' | 'UNFRIENDLY' | 'NEUTRAL' | 'FRIENDLY' | 'ALLIED';

export const CANONICAL_FACTIONS = [
  'sovereign_compact',
  'librarian_network',
  'red_hand',
  'circuit_syndicate',
  'unaffiliated',
] as const;

export type CanonicalFaction = (typeof CANONICAL_FACTIONS)[number];

export const TRUST_RANGES: Record<TrustTier, { min: number; max: number }> = {
  LOCKED: { min: 0, max: 50 },
  CRITICAL: { min: 51, max: 100 },
  LOW: { min: 101, max: 200 },
  MODERATE: { min: 201, max: 350 },
  HIGH: { min: 351, max: 450 },
  ELITE: { min: 451, max: Infinity },
};

export const FACTION_TIERS: Record<FactionTier, { min: number; max: number }> = {
  HOSTILE: { min: -100, max: -50 },
  UNFRIENDLY: { min: -49, max: -10 },
  NEUTRAL: { min: -9, max: 9 },
  FRIENDLY: { min: 10, max: 49 },
  ALLIED: { min: 50, max: 100 },
};

export const TRUST_SCORE_CONFIG = {
  STARTING_VALUE: 250,
  MIN_VALUE: 0,
  MAX_VALUE: 500,
  WARNING_THRESHOLD: 100,
  DIFFICULTY_MULTIPLIERS: {
    1: 0.5,
    2: 0.75,
    3: 1.0,
    4: 1.25,
    5: 1.5,
  },
  CORRECT_APPROVAL: { min: 1, max: 5 },
  CORRECT_DENIAL: { min: 1, max: 3 },
  FALSE_POSITIVE: { min: -15, max: -5 },
  FALSE_NEGATIVE: { min: -5, max: -2 },
  DEFER_HIGH_URGENCY: -1,
  BACKLOG_PENALTY_PER_EMAIL: -1,
  BACKLOG_THRESHOLD: 3,
} as const;

export const FUNDS_CONFIG = {
  STARTING_VALUE: 10000,
  MIN_VALUE: 0,
  WARNING_THRESHOLD: 1000,
  CLIENT_TIER_REVENUE: {
    1: 50,
    2: 150,
    3: 300,
    4: 500,
  },
  BREACH_PENALTY: {
    MIN: -10000,
    MAX: -1000,
  },
  OPERATIONAL_COST: {
    MIN: -100,
    MAX: -10,
  },
} as const;

export const FACTION_CONFIG = {
  STARTING_VALUE: 0,
  HOME_FACTION_STARTING_VALUE: 10,
  MIN_VALUE: -100,
  MAX_VALUE: 100,
  ALIGNED_APPROVAL: { min: 5, max: 15 },
  ALIGNED_DENIAL: { min: -5, max: -10 },
  BREACH_IMPACT: { min: -30, max: -10 },
  UPGRADE_BONUS: { min: 5, max: 20 },
} as const;

export const BACKLOG_CONFIG = {
  PENALTY_THRESHOLD: 3,
  INCIDENT_THRESHOLD: 10,
  PENALTY_PER_EMAIL: -1,
} as const;

export const PLAYER_LEVEL_CONFIG = {
  STARTING_LEVEL: 1,
  STARTING_XP: 0,
  MAX_NORMAL_LEVEL: 30,
  MAX_PRESTIGE_LEVEL: 50,
  XP_PER_CORRECT_DECISION: 10,
  XP_PER_INCIDENT_RESOLVED: 25,
  XP_PER_LEVEL_UP_BASE: 100,
  XP_PER_LEVEL_UP_MULTIPLIER: 1.5,
} as const;

export const LEVEL_TITLES: Record<number, PlayerTitle> = {
  1: 'Intern',
  2: 'Junior Analyst',
  3: 'Analyst',
  4: 'Senior Analyst',
  5: 'Team Lead',
  6: 'Security Engineer',
  7: 'Senior Security Engineer',
  8: 'Security Manager',
  9: 'Senior Security Manager',
  10: 'Security Director',
  11: 'VP of Security',
  12: 'CISO',
  13: 'Chief Security Architect',
  14: 'Security Partner',
  15: 'Executive Security Advisor',
  16: 'Security Visionary',
  17: 'Industry Legend',
  18: 'Industry Legend',
  19: 'Industry Legend',
  20: 'Industry Legend',
  21: 'Industry Legend',
  22: 'Industry Legend',
  23: 'Industry Legend',
  24: 'Industry Legend',
  25: 'Industry Legend',
  26: 'Industry Legend',
  27: 'Industry Legend',
  28: 'Industry Legend',
  29: 'Industry Legend',
  30: 'Industry Legend',
  31: 'Industry Legend',
  32: 'Industry Legend',
  33: 'Industry Legend',
  34: 'Industry Legend',
  35: 'Industry Legend',
  36: 'Industry Legend',
  37: 'Industry Legend',
  38: 'Industry Legend',
  39: 'Industry Legend',
  40: 'Industry Legend',
  41: 'Industry Legend',
  42: 'Industry Legend',
  43: 'Industry Legend',
  44: 'Industry Legend',
  45: 'Industry Legend',
  46: 'Industry Legend',
  47: 'Industry Legend',
  48: 'Industry Legend',
  49: 'Industry Legend',
  50: 'Industry Legend',
};

export interface ConsequenceInput {
  decisionId: string;
  emailId: string;
  decision: DecisionType;
  wasCorrect: boolean;
  isMalicious: boolean;
  emailDifficulty: EmailDifficulty;
  clientTier: ClientTier;
  factionId: string;
  isHighUrgency: boolean;
  trustImpact: number;
  fundsImpact: number;
  factionImpact: number;
}

export interface ConsequenceResult {
  trustChange: number;
  fundsChange: number;
  factionChanges: Record<string, number>;
  backlogPressure: number;
  events: DomainEvent[];
  warnings: string[];
}

export interface DaySummary {
  trustDelta: number;
  fundsDelta: number;
  factionDeltas: Record<string, number>;
  incidentsResolved: number;
  narrativeNotes: string[];
}

export interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface BacklogState {
  totalUnresolved: number;
  accumulatedPenalty: number;
  shouldCreateIncident: boolean;
}

export interface BreachConsequenceInput {
  severity: number;
  involvedFactions: string[];
}

export interface OperationalCostInput {
  operatingCost: number;
  facilityTier: string;
}
