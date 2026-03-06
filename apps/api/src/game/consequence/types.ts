export type DecisionType = 'approve' | 'deny' | 'flag' | 'verify' | 'defer';

export type EmailDifficulty = 1 | 2 | 3 | 4 | 5;

export type ClientTier = 1 | 2 | 3 | 4;

export type TrustTier = 'LOCKED' | 'CRITICAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'ELITE';

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
