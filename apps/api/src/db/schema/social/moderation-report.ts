import { sql } from 'drizzle-orm';
import { index, jsonb, pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const reportTypes = ['harassment', 'spam', 'cheating', 'content', 'other'] as const;
export type ReportType = (typeof reportTypes)[number];

export const reportStatuses = [
  'pending',
  'under_review',
  'resolved_actioned',
  'resolved_dismissed',
] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reportResolutions = [
  'warning',
  'mute',
  'content_removal',
  'restriction',
  'dismissed',
] as const;
export type ReportResolution = (typeof reportResolutions)[number];

export const moderationReport = socialSchema.table(
  'moderation_report',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    reporterPlayerId: uuid('reporter_player_id').notNull(),
    reportedPlayerId: uuid('reported_player_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    reportType: varchar('report_type', { length: 20 }).notNull(),
    contentReference: jsonb('content_reference'),
    evidence: jsonb('evidence'),
    description: varchar('description', { length: 500 }),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    assignedModeratorId: uuid('assigned_moderator_id'),
    resolution: varchar('resolution', { length: 30 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('moderation_report_tenant_idx').on(table.tenantId),
    reporterIdx: index('moderation_report_reporter_idx').on(table.reporterPlayerId),
    reportedIdx: index('moderation_report_reported_idx').on(table.reportedPlayerId),
    statusIdx: index('moderation_report_status_idx').on(table.status),
    assignedModeratorIdx: index('moderation_report_assigned_moderator_idx').on(
      table.assignedModeratorId,
    ),
    createdIdx: index('moderation_report_created_idx').on(table.createdAt),
  }),
);

export type ModerationReport = typeof moderationReport.$inferSelect;
export type NewModerationReport = typeof moderationReport.$inferInsert;

export interface ContentReference {
  type: string;
  id: string;
}

export interface ReportEvidence {
  messageIds?: string[] | undefined;
  timestamps?: string[] | undefined;
  screenshots?: string[] | undefined;
}
