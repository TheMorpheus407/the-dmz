export type ThreatTierLevel = 'low' | 'guarded' | 'elevated' | 'high' | 'severe';

export const THREAT_TIER_CONFIG: Record<
  ThreatTierLevel,
  {
    name: string;
    color: string;
    attacksPerDayMin: number;
    attacksPerDayMax: number;
    phishingRatio: number;
    difficultyMin: number;
    difficultyMax: number;
    availableVectors: AttackVector[];
    concurrentIncidentsMax: number;
    minimumDay: number;
    threatScoreThreshold: number;
  }
> = {
  low: {
    name: 'LOW',
    color: '#33ff33',
    attacksPerDayMin: 0,
    attacksPerDayMax: 1,
    phishingRatio: 0.2,
    difficultyMin: 1,
    difficultyMax: 2,
    availableVectors: ['email_phishing'],
    concurrentIncidentsMax: 0,
    minimumDay: 1,
    threatScoreThreshold: 0.0,
  },
  guarded: {
    name: 'GUARDED',
    color: '#3399ff',
    attacksPerDayMin: 1,
    attacksPerDayMax: 2,
    phishingRatio: 0.3,
    difficultyMin: 2,
    difficultyMax: 3,
    availableVectors: ['email_phishing', 'spear_phishing', 'credential_harvesting'],
    concurrentIncidentsMax: 1,
    minimumDay: 4,
    threatScoreThreshold: 0.2,
  },
  elevated: {
    name: 'ELEVATED',
    color: '#ffcc00',
    attacksPerDayMin: 2,
    attacksPerDayMax: 4,
    phishingRatio: 0.4,
    difficultyMin: 3,
    difficultyMax: 4,
    availableVectors: [
      'email_phishing',
      'spear_phishing',
      'credential_harvesting',
      'supply_chain',
      'insider_threat',
      'brute_force',
    ],
    concurrentIncidentsMax: 2,
    minimumDay: 10,
    threatScoreThreshold: 0.4,
  },
  high: {
    name: 'HIGH',
    color: '#ff6600',
    attacksPerDayMin: 4,
    attacksPerDayMax: 7,
    phishingRatio: 0.5,
    difficultyMin: 4,
    difficultyMax: 5,
    availableVectors: [
      'email_phishing',
      'spear_phishing',
      'credential_harvesting',
      'supply_chain',
      'insider_threat',
      'brute_force',
      'ddos',
      'apt_campaign',
      'coordinated_attack',
    ],
    concurrentIncidentsMax: 3,
    minimumDay: 20,
    threatScoreThreshold: 0.6,
  },
  severe: {
    name: 'SEVERE',
    color: '#ff0033',
    attacksPerDayMin: 6,
    attacksPerDayMax: 12,
    phishingRatio: 0.6,
    difficultyMin: 5,
    difficultyMax: 5,
    availableVectors: [
      'email_phishing',
      'spear_phishing',
      'credential_harvesting',
      'supply_chain',
      'insider_threat',
      'brute_force',
      'ddos',
      'apt_campaign',
      'coordinated_attack',
      'zero_day',
      'whaling',
    ],
    concurrentIncidentsMax: 5,
    minimumDay: 30,
    threatScoreThreshold: 0.8,
  },
};

export type AttackVector =
  | 'email_phishing'
  | 'spear_phishing'
  | 'credential_harvesting'
  | 'supply_chain'
  | 'insider_threat'
  | 'brute_force'
  | 'ddos'
  | 'apt_campaign'
  | 'coordinated_attack'
  | 'zero_day'
  | 'whaling'
  | 'bec';

export interface AttackTypeCatalogEntry {
  vector: AttackVector;
  name: string;
  description: string;
  mitreAttack: string;
  baseWeight: number;
  tierAvailability: Record<ThreatTierLevel, boolean>;
}

export const ATTACK_CATALOG: AttackTypeCatalogEntry[] = [
  {
    vector: 'email_phishing',
    name: 'Bulk Email Phishing',
    description: 'Mass-distributed fraudulent access requests',
    mitreAttack: 'T1566',
    baseWeight: 0.25,
    tierAvailability: {
      low: true,
      guarded: true,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'spear_phishing',
    name: 'Spear Phishing',
    description: 'Targeted attacks referencing real clients and events',
    mitreAttack: 'T1566.001',
    baseWeight: 0.2,
    tierAvailability: {
      low: false,
      guarded: true,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'credential_harvesting',
    name: 'Credential Harvesting',
    description: 'Emails directing to fake login pages',
    mitreAttack: 'T1566.002,T1078',
    baseWeight: 0.15,
    tierAvailability: {
      low: false,
      guarded: true,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'supply_chain',
    name: 'Supply Chain Attack',
    description: 'Malware hidden in client backup data',
    mitreAttack: 'T1195',
    baseWeight: 0.15,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'insider_threat',
    name: 'Insider Threat',
    description: 'Compromised client behaving anomalously',
    mitreAttack: 'T1078,T1098',
    baseWeight: 0.1,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'brute_force',
    name: 'Brute Force Attack',
    description: 'Automated credential guessing attacks',
    mitreAttack: 'T1110',
    baseWeight: 0.1,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'ddos',
    name: 'DDoS Attack',
    description: 'Volumetric attacks overwhelming bandwidth',
    mitreAttack: 'T1498',
    baseWeight: 0.05,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: false,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'apt_campaign',
    name: 'APT Campaign',
    description: 'Multi-phase coordinated operations',
    mitreAttack: 'TA0043-TA0040',
    baseWeight: 0.05,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: false,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'coordinated_attack',
    name: 'Coordinated Multi-Vector',
    description: 'Simultaneous attacks across multiple vectors',
    mitreAttack: 'TA0001-TA0040',
    baseWeight: 0.05,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: false,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'zero_day',
    name: 'Zero-Day Exploit',
    description: 'Novel attack patterns exploiting unknown vulnerabilities',
    mitreAttack: 'T1190',
    baseWeight: 0.05,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: false,
      high: false,
      severe: true,
    },
  },
  {
    vector: 'whaling',
    name: 'Whaling Attack',
    description: 'Ultra-targeted attacks on highest-value entities',
    mitreAttack: 'T1566,T1656',
    baseWeight: 0.05,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: true,
      high: true,
      severe: true,
    },
  },
  {
    vector: 'bec',
    name: 'Business Email Compromise',
    description: 'Impersonation of authority figures',
    mitreAttack: 'T1656,T1534',
    baseWeight: 0.1,
    tierAvailability: {
      low: false,
      guarded: false,
      elevated: true,
      high: true,
      severe: true,
    },
  },
];

export interface ThreatTierTransition {
  fromTier: ThreatTierLevel;
  toTier: ThreatTierLevel;
  reason: string;
  holdDaysMin: number;
}

export const THREAT_TIER_TRANSITIONS: ThreatTierTransition[] = [
  {
    fromTier: 'low',
    toTier: 'guarded',
    reason: 'narrative',
    holdDaysMin: 2,
  },
  {
    fromTier: 'guarded',
    toTier: 'elevated',
    reason: 'narrative',
    holdDaysMin: 2,
  },
  {
    fromTier: 'elevated',
    toTier: 'high',
    reason: 'narrative',
    holdDaysMin: 2,
  },
  {
    fromTier: 'high',
    toTier: 'severe',
    reason: 'narrative',
    holdDaysMin: 2,
  },
];

export interface PlayerBehaviorProfile {
  detectionRateByCategory: Record<AttackVector, number>;
  falsePositiveRate: number;
  responseTimeByCategory: Record<AttackVector, number>;
  streakCorrect: number;
  streakIncorrect: number;
  verificationDepth: number;
  headerCheckRate: number;
  urlInspectionRate: number;
  crossReferenceRate: number;
  securityToolCoverage: number;
  toolMaintenanceLevel: number;
  financialReserve: number;
  capacityUtilization: number;
}

export const createInitialPlayerBehaviorProfile = (): PlayerBehaviorProfile => ({
  detectionRateByCategory: {
    email_phishing: 0.5,
    spear_phishing: 0.5,
    credential_harvesting: 0.5,
    supply_chain: 0.5,
    insider_threat: 0.5,
    brute_force: 0.5,
    ddos: 0.5,
    apt_campaign: 0.5,
    coordinated_attack: 0.5,
    zero_day: 0.5,
    whaling: 0.5,
    bec: 0.5,
  },
  falsePositiveRate: 0.1,
  responseTimeByCategory: {
    email_phishing: 30,
    spear_phishing: 30,
    credential_harvesting: 30,
    supply_chain: 30,
    insider_threat: 30,
    brute_force: 30,
    ddos: 30,
    apt_campaign: 30,
    coordinated_attack: 30,
    zero_day: 30,
    whaling: 30,
    bec: 30,
  },
  streakCorrect: 0,
  streakIncorrect: 0,
  verificationDepth: 0,
  headerCheckRate: 0,
  urlInspectionRate: 0,
  crossReferenceRate: 0,
  securityToolCoverage: 0,
  toolMaintenanceLevel: 0,
  financialReserve: 0.5,
  capacityUtilization: 0.5,
});

export interface GeneratedAttack {
  attackId: string;
  vector: AttackVector;
  difficulty: number;
  faction: string;
  timestamp: string;
  isCampaignPart: boolean;
  campaignId?: string;
}

export interface ThreatTierChangeEvent {
  sessionId: string;
  previousTier: ThreatTierLevel;
  newTier: ThreatTierLevel;
  reason: string;
  narrativeMessage: string;
}

export const NARRATIVE_MESSAGES: Record<
  'escalation' | 'deescalation' | 'breathing_room',
  Record<ThreatTierLevel, string>
> = {
  escalation: {
    low: 'A new day dawns on the network. But shadows gather.',
    guarded:
      'Our intelligence network reports increased adversary coordination. Threat level elevated to GUARDED.',
    elevated: 'Multiple threat vectors active. Trust nothing. Threat level elevated to ELEVATED.',
    high: 'We are under coordinated assault. Every decision matters. Threat level elevated to HIGH.',
    severe: 'This is it. Everything we have built is on the line. Threat level elevated to SEVERE.',
  },
  deescalation: {
    low: 'The network is quiet. Threat actors are regrouping elsewhere.',
    guarded: 'Intelligence suggests the probing has subsided. Threat level reduced to GUARDED.',
    elevated:
      'The attackers appear to be regrouping. Use this time wisely. Threat level reduced to ELEVATED.',
    high: 'The storm has passed for now. But they will be back. Threat level reduced to HIGH.',
    severe: 'The worst has passed. We breathe again. Threat level reduced to SEVERE.',
  },
  breathing_room: {
    low: 'Quiet on the wire. Almost too quiet.',
    guarded: 'A moment of calm. Review your defenses.',
    elevated: 'The pressure eases. Morpheus notes the temporary reprieve.',
    high: 'The coordinated assault subsides. Recovery is possible.',
    severe: 'The siege breaks. We have a chance to rebuild.',
  },
};

export const getThreatTierByScore = (score: number, minimumDay: number): ThreatTierLevel => {
  const tierThresholds: Array<{ tier: ThreatTierLevel; threshold: number; minDay: number }> = [
    { tier: 'severe', threshold: 0.8, minDay: 30 },
    { tier: 'high', threshold: 0.6, minDay: 20 },
    { tier: 'elevated', threshold: 0.4, minDay: 10 },
    { tier: 'guarded', threshold: 0.2, minDay: 4 },
    { tier: 'low', threshold: 0.0, minDay: 1 },
  ];

  for (const { tier, threshold, minDay } of tierThresholds) {
    if (score >= threshold && minimumDay >= minDay) {
      return tier;
    }
  }
  return 'low';
};

export const calculateThreatScore = (params: {
  narrativeProgress: number;
  playerCompetence: number;
  facilityScale: number;
  eventTriggers: number;
}): number => {
  const w1 = 0.35;
  const w2 = 0.25;
  const w3 = 0.25;
  const w4 = 0.15;

  return (
    w1 * params.narrativeProgress +
    w2 * params.playerCompetence +
    w3 * params.facilityScale +
    w4 * params.eventTriggers
  );
};

export const calculatePlayerCompetence = (profile: PlayerBehaviorProfile): number => {
  const avgDetectionRate =
    Object.values(profile.detectionRateByCategory).reduce((a, b) => a + b, 0) /
    Object.keys(profile.detectionRateByCategory).length;

  const normalizedResponseTime = Math.max(
    0,
    1 -
      Math.min(
        1,
        Object.values(profile.responseTimeByCategory).reduce((a, b) => a + b, 0) / 12 / 60,
      ),
  );

  return (
    0.25 * avgDetectionRate +
    0.15 * (profile.verificationDepth / 5) +
    0.1 * (1 - profile.falsePositiveRate) +
    0.15 * normalizedResponseTime +
    0.1 * profile.securityToolCoverage +
    0.1 * profile.toolMaintenanceLevel +
    0.1 * profile.crossReferenceRate +
    0.05 * (profile.streakCorrect / (profile.streakCorrect + profile.streakIncorrect + 1))
  );
};
