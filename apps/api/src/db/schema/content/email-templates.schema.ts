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

export const emailTemplates = contentSchema.table(
  'email_templates',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    body: text('body').notNull(),
    fromName: varchar('from_name', { length: 255 }),
    fromEmail: varchar('from_email', { length: 255 }),
    replyTo: varchar('reply_to', { length: 255 }),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    difficulty: integer('difficulty').notNull(),
    faction: varchar('faction', { length: 50 }),
    attackType: varchar('attack_type', { length: 100 }),
    threatLevel: varchar('threat_level', { length: 20 }).notNull(),
    season: integer('season'),
    chapter: integer('chapter'),
    language: varchar('language', { length: 10 }).notNull().default('en'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    metadata: jsonb('metadata').notNull().default({}),
    isAiGenerated: boolean('is_ai_generated').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('email_templates_tenant_idx').on(table.tenantId),
    contentTypeIdx: index('email_templates_content_type_idx').on(table.contentType),
    difficultyIdx: index('email_templates_difficulty_idx').on(table.difficulty),
    factionIdx: index('email_templates_faction_idx').on(table.faction),
    threatLevelIdx: index('email_templates_threat_level_idx').on(table.threatLevel),
    seasonChapterIdx: index('email_templates_season_chapter_idx').on(table.season, table.chapter),
    localeIdx: index('email_templates_locale_idx').on(table.locale),
    activeIdx: index('email_templates_active_idx').on(table.isActive),
  }),
);

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export const scenarios = contentSchema.table(
  'scenarios',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    difficulty: integer('difficulty').notNull(),
    faction: varchar('faction', { length: 50 }),
    season: integer('season'),
    chapter: integer('chapter'),
    language: varchar('language', { length: 10 }).notNull().default('en'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('scenarios_tenant_idx').on(table.tenantId),
    difficultyIdx: index('scenarios_difficulty_idx').on(table.difficulty),
    factionIdx: index('scenarios_faction_idx').on(table.faction),
    seasonChapterIdx: index('scenarios_season_chapter_idx').on(table.season, table.chapter),
  }),
);

export type Scenario = typeof scenarios.$inferSelect;
export type NewScenario = typeof scenarios.$inferInsert;

export const scenarioBeats = contentSchema.table(
  'scenario_beats',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    beatIndex: integer('beat_index').notNull(),
    dayOffset: integer('day_offset').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    emailTemplateId: uuid('email_template_id').references(() => emailTemplates.id, {
      onDelete: 'set null',
    }),
    documentType: varchar('document_type', { length: 50 }),
    attackType: varchar('attack_type', { length: 100 }),
    threatLevel: varchar('threat_level', { length: 20 }),
    requiredIndicators: jsonb('required_indicators').notNull().default([]),
    optionalIndicators: jsonb('optional_indicators').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    scenarioIdx: index('scenario_beats_scenario_idx').on(table.scenarioId),
    tenantIdx: index('scenario_beats_tenant_idx').on(table.tenantId),
    dayIdx: index('scenario_beats_day_idx').on(table.dayOffset),
  }),
);

export type ScenarioBeat = typeof scenarioBeats.$inferSelect;
export type NewScenarioBeat = typeof scenarioBeats.$inferInsert;

export const documentTemplates = contentSchema.table(
  'document_templates',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    difficulty: integer('difficulty'),
    faction: varchar('faction', { length: 50 }),
    season: integer('season'),
    chapter: integer('chapter'),
    language: varchar('language', { length: 10 }).notNull().default('en'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('document_templates_tenant_idx').on(table.tenantId),
    typeIdx: index('document_templates_type_idx').on(table.documentType),
    factionIdx: index('document_templates_faction_idx').on(table.faction),
    localeIdx: index('document_templates_locale_idx').on(table.locale),
  }),
);

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;

export const localizedContent = contentSchema.table(
  'localized_content',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    contentKey: varchar('content_key', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    language: varchar('language', { length: 10 }).notNull().default('en'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    content: text('content').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('localized_content_tenant_idx').on(table.tenantId),
    contentKeyIdx: index('localized_content_key_idx').on(table.contentKey),
    localeIdx: index('localized_content_locale_idx').on(table.locale),
  }),
);

export type LocalizedContent = typeof localizedContent.$inferSelect;
export type NewLocalizedContent = typeof localizedContent.$inferInsert;

export const aiGenerationLog = contentSchema.table(
  'ai_generation_log',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    requestId: varchar('request_id', { length: 255 }).notNull(),
    promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    errorMessage: text('error_message'),
    generationParams: jsonb('generation_params').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('ai_generation_log_tenant_idx').on(table.tenantId),
    requestIdx: index('ai_generation_log_request_idx').on(table.requestId),
    statusIdx: index('ai_generation_log_status_idx').on(table.status),
    createdIdx: index('ai_generation_log_created_idx').on(table.createdAt),
  }),
);

export type AiGenerationLog = typeof aiGenerationLog.$inferSelect;
export type NewAiGenerationLog = typeof aiGenerationLog.$inferInsert;
