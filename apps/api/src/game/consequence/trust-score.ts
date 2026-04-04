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
  if (decision === 'defer' && isHighUrgency) {
    return -1;
  }

  const multiplier = DIFFICULTY_MULTIPLIERS[emailDifficulty];

  const baseChange = wasCorrect
    ? calculateCorrectDecisionReward(decision, multiplier)
    : calculateIncorrectDecisionPenalty(decision, isMalicious, multiplier);

  const backlogPenalty = calculateBacklogPenalty(backlogCount);
  return baseChange + backlogPenalty;
}

function calculateCorrectDecisionReward(decision: string, multiplier: number): number {
  if (decision === 'approve') {
    return Math.round((1 + Math.random() * 4) * multiplier);
  }
  if (decision === 'deny') {
    return Math.round((1 + Math.random() * 2) * multiplier);
  }
  if (decision === 'flag') {
    return Math.round((1 + Math.random() * 2) * multiplier);
  }
  return 0;
}

function calculateIncorrectDecisionPenalty(
  decision: string,
  isMalicious: boolean,
  multiplier: number,
): number {
  if (isMalicious && decision === 'approve') {
    return -Math.round((5 + Math.random() * 10) * multiplier);
  }
  if (!isMalicious && decision === 'deny') {
    return -Math.round((2 + Math.random() * 3) * multiplier);
  }
  if (decision === 'flag') {
    return Math.round(-1 * multiplier);
  }
  return 0;
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
