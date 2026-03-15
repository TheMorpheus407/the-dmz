import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    eventId: uuid('event_id').primaryKey(),
    correlationId: uuid('correlation_id').notNull(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id'),
    eventName: varchar('event_name', { length: 128 }).notNull(),
    eventVersion: integer('event_version').notNull().default(1),
    eventTime: timestamp('event_time', { withTimezone: true, mode: 'date' }).notNull(),
    source: varchar('source', { length: 64 }).notNull(),
    environment: varchar('environment', { length: 32 }).notNull().default('development'),
    eventProperties: jsonb('event_properties').notNull().default({}),
    deviceInfo: jsonb('device_info'),
    geoInfo: jsonb('geo_info'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('analytics_events_tenant_idx').on(table.tenantId),
    eventNameIdx: index('analytics_events_event_name_idx').on(table.eventName),
    userIdx: index('analytics_events_user_idx').on(table.userId),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
    sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
  }),
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export const playerProfiles = pgTable(
  'analytics_player_profiles',
  {
    userId: uuid('user_id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    totalSessions: integer('total_sessions').notNull().default(0),
    totalDaysPlayed: integer('total_days_played').notNull().default(0),
    phishingDetectionRate: real('phishing_detection_rate').notNull().default(0.5),
    falsePositiveRate: real('false_positive_rate').notNull().default(0.5),
    avgDecisionTimeSeconds: real('avg_decision_time_seconds'),
    indicatorProficiency: jsonb('indicator_proficiency').notNull().default({}),
    competencyScores: jsonb('competency_scores').notNull().default({}),
    skillRating: integer('skill_rating').notNull().default(1000),
    lastComputedAt: timestamp('last_computed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    calibrationPhase: varchar('calibration_phase', { length: 32 }).notNull().default('active'),
    calibrationStartDate: timestamp('calibration_start_date', { withTimezone: true, mode: 'date' }),
    trend30d: jsonb('trend_30d').notNull().default({}),
    trend90d: jsonb('trend_90d').notNull().default({}),
    recommendedFocus: jsonb('recommended_focus').notNull().default([]),
    confidenceIntervals: jsonb('confidence_intervals').notNull().default({}),
    lastSnapshotAt: timestamp('last_snapshot_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    tenantIdx: index('analytics_player_profiles_tenant_idx').on(table.tenantId),
    skillRatingIdx: index('analytics_player_profiles_skill_rating_idx').on(table.skillRating),
  }),
);

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type NewPlayerProfile = typeof playerProfiles.$inferInsert;

export const deadLetterQueue = pgTable(
  'analytics_dead_letter_queue',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    originalEvent: jsonb('original_event').notNull(),
    errorMessage: text('error_message').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    tenantId: uuid('tenant_id').notNull(),
  },
  (table) => ({
    tenantIdx: index('analytics_dlq_tenant_idx').on(table.tenantId),
    createdIdx: index('analytics_dlq_created_idx').on(table.createdAt),
  }),
);

export type DeadLetterQueueItem = typeof deadLetterQueue.$inferSelect;
export type NewDeadLetterQueueItem = typeof deadLetterQueue.$inferInsert;

export const analyticsMetrics = pgTable(
  'analytics_metrics',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metricName: varchar('metric_name', { length: 128 }).notNull(),
    metricValue: jsonb('metric_value').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    tenantId: uuid('tenant_id'),
  },
  (table) => ({
    nameIdx: index('analytics_metrics_name_idx').on(table.metricName),
    recordedIdx: index('analytics_metrics_recorded_idx').on(table.recordedAt),
    tenantIdx: index('analytics_metrics_tenant_idx').on(table.tenantId),
  }),
);

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type NewAnalyticsMetric = typeof analyticsMetrics.$inferInsert;

export const retentionCohorts = pgTable(
  'analytics_retention_cohorts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    cohortDate: timestamp('cohort_date', { withTimezone: true, mode: 'date' }).notNull(),
    firstSessionAt: timestamp('first_session_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastSessionAt: timestamp('last_session_at', { withTimezone: true, mode: 'date' }).notNull(),
    totalSessions: integer('total_sessions').notNull().default(0),
    totalMinutesPlayed: integer('total_minutes_played').notNull().default(0),
    sessionDates: jsonb('session_dates').notNull().default([]),
    d1Retained: integer('d1_retained').notNull().default(0),
    d7Retained: integer('d7_retained').notNull().default(0),
    d30Retained: integer('d30_retained').notNull().default(0),
    d60Retained: integer('d60_retained').notNull().default(0),
    d90Retained: integer('d90_retained').notNull().default(0),
    churnedAt: timestamp('churned_at', { withTimezone: true, mode: 'date' }),
    churnRiskScore: real('churn_risk_score'),
    contentDropOffPoints: jsonb('content_drop_off_points').notNull().default([]),
    seasonProgressionLevel: integer('season_progression_level').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('analytics_retention_cohorts_tenant_idx').on(table.tenantId),
    userIdx: index('analytics_retention_cohorts_user_idx').on(table.userId),
    cohortDateIdx: index('analytics_retention_cohorts_cohort_date_idx').on(table.cohortDate),
  }),
);

export type RetentionCohort = typeof retentionCohorts.$inferSelect;
export type NewRetentionCohort = typeof retentionCohorts.$inferInsert;

export const pseudonymizationMappings = pgTable(
  'analytics_pseudonymization_mappings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    originalUserId: uuid('original_user_id').notNull(),
    pseudonymousId: uuid('pseudonymous_id').notNull().unique(),
    tenantId: uuid('tenant_id').notNull(),
    encryptedMappingKey: text('encrypted_mapping_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    tenantIdx: index('analytics_pseudonymization_mappings_tenant_idx').on(table.tenantId),
    originalUserIdx: index('analytics_pseudonymization_mappings_original_user_idx').on(
      table.originalUserId,
    ),
    pseudonymousIdx: index('analytics_pseudonymization_mappings_pseudonymous_idx').on(
      table.pseudonymousId,
    ),
  }),
);

export type PseudonymizationMapping = typeof pseudonymizationMappings.$inferSelect;
export type NewPseudonymizationMapping = typeof pseudonymizationMappings.$inferInsert;
