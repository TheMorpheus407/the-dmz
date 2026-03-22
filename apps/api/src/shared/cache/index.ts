export {
  REDIS_KEYSPACE_VERSION,
  APP_PREFIX,
  KEY_CATEGORIES,
  GLOBAL_KEY_ALLOWLIST,
  DEFAULT_TTL_SECONDS,
  MAX_KEY_LENGTH,
  KEY_SEGMENT_SEPARATOR,
  type RedisKeyCategory,
  type TenantScopedKeyOptions,
  type GlobalKeyOptions,
  isValidKeyCategory,
  getDefaultTTL,
} from './redis-key-manifest.js';

export {
  tenantScopedKey,
  globalKey,
  parseKey,
  validateTenantKey,
  getTTL,
  type ParsedKey,
  InvalidTenantIdError,
  InvalidKeyCategoryError,
  GlobalKeyNotAllowedError,
  KeyTooLongError,
  validateTenantId,
} from './redis-keys.js';

export {
  buildABACCacheKey,
  getABACCachedPermissions,
  setABACCachedPermissions,
  invalidateABACCache,
  invalidateABACCacheForRole,
  isABACCacheHealthy,
  getABACCacheMetrics,
  resetABACCacheMetrics,
  type ABACCachedEvaluation,
  type ABACCacheMetrics,
} from './abac-cache.js';

export {
  buildContentCacheKey,
  getCachedContent,
  setCachedContent,
  invalidateContentCache,
  isContentCacheHealthy,
  getContentCacheMetrics,
  resetContentCacheMetrics,
  getContentCacheTTL,
  type CacheContentType,
  type CachedContent,
  type ContentCacheMetrics,
} from './content-cache.js';

export {
  buildTenantPolicyCacheKey,
  buildUserPermissionsCacheKey,
  buildFeatureFlagsCacheKey,
  getCachedTenantPolicy,
  setCachedTenantPolicy,
  getCachedUserPermissions,
  setCachedUserPermissions,
  getCachedFeatureFlags,
  setCachedFeatureFlags,
  invalidateTenantPolicyCache,
  invalidateUserPermissionsCache,
  invalidateAllUserPermissionsCache,
  invalidateFeatureFlagsCache,
  isAuthPolicyCacheHealthy,
  getAuthPolicyCacheMetrics,
  resetAuthPolicyCacheMetrics,
  type CachedAuthPolicy,
  type CachedUserPermissions,
  type CachedFeatureFlags,
  type AuthPolicyCacheMetrics,
} from './auth-policy-cache.js';

export {
  buildGameStateCacheKey,
  getCachedGameState,
  setCachedGameState,
  deleteCachedGameState,
  invalidateUserGameState,
  invalidateTenantGameState,
  isGameStateCacheHealthy,
  getGameStateCacheMetrics,
  resetGameStateCacheMetrics,
  getOrFetchGameState,
  type CachedGameState,
  type GameStateCacheMetrics,
} from './game-state-cache.js';

export {
  getAllCacheMetrics,
  getCacheMetricsSummary,
  formatCacheMetricsPrometheus,
  type CacheMetrics,
  type CacheMetricsSummary,
} from './metrics.js';

export {
  handleCacheInvalidationEvent,
  createContentInvalidationEvent,
  createPolicyInvalidationEvent,
  createPermissionsInvalidationEvent,
  createFeatureFlagsInvalidationEvent,
  createUserRoleChangeInvalidationEvent,
  createTenantSettingsInvalidationEvent,
  createGameSessionEndedInvalidationEvent,
  type CacheInvalidationEvent,
} from './cache-invalidation.js';

export {
  buildPlayerProfileCacheKey,
  getCachedPlayerProfile,
  setCachedPlayerProfile,
  invalidatePlayerProfileCache,
  isPlayerProfileCacheHealthy,
  getPlayerProfileCacheMetrics,
  resetPlayerProfileCacheMetrics,
  type CachedPlayerProfile,
  type PlayerProfileCacheMetrics,
} from './player-profile-cache.js';

export {
  buildRelationshipCacheKey,
  getCachedRelationships,
  setCachedRelationships,
  invalidateRelationshipCache,
  invalidateBothPlayersRelationshipCache,
  isRelationshipCacheHealthy,
  getRelationshipCacheMetrics,
  resetRelationshipCacheMetrics,
  type CachedRelationship,
  type CachedRelationshipState,
  type RelationshipCacheMetrics,
} from './relationship-cache.js';

export {
  buildPresenceCacheKey,
  getCachedPresence,
  setCachedPresence,
  deleteCachedPresence,
  refreshPresenceTTL,
  isPresenceCacheHealthy,
  getPresenceCacheMetrics,
  resetPresenceCacheMetrics,
  type CachedPresence,
  type PresenceCacheMetrics,
} from './presence-cache.js';

export {
  buildPartyCacheKey,
  getCachedParty,
  setCachedParty,
  deleteCachedParty,
  isPartyCacheHealthy,
  getPartyCacheMetrics,
  resetPartyCacheMetrics,
  type CachedParty,
  type CachedPartyMember,
  type PartyCacheMetrics,
} from './party-cache.js';

export {
  buildCoopSessionCacheKey,
  getCachedCoopSession,
  setCachedCoopSession,
  deleteCachedCoopSession,
  isCoopSessionCacheHealthy,
  getCoopSessionCacheMetrics,
  resetCoopSessionCacheMetrics,
  type CachedCoopSession,
  type CachedCoopRoleAssignment,
  type CoopSessionCacheMetrics,
} from './coop-session-cache.js';
