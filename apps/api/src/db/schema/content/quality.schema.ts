import { sql } from 'drizzle-orm';
import {
  index,
  boolean,
  jsonb,
  pgSchema,
  timestamp,
  uuid,
  varchar,
  numeric,
  text,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { emailTemplates } from './email-templates.schema.js';

const contentSchema = pgSchema('content');

export const qualityScores = contentSchema.table(
  'quality_scores',
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
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }).notNull(),
    narrativePlausibility: numeric('narrative_plausibility', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    grammarClarity: numeric('grammar_clarity', { precision: 5, scale: 2 }).notNull().default('0'),
    attackAlignment: numeric('attack_alignment', { precision: 5, scale: 2 }).notNull().default('0'),
    signalDiversity: numeric('signal_diversity', { precision: 5, scale: 2 }).notNull().default('0'),
    learnability: numeric('learnability', { precision: 5, scale: 2 }).notNull().default('0'),
    flags: jsonb('flags').notNull().default([]),
    recommendations: jsonb('recommendations').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    scoredAt: timestamp('scored_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('quality_scores_tenant_idx').on(table.tenantId),
    emailIdx: index('quality_scores_email_idx').on(table.emailTemplateId),
    statusIdx: index('quality_scores_status_idx').on(table.status),
    overallScoreIdx: index('quality_scores_overall_idx').on(table.overallScore),
    scoredAtIdx: index('quality_scores_scored_at_idx').on(table.scoredAt),
  }),
);

export type QualityScore = typeof qualityScores.$inferSelect;
export type NewQualityScore = typeof qualityScores.$inferInsert;

export const qualityThresholds = contentSchema.table(
  'quality_thresholds',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    minScore: numeric('min_score', { precision: 5, scale: 2 }).notNull(),
    maxScore: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('quality_thresholds_tenant_idx').on(table.tenantId),
    statusIdx: index('quality_thresholds_status_idx').on(table.status),
  }),
);

export type QualityThreshold = typeof qualityThresholds.$inferSelect;
export type NewQualityThreshold = typeof qualityThresholds.$inferInsert;

export const qualityFlags = contentSchema.table(
  'quality_flags',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    qualityScoreId: uuid('quality_score_id')
      .notNull()
      .references(() => qualityScores.id, { onDelete: 'cascade' }),
    flagType: varchar('flag_type', { length: 50 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull().default('minor'),
    description: text('description').notNull(),
    location: varchar('location', { length: 255 }),
    metadata: jsonb('metadata').notNull().default({}),
    isResolved: boolean('is_resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('quality_flags_tenant_idx').on(table.tenantId),
    scoreIdx: index('quality_flags_score_idx').on(table.qualityScoreId),
    flagTypeIdx: index('quality_flags_type_idx').on(table.flagType),
    resolvedIdx: index('quality_flags_resolved_idx').on(table.isResolved),
  }),
);

export type QualityFlag = typeof qualityFlags.$inferSelect;
export type NewQualityFlag = typeof qualityFlags.$inferInsert;

export const qualityHistory = contentSchema.table(
  'quality_history',
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
    previousScore: numeric('previous_score', { precision: 5, scale: 2 }),
    newScore: numeric('new_score', { precision: 5, scale: 2 }).notNull(),
    changeReason: varchar('change_reason', { length: 255 }),
    playerOutcome: varchar('player_outcome', { length: 50 }),
    detectionRate: numeric('detection_rate', { precision: 5, scale: 2 }),
    falsePositiveRate: numeric('false_positive_rate', { precision: 5, scale: 2 }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('quality_history_tenant_idx').on(table.tenantId),
    emailIdx: index('quality_history_email_idx').on(table.emailTemplateId),
    createdIdx: index('quality_history_created_idx').on(table.createdAt),
  }),
);

export type QualityHistory = typeof qualityHistory.$inferSelect;
export type NewQualityHistory = typeof qualityHistory.$inferInsert;

export const QUALITY_FLAG_TYPES = [
  'poor_grammar',
  'inconsistent_faction',
  'too_obvious',
  'too_vague',
  'repetitive_pattern',
  'missing_indicators',
] as const;

export type QualityFlagType = (typeof QUALITY_FLAG_TYPES)[number];

export const QUALITY_STATUSES = ['excellent', 'good', 'fair', 'poor'] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const DEFAULT_QUALITY_THRESHOLDS: Omit<
  NewQualityThreshold,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'excellent',
    minScore: '80',
    maxScore: '100',
    status: 'excellent',
    action: 'auto_approve',
  },
  {
    name: 'good',
    minScore: '60',
    maxScore: '79',
    status: 'good',
    action: 'auto_approve',
  },
  {
    name: 'fair',
    minScore: '40',
    maxScore: '59',
    status: 'fair',
    action: 'review_recommended',
  },
  {
    name: 'poor',
    minScore: '0',
    maxScore: '39',
    status: 'poor',
    action: 'reject',
  },
];
