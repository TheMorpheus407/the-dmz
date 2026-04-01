import { and, eq } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import {
  scenarios,
  scenarioBeats,
  type Scenario,
  type ScenarioBeat,
} from '../../../db/schema/content/index.js';

export type { Scenario, ScenarioBeat };

export const findScenarios = async (
  db: DB,
  tenantId: string,
  filters?: {
    difficulty?: number;
    faction?: string;
    season?: number;
    isActive?: boolean;
  },
): Promise<Scenario[]> => {
  const conditions = [eq(scenarios.tenantId, tenantId)];

  if (filters?.difficulty) {
    conditions.push(eq(scenarios.difficulty, filters.difficulty));
  }
  if (filters?.faction) {
    conditions.push(eq(scenarios.faction, filters.faction));
  }
  if (filters?.season) {
    conditions.push(eq(scenarios.season, filters.season));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(scenarios.isActive, filters.isActive));
  }

  return db
    .select()
    .from(scenarios)
    .where(and(...conditions));
};

export const findScenarioById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Scenario | undefined> => {
  const results = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, id), eq(scenarios.tenantId, tenantId)));

  return results[0];
};

export const findScenarioWithBeats = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<{ scenario: Scenario; beats: ScenarioBeat[] } | undefined> => {
  const scenario = await findScenarioById(db, tenantId, id);
  if (!scenario) return undefined;

  const beatResults = await db
    .select()
    .from(scenarioBeats)
    .where(and(eq(scenarioBeats.scenarioId, id), eq(scenarioBeats.tenantId, tenantId)))
    .orderBy(scenarioBeats.beatIndex);

  return { scenario, beats: beatResults };
};

export const createScenario = async (
  db: DB,
  data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Scenario> => {
  const [created] = await db.insert(scenarios).values(data).returning();
  if (!created) {
    throw new Error('Failed to create scenario');
  }
  return created;
};
