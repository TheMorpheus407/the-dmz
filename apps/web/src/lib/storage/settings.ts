import { getDB, type StoredSetting } from './idb';

export async function saveSetting(key: string, value: unknown): Promise<StoredSetting> {
  const db = await getDB();
  const setting: StoredSetting = {
    key,
    value,
    updatedAt: Date.now(),
  };

  await db.put('settings', setting);
  return setting;
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const setting = await db.get('settings', key);
  return setting?.value as T | undefined;
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', key);
}

export async function getAllSettings(): Promise<StoredSetting[]> {
  const db = await getDB();
  return db.getAll('settings');
}

export async function clearAllSettings(): Promise<void> {
  const db = await getDB();
  await db.clear('settings');
}

export async function getSettingUpdatedAt(key: string): Promise<number | undefined> {
  const db = await getDB();
  const setting = await db.get('settings', key);
  return setting?.updatedAt;
}

export async function settingExists(key: string): Promise<boolean> {
  const db = await getDB();
  const setting = await db.get('settings', key);
  return !!setting;
}
