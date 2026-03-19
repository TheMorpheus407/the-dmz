import { boolean, pgSchema, timestamp, varchar, text } from 'drizzle-orm/pg-core';

const contentSchema = pgSchema('content');

export const avatars = contentSchema.table('avatars', {
  id: varchar('id', { length: 36 }).primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  tags: text('tags').array().notNull().default([]),
  rarityTier: varchar('rarity_tier', { length: 20 }).notNull().default('common'),
  unlockCondition: text('unlock_condition').notNull().default('Default avatar'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export type Avatar = typeof avatars.$inferSelect;
export type NewAvatar = typeof avatars.$inferInsert;

export const avatarCategories = ['animal', 'robot', 'geometric', 'character'] as const;
export type AvatarCategory = (typeof avatarCategories)[number];

export const avatarCategoriesExtended = [
  'character_silhouette',
  'facility_theme',
  'faction_emblem',
  'animal',
  'robot',
  'geometric',
  'character',
] as const;
export type AvatarCategoryExtended = (typeof avatarCategoriesExtended)[number];

export const rarityTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type RarityTier = (typeof rarityTiers)[number];
