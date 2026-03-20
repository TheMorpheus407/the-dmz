import type { CoopRole } from '../schemas/coop-session.schema.js';

export type { CoopRole } from '../schemas/coop-session.schema.js';

export type PartyDifficultyTier = 'training' | 'standard' | 'hardened' | 'nightmare';

export interface CoopThreatScaling {
  emailVolumeMultiplier: number;
  threatProbabilityBonus: number;
  incidentProbabilityBonus: number;
  breachSeverityBonus: number;
  timePressureMultiplier: number;
}

export interface CoopContext {
  partySize: number;
  coopRole?: CoopRole;
  difficultyTier: PartyDifficultyTier;
  threatScaling: CoopThreatScaling;
}

export const COOP_SCALING_BASE: CoopThreatScaling = {
  emailVolumeMultiplier: 1.0,
  threatProbabilityBonus: 0,
  incidentProbabilityBonus: 0,
  breachSeverityBonus: 0,
  timePressureMultiplier: 1.0,
};

export const COOP_SCALING_2_PLAYER: CoopThreatScaling = {
  emailVolumeMultiplier: 1.2,
  threatProbabilityBonus: 0.1,
  incidentProbabilityBonus: 0.05,
  breachSeverityBonus: 1,
  timePressureMultiplier: 1.15,
};

export function getCoopScalingForPartySize(partySize: number): CoopThreatScaling {
  if (partySize <= 1) {
    return COOP_SCALING_BASE;
  }
  if (partySize === 2) {
    return COOP_SCALING_2_PLAYER;
  }
  const additionalPlayers = partySize - 2;
  return {
    emailVolumeMultiplier: COOP_SCALING_2_PLAYER.emailVolumeMultiplier + additionalPlayers * 0.1,
    threatProbabilityBonus: COOP_SCALING_2_PLAYER.threatProbabilityBonus + additionalPlayers * 0.05,
    incidentProbabilityBonus:
      COOP_SCALING_2_PLAYER.incidentProbabilityBonus + additionalPlayers * 0.03,
    breachSeverityBonus: COOP_SCALING_2_PLAYER.breachSeverityBonus + additionalPlayers * 0.5,
    timePressureMultiplier: COOP_SCALING_2_PLAYER.timePressureMultiplier + additionalPlayers * 0.1,
  };
}

export const DIFFICULTY_TIER_MULTIPLIERS: Record<
  PartyDifficultyTier,
  { volumeMult: number; threatMult: number; breachMult: number }
> = {
  training: { volumeMult: 0.6, threatMult: 0.7, breachMult: 0.5 },
  standard: { volumeMult: 1.0, threatMult: 1.0, breachMult: 1.0 },
  hardened: { volumeMult: 1.3, threatMult: 1.2, breachMult: 1.3 },
  nightmare: { volumeMult: 1.5, threatMult: 1.4, breachMult: 1.6 },
};

export function calculateEffectiveScaling(
  coopScaling: CoopThreatScaling,
  difficultyTier: PartyDifficultyTier,
): CoopThreatScaling {
  const tierMults = DIFFICULTY_TIER_MULTIPLIERS[difficultyTier];
  return {
    emailVolumeMultiplier: coopScaling.emailVolumeMultiplier * tierMults.volumeMult,
    threatProbabilityBonus: coopScaling.threatProbabilityBonus * tierMults.threatMult,
    incidentProbabilityBonus: coopScaling.incidentProbabilityBonus * tierMults.threatMult,
    breachSeverityBonus: coopScaling.breachSeverityBonus * tierMults.breachMult,
    timePressureMultiplier: coopScaling.timePressureMultiplier * tierMults.volumeMult,
  };
}
