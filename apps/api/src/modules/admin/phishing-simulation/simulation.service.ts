import { randomUUID } from 'crypto';

import { eq, and, desc, sql as sqlFn, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { phishingSimulations } from '../../../shared/database/schema/index.js';

import type {
  PhishingSimulation,
  PhishingSimulationInput,
  PhishingSimulationUpdateInput,
  SimulationStatus,
  UrgencyLevel,
} from './types.js';

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
