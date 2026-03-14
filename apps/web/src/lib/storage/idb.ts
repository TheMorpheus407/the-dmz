import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface CachedEmail {
  id: string;
  scenarioId: string;
  difficulty: number;
  content: unknown;
  indicators: string[];
  createdAt: number;
  cachedAt: number;
}

export interface QueuedDecision {
  id: string;
  sessionId: string;
  emailId: string;
  decision: string;
  markedIndicators: string[];
  timestamp: number;
  synced: boolean;
}

export interface StoredGameState {
  sessionId: string;
  dayNumber: number;
  phase: string;
  resources: unknown;
  wallet: number;
  lastSyncedAt: number;
}

export interface StoredSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface DmzOfflineDB extends DBSchema {
  events: {
    key: string;
    value: {
      id: string;
      type: string;
      payload: unknown;
      timestamp: number;
      clientSequenceId: number;
      synced: boolean;
    };
    indexes: { 'by-synced': number; 'by-timestamp': number };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      state: unknown;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  offlineContent: {
    key: string;
    value: {
      id: string;
      type: string;
      data: unknown;
      difficulty: string;
      createdAt: number;
    };
    indexes: { 'by-type': string; 'by-difficulty': string };
  };
  pushSubscriptions: {
    key: string;
    value: {
      id: string;
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
      createdAt: number;
    };
  };
  emails: {
    key: string;
    value: CachedEmail;
    indexes: { 'by-scenarioId': string; 'by-difficulty': number; 'by-cachedAt': number };
  };
  decisions: {
    key: string;
    value: QueuedDecision;
    indexes: { 'by-sessionId': string; 'by-synced': number; 'by-timestamp': number };
  };
  gameState: {
    key: string;
    value: StoredGameState;
  };
  settings: {
    key: string;
    value: StoredSetting;
  };
}

const DB_NAME = 'dmz-offline';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<DmzOfflineDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<DmzOfflineDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  if (!dbPromise) {
    dbPromise = openDB<DmzOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const eventStore = db.createObjectStore('events', {
            keyPath: 'id',
          });
          eventStore.createIndex('by-synced', 'synced');
          eventStore.createIndex('by-timestamp', 'timestamp');

          const sessionStore = db.createObjectStore('sessions', {
            keyPath: 'id',
          });
          sessionStore.createIndex('by-timestamp', 'timestamp');

          const contentStore = db.createObjectStore('offlineContent', {
            keyPath: 'id',
          });
          contentStore.createIndex('by-type', 'type');
          contentStore.createIndex('by-difficulty', 'difficulty');

          db.createObjectStore('pushSubscriptions', {
            keyPath: 'id',
          });
        }

        if (oldVersion < 2) {
          const emailStore = db.createObjectStore('emails', {
            keyPath: 'id',
          });
          emailStore.createIndex('by-scenarioId', 'scenarioId');
          emailStore.createIndex('by-difficulty', 'difficulty');
          emailStore.createIndex('by-cachedAt', 'cachedAt');

          const decisionStore = db.createObjectStore('decisions', {
            keyPath: 'id',
          });
          decisionStore.createIndex('by-sessionId', 'sessionId');
          decisionStore.createIndex('by-synced', 'synced');
          decisionStore.createIndex('by-timestamp', 'timestamp');

          db.createObjectStore('gameState', {
            keyPath: 'sessionId',
          });

          db.createObjectStore('settings', {
            keyPath: 'key',
          });
        }
      },
    });
  }

  return dbPromise;
}

export async function clearDB(): Promise<void> {
  const db = await getDB();
  await db.clear('events');
  await db.clear('sessions');
  await db.clear('offlineContent');
  await db.clear('pushSubscriptions');
  await db.clear('emails');
  await db.clear('decisions');
  await db.clear('gameState');
  await db.clear('settings');
}

export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { used: 0, quota: 0 };
  }

  const estimate = await navigator.storage.estimate();
  return {
    used: estimate.usage || 0,
    quota: estimate.quota || 0,
  };
}

export const MAX_IDB_STORAGE_MB = 100;
export const MAX_EMAILS_STORAGE_MB = 50;
export const MAX_QUEUED_DECISIONS = 10000;
export const SYNCED_DECISIONS_TO_KEEP = 100;
export const CLEANUP_AFTER_DAYS = 30;

export function resetDB(): void {
  dbPromise = null;
}

export async function isIDBAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return false;
  }
  try {
    await indexedDB.databases();
    return true;
  } catch {
    return false;
  }
}

export type { DmzOfflineDB as TheDmzDB };
