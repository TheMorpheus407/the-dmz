export interface SteamAchievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockTime?: number;
}

export interface SteamUser {
  steamId: string;
  displayName: string;
  avatarUrl: string;
}

export interface SteamCloudSave {
  appId: string;
  saveName: string;
  data: Uint8Array;
  timestamp: number;
}

let steamInitialized = false;
const currentUser: SteamUser | null = null;

export async function initializeSteam(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.warn('[Steam] Not running in Tauri environment');
    return false;
  }

  try {
    steamInitialized = true;
    console.info('[Steam] API initialized (stub)');
    return true;
  } catch (error) {
    console.error('[Steam] Failed to initialize:', error);
    return false;
  }
}

export function isSteamAvailable(): boolean {
  return steamInitialized;
}

export async function getCurrentUser(): Promise<SteamUser | null> {
  if (!steamInitialized) {
    return null;
  }

  return currentUser;
}

export async function unlockAchievement(achievementId: string): Promise<boolean> {
  if (!steamInitialized) {
    console.warn(`[Steam] Cannot unlock achievement ${achievementId}: Steam not initialized`);
    return false;
  }

  console.info(`[Steam] Achievement unlocked: ${achievementId}`);
  return true;
}

export async function getAchievements(): Promise<SteamAchievement[]> {
  if (!steamInitialized) {
    return [];
  }

  return [];
}

export async function clearAchievement(achievementId: string): Promise<boolean> {
  if (!steamInitialized) {
    return false;
  }

  console.info(`[Steam] Achievement cleared: ${achievementId}`);
  return true;
}

export const ACHIEVEMENTS = {
  FIRST_EMAIL: 'FIRST_EMAIL',
  FIRST_DAY_COMPLETE: 'FIRST_DAY_COMPLETE',
  FIRST_WEEK_COMPLETE: 'FIRST_WEEK_COMPLETE',
  PERFECT_DAY: 'PERFECT_DAY',
  NO_MISTAKES_WEEK: 'NO_MISTAKES_WEEK',
  ZERO_BREACHES: 'ZERO_BREACHES',
  UPGRADE_PURCHASED: 'UPGRADE_PURCHASED',
  VERIFICATION_MASTER: 'VERIFICATION_MASTER',
  PHISHING_EXPERT: 'PHISHING_EXPERT',
  INCIDENT_RESPONDER: 'INCIDENT_RESPONDER',
  FACILITY_MASTER: 'FACILITY_MASTER',
  SEASON_COMPLETE: 'SEASON_COMPLETE',
} as const;

export type AchievementId = (typeof ACHIEVEMENTS)[keyof typeof ACHIEVEMENTS];
