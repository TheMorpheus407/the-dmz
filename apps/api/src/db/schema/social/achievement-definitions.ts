import {
  pgSchema,
  varchar,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

const socialSchema = pgSchema('social');

export const achievementCategories = [
  'core_competency',
  'operational_mastery',
  'social_contribution',
  'narrative_milestone',
  'hidden_badge',
] as const;
export type AchievementCategory = (typeof achievementCategories)[number];

export const achievementVisibilities = ['visible', 'hidden'] as const;
export type AchievementVisibility = (typeof achievementVisibilities)[number];

export const achievementDefinitions = socialSchema.table(
  'achievement_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    achievementKey: varchar('achievement_key', { length: 100 }).notNull().unique(),
    category: varchar('category', { length: 50 }).notNull(),
    visibility: varchar('visibility', { length: 20 }).notNull().default('visible'),
    title: varchar('title', { length: 100 }).notNull(),
    description: varchar('description', { length: 280 }).notNull(),
    iconId: varchar('icon_id', { length: 36 }),
    competencyDomains: jsonb('competency_domains').notNull().default([]),
    enterpriseReportable: boolean('enterprise_reportable').notNull().default(false),
    points: integer('points').notNull().default(10),
    criteria: jsonb('criteria').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    achievementKeyUnique: uniqueIndex('achievement_definitions_key_unique').on(
      table.achievementKey,
    ),
    categoryIdx: index('achievement_definitions_category_idx').on(table.category),
    visibilityIdx: index('achievement_definitions_visibility_idx').on(table.visibility),
  }),
);

export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type NewAchievementDefinition = typeof achievementDefinitions.$inferInsert;
