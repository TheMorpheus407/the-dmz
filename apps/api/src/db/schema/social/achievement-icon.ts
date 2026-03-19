import { pgSchema, varchar, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

const socialSchema = pgSchema('social');

export const achievementIconCategories = [
  'animal',
  'robot',
  'geometric',
  'character',
  'milestone',
  'competency',
] as const;
export type AchievementIconCategory = (typeof achievementIconCategories)[number];

export const achievementIconRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type AchievementIconRarity = (typeof achievementIconRarities)[number];

export const achievementIcons = socialSchema.table('achievement_icon', {
  id: uuid('id').defaultRandom().primaryKey(),
  iconKey: varchar('icon_key', { length: 36 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull().default('common'),
  isAnimated: boolean('is_animated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type AchievementIcon = typeof achievementIcons.$inferSelect;
export type NewAchievementIcon = typeof achievementIcons.$inferInsert;
