import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface TheDmzDB extends DBSchema {
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
}

const DB_NAME = 'the-dmz-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TheDmzDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<TheDmzDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  if (!dbPromise) {
    dbPromise = openDB<TheDmzDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
