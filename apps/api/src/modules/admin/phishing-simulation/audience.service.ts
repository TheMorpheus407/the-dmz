import { randomUUID } from 'crypto';

import { eq, and, type SQL } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { phishingSimulationAudience, users } from '../../../shared/database/schema/index.js';

import type { PhishingSimulationAudience, SimulationAudienceInput } from './types.js';

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
