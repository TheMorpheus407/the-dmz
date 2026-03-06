import type { ClientTier } from './types.js';

const CLIENT_TIER_REVENUE: Record<ClientTier, number> = {
  1: 50,
  2: 150,
  3: 300,
  4: 500,
};

export function calculateRevenue(
  wasCorrect: boolean,
  decision: string,
  clientTier: ClientTier,
): number {
  if (!wasCorrect || decision !== 'approve') {
    return 0;
  }

  return CLIENT_TIER_REVENUE[clientTier];
}

export function calculateBreachPenalty(severity: number): number {
  const minPenalty = 1000;
  const maxPenalty = 10000;

  const severityNormalized = Math.min(Math.max(severity, 1), 10);
  const ratio = severityNormalized / 10;

  return -Math.round(minPenalty + (maxPenalty - minPenalty) * ratio);
}

export function calculateOperationalCost(operatingCost: number, facilityTier: string): number {
  const tierMultiplier: Record<string, number> = {
    basic: 1.0,
    standard: 1.2,
    advanced: 1.5,
    elite: 2.0,
  };

  const multiplier = tierMultiplier[facilityTier] ?? 1.0;
  return -Math.round(operatingCost * multiplier);
}

export function calculateFundsChange(
  wasCorrect: boolean,
  decision: string,
  clientTier: ClientTier,
  fundsImpact: number,
): number {
  if (decision === 'approve' && wasCorrect) {
    return CLIENT_TIER_REVENUE[clientTier];
  }

  return fundsImpact;
}

export function clampFunds(funds: number): number {
  if (funds < 0) return 0;
  return funds;
}

export function isFundsAtWarning(funds: number): boolean {
  return funds < 1000;
}

export function isFundsAtGameOver(funds: number): boolean {
  return funds <= 0;
}

export function calculateUpgradeCost(tierLevel: number): number {
  const baseCosts = [0, 5000, 15000, 35000, 75000];
  return baseCosts[Math.min(tierLevel, baseCosts.length - 1)] ?? 0;
}
