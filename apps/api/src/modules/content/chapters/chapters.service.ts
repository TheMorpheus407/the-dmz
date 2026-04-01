import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findChaptersBySeason,
  findChapterById,
  createChapter,
  type Chapter,
} from './chapters.repo.js';

import type { AppConfig } from '../../../config.js';

export type { Chapter };

export type ChapterInput = {
  seasonId: string;
  chapterNumber: number;
  act: number;
  title: string;
  description?: string;
  dayStart: number;
  dayEnd: number;
  difficultyStart?: number;
  difficultyEnd?: number;
  threatLevel?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const listChaptersBySeason = async (
  config: AppConfig,
  tenantId: string,
  seasonId: string,
  filters?: {
    act?: number;
    isActive?: boolean;
  },
): Promise<Chapter[]> => {
  const db = getDatabaseClient(config);
  return findChaptersBySeason(db, tenantId, seasonId, filters);
};

export const getChapter = async (
  config: AppConfig,
  tenantId: string,
  id: string,
): Promise<Chapter | undefined> => {
  const db = getDatabaseClient(config);
  return findChapterById(db, tenantId, id);
};

export const createChapterRecord = async (
  config: AppConfig,
  tenantId: string,
  data: ChapterInput,
): Promise<Chapter> => {
  const db = getDatabaseClient(config);
  return createChapter(db, {
    tenantId,
    seasonId: data.seasonId,
    chapterNumber: data.chapterNumber,
    act: data.act,
    title: data.title,
    description: data.description ?? null,
    dayStart: data.dayStart,
    dayEnd: data.dayEnd,
    difficultyStart: data.difficultyStart ?? 1,
    difficultyEnd: data.difficultyEnd ?? 2,
    threatLevel: data.threatLevel ?? 'LOW',
    metadata: data.metadata ?? {},
    isActive: data.isActive ?? true,
  });
};
