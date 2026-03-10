import { sql } from 'drizzle-orm';
import {
  index,
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const contentSchema = pgSchema('content');

export const seasons = contentSchema.table(
  'seasons',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    seasonNumber: integer('season_number').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    theme: text('theme').notNull(),
    logline: text('logline').notNull(),
    description: text('description'),
    threatCurveStart: varchar('threat_curve_start', { length: 20 }).notNull().default('LOW'),
    threatCurveEnd: varchar('threat_curve_end', { length: 20 }).notNull().default('HIGH'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('seasons_tenant_idx').on(table.tenantId),
    seasonNumberIdx: index('seasons_number_idx').on(table.seasonNumber),
    activeIdx: index('seasons_active_idx').on(table.isActive),
  }),
);

export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;

export const chapters = contentSchema.table(
  'chapters',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number').notNull(),
    act: integer('act').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    dayStart: integer('day_start').notNull(),
    dayEnd: integer('day_end').notNull(),
    difficultyStart: integer('difficulty_start').notNull().default(1),
    difficultyEnd: integer('difficulty_end').notNull().default(2),
    threatLevel: varchar('threat_level', { length: 20 }).notNull().default('LOW'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('chapters_tenant_idx').on(table.tenantId),
    seasonIdx: index('chapters_season_idx').on(table.seasonId),
    chapterNumberIdx: index('chapters_number_idx').on(table.chapterNumber),
    actIdx: index('chapters_act_idx').on(table.act),
    activeIdx: index('chapters_active_idx').on(table.isActive),
  }),
);

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
