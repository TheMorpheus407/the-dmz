import { randomUUID } from 'crypto';

import { eq, and, desc, sql as sqlFn, inArray, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  phishingSimulations,
  phishingSimulationTemplates,
  phishingSimulationAudience,
  phishingSimulationResults,
  phishingSimulationTeachableMoments,
  phishingSimulationEvents,
  users,
} from '../../shared/database/schema/index.js';

export type SimulationStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type SimulationOutcome = 'clicked' | 'reported' | 'ignored' | 'pending';

export interface PhishingSimulation {
  simulationId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: SimulationStatus;
  templateId: string | null;
  difficultyTier: number;
  urgencyLevel: UrgencyLevel;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  subject: string;
  body: string;
  includeAttachment: boolean;
  attachmentName: string | null;
  trackingEnabled: boolean;
  teachableMomentId: string | null;
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  timezone: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationInput {
  name: string;
  description?: string | undefined;
  templateId?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject: string;
  body: string;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  trackingEnabled?: boolean | undefined;
  teachableMomentId?: string | undefined;
  scheduledStartDate?: Date | undefined;
  scheduledEndDate?: Date | undefined;
  timezone?: string | undefined;
  createdBy: string;
}

export interface PhishingSimulationUpdateInput {
  name?: string | undefined;
  description?: string | undefined;
  templateId?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject?: string | undefined;
  body?: string | undefined;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  trackingEnabled?: boolean | undefined;
  teachableMomentId?: string | undefined;
  scheduledStartDate?: Date | undefined;
  scheduledEndDate?: Date | undefined;
  timezone?: string | undefined;
}

export interface SimulationAudienceInput {
  groupIds?: string[] | undefined;
  departments?: string[] | undefined;
  locations?: string[] | undefined;
  roles?: string[] | undefined;
  attributeFilters?: Record<string, unknown> | undefined;
}

export interface PhishingSimulationAudience {
  audienceId: string;
  simulationId: string;
  groupIds: string[];
  departments: string[];
  locations: string[];
  roles: string[];
  attributeFilters: Record<string, unknown>;
  targetUserCount: number | null;
  enrolledUserCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationResult {
  resultId: string;
  simulationId: string;
  userId: string;
  emailDelivered: boolean;
  emailOpened: boolean;
  linkClicked: boolean;
  clickedAt: Date | null;
  timeToClickSeconds: number | null;
  reported: boolean;
  reportedAt: Date | null;
  timeToReportSeconds: number | null;
  attachmentOpened: boolean;
  attachmentOpenedAt: Date | null;
  simulationOutcome: SimulationOutcome | null;
  teachableMomentViewed: boolean;
  teachableMomentViewedAt: Date | null;
  enrolledInMicroTraining: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationResultInput {
  userId: string;
  simulationId: string;
}

export interface PhishingSimulationTemplate {
  templateId: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  difficultyTier: number;
  urgencyLevel: UrgencyLevel;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  subject: string;
  body: string;
  mergeTags: string[];
  includeAttachment: boolean;
  attachmentName: string | null;
  indicatorHints: string[];
  teachableMomentConfig: Record<string, unknown>;
  isActive: boolean;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationTemplateInput {
  name: string;
  description?: string | undefined;
  category?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject: string;
  body: string;
  mergeTags?: string[] | undefined;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  indicatorHints?: string[] | undefined;
  teachableMomentConfig?: Record<string, unknown> | undefined;
}

export interface TeachableMoment {
  momentId: string;
  tenantId: string;
  name: string;
  title: string;
  description: string;
  indicatorType: string | null;
  educationalContent: string;
  whatToDoInstead: string;
  microTrainingCourseId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeachableMomentInput {
  name: string;
  title: string;
  description: string;
  indicatorType?: string | undefined;
  educationalContent: string;
  whatToDoInstead: string;
  microTrainingCourseId?: string | undefined;
}

export interface SimulationResultsSummary {
  totalTargeted: number;
  emailDelivered: number;
  emailOpened: number;
  linkClicked: number;
  clickRate: number;
  reported: number;
  reportRate: number;
  attachmentOpened: number;
  teachableMomentViewed: number;
  microTrainingEnrolled: number;
  byDepartment: {
    department: string;
    total: number;
    clicked: number;
    reported: number;
    clickRate: number;
    reportRate: number;
  }[];
  byRole: {
    role: string;
    total: number;
    clicked: number;
    reported: number;
    clickRate: number;
    reportRate: number;
  }[];
  timeToClickDistribution: { bucket: string; count: number }[];
  repeatFailures: string[];
}

function mapSimulationRow(row: typeof phishingSimulations.$inferSelect): PhishingSimulation {
  return {
    simulationId: row.simulationId,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    status: row.status as SimulationStatus,
    templateId: row.templateId,
    difficultyTier: row.difficultyTier,
    urgencyLevel: row.urgencyLevel as UrgencyLevel,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    replyTo: row.replyTo,
    subject: row.subject,
    body: row.body,
    includeAttachment: row.includeAttachment,
    attachmentName: row.attachmentName,
    trackingEnabled: row.trackingEnabled,
    teachableMomentId: row.teachableMomentId,
    scheduledStartDate: row.scheduledStartDate ? new Date(row.scheduledStartDate) : null,
    scheduledEndDate: row.scheduledEndDate ? new Date(row.scheduledEndDate) : null,
    actualStartDate: row.actualStartDate ? new Date(row.actualStartDate) : null,
    actualEndDate: row.actualEndDate ? new Date(row.actualEndDate) : null,
    timezone: row.timezone || 'UTC',
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapTemplateRow(
  row: typeof phishingSimulationTemplates.$inferSelect,
): PhishingSimulationTemplate {
  return {
    templateId: row.templateId,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    category: row.category,
    difficultyTier: row.difficultyTier,
    urgencyLevel: row.urgencyLevel as UrgencyLevel,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    replyTo: row.replyTo,
    subject: row.subject,
    body: row.body,
    mergeTags: row.mergeTags as string[],
    includeAttachment: row.includeAttachment,
    attachmentName: row.attachmentName,
    indicatorHints: row.indicatorHints as string[],
    teachableMomentConfig: row.teachableMomentConfig as Record<string, unknown>,
    isActive: row.isActive,
    isBuiltIn: row.isBuiltIn,
    usageCount: row.usageCount,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapAudienceRow(
  row: typeof phishingSimulationAudience.$inferSelect,
): PhishingSimulationAudience {
  return {
    audienceId: row.audienceId,
    simulationId: row.simulationId,
    groupIds: row.groupIds as string[],
    departments: row.departments as string[],
    locations: row.locations as string[],
    roles: row.roles as string[],
    attributeFilters: row.attributeFilters as Record<string, unknown>,
    targetUserCount: row.targetUserCount,
    enrolledUserCount: row.enrolledUserCount,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

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

export const createPhishingSimulation = async (
  tenantId: string,
  input: PhishingSimulationInput,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation> => {
  const db = getDatabaseClient(config);

  const [simulation] = await db
    .insert(phishingSimulations)
    .values({
      simulationId: randomUUID(),
      tenantId,
      name: input.name,
      description: input.description ?? null,
      status: 'draft',
      templateId: input.templateId ?? null,
      difficultyTier: input.difficultyTier ?? 1,
      urgencyLevel: input.urgencyLevel ?? 'medium',
      senderName: input.senderName ?? null,
      senderEmail: input.senderEmail ?? null,
      replyTo: input.replyTo ?? null,
      subject: input.subject,
      body: input.body,
      includeAttachment: input.includeAttachment ?? false,
      attachmentName: input.attachmentName ?? null,
      trackingEnabled: input.trackingEnabled ?? true,
      teachableMomentId: input.teachableMomentId ?? null,
      scheduledStartDate: input.scheduledStartDate ?? null,
      scheduledEndDate: input.scheduledEndDate ?? null,
      timezone: input.timezone ?? 'UTC',
      createdBy: input.createdBy,
    })
    .returning();

  if (!simulation) {
    throw new Error('Failed to create phishing simulation');
  }

  return mapSimulationRow(simulation);
};

export const listPhishingSimulations = async (
  tenantId: string,
  options: {
    status?: SimulationStatus | undefined;
    dateFrom?: Date | undefined;
    dateTo?: Date | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
  } = {},
  config: AppConfig = loadConfig(),
): Promise<{ simulations: PhishingSimulation[]; total: number }> => {
  const db = getDatabaseClient(config);

  const conditions: (SQL | undefined)[] = [eq(phishingSimulations.tenantId, tenantId)];

  if (options.status) {
    conditions.push(eq(phishingSimulations.status, options.status));
  }

  if (options.dateFrom) {
    conditions.push(sqlFn`${phishingSimulations.scheduledStartDate} >= ${options.dateFrom}`);
  }

  if (options.dateTo) {
    conditions.push(sqlFn`${phishingSimulations.scheduledEndDate} <= ${options.dateTo}`);
  }

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const simulationList = await db
    .select()
    .from(phishingSimulations)
    .where(and(...conditions))
    .orderBy(desc(phishingSimulations.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sqlFn`count(*)` })
    .from(phishingSimulations)
    .where(and(...conditions));

  return {
    simulations: simulationList.map(mapSimulationRow),
    total: Number(countResult?.count ?? 0),
  };
};

export const getPhishingSimulationById = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const db = getDatabaseClient(config);

  const [simulation] = await db
    .select()
    .from(phishingSimulations)
    .where(
      and(
        eq(phishingSimulations.tenantId, tenantId),
        eq(phishingSimulations.simulationId, simulationId),
      ),
    )
    .limit(1);

  return simulation ? mapSimulationRow(simulation) : null;
};

export const updatePhishingSimulation = async (
  tenantId: string,
  simulationId: string,
  input: PhishingSimulationUpdateInput,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const db = getDatabaseClient(config);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) updateData['name'] = input.name;
  if (input.description !== undefined) updateData['description'] = input.description;
  if (input.templateId !== undefined) updateData['templateId'] = input.templateId;
  if (input.difficultyTier !== undefined) updateData['difficultyTier'] = input.difficultyTier;
  if (input.urgencyLevel !== undefined) updateData['urgencyLevel'] = input.urgencyLevel;
  if (input.senderName !== undefined) updateData['senderName'] = input.senderName;
  if (input.senderEmail !== undefined) updateData['senderEmail'] = input.senderEmail;
  if (input.replyTo !== undefined) updateData['replyTo'] = input.replyTo;
  if (input.subject !== undefined) updateData['subject'] = input.subject;
  if (input.body !== undefined) updateData['body'] = input.body;
  if (input.includeAttachment !== undefined)
    updateData['includeAttachment'] = input.includeAttachment;
  if (input.attachmentName !== undefined) updateData['attachmentName'] = input.attachmentName;
  if (input.trackingEnabled !== undefined) updateData['trackingEnabled'] = input.trackingEnabled;
  if (input.teachableMomentId !== undefined)
    updateData['teachableMomentId'] = input.teachableMomentId;
  if (input.scheduledStartDate !== undefined)
    updateData['scheduledStartDate'] = input.scheduledStartDate;
  if (input.scheduledEndDate !== undefined) updateData['scheduledEndDate'] = input.scheduledEndDate;
  if (input.timezone !== undefined) updateData['timezone'] = input.timezone;

  const [simulation] = await db
    .update(phishingSimulations)
    .set(updateData)
    .where(
      and(
        eq(phishingSimulations.tenantId, tenantId),
        eq(phishingSimulations.simulationId, simulationId),
      ),
    )
    .returning();

  return simulation ? mapSimulationRow(simulation) : null;
};

export const updateSimulationStatus = async (
  tenantId: string,
  simulationId: string,
  status: SimulationStatus,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const db = getDatabaseClient(config);

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'active') {
    updateData['actualStartDate'] = new Date();
  } else if (status === 'completed' || status === 'cancelled') {
    updateData['actualEndDate'] = new Date();
  }

  const [simulation] = await db
    .update(phishingSimulations)
    .set(updateData)
    .where(
      and(
        eq(phishingSimulations.tenantId, tenantId),
        eq(phishingSimulations.simulationId, simulationId),
      ),
    )
    .returning();

  return simulation ? mapSimulationRow(simulation) : null;
};

export const deletePhishingSimulation = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  await db
    .delete(phishingSimulations)
    .where(
      and(
        eq(phishingSimulations.tenantId, tenantId),
        eq(phishingSimulations.simulationId, simulationId),
      ),
    );

  return true;
};

export const setSimulationAudience = async (
  _tenantId: string,
  simulationId: string,
  input: SimulationAudienceInput,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationAudience> => {
  const db = getDatabaseClient(config);

  const existingResult = await db
    .select()
    .from(phishingSimulationAudience)
    .where(eq(phishingSimulationAudience.simulationId, simulationId))
    .limit(1);

  const existing = existingResult[0];

  if (existing) {
    const [audience] = await db
      .update(phishingSimulationAudience)
      .set({
        groupIds: input.groupIds ?? [],
        departments: input.departments ?? [],
        locations: input.locations ?? [],
        roles: input.roles ?? [],
        attributeFilters: input.attributeFilters ?? {},
        updatedAt: new Date(),
      })
      .where(eq(phishingSimulationAudience.audienceId, existing.audienceId))
      .returning();

    if (!audience) {
      throw new Error('Failed to update simulation audience');
    }

    return mapAudienceRow(audience);
  }

  const [audience] = await db
    .insert(phishingSimulationAudience)
    .values({
      audienceId: randomUUID(),
      simulationId,
      groupIds: input.groupIds ?? [],
      departments: input.departments ?? [],
      locations: input.locations ?? [],
      roles: input.roles ?? [],
      attributeFilters: input.attributeFilters ?? {},
    })
    .returning();

  if (!audience) {
    throw new Error('Failed to create simulation audience');
  }

  return mapAudienceRow(audience);
};

export const getSimulationAudience = async (
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationAudience | null> => {
  const db = getDatabaseClient(config);

  const [audience] = await db
    .select()
    .from(phishingSimulationAudience)
    .where(eq(phishingSimulationAudience.simulationId, simulationId))
    .limit(1);

  return audience ? mapAudienceRow(audience) : null;
};

export const getEligibleUsersForSimulation = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> => {
  const db = getDatabaseClient(config);

  const audience = await getSimulationAudience(simulationId, config);
  if (!audience) {
    return [];
  }

  const conditions: (SQL | undefined)[] = [eq(users.tenantId, tenantId), eq(users.isActive, true)];

  const userList = await db
    .select({
      userId: users.userId,
      department: users.department,
      role: users.role,
    })
    .from(users)
    .where(and(...conditions));

  const eligibleUserIds: string[] = [];

  for (const user of userList) {
    let isEligible = true;

    const userDepartment = user.department ?? '';
    const userRole = user.role ?? '';

    const deptArray = audience.departments;
    const roleArray = audience.roles;

    if (deptArray && deptArray.length > 0) {
      isEligible = isEligible && deptArray.includes(userDepartment);
    }

    if (roleArray && roleArray.length > 0) {
      isEligible = isEligible && roleArray.includes(userRole);
    }

    if (audience.attributeFilters && Object.keys(audience.attributeFilters).length > 0) {
      const filters = audience.attributeFilters;
      for (const [key, value] of Object.entries(filters)) {
        if ((user as Record<string, unknown>)[key] !== value) {
          isEligible = false;
          break;
        }
      }
    }

    if (isEligible) {
      eligibleUserIds.push(user.userId);
    }
  }

  return eligibleUserIds;
};

export const launchSimulation = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  if (
    simulation.status !== 'draft' &&
    simulation.status !== 'scheduled' &&
    simulation.status !== 'paused'
  ) {
    throw new Error('Simulation cannot be launched in current status');
  }

  const eligibleUsers = await getEligibleUsersForSimulation(tenantId, simulationId, config);

  const db = getDatabaseClient(config);

  if (eligibleUsers.length > 0) {
    const resultsToCreate = eligibleUsers.map((userId) => ({
      resultId: randomUUID(),
      simulationId,
      userId,
      emailDelivered: false,
      emailOpened: false,
      linkClicked: false,
      reported: false,
      attachmentOpened: false,
      teachableMomentViewed: false,
      enrolledInMicroTraining: false,
    }));

    await db.insert(phishingSimulationResults).values(resultsToCreate);

    await db
      .update(phishingSimulationAudience)
      .set({
        enrolledUserCount: eligibleUsers.length,
        updatedAt: new Date(),
      })
      .where(eq(phishingSimulationAudience.simulationId, simulationId));
  }

  return updateSimulationStatus(tenantId, simulationId, 'active', config);
};

export const pauseSimulation = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  if (simulation.status !== 'active') {
    throw new Error('Only active simulations can be paused');
  }

  return updateSimulationStatus(tenantId, simulationId, 'paused', config);
};

export const resumeSimulation = async (
  tenantId: string,
  simulationId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulation | null> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  if (simulation.status !== 'paused') {
    throw new Error('Only paused simulations can be resumed');
  }

  return updateSimulationStatus(tenantId, simulationId, 'active', config);
};

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

export const createPhishingTemplate = async (
  tenantId: string,
  input: PhishingSimulationTemplateInput,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate> => {
  const db = getDatabaseClient(config);

  const [template] = await db
    .insert(phishingSimulationTemplates)
    .values({
      templateId: randomUUID(),
      tenantId,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      difficultyTier: input.difficultyTier ?? 1,
      urgencyLevel: input.urgencyLevel ?? 'medium',
      senderName: input.senderName ?? null,
      senderEmail: input.senderEmail ?? null,
      replyTo: input.replyTo ?? null,
      subject: input.subject,
      body: input.body,
      mergeTags: input.mergeTags ?? [],
      includeAttachment: input.includeAttachment ?? false,
      attachmentName: input.attachmentName ?? null,
      indicatorHints: input.indicatorHints ?? [],
      teachableMomentConfig: input.teachableMomentConfig ?? {},
      isActive: true,
      isBuiltIn: false,
    })
    .returning();

  if (!template) {
    throw new Error('Failed to create phishing template');
  }

  return mapTemplateRow(template);
};

export const listPhishingTemplates = async (
  tenantId: string,
  options: {
    category?: string | undefined;
    isActive?: boolean | undefined;
    includeBuiltIn?: boolean | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  } = {},
  config: AppConfig = loadConfig(),
): Promise<{ templates: PhishingSimulationTemplate[]; total: number }> => {
  const db = getDatabaseClient(config);

  const conditions: (SQL | undefined)[] = [];

  if (!options.includeBuiltIn) {
    conditions.push(
      sqlFn`${phishingSimulationTemplates.tenantId} = ${tenantId} OR ${phishingSimulationTemplates.tenantId} IS NULL`,
    );
  } else {
    conditions.push(
      and(
        eq(phishingSimulationTemplates.tenantId, tenantId),
        sqlFn`${phishingSimulationTemplates.tenantId} IS NULL`,
      ),
    );
  }

  if (options.category) {
    conditions.push(eq(phishingSimulationTemplates.category, options.category));
  }

  if (options.isActive !== undefined) {
    conditions.push(eq(phishingSimulationTemplates.isActive, options.isActive));
  }

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const templateList = await db
    .select()
    .from(phishingSimulationTemplates)
    .where(and(...conditions))
    .orderBy(desc(phishingSimulationTemplates.usageCount))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sqlFn`count(*)` })
    .from(phishingSimulationTemplates)
    .where(and(...conditions));

  return {
    templates: templateList.map(mapTemplateRow),
    total: Number(countResult?.count ?? 0),
  };
};

export const getPhishingTemplateById = async (
  templateId: string,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate | null> => {
  const db = getDatabaseClient(config);

  const [template] = await db
    .select()
    .from(phishingSimulationTemplates)
    .where(eq(phishingSimulationTemplates.templateId, templateId))
    .limit(1);

  return template ? mapTemplateRow(template) : null;
};

export const updatePhishingTemplate = async (
  tenantId: string,
  templateId: string,
  input: Partial<PhishingSimulationTemplateInput>,
  config: AppConfig = loadConfig(),
): Promise<PhishingSimulationTemplate | null> => {
  const db = getDatabaseClient(config);

  const existing = await getPhishingTemplateById(templateId, config);
  if (!existing) {
    return null;
  }

  if (existing.isBuiltIn && existing.tenantId !== null) {
    throw new Error('Cannot modify built-in templates');
  }

  if (!existing.isBuiltIn && existing.tenantId !== tenantId) {
    throw new Error('Template not found');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) updateData['name'] = input.name;
  if (input.description !== undefined) updateData['description'] = input.description;
  if (input.category !== undefined) updateData['category'] = input.category;
  if (input.difficultyTier !== undefined) updateData['difficultyTier'] = input.difficultyTier;
  if (input.urgencyLevel !== undefined) updateData['urgencyLevel'] = input.urgencyLevel;
  if (input.senderName !== undefined) updateData['senderName'] = input.senderName;
  if (input.senderEmail !== undefined) updateData['senderEmail'] = input.senderEmail;
  if (input.replyTo !== undefined) updateData['replyTo'] = input.replyTo;
  if (input.subject !== undefined) updateData['subject'] = input.subject;
  if (input.body !== undefined) updateData['body'] = input.body;
  if (input.mergeTags !== undefined) updateData['mergeTags'] = input.mergeTags;
  if (input.includeAttachment !== undefined)
    updateData['includeAttachment'] = input.includeAttachment;
  if (input.attachmentName !== undefined) updateData['attachmentName'] = input.attachmentName;
  if (input.indicatorHints !== undefined) updateData['indicatorHints'] = input.indicatorHints;
  if (input.teachableMomentConfig !== undefined)
    updateData['teachableMomentConfig'] = input.teachableMomentConfig;

  const [template] = await db
    .update(phishingSimulationTemplates)
    .set(updateData)
    .where(eq(phishingSimulationTemplates.templateId, templateId))
    .returning();

  return template ? mapTemplateRow(template) : null;
};

export const deletePhishingTemplate = async (
  tenantId: string,
  templateId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const existing = await getPhishingTemplateById(templateId, config);
  if (!existing) {
    return false;
  }

  if (existing.isBuiltIn) {
    throw new Error('Cannot delete built-in templates');
  }

  if (existing.tenantId !== tenantId) {
    throw new Error('Template not found');
  }

  await db
    .delete(phishingSimulationTemplates)
    .where(eq(phishingSimulationTemplates.templateId, templateId));

  return true;
};

export const createTeachableMoment = async (
  tenantId: string,
  input: TeachableMomentInput,
  config: AppConfig = loadConfig(),
): Promise<TeachableMoment> => {
  const db = getDatabaseClient(config);

  const [moment] = await db
    .insert(phishingSimulationTeachableMoments)
    .values({
      momentId: randomUUID(),
      tenantId,
      name: input.name,
      title: input.title,
      description: input.description,
      indicatorType: input.indicatorType ?? null,
      educationalContent: input.educationalContent,
      whatToDoInstead: input.whatToDoInstead,
      microTrainingCourseId: input.microTrainingCourseId ?? null,
    })
    .returning();

  if (!moment) {
    throw new Error('Failed to create teachable moment');
  }

  return {
    momentId: moment.momentId,
    tenantId: moment.tenantId,
    name: moment.name,
    title: moment.title,
    description: moment.description,
    indicatorType: moment.indicatorType,
    educationalContent: moment.educationalContent,
    whatToDoInstead: moment.whatToDoInstead,
    microTrainingCourseId: moment.microTrainingCourseId,
    isActive: moment.isActive,
    createdAt: new Date(moment.createdAt),
    updatedAt: new Date(moment.updatedAt),
  };
};

export const listTeachableMoments = async (
  tenantId: string,
  options: { indicatorType?: string | undefined; isActive?: boolean | undefined } = {},
  config: AppConfig = loadConfig(),
): Promise<TeachableMoment[]> => {
  const db = getDatabaseClient(config);

  const conditions: (SQL | undefined)[] = [
    eq(phishingSimulationTeachableMoments.tenantId, tenantId),
  ];

  if (options.indicatorType) {
    conditions.push(eq(phishingSimulationTeachableMoments.indicatorType, options.indicatorType));
  }

  if (options.isActive !== undefined) {
    conditions.push(eq(phishingSimulationTeachableMoments.isActive, options.isActive));
  }

  const moments = await db
    .select()
    .from(phishingSimulationTeachableMoments)
    .where(and(...conditions))
    .orderBy(desc(phishingSimulationTeachableMoments.createdAt));

  return moments.map((m) => ({
    momentId: m.momentId,
    tenantId: m.tenantId,
    name: m.name,
    title: m.title,
    description: m.description,
    indicatorType: m.indicatorType,
    educationalContent: m.educationalContent,
    whatToDoInstead: m.whatToDoInstead,
    microTrainingCourseId: m.microTrainingCourseId,
    isActive: m.isActive,
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
  }));
};

export const getTeachableMomentById = async (
  tenantId: string,
  momentId: string,
  config: AppConfig = loadConfig(),
): Promise<TeachableMoment | null> => {
  const db = getDatabaseClient(config);

  const [moment] = await db
    .select()
    .from(phishingSimulationTeachableMoments)
    .where(
      and(
        eq(phishingSimulationTeachableMoments.tenantId, tenantId),
        eq(phishingSimulationTeachableMoments.momentId, momentId),
      ),
    )
    .limit(1);

  if (!moment) {
    return null;
  }

  return {
    momentId: moment.momentId,
    tenantId: moment.tenantId,
    name: moment.name,
    title: moment.title,
    description: moment.description,
    indicatorType: moment.indicatorType,
    educationalContent: moment.educationalContent,
    whatToDoInstead: moment.whatToDoInstead,
    microTrainingCourseId: moment.microTrainingCourseId,
    isActive: moment.isActive,
    createdAt: new Date(moment.createdAt),
    updatedAt: new Date(moment.updatedAt),
  };
};

export const exportSimulationResults = async (
  tenantId: string,
  simulationId: string,
  format: 'csv' | 'json',
  config: AppConfig = loadConfig(),
): Promise<string> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  const results = await getSimulationResults(tenantId, simulationId, config);

  const userIds = results.map((r) => r.userId);
  const usersWithInfo =
    userIds.length > 0
      ? await getDatabaseClient(config)
          .select({
            userId: users.userId,
            email: users.email,
            department: users.department,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.userId, userIds))
      : [];

  const userMap = new Map(usersWithInfo.map((u) => [u.userId, u]));

  const enrichedResults = results.map((r) => {
    const user = userMap.get(r.userId);
    return {
      ...r,
      userEmail: user?.email ?? '',
      userDepartment: user?.department ?? '',
      userRole: user?.role ?? '',
    };
  });

  if (format === 'csv') {
    const headers = [
      'result_id',
      'simulation_id',
      'user_id',
      'user_email',
      'department',
      'role',
      'email_delivered',
      'email_opened',
      'link_clicked',
      'clicked_at',
      'time_to_click_seconds',
      'reported',
      'reported_at',
      'time_to_report_seconds',
      'simulation_outcome',
      'teachable_moment_viewed',
      'enrolled_in_micro_training',
    ].join(',');

    const rows = enrichedResults.map((r) =>
      [
        r.resultId,
        r.simulationId,
        r.userId,
        r.userEmail,
        r.userDepartment,
        r.userRole,
        r.emailDelivered,
        r.emailOpened,
        r.linkClicked,
        r.clickedAt?.toISOString() ?? '',
        r.timeToClickSeconds ?? '',
        r.reported,
        r.reportedAt?.toISOString() ?? '',
        r.timeToReportSeconds ?? '',
        r.simulationOutcome ?? '',
        r.teachableMomentViewed,
        r.enrolledInMicroTraining,
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  return JSON.stringify(enrichedResults, null, 2);
};
