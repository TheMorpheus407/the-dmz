export { getDB, clearDB, getStorageUsage, MAX_IDB_STORAGE_MB, type TheDmzDB } from './idb';

export {
  saveEvent,
  getEvents,
  getUnsyncedEvents,
  markEventSynced,
  markEventsSynced,
  clearOldEvents,
  deleteEvent,
  getEventCount,
  type QueuedEvent,
} from './event-queue';

export {
  saveSessionSnapshot,
  getLatestSessionSnapshot,
  getSessionSnapshot,
  getAllSessionSnapshots,
  deleteSessionSnapshot,
  clearOldSnapshots,
  startSessionSnapshotTimer,
  stopSessionSnapshotTimer,
  SESSION_SNAPSHOT_INTERVAL_MS,
  type SessionSnapshot,
} from './session';

export {
  saveOfflineContent,
  getOfflineContent,
  getAllOfflineContent,
  getOfflineContentByType,
  getOfflineContentByDifficulty,
  deleteOfflineContent,
  clearOfflineContent,
  getOfflineContentStats,
  DOCUMENT_TYPES,
  DIFFICULTY_TIERS,
  type OfflineContent,
  type DocumentType,
  type DifficultyTier,
} from './content';
