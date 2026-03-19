import { z } from 'zod';

export const socialPrivacyModeSchema = z.enum(['public', 'friends_only', 'private']);
export type SocialPrivacyMode = z.infer<typeof socialPrivacyModeSchema>;

export const avatarCategorySchema = z.enum(['animal', 'robot', 'geometric', 'character']);
export type AvatarCategory = z.infer<typeof avatarCategorySchema>;

export const playerProfileBaseSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  displayName: z.string().min(1).max(50),
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
  displayName: z.string().min(1).max(50),
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
  displayName: z.string().min(1).max(50).optional(),
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
  category: avatarCategorySchema,
  name: z.string().max(100),
  imageUrl: z.string().max(500).nullable(),
  isActive: z.boolean(),
});

export type PlayerProfileBase = z.infer<typeof playerProfileBaseSchema>;
export type PlayerProfilePublic = z.infer<typeof playerProfilePublicSchema>;
export type PlayerProfilePrivate = z.infer<typeof playerProfilePrivateSchema>;
export type UpdatePlayerProfileInput = z.infer<typeof updatePlayerProfileInputSchema>;
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsInputSchema>;
export type PrivacySettingsResponse = z.infer<typeof privacySettingsResponseSchema>;
export type Avatar = z.infer<typeof avatarSchema>;
