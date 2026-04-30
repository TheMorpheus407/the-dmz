export type QualityFlagType =
  | 'poor_grammar'
  | 'inconsistent_faction'
  | 'too_obvious'
  | 'too_vague'
  | 'repetitive_pattern'
  | 'missing_indicators';

export interface QualityScoreBreakdown {
  narrativePlausibility: number;
  grammarClarity: number;
  attackAlignment: number;
  signalDiversity: number;
  learnability: number;
}

export interface QualityScoreResult {
  overall: number;
  breakdown: QualityScoreBreakdown;
  flags: QualityFlagType[];
  recommendations: string[];
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface QualityScoringInput {
  subject: string;
  body: string;
  fromName?: string | undefined;
  fromEmail?: string | undefined;
  replyTo?: string | undefined;
  headers?: Record<string, string> | undefined;
  faction?: string | undefined;
  attackType?: string | undefined;
  difficulty?: number | undefined;
  worldState?:
    | {
        day?: number | undefined;
        threatLevel?: string | undefined;
        facilityTier?: number | undefined;
      }
    | undefined;
}

const WEIGHTS = {
  narrativePlausibility: 0.25,
  grammarClarity: 0.2,
  attackAlignment: 0.2,
  signalDiversity: 0.2,
  learnability: 0.15,
} as const;

const VALID_FACTIONS = [
  'Sovereign Compact',
  'Nexion Industries',
  'Librarians',
  'Hacktivists',
  'Criminal Networks',
] as const;

const VALID_ATTACK_TYPES = [
  'phishing',
  'spear_phishing',
  'bec',
  'credential_harvesting',
  'malware_delivery',
  'pretexting',
  'supply_chain',
  'ransomware',
  'insider',
] as const;

const GRAMMAR_ERROR_PATTERNS = [
  /\b(their|there|they're)\b/gi,
  /\b(its|it's)\b/gi,
  /\b(your|you're)\b/gi,
  /\b(to|too|two)\b/gi,
  /\b(then|than)\b/gi,
  /\b(could of|would of|should of)\b/gi,
  /\b(alot)\b/gi,
  /\s{2,}/g,
  /[.!?]{2,}/g,
];

const REPETITIVE_PATTERNS = [
  /(urgent|immediately|now)\s+(urgent|immediately|now)/gi,
  /(click here|click now|click below)\s+(click here|click now|click below)/gi,
  /(account|password|credential)\s+(account|password|credential)/gi,
];

const VAGUENESS_INDICATORS = [
  'contact support',
  'for more information',
  'please understand',
  'do the needful',
  'at your earliest convenience',
  'kindly revert',
];

const SIGNAL_INDICATORS = [
  'mismatched domain',
  'unusual sender',
  'grammar error',
  'urgent tone',
  'suspicious link',
  'request for credentials',
  'unusual timing',
  'authority impersonation',
];

function checkGrammar(text: string): {
  score: number;
  flags: QualityFlagType[];
  recommendations: string[];
} {
  let errorCount = 0;
  const flags: QualityFlagType[] = [];
  const recommendations: string[] = [];

  for (const pattern of GRAMMAR_ERROR_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      errorCount += matches.length;
    }
  }

  const wordCount = text.split(/\s+/).length;
  const errorRate = wordCount > 0 ? errorCount / wordCount : 0;

  if (errorRate > 0.02) {
    flags.push('poor_grammar');
    recommendations.push('Review email for grammar and spelling errors');
  }

  const score = Math.max(0, 100 - errorCount * 15);
  return { score, flags, recommendations };
}

function assessNarrativePlausibility(input: QualityScoringInput): {
  score: number;
  flags: QualityFlagType[];
  recommendations: string[];
} {
  let score = 70;
  const flags: QualityFlagType[] = [];
  const recommendations: string[] = [];

  if (input.faction && !VALID_FACTIONS.includes(input.faction as (typeof VALID_FACTIONS)[number])) {
    flags.push('inconsistent_faction');
    recommendations.push('Use a valid faction from the game lore');
    score -= 20;
  }

  if (
    input.attackType &&
    !VALID_ATTACK_TYPES.includes(input.attackType as (typeof VALID_ATTACK_TYPES)[number])
  ) {
    flags.push('inconsistent_faction');
    recommendations.push('Use a valid attack type from DD-05');
    score -= 15;
  }

  if (input.worldState?.threatLevel) {
    const validThreatLevels = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'];
    if (!validThreatLevels.includes(input.worldState.threatLevel)) {
      score -= 10;
      recommendations.push('Use a valid threat level');
    }
  }

  const bodyLength = input.body?.length ?? 0;
  if (bodyLength < 50) {
    flags.push('too_vague');
    recommendations.push('Email body is too short for realistic content');
    score -= 15;
  } else if (bodyLength > 2000) {
    score -= 10;
    recommendations.push('Consider shortening the email for better pacing');
  }

  return { score: Math.min(100, Math.max(0, score)), flags, recommendations };
}

function assessSignalDiversity(body: string): {
  score: number;
  flags: QualityFlagType[];
  recommendations: string[];
} {
  let score = 70;
  const flags: QualityFlagType[] = [];
  const recommendations: string[] = [];

  const lowerBody = body.toLowerCase();

  for (const pattern of REPETITIVE_PATTERNS) {
    if (pattern.test(lowerBody)) {
      flags.push('repetitive_pattern');
      recommendations.push('Remove repetitive phrasing');
      score -= 20;
      break;
    }
  }

  let signalCount = 0;
  for (const signal of SIGNAL_INDICATORS) {
    if (lowerBody.includes(signal)) {
      signalCount++;
    }
  }

  if (signalCount === 0) {
    flags.push('missing_indicators');
    recommendations.push('Add more security indicators for training value');
    score -= 25;
  } else if (signalCount < 2) {
    score -= 10;
    recommendations.push('Consider adding more subtle indicators');
  }

  const uniqueWordRatio = new Set(body.toLowerCase().split(/\s+/)).size / body.split(/\s+/).length;
  if (uniqueWordRatio < 0.3) {
    flags.push('repetitive_pattern');
    recommendations.push('Increase vocabulary diversity');
    score -= 15;
  }

  return { score: Math.min(100, Math.max(0, score)), flags, recommendations };
}

function assessLearnability(
  body: string,
  difficulty?: number,
): { score: number; flags: QualityFlagType[]; recommendations: string[] } {
  let score = 70;
  const flags: QualityFlagType[] = [];
  const recommendations: string[] = [];

  const lowerBody = body.toLowerCase();
  let clearIndicatorCount = 0;
  let vagueIndicatorCount = 0;

  const clearIndicators = [
    'mismatch',
    'fake',
    'suspicious',
    'unauthorized',
    'verify',
    'confirm',
    'password',
    'credential',
  ];

  for (const indicator of clearIndicators) {
    if (lowerBody.includes(indicator)) {
      clearIndicatorCount++;
    }
  }

  for (const vague of VAGUENESS_INDICATORS) {
    if (lowerBody.includes(vague)) {
      vagueIndicatorCount++;
    }
  }

  if (vagueIndicatorCount > clearIndicatorCount && difficulty && difficulty <= 2) {
    flags.push('too_obvious');
    recommendations.push('For low difficulty, add more obvious indicators');
    score -= 20;
  } else if (clearIndicatorCount === 0 && difficulty && difficulty >= 4) {
    flags.push('too_vague');
    recommendations.push('For high difficulty, indicators should be more subtle');
    score -= 15;
  }

  if (clearIndicatorCount >= 2) {
    score += 15;
  }

  return { score: Math.min(100, Math.max(0, score)), flags, recommendations };
}

function assessAttackAlignment(
  body: string,
  attackType?: string,
): { score: number; flags: QualityFlagType[]; recommendations: string[] } {
  let score = 70;
  const flags: QualityFlagType[] = [];
  const recommendations: string[] = [];

  const lowerBody = body.toLowerCase();

  const attackTypeIndicators: Record<string, string[]> = {
    phishing: ['click', 'link', 'login', 'verify'],
    spear_phishing: ['specific', 'personal', 'targeted', 'name'],
    bec: ['wire transfer', 'payment', 'invoice', 'bank'],
    credential_harvesting: ['password', 'username', 'login', 'credential'],
    malware_delivery: ['attachment', 'download', 'file', 'document'],
    pretexting: ['urgent', 'authority', 'manager', 'ceo'],
    supply_chain: ['vendor', 'partner', 'third-party', 'supplier'],
    ransomware: ['encrypt', 'ransom', 'payment', 'bitcoin'],
    insider: ['internal', 'employee', 'contractor', 'privilege'],
  };

  if (attackType && attackTypeIndicators[attackType]) {
    const requiredIndicators = attackTypeIndicators[attackType];
    let matchedCount = 0;

    for (const indicator of requiredIndicators) {
      if (lowerBody.includes(indicator)) {
        matchedCount++;
      }
    }

    const matchRatio = matchedCount / requiredIndicators.length;
    score = 50 + matchRatio * 50;

    if (matchRatio < 0.25) {
      recommendations.push(`Add more indicators typical of ${attackType} attacks`);
    }
  }

  return { score: Math.min(100, Math.max(0, score)), flags, recommendations };
}

function calculateOverallScore(breakdown: QualityScoreBreakdown): number {
  const weighted =
    breakdown.narrativePlausibility * WEIGHTS.narrativePlausibility +
    breakdown.grammarClarity * WEIGHTS.grammarClarity +
    breakdown.attackAlignment * WEIGHTS.attackAlignment +
    breakdown.signalDiversity * WEIGHTS.signalDiversity +
    breakdown.learnability * WEIGHTS.learnability;

  return Math.round(weighted);
}

function classifyQualityScore(overall: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (overall >= 80) return 'excellent';
  if (overall >= 60) return 'good';
  if (overall >= 40) return 'fair';
  return 'poor';
}

export const scoreEmail = (input: QualityScoringInput): QualityScoreResult => {
  const allFlags: QualityFlagType[] = [];
  const allRecommendations: string[] = [];

  const grammarResult = checkGrammar(input.body);
  allFlags.push(...grammarResult.flags);
  allRecommendations.push(...grammarResult.recommendations);

  const narrativeResult = assessNarrativePlausibility(input);
  allFlags.push(...narrativeResult.flags);
  allRecommendations.push(...narrativeResult.recommendations);

  const signalResult = assessSignalDiversity(input.body);
  allFlags.push(...signalResult.flags);
  allRecommendations.push(...signalResult.recommendations);

  const learnabilityResult = assessLearnability(input.body, input.difficulty);
  allFlags.push(...learnabilityResult.flags);
  allRecommendations.push(...learnabilityResult.recommendations);

  const attackResult = assessAttackAlignment(input.body, input.attackType);
  allFlags.push(...attackResult.flags);
  allRecommendations.push(...attackResult.recommendations);

  const breakdown: QualityScoreBreakdown = {
    narrativePlausibility: narrativeResult.score,
    grammarClarity: grammarResult.score,
    attackAlignment: attackResult.score,
    signalDiversity: signalResult.score,
    learnability: learnabilityResult.score,
  };

  const overall = calculateOverallScore(breakdown);
  const status = classifyQualityScore(overall);

  const uniqueFlags = [...new Set(allFlags)];
  const uniqueRecommendations = [...new Set(allRecommendations)];

  return {
    overall,
    breakdown,
    flags: uniqueFlags,
    recommendations: uniqueRecommendations,
    status,
  };
};

export const scoreBatch = (emails: QualityScoringInput[]): QualityScoreResult[] => {
  return emails.map(scoreEmail);
};

export const WEIGHTS_CONFIG = WEIGHTS;
export const QUALITY_THRESHOLDS = {
  excellent: { min: 80, max: 100 },
  good: { min: 60, max: 79 },
  fair: { min: 40, max: 59 },
  poor: { min: 0, max: 39 },
} as const;
