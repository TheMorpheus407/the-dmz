import { sql } from 'drizzle-orm';
import {
  index,
  boolean,
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uuid,
  varchar,
  numeric,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { emailTemplates } from './email-templates.schema.js';

const contentSchema = pgSchema('content');

export const difficultyThresholds = contentSchema.table(
  'difficulty_thresholds',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    difficulty: integer('difficulty').notNull(),
    featureName: varchar('feature_name', { length: 100 }).notNull(),
    minValue: numeric('min_value'),
    maxValue: numeric('max_value'),
    weight: numeric('weight')
      .notNull()
      .default(sql`1.0`),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('difficulty_thresholds_tenant_idx').on(table.tenantId),
    difficultyIdx: index('difficulty_thresholds_difficulty_idx').on(table.difficulty),
    featureIdx: index('difficulty_thresholds_feature_idx').on(table.featureName),
  }),
);

export type DifficultyThreshold = typeof difficultyThresholds.$inferSelect;
export type NewDifficultyThreshold = typeof difficultyThresholds.$inferInsert;

export const emailFeatures = contentSchema.table(
  'email_features',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    emailTemplateId: uuid('email_template_id').references(() => emailTemplates.id, {
      onDelete: 'cascade',
    }),
    indicatorCount: integer('indicator_count'),
    wordCount: integer('word_count'),
    hasSpoofedHeaders: boolean('has_spoofed_headers'),
    impersonationQuality: numeric('impersonation_quality'),
    hasVerificationHooks: boolean('has_verification_hooks'),
    emotionalManipulationLevel: numeric('emotional_manipulation_level'),
    grammarComplexity: numeric('grammar_complexity'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('email_features_tenant_idx').on(table.tenantId),
    emailIdx: index('email_features_email_idx').on(table.emailTemplateId),
    createdIdx: index('email_features_created_idx').on(table.createdAt),
  }),
);

export type EmailFeature = typeof emailFeatures.$inferSelect;
export type NewEmailFeature = typeof emailFeatures.$inferInsert;

export const difficultyHistory = contentSchema.table(
  'difficulty_history',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    emailTemplateId: uuid('email_template_id').references(() => emailTemplates.id, {
      onDelete: 'cascade',
    }),
    requestedDifficulty: integer('requested_difficulty'),
    classifiedDifficulty: integer('classified_difficulty').notNull(),
    classificationMethod: varchar('classification_method', { length: 20 }).notNull(),
    confidence: numeric('confidence'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('difficulty_history_tenant_idx').on(table.tenantId),
    emailIdx: index('difficulty_history_email_idx').on(table.emailTemplateId),
    difficultyIdx: index('difficulty_history_difficulty_idx').on(table.classifiedDifficulty),
    methodIdx: index('difficulty_history_method_idx').on(table.classificationMethod),
    createdIdx: index('difficulty_history_created_idx').on(table.createdAt),
  }),
);

export type DifficultyHistory = typeof difficultyHistory.$inferSelect;
export type NewDifficultyHistory = typeof difficultyHistory.$inferInsert;
