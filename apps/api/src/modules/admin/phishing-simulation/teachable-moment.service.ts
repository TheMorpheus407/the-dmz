import { randomUUID } from 'crypto';

import { eq, and, desc, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { phishingSimulationTeachableMoments } from '../../../shared/database/schema/index.js';

import type { TeachableMoment, TeachableMomentInput } from './types.js';

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
