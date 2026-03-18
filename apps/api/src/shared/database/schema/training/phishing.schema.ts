import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const phishingSimulations = pgTable(
  'training.phishing_simulations',
  {
    simulationId: uuid('simulation_id')
      .primaryKey()
      .default({} as never),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 65535 }),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    templateId: uuid('template_id'),
    difficultyTier: integer('difficulty_tier').notNull().default(1),
    urgencyLevel: varchar('urgency_level', { length: 20 }).notNull().default('medium'),
    senderName: varchar('sender_name', { length: 255 }),
    senderEmail: varchar('sender_email', { length: 255 }),
    replyTo: varchar('reply_to', { length: 255 }),
    subject: varchar('subject', { length: 500 }).notNull(),
    body: text('body').notNull(),
    includeAttachment: boolean('include_attachment').notNull().default(false),
    attachmentName: varchar('attachment_name', { length: 255 }),
    trackingEnabled: boolean('tracking_enabled').notNull().default(true),
    teachableMomentId: uuid('teachable_moment_id'),
    scheduledStartDate: timestamp('scheduled_start_date', { withTimezone: true, mode: 'date' }),
    scheduledEndDate: timestamp('scheduled_end_date', { withTimezone: true, mode: 'date' }),
    actualStartDate: timestamp('actual_start_date', { withTimezone: true, mode: 'date' }),
    actualEndDate: timestamp('actual_end_date', { withTimezone: true, mode: 'date' }),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('phishing_simulations_tenant_idx').on(table.tenantId),
    statusIdx: index('phishing_simulations_status_idx').on(table.status),
    templateIdx: index('phishing_simulations_template_idx').on(table.templateId),
    createdByIdx: index('phishing_simulations_created_by_idx').on(table.createdBy),
    scheduledStartIdx: index('phishing_simulations_scheduled_start_idx').on(
      table.scheduledStartDate,
    ),
  }),
);

export const phishingSimulationTemplates = pgTable(
  'training.phishing_simulation_templates',
  {
    templateId: uuid('template_id')
      .primaryKey()
      .default({} as never),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 65535 }),
    category: varchar('category', { length: 100 }),
    difficultyTier: integer('difficulty_tier').notNull().default(1),
    urgencyLevel: varchar('urgency_level', { length: 20 }).notNull().default('medium'),
    senderName: varchar('sender_name', { length: 255 }),
    senderEmail: varchar('sender_email', { length: 255 }),
    replyTo: varchar('reply_to', { length: 255 }),
    subject: varchar('subject', { length: 500 }).notNull(),
    body: text('body').notNull(),
    mergeTags: jsonb('merge_tags').notNull().default([]),
    includeAttachment: boolean('include_attachment').notNull().default(false),
    attachmentName: varchar('attachment_name', { length: 255 }),
    indicatorHints: jsonb('indicator_hints').notNull().default([]),
    teachableMomentConfig: jsonb('teachable_moment_config').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('phishing_simulation_templates_tenant_idx').on(table.tenantId),
    categoryIdx: index('phishing_simulation_templates_category_idx').on(table.category),
    difficultyIdx: index('phishing_simulation_templates_difficulty_idx').on(table.difficultyTier),
    activeIdx: index('phishing_simulation_templates_active_idx').on(table.isActive),
  }),
);

export const phishingSimulationAudience = pgTable(
  'training.phishing_simulation_audience',
  {
    audienceId: uuid('audience_id')
      .primaryKey()
      .default({} as never),
    simulationId: uuid('simulation_id').notNull(),
    groupIds: jsonb('group_ids').notNull().default([]),
    departments: jsonb('departments').notNull().default([]),
    locations: jsonb('locations').notNull().default([]),
    roles: jsonb('roles').notNull().default([]),
    attributeFilters: jsonb('attribute_filters').notNull().default({}),
    targetUserCount: integer('target_user_count'),
    enrolledUserCount: integer('enrolled_user_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    simulationIdx: index('phishing_simulation_audience_simulation_idx').on(table.simulationId),
  }),
);

export const phishingSimulationResults = pgTable(
  'training.phishing_simulation_results',
  {
    resultId: uuid('result_id')
      .primaryKey()
      .default({} as never),
    simulationId: uuid('simulation_id').notNull(),
    userId: uuid('user_id').notNull(),
    emailDelivered: boolean('email_delivered').notNull().default(false),
    emailOpened: boolean('email_opened').notNull().default(false),
    linkClicked: boolean('link_clicked').notNull().default(false),
    clickedAt: timestamp('clicked_at', { withTimezone: true, mode: 'date' }),
    timeToClickSeconds: integer('time_to_click_seconds'),
    reported: boolean('reported').notNull().default(false),
    reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'date' }),
    timeToReportSeconds: integer('time_to_report_seconds'),
    attachmentOpened: boolean('attachment_opened').notNull().default(false),
    attachmentOpenedAt: timestamp('attachment_opened_at', { withTimezone: true, mode: 'date' }),
    simulationOutcome: varchar('simulation_outcome', { length: 32 }),
    teachableMomentViewed: boolean('teachable_moment_viewed').notNull().default(false),
    teachableMomentViewedAt: timestamp('teachable_moment_viewed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    enrolledInMicroTraining: boolean('enrolled_in_micro_training').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    simulationIdx: index('phishing_simulation_results_simulation_idx').on(table.simulationId),
    userIdx: index('phishing_simulation_results_user_idx').on(table.userId),
    outcomeIdx: index('phishing_simulation_results_outcome_idx').on(table.simulationOutcome),
    uniqueResult: { columns: [table.simulationId, table.userId] },
  }),
);

export const phishingSimulationTeachableMoments = pgTable(
  'training.phishing_teachable_moments',
  {
    momentId: uuid('moment_id')
      .primaryKey()
      .default({} as never),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    indicatorType: varchar('indicator_type', { length: 100 }),
    educationalContent: text('educational_content').notNull(),
    whatToDoInstead: text('what_to_do_instead').notNull(),
    microTrainingCourseId: uuid('micro_training_course_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('phishing_teachable_moments_tenant_idx').on(table.tenantId),
    indicatorIdx: index('phishing_teachable_moments_indicator_idx').on(table.indicatorType),
    activeIdx: index('phishing_teachable_moments_active_idx').on(table.isActive),
  }),
);

export const phishingSimulationEvents = pgTable(
  'training.phishing_simulation_events',
  {
    eventId: uuid('event_id')
      .primaryKey()
      .default({} as never),
    simulationId: uuid('simulation_id').notNull(),
    userId: uuid('user_id').notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: jsonb('event_data').notNull().default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    simulationIdx: index('phishing_simulation_events_simulation_idx').on(table.simulationId),
    userIdx: index('phishing_simulation_events_user_idx').on(table.userId),
    typeIdx: index('phishing_simulation_events_type_idx').on(table.eventType),
    createdIdx: index('phishing_simulation_events_created_idx').on(table.createdAt),
  }),
);

export type PhishingSimulation = typeof phishingSimulations.$inferSelect;
export type NewPhishingSimulation = typeof phishingSimulations.$inferInsert;

export type PhishingSimulationTemplate = typeof phishingSimulationTemplates.$inferSelect;
export type NewPhishingSimulationTemplate = typeof phishingSimulationTemplates.$inferInsert;

export type PhishingSimulationAudience = typeof phishingSimulationAudience.$inferSelect;
export type NewPhishingSimulationAudience = typeof phishingSimulationAudience.$inferInsert;

export type PhishingSimulationResult = typeof phishingSimulationResults.$inferSelect;
export type NewPhishingSimulationResult = typeof phishingSimulationResults.$inferInsert;

export type PhishingSimulationTeachableMoment =
  typeof phishingSimulationTeachableMoments.$inferSelect;
export type NewPhishingSimulationTeachableMoment =
  typeof phishingSimulationTeachableMoments.$inferInsert;

export type PhishingSimulationEvent = typeof phishingSimulationEvents.$inferSelect;
export type NewPhishingSimulationEvent = typeof phishingSimulationEvents.$inferInsert;
