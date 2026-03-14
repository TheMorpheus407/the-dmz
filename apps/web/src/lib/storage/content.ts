import { generateId } from '$lib/utils/id';

import { getDB } from './idb';

export type DocumentType =
  | 'email'
  | 'memo'
  | 'report'
  | 'log'
  | 'chat'
  | 'file'
  | 'calendar'
  | 'invoice'
  | 'contract'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'other';

export type DifficultyTier = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';

export interface OfflineContent {
  id: string;
  type: DocumentType;
  data: unknown;
  difficulty: DifficultyTier;
  createdAt: number;
}

export async function saveOfflineContent(
  type: DocumentType,
  data: unknown,
  difficulty: DifficultyTier,
): Promise<OfflineContent> {
  const db = await getDB();
  const content: OfflineContent = {
    id: generateId(),
    type,
    data,
    difficulty,
    createdAt: Date.now(),
  };

  await db.put('offlineContent', content);
  return content;
}

export async function getOfflineContent(id: string): Promise<OfflineContent | undefined> {
  const db = await getDB();
  const result = await db.get('offlineContent', id);
  return result as OfflineContent | undefined;
}

export async function getAllOfflineContent(): Promise<OfflineContent[]> {
  const db = await getDB();
  const result = await db.getAll('offlineContent');
  return result as OfflineContent[];
}

export async function getOfflineContentByType(type: DocumentType): Promise<OfflineContent[]> {
  const db = await getDB();
  const tx = db.transaction('offlineContent', 'readonly');
  const index = tx.store.index('by-type');
  const result = await index.getAll(type);
  return result as OfflineContent[];
}

export async function getOfflineContentByDifficulty(
  difficulty: DifficultyTier,
): Promise<OfflineContent[]> {
  const db = await getDB();
  const tx = db.transaction('offlineContent', 'readonly');
  const index = tx.store.index('by-difficulty');
  const result = await index.getAll(difficulty);
  return result as OfflineContent[];
}

export async function deleteOfflineContent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offlineContent', id);
}

export async function clearOfflineContent(): Promise<void> {
  const db = await getDB();
  await db.clear('offlineContent');
}

export async function getOfflineContentStats(): Promise<{
  total: number;
  byType: Record<DocumentType, number>;
  byDifficulty: Record<DifficultyTier, number>;
}> {
  const all = await getAllOfflineContent();

  const byType: Record<DocumentType, number> = {
    email: 0,
    memo: 0,
    report: 0,
    log: 0,
    chat: 0,
    file: 0,
    calendar: 0,
    invoice: 0,
    contract: 0,
    spreadsheet: 0,
    presentation: 0,
    code: 0,
    other: 0,
  };

  const byDifficulty: Record<DifficultyTier, number> = {
    tutorial: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };

  for (const content of all) {
    byType[content.type]++;
    byDifficulty[content.difficulty]++;
  }

  return {
    total: all.length,
    byType,
    byDifficulty,
  };
}

export const DOCUMENT_TYPES: DocumentType[] = [
  'email',
  'memo',
  'report',
  'log',
  'chat',
  'file',
  'calendar',
  'invoice',
  'contract',
  'spreadsheet',
  'presentation',
  'code',
  'other',
];

export const DIFFICULTY_TIERS: DifficultyTier[] = ['tutorial', 'easy', 'medium', 'hard', 'expert'];
