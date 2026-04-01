import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findScenarios,
  findScenarioWithBeats,
  createScenario,
  type Scenario,
  type ScenarioBeat,
} from './scenarios.repo.js';

import type { AppConfig } from '../../../config.js';

export type { Scenario, ScenarioBeat };

export type ScenarioInput = {
  name: string;
  description?: string | null;
  difficulty: number;
  faction?: string | null;
  season?: number | null;
  chapter?: number | null;
  language?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const listScenarios = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    difficulty?: number;
    faction?: string;
    season?: number;
    isActive?: boolean;
  },
): Promise<Scenario[]> => {
  const db = getDatabaseClient(config);
  return findScenarios(db, tenantId, filters);
};

export const getScenario = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<{ scenario: Scenario; beats: ScenarioBeat[] } | undefined> => {
  const db = getDatabaseClient(config);
  return findScenarioWithBeats(db, tenantId, id);
};

export const createScenarioRecord = async (
  config: AppConfig,
  tenantId: string,
  data: ScenarioInput,
): Promise<Scenario> => {
  const db = getDatabaseClient(config);
  return createScenario(db, {
    tenantId,
    name: data.name,
    description: data.description ?? null,
    difficulty: data.difficulty,
    faction: data.faction ?? null,
    season: data.season ?? null,
    chapter: data.chapter ?? null,
    language: data.language ?? 'en',
    locale: data.locale ?? 'en-US',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};
