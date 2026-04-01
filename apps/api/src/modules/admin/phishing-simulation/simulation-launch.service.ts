import { randomUUID } from 'crypto';

import { eq } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import {
  phishingSimulationResults,
  phishingSimulationAudience,
} from '../../../shared/database/schema/index.js';

import { getPhishingSimulationById, updateSimulationStatus } from './simulation.service.js';
import { getEligibleUsersForSimulation } from './audience.service.js';

import type { PhishingSimulation } from './types.js';

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
