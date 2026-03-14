import { getDB, MAX_EMAILS_STORAGE_MB, type CachedEmail } from './idb';

export interface EmailContent {
  scenarioId: string;
  difficulty: number;
  content: unknown;
  indicators: string[];
  createdAt: number;
}

export async function cacheEmail(id: string, email: EmailContent): Promise<CachedEmail> {
  const db = await getDB();
  const cached: CachedEmail = {
    id,
    scenarioId: email.scenarioId,
    difficulty: email.difficulty,
    content: email.content,
    indicators: email.indicators,
    createdAt: email.createdAt,
    cachedAt: Date.now(),
  };

  await db.put('emails', cached);
  return cached;
}

export async function cacheEmails(
  emails: Array<{ id: string } & EmailContent>,
): Promise<CachedEmail[]> {
  const db = await getDB();
  const cached: CachedEmail[] = [];
  const now = Date.now();

  const tx = db.transaction('emails', 'readwrite');
  for (const email of emails) {
    const cachedEmail: CachedEmail = {
      id: email.id,
      scenarioId: email.scenarioId,
      difficulty: email.difficulty,
      content: email.content,
      indicators: email.indicators,
      createdAt: email.createdAt,
      cachedAt: now,
    };
    await tx.store.put(cachedEmail);
    cached.push(cachedEmail);
  }

  await tx.done;
  return cached;
}

export async function getCachedEmail(id: string): Promise<CachedEmail | undefined> {
  const db = await getDB();
  return db.get('emails', id);
}

export async function getAllCachedEmails(): Promise<CachedEmail[]> {
  const db = await getDB();
  return db.getAllFromIndex('emails', 'by-cachedAt');
}

export async function getCachedEmailsByDifficulty(difficulty: number): Promise<CachedEmail[]> {
  const db = await getDB();
  return db.getAllFromIndex('emails', 'by-difficulty', difficulty);
}

export async function getCachedEmailsByScenarioId(scenarioId: string): Promise<CachedEmail[]> {
  const db = await getDB();
  return db.getAllFromIndex('emails', 'by-scenarioId', scenarioId);
}

export async function deleteCachedEmail(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('emails', id);
}

export async function clearCachedEmails(): Promise<void> {
  const db = await getDB();
  await db.clear('emails');
}

export async function getEmailCacheCount(): Promise<number> {
  const db = await getDB();
  return db.count('emails');
}

export async function getEmailStorageEstimate(): Promise<{
  usedBytes: number;
  limitBytes: number;
}> {
  const emails = await getAllCachedEmails();
  const usedBytes = emails.reduce((total, email) => {
    return total + JSON.stringify(email).length;
  }, 0);
  const limitBytes = MAX_EMAILS_STORAGE_MB * 1024 * 1024;
  return { usedBytes, limitBytes };
}

export async function isEmailStorageQuotaExceeded(): Promise<boolean> {
  const { usedBytes, limitBytes } = await getEmailStorageEstimate();
  return usedBytes >= limitBytes;
}
