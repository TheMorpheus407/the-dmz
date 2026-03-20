import { eq, and, or, isNull, desc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  moderationReport,
  moderationAction,
  type ReportType,
  type ReportStatus,
  type ReportResolution,
  type ContentReference,
  type ReportEvidence,
} from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

export interface SubmitReportInput {
  reporterPlayerId: string;
  reportedPlayerId: string;
  reportType: ReportType;
  contentReference: ContentReference | undefined;
  evidence: ReportEvidence | undefined;
  description: string | undefined;
}

export interface SubmitReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

export interface ModerationQueueFilters {
  status: ReportStatus | undefined;
  reportType: ReportType | undefined;
  assignedModeratorId: string | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function submitReport(
  config: AppConfig,
  tenantId: string,
  input: SubmitReportInput,
): Promise<SubmitReportResult> {
  if (input.reporterPlayerId === input.reportedPlayerId) {
    return { success: false, error: 'Cannot report yourself' };
  }

  const db = getDatabaseClient(config);

  const existingReport = await db.query.moderationReport.findFirst({
    where: and(
      eq(moderationReport.reporterPlayerId, input.reporterPlayerId),
      eq(moderationReport.reportedPlayerId, input.reportedPlayerId),
      eq(moderationReport.tenantId, tenantId),
      or(eq(moderationReport.status, 'pending'), eq(moderationReport.status, 'under_review')),
    ),
  });

  if (existingReport) {
    return { success: false, error: 'Active report already exists for this player' };
  }

  const [report] = await db
    .insert(moderationReport)
    .values({
      reporterPlayerId: input.reporterPlayerId,
      reportedPlayerId: input.reportedPlayerId,
      tenantId,
      reportType: input.reportType,
      contentReference: input.contentReference ?? null,
      evidence: input.evidence ?? null,
      description: input.description ?? null,
      status: 'pending',
    })
    .returning();

  return { success: true, reportId: report!.id };
}

export async function getModerationQueue(
  config: AppConfig,
  tenantId: string,
  filters: ModerationQueueFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<typeof moderationReport.$inferSelect>> {
  const db = getDatabaseClient(config);

  const conditions = [eq(moderationReport.tenantId, tenantId)];

  if (filters.status) {
    conditions.push(eq(moderationReport.status, filters.status));
  }

  if (filters.reportType) {
    conditions.push(eq(moderationReport.reportType, filters.reportType));
  }

  if (filters.assignedModeratorId) {
    conditions.push(eq(moderationReport.assignedModeratorId, filters.assignedModeratorId));
  }

  const offset = (page - 1) * pageSize;

  const reports = await db.query.moderationReport.findMany({
    where: and(...conditions),
    orderBy: [desc(moderationReport.createdAt)],
    limit: pageSize,
    offset,
  });

  const countResult = await db
    .select({ count: moderationReport.id })
    .from(moderationReport)
    .where(and(...conditions));

  const total = countResult.length;

  return {
    items: reports,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getReportById(
  config: AppConfig,
  tenantId: string,
  reportId: string,
): Promise<typeof moderationReport.$inferSelect | null> {
  const db = getDatabaseClient(config);

  const report = await db.query.moderationReport.findFirst({
    where: and(eq(moderationReport.id, reportId), eq(moderationReport.tenantId, tenantId)),
  });

  return report ?? null;
}

export async function assignModerator(
  config: AppConfig,
  tenantId: string,
  reportId: string,
  moderatorId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabaseClient(config);

  const report = await db.query.moderationReport.findFirst({
    where: and(eq(moderationReport.id, reportId), eq(moderationReport.tenantId, tenantId)),
  });

  if (!report) {
    return { success: false, error: 'Report not found' };
  }

  if (report.status === 'resolved_actioned' || report.status === 'resolved_dismissed') {
    return { success: false, error: 'Cannot assign moderator to resolved report' };
  }

  await db
    .update(moderationReport)
    .set({
      assignedModeratorId: moderatorId,
      status: 'under_review',
    })
    .where(eq(moderationReport.id, reportId));

  return { success: true };
}

export async function resolveReport(
  config: AppConfig,
  tenantId: string,
  reportId: string,
  moderatorId: string,
  resolution: ReportResolution,
  actionType?: string,
  reason?: string,
  expiresAt?: Date,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabaseClient(config);

  const report = await db.query.moderationReport.findFirst({
    where: and(eq(moderationReport.id, reportId), eq(moderationReport.tenantId, tenantId)),
  });

  if (!report) {
    return { success: false, error: 'Report not found' };
  }

  if (report.status === 'resolved_actioned' || report.status === 'resolved_dismissed') {
    return { success: false, error: 'Report already resolved' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(moderationReport)
      .set({
        status: 'resolved_actioned',
        resolution,
        resolvedAt: new Date(),
      })
      .where(eq(moderationReport.id, reportId));

    if (resolution !== 'dismissed' && actionType) {
      await tx.insert(moderationAction).values({
        playerId: report.reportedPlayerId,
        moderatorId,
        tenantId,
        actionType,
        reason: reason ?? null,
        reportId,
        expiresAt: expiresAt ?? null,
      });
    }
  });

  return { success: true };
}

export async function getPlayerModerationHistory(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  limit = 50,
): Promise<(typeof moderationAction.$inferSelect)[]> {
  const db = getDatabaseClient(config);

  const actions = await db.query.moderationAction.findMany({
    where: and(eq(moderationAction.playerId, playerId), eq(moderationAction.tenantId, tenantId)),
    orderBy: [desc(moderationAction.createdAt)],
    limit,
  });

  return actions;
}

export async function getModerationActions(
  config: AppConfig,
  tenantId: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<typeof moderationAction.$inferSelect>> {
  const db = getDatabaseClient(config);

  const offset = (page - 1) * pageSize;

  const actions = await db.query.moderationAction.findMany({
    where: eq(moderationAction.tenantId, tenantId),
    orderBy: [desc(moderationAction.createdAt)],
    limit: pageSize,
    offset,
  });

  const countResult = await db
    .select({ count: moderationAction.id })
    .from(moderationAction)
    .where(eq(moderationAction.tenantId, tenantId));

  const total = countResult.length;

  return {
    items: actions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getActiveRestrictions(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<(typeof moderationAction.$inferSelect)[]> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const activeActions = await db.query.moderationAction.findMany({
    where: and(
      eq(moderationAction.playerId, playerId),
      eq(moderationAction.tenantId, tenantId),
      or(isNull(moderationAction.expiresAt), eq(moderationAction.expiresAt, now)),
    ),
  });

  return activeActions.filter((action) => action.expiresAt === null || action.expiresAt > now);
}
