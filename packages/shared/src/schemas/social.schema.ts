import { z } from 'zod';

import { displayNameSchema } from './common.schema.js';

export const socialPrivacyModeSchema = z.enum(['public', 'friends_only', 'private']);
export type SocialPrivacyMode = z.infer<typeof socialPrivacyModeSchema>;

export const avatarCategorySchema = z.enum(['animal', 'robot', 'geometric', 'character']);
export type AvatarCategory = z.infer<typeof avatarCategorySchema>;

export const avatarCategoryExtendedSchema = z.enum([
  'character_silhouette',
  'facility_theme',
  'faction_emblem',
  'animal',
  'robot',
  'geometric',
  'character',
]);
export type AvatarCategoryExtended = z.infer<typeof avatarCategoryExtendedSchema>;

export const rarityTierSchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);
export type RarityTier = z.infer<typeof rarityTierSchema>;

export const playerProfileBaseSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  displayName: displayNameSchema,
  avatarId: z.string().max(36).nullable(),
  privacyMode: socialPrivacyModeSchema,
  bio: z.string().max(280).nullable(),
  socialVisibility: z.record(z.unknown()),
  seasonRank: z.number().int().nullable(),
  skillRatingBlue: z.number().int().nullable(),
  skillRatingRed: z.number().int().nullable(),
  skillRatingCoop: z.number().int().nullable(),
  totalSessionsPlayed: z.number().int(),
  currentStreak: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().nullable(),
});

export const playerProfilePublicSchema = playerProfileBaseSchema.extend({
  isOwner: z.boolean().optional(),
});

export const playerProfilePrivateSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  displayName: displayNameSchema,
  privacyMode: socialPrivacyModeSchema,
  seasonRank: z.number().int().nullable(),
  skillRatingBlue: z.number().int().nullable(),
  skillRatingRed: z.number().int().nullable(),
  skillRatingCoop: z.number().int().nullable(),
  totalSessionsPlayed: z.number().int(),
  currentStreak: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().nullable(),
});

export const updatePlayerProfileInputSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarId: z.string().max(36).optional(),
  bio: z.string().max(280).optional(),
  seasonRank: z.number().int().optional(),
  skillRatingBlue: z.number().int().optional(),
  skillRatingRed: z.number().int().optional(),
  skillRatingCoop: z.number().int().optional(),
  totalSessionsPlayed: z.number().int().optional(),
  currentStreak: z.number().int().optional(),
});

export const updatePrivacySettingsInputSchema = z.object({
  privacyMode: socialPrivacyModeSchema.optional(),
  socialVisibility: z.record(z.unknown()).optional(),
});

export const privacySettingsResponseSchema = z.object({
  privacyMode: socialPrivacyModeSchema,
  socialVisibility: z.record(z.unknown()),
});

export const avatarSchema = z.object({
  id: z.string().max(36),
  category: avatarCategoryExtendedSchema,
  name: z.string().max(100),
  description: z.string(),
  tags: z.array(z.string()),
  rarityTier: rarityTierSchema,
  unlockCondition: z.string(),
  imageUrl: z.string().max(500).nullable(),
  isActive: z.boolean(),
});

export const setAvatarInputSchema = z.object({
  avatarId: z.string().max(36),
});

export const signalCategorySchema = z.enum(['decision', 'urgency', 'coordination', 'resource']);
export type SignalCategory = z.infer<typeof signalCategorySchema>;

export const quickSignalTemplateSchema = z.object({
  templateId: z.string().uuid(),
  signalKey: z.string().max(50),
  category: signalCategorySchema,
  icon: z.string().max(10),
  label: z.string().max(50),
  description: z.string().max(200),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export const quickSignalUsageSchema = z.object({
  usageId: z.string().uuid(),
  playerId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  signalKey: z.string().max(50),
  targetPlayerId: z.string().uuid().nullable(),
  sentAt: z.string().datetime(),
  context: z.record(z.unknown()),
});

export const sendSignalInputSchema = z.object({
  signalKey: z.string().min(1).max(50),
  sessionId: z.string().uuid().optional(),
  targetPlayerId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional(),
});

export type PlayerProfileBase = z.infer<typeof playerProfileBaseSchema>;
export type PlayerProfilePublic = z.infer<typeof playerProfilePublicSchema>;
export type PlayerProfilePrivate = z.infer<typeof playerProfilePrivateSchema>;
export type UpdatePlayerProfileInput = z.infer<typeof updatePlayerProfileInputSchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsInputSchema>;
export type PrivacySettingsResponse = z.infer<typeof privacySettingsResponseSchema>;
export type Avatar = z.infer<typeof avatarSchema>;
export type SetAvatarInput = z.infer<typeof setAvatarInputSchema>;
export type QuickSignalTemplate = z.infer<typeof quickSignalTemplateSchema>;
export type QuickSignalUsage = z.infer<typeof quickSignalUsageSchema>;
export type SendSignalInput = z.infer<typeof sendSignalInputSchema>;

export const enterpriseScopeSchema = z.enum(['department', 'tenant', 'corporation']);
export type EnterpriseScope = z.infer<typeof enterpriseScopeSchema>;

export const privacyLevelSchema = z.enum(['full_name', 'pseudonym', 'anonymous_aggregate']);
export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;

export const leaderboardTypeSchema = z.enum([
  'accuracy',
  'response_time',
  'incident_resolution',
  'verification_discipline',
  'composite',
]);
export type LeaderboardType = z.infer<typeof leaderboardTypeSchema>;

export const enterpriseLeaderboardBaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  scope: enterpriseScopeSchema,
  orgUnitId: z.string().uuid().nullable(),
  corporationId: z.string().uuid().nullable(),
  leaderboardType: leaderboardTypeSchema,
  resetCadence: z.enum(['daily', 'weekly', 'seasonal']),
  currentSeasonId: z.string(),
  privacyLevel: privacyLevelSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const enterpriseLeaderboardEntryBaseSchema = z.object({
  id: z.string().uuid(),
  leaderboardId: z.string().uuid(),
  playerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  corporationId: z.string().uuid().nullable(),
  score: z.number().int(),
  rank: z.number().int(),
  metrics: z.object({
    accuracy: z.number(),
    avgDecisionTime: z.number(),
    incidentsResolved: z.number(),
    resourceEfficiency: z.number(),
  }),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  updatedAt: z.string().datetime(),
  displayName: z.string().optional(),
  avatarId: z.string().nullable().optional(),
});

export const teamSummarySchema = z.object({
  teamId: z.string().uuid(),
  averageScore: z.number().int(),
  totalPlayers: z.number().int(),
  topPerformers: z.array(
    z.object({
      playerId: z.string().uuid(),
      score: z.number().int(),
      rank: z.number().int(),
    }),
  ),
});

export const updatePrivacyLevelInputSchema = z.object({
  privacyLevel: privacyLevelSchema,
});

export type EnterpriseLeaderboardBase = z.infer<typeof enterpriseLeaderboardBaseSchema>;
export type EnterpriseLeaderboardEntryBase = z.infer<typeof enterpriseLeaderboardEntryBaseSchema>;
export type TeamSummary = z.infer<typeof teamSummarySchema>;
export type UpdatePrivacyLevelInput = z.infer<typeof updatePrivacyLevelInputSchema>;
