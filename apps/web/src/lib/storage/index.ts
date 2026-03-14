export {
  getDB,
  clearDB,
  getStorageUsage,
  resetDB,
  isIDBAvailable,
  MAX_IDB_STORAGE_MB,
  MAX_EMAILS_STORAGE_MB,
  MAX_QUEUED_DECISIONS,
  SYNCED_DECISIONS_TO_KEEP,
  CLEANUP_AFTER_DAYS,
  type TheDmzDB,
  type CachedEmail,
  type QueuedDecision,
  type StoredGameState,
  type StoredSetting,
} from './idb';

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

export {
  cacheEmail,
  cacheEmails,
  getCachedEmail,
  getAllCachedEmails,
  getCachedEmailsByDifficulty,
  getCachedEmailsByScenarioId,
  deleteCachedEmail,
  clearCachedEmails,
  getEmailCacheCount,
  getEmailStorageEstimate,
  isEmailStorageQuotaExceeded,
  type EmailContent,
} from './emails';

export {
  queueDecision,
  getPendingDecisions,
  getPendingDecisionsBySession,
  markDecisionSynced,
  markDecisionsSynced,
  deleteDecision,
  getAllDecisions,
  getDecisionCount,
  clearSyncedData,
  clearOldDecisions,
  clearAllDecisions,
  type DecisionInput,
} from './decisions';

export {
  saveGameState,
  loadGameState,
  deleteGameState,
  getAllGameStates,
  clearAllGameStates,
  markGameStateSynced,
  getUnsyncedGameStates,
  type GameStateInput,
} from './game-state';

export {
  saveSetting,
  getSetting,
  deleteSetting,
  getAllSettings,
  clearAllSettings,
  getSettingUpdatedAt,
  settingExists,
} from './settings';
