import type { FactionTier, CanonicalFaction } from './types.js';

export function getFactionTier(relationValue: number): FactionTier {
  if (relationValue <= -50) return 'HOSTILE';
  if (relationValue <= -10) return 'UNFRIENDLY';
  if (relationValue <= 9) return 'NEUTRAL';
  if (relationValue <= 49) return 'FRIENDLY';
  return 'ALLIED';
}

export function calculateFactionChange(
  wasCorrect: boolean,
  decision: string,
  _factionId: string,
  isFactionAligned: boolean,
): number {
  if (!isFactionAligned) return 0;

  if (wasCorrect) {
    if (decision === 'approve') {
      return Math.round(5 + Math.random() * 10);
    } else if (decision === 'deny') {
      return Math.round(-5 - Math.random() * 5);
    }
  } else {
    if (decision === 'approve' && !isFactionAligned) {
      return Math.round(-5 - Math.random() * 5);
    } else if (decision === 'deny' && isFactionAligned) {
      return Math.round(3 + Math.random() * 5);
    }
  }

  return 0;
}

export function calculateBreachFactionImpact(involvedFactions: string[]): Record<string, number> {
  const impact: Record<string, number> = {};

  for (const faction of involvedFactions) {
    impact[faction] = Math.round(-10 - Math.random() * 20);
  }

  return impact;
}

export function calculateUpgradeFactionBonus(
  factionId: string,
  upgradeType: string,
): Record<string, number> {
  const bonus: Record<string, number> = {};

  if (upgradeType === 'security') {
    bonus[factionId] = Math.round(5 + Math.random() * 15);
  }

  return bonus;
}

export function clampFactionRelation(value: number): number {
  if (value < -100) return -100;
  if (value > 100) return 100;
  return value;
}

export function initializeFactionRelations(homeFaction: string): Record<string, number> {
  const relations: Record<string, number> = {
    sovereign_compact: 0,
    librarian_network: 0,
    red_hand: 0,
    circuit_syndicate: 0,
    unaffiliated: 0,
  };

  relations[homeFaction] = 10;

  return relations;
}

export function getDefaultHomeFaction(): CanonicalFaction {
  return 'unaffiliated';
}

export function isFactionRelationAtWarning(relationValue: number): boolean {
  return relationValue < -25;
}
