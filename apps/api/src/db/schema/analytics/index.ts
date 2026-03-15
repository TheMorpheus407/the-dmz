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
