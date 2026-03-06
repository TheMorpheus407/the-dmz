import { PLAYER_LEVEL_CONFIG, LEVEL_TITLES, type PlayerTitle } from './types.js';

export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;

  const baseXP = PLAYER_LEVEL_CONFIG.XP_PER_LEVEL_UP_BASE;
  const multiplier = PLAYER_LEVEL_CONFIG.XP_PER_LEVEL_UP_MULTIPLIER;

  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += Math.round(baseXP * Math.pow(multiplier, i - 1));
  }

  return totalXP;
}

export function getLevelFromXP(xp: number): number {
  let level = 1;

  while (level < PLAYER_LEVEL_CONFIG.MAX_PRESTIGE_LEVEL) {
    const xpRequired = calculateXPForLevel(level + 1);
    if (xp < xpRequired) {
      break;
    }
    level++;
  }

  return level;
}

export function getXPProgress(currentXP: number): {
  currentLevel: number;
  currentLevelXP: number;
  xpForNextLevel: number;
  progressPercentage: number;
  isPrestige: boolean;
  title: PlayerTitle;
} {
  const level = getLevelFromXP(currentXP);
  const xpForCurrentLevel = calculateXPForLevel(level);
  const xpForNextLevel = calculateXPForLevel(level + 1);
  const currentLevelXP = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = xpNeeded > 0 ? (currentLevelXP / xpNeeded) * 100 : 100;
  const isPrestige = level > PLAYER_LEVEL_CONFIG.MAX_NORMAL_LEVEL;
  const title = LEVEL_TITLES[Math.min(level, 50)] ?? 'Industry Legend';

  return {
    currentLevel: level,
    currentLevelXP,
    xpForNextLevel,
    progressPercentage: Math.min(progressPercentage, 100),
    isPrestige,
    title,
  };
}

export function awardXPForDecision(wasCorrect: boolean, difficulty: number): number {
  if (!wasCorrect) return 0;

  const baseXP = PLAYER_LEVEL_CONFIG.XP_PER_CORRECT_DECISION;
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.1;

  return Math.round(baseXP * difficultyMultiplier);
}

export function awardXPForIncidentResolved(severity: number): number {
  const baseXP = PLAYER_LEVEL_CONFIG.XP_PER_INCIDENT_RESOLVED;
  const severityMultiplier = 1 + severity / 10;

  return Math.round(baseXP * severityMultiplier);
}

export function calculateLevelUp(
  currentXP: number,
  xpToAdd: number,
): {
  didLevelUp: boolean;
  previousLevel: number;
  newLevel: number;
  xpRemaining: number;
  xpAwarded: number;
} {
  const previousLevel = getLevelFromXP(currentXP);
  const newTotalXP = currentXP + xpToAdd;
  const newLevel = getLevelFromXP(newTotalXP);
  const xpRequiredForNewLevel = calculateXPForLevel(newLevel);
  const xpRequiredForPreviousLevel = calculateXPForLevel(previousLevel);
  const xpUsedForLevelUps = xpRequiredForNewLevel - xpRequiredForPreviousLevel;
  const xpRemaining = xpToAdd - xpUsedForLevelUps;

  return {
    didLevelUp: newLevel > previousLevel,
    previousLevel,
    newLevel,
    xpRemaining: Math.max(0, xpRemaining),
    xpAwarded: xpToAdd,
  };
}

export function getTitleForLevel(level: number): PlayerTitle {
  return LEVEL_TITLES[Math.min(level, 50)] ?? 'Industry Legend';
}

export function isLevelGatedContent(level: number, requiredLevel: number): boolean {
  return level < requiredLevel;
}

export function getTrustTierUnlockedByLevel(level: number): { tier: string; minLevel: number }[] {
  const tiers = [
    { tier: 'CRITICAL', minLevel: 1 },
    { tier: 'LOW', minLevel: 5 },
    { tier: 'MODERATE', minLevel: 10 },
    { tier: 'HIGH', minLevel: 20 },
    { tier: 'ELITE', minLevel: 30 },
  ];

  return tiers.filter((t) => level >= t.minLevel);
}
