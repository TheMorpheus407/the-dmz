import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const campaigns = pgTable(
  'training.campaigns',
  {
    campaignId: uuid('campaign_id')
      .primaryKey()
      .default({} as never),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 65535 }),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    campaignType: varchar('campaign_type', { length: 32 }).notNull(),
    createdBy: uuid('created_by').notNull(),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
    recurrencePattern: varchar('recurrence_pattern', { length: 32 }).default('one-time'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('campaigns_tenant_idx').on(table.tenantId),
    statusIdx: index('campaigns_status_idx').on(table.status),
    typeIdx: index('campaigns_type_idx').on(table.campaignType),
    createdByIdx: index('campaigns_created_by_idx').on(table.createdBy),
  }),
);

export const campaignAudience = pgTable(
  'training.campaign_audience',
  {
    audienceId: uuid('audience_id')
      .primaryKey()
      .default({} as never),
    campaignId: uuid('campaign_id').notNull(),
    groupIds: jsonb('group_ids').notNull().default([]),
    departments: jsonb('departments').notNull().default([]),
    locations: jsonb('locations').notNull().default([]),
    roles: jsonb('roles').notNull().default([]),
    attributeFilters: jsonb('attribute_filters').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdx: index('campaign_audience_campaign_idx').on(table.campaignId),
  }),
);

export const campaignContent = pgTable(
  'training.campaign_content',
  {
    contentId: uuid('content_id')
      .primaryKey()
      .default({} as never),
    campaignId: uuid('campaign_id').notNull(),
    contentType: varchar('content_type', { length: 32 }).notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    dueDays: integer('due_days').default(7),
    isPrerequisite: boolean('is_prerequisite').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdx: index('campaign_content_campaign_idx').on(table.campaignId),
    contentItemIdx: index('campaign_content_item_idx').on(table.contentItemId),
  }),
);

export const campaignEnrollments = pgTable(
  'training.campaign_enrollments',
  {
    enrollmentId: uuid('enrollment_id')
      .primaryKey()
      .default({} as never),
    campaignId: uuid('campaign_id').notNull(),
    userId: uuid('user_id').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('not_started'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
    lastReminderAt: timestamp('last_reminder_at', { withTimezone: true, mode: 'date' }),
    reminderCount: integer('reminder_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdx: index('campaign_enrollments_campaign_idx').on(table.campaignId),
    userIdx: index('campaign_enrollments_user_idx').on(table.userId),
    statusIdx: index('campaign_enrollments_status_idx').on(table.status),
    uniqueEnrollment: { columns: [table.campaignId, table.userId] },
  }),
);

export const campaignTemplates = pgTable(
  'training.campaign_templates',
  {
    templateId: uuid('template_id')
      .primaryKey()
      .default({} as never),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 65535 }),
    campaignType: varchar('campaign_type', { length: 32 }).notNull(),
    audienceConfig: jsonb('audience_config').notNull().default({}),
    contentConfig: jsonb('content_config').notNull().default({}),
    scheduleConfig: jsonb('schedule_config').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('campaign_templates_tenant_idx').on(table.tenantId),
  }),
);

export const campaignEscalations = pgTable(
  'training.campaign_escalations',
  {
    escalationId: uuid('escalation_id')
      .primaryKey()
      .default({} as never),
    campaignId: uuid('campaign_id').notNull(),
    reminderDays: jsonb('reminder_days').notNull().default([1, 3, 7]),
    managerNotification: boolean('manager_notification').notNull().default(true),
    complianceAlert: boolean('compliance_alert').notNull().default(false),
    complianceAlertThreshold: integer('compliance_alert_threshold').default(14),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdx: index('campaign_escalations_campaign_idx').on(table.campaignId),
  }),
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignAudience = typeof campaignAudience.$inferSelect;
export type NewCampaignAudience = typeof campaignAudience.$inferInsert;

export type CampaignContent = typeof campaignContent.$inferSelect;
export type NewCampaignContent = typeof campaignContent.$inferInsert;

export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;
export type NewCampaignEnrollment = typeof campaignEnrollments.$inferInsert;

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type NewCampaignTemplate = typeof campaignTemplates.$inferInsert;

export type CampaignEscalation = typeof campaignEscalations.$inferSelect;
export type NewCampaignEscalation = typeof campaignEscalations.$inferInsert;
