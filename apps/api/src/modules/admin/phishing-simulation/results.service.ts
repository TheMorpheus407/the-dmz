import { randomUUID } from 'crypto';

import { eq, and, inArray } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import {
  phishingSimulationResults,
  phishingSimulationEvents,
  users,
} from '../../../shared/database/schema/index.js';

import { getPhishingSimulationById } from './simulation.service.js';

import type {
  PhishingSimulationResult,
  SimulationResultsSummary,
  SimulationOutcome,
} from './types.js';

function mapResultRow(
  row: typeof phishingSimulationResults.$inferSelect,
): PhishingSimulationResult {
  return {
    resultId: row.resultId,
    simulationId: row.simulationId,
    userId: row.userId,
    emailDelivered: row.emailDelivered,
    emailOpened: row.emailOpened,
    linkClicked: row.linkClicked,
    clickedAt: row.clickedAt ? new Date(row.clickedAt) : null,
    timeToClickSeconds: row.timeToClickSeconds,
    reported: row.reported,
    reportedAt: row.reportedAt ? new Date(row.reportedAt) : null,
    timeToReportSeconds: row.timeToReportSeconds,
    attachmentOpened: row.attachmentOpened,
    attachmentOpenedAt: row.attachmentOpenedAt ? new Date(row.attachmentOpenedAt) : null,
    simulationOutcome: row.simulationOutcome as SimulationOutcome | null,
    teachableMomentViewed: row.teachableMomentViewed,
    teachableMomentViewedAt: row.teachableMomentViewedAt
      ? new Date(row.teachableMomentViewedAt)
      : null,
    enrolledInMicroTraining: row.enrolledInMicroTraining,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const getSimulationResults = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationResult[]> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  const db = getDatabaseClient(config);

  const results = await db
    .select()
    .from(phishingSimulationResults)
    .where(eq(phishingSimulationResults.simulationId, simulationId));

  return results.map(mapResultRow);
};

export const getSimulationResultsSummary = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<SimulationResultsSummary | null> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    return null;
  }

  const db = getDatabaseClient(config);

  const results = await db
    .select()
    .from(phishingSimulationResults)
    .where(eq(phishingSimulationResults.simulationId, simulationId));

  const totalTargeted = results.length;
  const emailDelivered = results.filter((r) => r.emailDelivered).length;
  const emailOpened = results.filter((r) => r.emailOpened).length;
  const linkClicked = results.filter((r) => r.linkClicked).length;
  const reported = results.filter((r) => r.reported).length;
  const attachmentOpened = results.filter((r) => r.attachmentOpened).length;
  const teachableMomentViewed = results.filter((r) => r.teachableMomentViewed).length;
  const microTrainingEnrolled = results.filter((r) => r.enrolledInMicroTraining).length;

  const clickRate = totalTargeted > 0 ? (linkClicked / totalTargeted) * 100 : 0;
  const reportRate = totalTargeted > 0 ? (reported / totalTargeted) * 100 : 0;

  const userIds = results.map((r) => r.userId);
  const usersWithDept =
    userIds.length > 0
      ? await db
          .select({ userId: users.userId, department: users.department, role: users.role })
          .from(users)
          .where(inArray(users.userId, userIds))
      : [];

  const userMap = new Map(usersWithDept.map((u) => [u.userId, u]));

  const deptMap = new Map<string, { total: number; clicked: number; reported: number }>();
  const roleMap = new Map<string, { total: number; clicked: number; reported: number }>();

  for (const result of results) {
    const user = userMap.get(result.userId);
    const dept = user?.department ?? 'Unknown';
    const role = user?.role ?? 'Unknown';

    const deptStats = deptMap.get(dept) ?? { total: 0, clicked: 0, reported: 0 };
    deptStats.total++;
    if (result.linkClicked) deptStats.clicked++;
    if (result.reported) deptStats.reported++;
    deptMap.set(dept, deptStats);

    const roleStats = roleMap.get(role) ?? { total: 0, clicked: 0, reported: 0 };
    roleStats.total++;
    if (result.linkClicked) roleStats.clicked++;
    if (result.reported) roleStats.reported++;
    roleMap.set(role, roleStats);
  }

  const byDepartment = Array.from(deptMap.entries()).map(([department, stats]) => ({
    department,
    total: stats.total,
    clicked: stats.clicked,
    reported: stats.reported,
    clickRate: stats.total > 0 ? (stats.clicked / stats.total) * 100 : 0,
    reportRate: stats.total > 0 ? (stats.reported / stats.total) * 100 : 0,
  }));

  const byRole = Array.from(roleMap.entries()).map(([role, stats]) => ({
    role,
    total: stats.total,
    clicked: stats.clicked,
    reported: stats.reported,
    clickRate: stats.total > 0 ? (stats.clicked / stats.total) * 100 : 0,
    reportRate: stats.total > 0 ? (stats.reported / stats.total) * 100 : 0,
  }));

  const timeToClickBuckets = [
    { bucket: '< 1 min', min: 0, max: 60 },
    { bucket: '1-5 min', min: 60, max: 300 },
    { bucket: '5-15 min', min: 300, max: 900 },
    { bucket: '15-30 min', min: 900, max: 1800 },
    { bucket: '30-60 min', min: 1800, max: 3600 },
    { bucket: '> 1 hour', min: 3600, max: Infinity },
  ];

  const timeToClickDistribution = timeToClickBuckets.map(({ bucket, min, max }) => ({
    bucket,
    count: results.filter((r) => {
      if (!r.timeToClickSeconds) return false;
      return r.timeToClickSeconds >= min && r.timeToClickSeconds < max;
    }).length,
  }));

  const userFailureCount = new Map<string, number>();
  for (const result of results) {
    if (result.linkClicked) {
      userFailureCount.set(result.userId, (userFailureCount.get(result.userId) || 0) + 1);
    }
  }

  const repeatFailures = Array.from(userFailureCount.entries())
    .filter(([, count]) => count > 1)
    .map(([userId]) => userId);

  return {
    totalTargeted,
    emailDelivered,
    emailOpened,
    linkClicked,
    clickRate,
    reported,
    reportRate,
    attachmentOpened,
    teachableMomentViewed,
    microTrainingEnrolled,
    byDepartment,
    byRole,
    timeToClickDistribution,
    repeatFailures,
  };
};

export const recordSimulationEvent = async (
  simulationId: string,
  userId: string,
  eventType: string,
  eventData: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  await db.insert(phishingSimulationEvents).values({
    eventId: randomUUID(),
    simulationId,
    userId,
    eventType,
    eventData,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
};

export const recordLinkClick = async (
  simulationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existingResult] = await db
    .select()
    .from(phishingSimulationResults)
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    )
    .limit(1);

  if (!existingResult) {
    throw new Error('Simulation result not found');
  }

  const now = new Date();
  const simulationStart = existingResult.createdAt;
  const timeToClickSeconds = Math.floor(
    (now.getTime() - new Date(simulationStart).getTime()) / 1000,
  );

  await db
    .update(phishingSimulationResults)
    .set({
      linkClicked: true,
      clickedAt: now,
      timeToClickSeconds,
      simulationOutcome: 'clicked',
      updatedAt: now,
    })
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    );

  await recordSimulationEvent(
    simulationId,
    userId,
    'link_clicked',
    {},
    ipAddress,
    userAgent,
    config,
  );
};

export const recordReport = async (
  simulationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  const [existingResult] = await db
    .select()
    .from(phishingSimulationResults)
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    )
    .limit(1);

  if (!existingResult) {
    throw new Error('Simulation result not found');
  }

  const now = new Date();
  const simulationStart = existingResult.createdAt;
  const timeToReportSeconds = Math.floor(
    (now.getTime() - new Date(simulationStart).getTime()) / 1000,
  );

  const currentOutcome = existingResult.simulationOutcome;

  await db
    .update(phishingSimulationResults)
    .set({
      reported: true,
      reportedAt: now,
      timeToReportSeconds,
      simulationOutcome: currentOutcome === 'clicked' ? 'clicked' : 'reported',
      updatedAt: now,
    })
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    );

  await recordSimulationEvent(
    simulationId,
    userId,
    'simulation_reported',
    {},
    ipAddress,
    userAgent,
    config,
  );
};

export const recordTeachableMomentView = async (
  simulationId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  await db
    .update(phishingSimulationResults)
    .set({
      teachableMomentViewed: true,
      teachableMomentViewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    );

  await recordSimulationEvent(simulationId, userId, 'teachable_moment_viewed', {});
};

export const recordMicroTrainingEnrollment = async (
  simulationId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<void> => {
  const db = getDatabaseClient(config);

  await db
    .update(phishingSimulationResults)
    .set({
      enrolledInMicroTraining: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(phishingSimulationResults.simulationId, simulationId),
        eq(phishingSimulationResults.userId, userId),
      ),
    );

  await recordSimulationEvent(simulationId, userId, 'micro_training_enrolled', {});
};
