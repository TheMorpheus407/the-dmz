import { getDatabaseClient } from '../../../shared/database/connection.js';

import { findSeasons, findSeasonById, createSeason, type Season } from './seasons.repo.js';

import type { AppConfig } from '../../../config.js';

export type { Season };

export type SeasonInput = {
  seasonNumber: number;
  title: string;
  theme: string;
  logline: string;
  description?: string;
  threatCurveStart?: string;
  threatCurveEnd?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const listSeasons = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    seasonNumber?: number;
    isActive?: boolean;
  },
): Promise<Season[]> => {
  const db = getDatabaseClient(config);
  return findSeasons(db, tenantId, filters);
};

export const getSeason = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<Season | undefined> => {
  const db = getDatabaseClient(config);
  return findSeasonById(db, tenantId, id);
};

export const createSeasonRecord = async (
  config: AppConfig,
  tenantId: string,
  data: SeasonInput,
): Promise<Season> => {
  const db = getDatabaseClient(config);
  return createSeason(db, {
    tenantId,
    seasonNumber: data.seasonNumber,
    title: data.title,
    theme: data.theme,
    logline: data.logline,
    description: data.description ?? null,
    threatCurveStart: data.threatCurveStart ?? 'LOW',
    threatCurveEnd: data.threatCurveEnd ?? 'HIGH',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};
