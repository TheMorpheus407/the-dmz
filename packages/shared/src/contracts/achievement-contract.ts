export const ACHIEVEMENT_CATEGORIES = [
  'core_competency',
  'operational_mastery',
  'social_contribution',
  'narrative_milestone',
  'hidden_badge',
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const ACHIEVEMENT_VISIBILITIES = ['visible', 'hidden'] as const;
export type AchievementVisibility = (typeof ACHIEVEMENT_VISIBILITIES)[number];

export const ACHIEVEMENT_ICON_CATEGORIES = [
  'animal',
  'robot',
  'geometric',
  'character',
  'milestone',
  'competency',
] as const;

export type AchievementIconCategory = (typeof ACHIEVEMENT_ICON_CATEGORIES)[number];

export const ACHIEVEMENT_ICON_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;
export type AchievementIconRarity = (typeof ACHIEVEMENT_ICON_RARITIES)[number];

export interface AchievementCriteriaCondition {
  count?: number;
  accuracyThreshold?: number;
  timeWindow?: string;
  consecutiveDays?: number;
  verificationUsed?: boolean;
  [key: string]: unknown;
}

export interface AchievementCriteria {
  eventType: string;
  conditions: AchievementCriteriaCondition;
}

export interface AchievementDefinitionContract {
  id: string;
  achievementKey: string;
  category: AchievementCategory;
  visibility: AchievementVisibility;
  title: string;
  description: string;
  iconId: string | null;
  competencyDomains: string[];
  enterpriseReportable: boolean;
  points: number;
  criteria: AchievementCriteria;
  createdAt: string;
}

export interface PlayerAchievementContract {
  id: string;
  playerId: string;
  achievementId: string;
  tenantId: string;
  unlockedAt: string | null;
  progress: Record<string, unknown>;
  notificationSent: boolean;
  sharedToProfile: boolean;
  createdAt: string;
}

export interface AchievementIconContract {
  id: string;
  iconKey: string;
  category: AchievementIconCategory;
  rarity: AchievementIconRarity;
  isAnimated: boolean;
  createdAt: string;
}
