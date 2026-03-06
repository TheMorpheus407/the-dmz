import type { TrustTier, EmailDifficulty } from './types.js';

const DIFFICULTY_MULTIPLIERS: Record<EmailDifficulty, number> = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.25,
  5: 1.5,
};

export function getTrustTier(trustScore: number): TrustTier {
  if (trustScore <= 50) return 'LOCKED';
  if (trustScore <= 100) return 'CRITICAL';
  if (trustScore <= 200) return 'LOW';
  if (trustScore <= 350) return 'MODERATE';
  if (trustScore <= 450) return 'HIGH';
  return 'ELITE';
}

export function calculateTrustChange(
  wasCorrect: boolean,
  decision: string,
  emailDifficulty: EmailDifficulty,
  isMalicious: boolean,
  isHighUrgency: boolean,
  backlogCount: number,
): number {
  const multiplier = DIFFICULTY_MULTIPLIERS[emailDifficulty];
  let change = 0;

  if (decision === 'defer' && isHighUrgency) {
    return -1;
  }

  if (wasCorrect) {
    if (decision === 'approve') {
      const baseMin = 1;
      const baseMax = 5;
      change = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * multiplier);
    } else if (decision === 'deny') {
      const baseMin = 1;
      const baseMax = 3;
      change = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * multiplier);
    } else if (decision === 'flag') {
      change = Math.round((1 + Math.random() * 2) * multiplier);
    }
  } else {
    if (isMalicious && decision === 'approve') {
      const baseMin = 5;
      const baseMax = 15;
      change = -Math.round((baseMin + Math.random() * (baseMax - baseMin)) * multiplier);
    } else if (!isMalicious && decision === 'deny') {
      const baseMin = 2;
      const baseMax = 5;
      change = -Math.round((baseMin + Math.random() * (baseMax - baseMin)) * multiplier);
    } else if (decision === 'flag') {
      change = Math.round(-1 * multiplier);
    }
  }

  const backlogPenalty = calculateBacklogPenalty(backlogCount);
  change += backlogPenalty;

  return change;
}

export function calculateBacklogPenalty(backlogCount: number): number {
  if (backlogCount <= 3) return 0;
  return -(backlogCount - 3);
}

export function clampTrustScore(trustScore: number): number {
  if (trustScore < 0) return 0;
  if (trustScore > 500) return 500;
  return trustScore;
}

export function isTrustAtWarning(trustScore: number): boolean {
  return trustScore < 100;
}

export function calculateTrustFromDecisionEvaluation(
  trustImpact: number,
  _wasCorrect: boolean,
  decision: string,
  emailDifficulty: EmailDifficulty,
): number {
  const multiplier = DIFFICULTY_MULTIPLIERS[emailDifficulty];
  const baseChange = trustImpact;
  const scaledChange = Math.round(baseChange * multiplier);

  if (decision === 'defer') {
    return -1;
  }

  return scaledChange;
}
