import { invalidateContentCache, type CacheContentType } from './content-cache.js';
import {
  invalidateTenantPolicyCache,
  invalidateUserPermissionsCache,
  invalidateFeatureFlagsCache,
} from './auth-policy-cache.js';
import { invalidateUserGameState, invalidateTenantGameState } from './game-state-cache.js';
import { invalidateABACCache } from './abac-cache.js';

import type { AppConfig } from '../../config.js';

export interface CacheInvalidationEvent {
  type:
    | 'content_updated'
    | 'content_deleted'
    | 'policy_updated'
    | 'permissions_updated'
    | 'feature_flags_updated'
    | 'user_role_changed'
    | 'tenant_settings_changed'
    | 'game_session_ended';
  tenantId: string;
  userId?: string;
  contentType?: CacheContentType;
  contentId?: string;
}

export const handleCacheInvalidationEvent = async (
  config: AppConfig,
  event: CacheInvalidationEvent,
): Promise<void> => {
  const redis = undefined;

  switch (event.type) {
    case 'content_updated':
    case 'content_deleted':
      if (event.contentType && event.contentId) {
        await invalidateContentCache(
          config,
          event.tenantId,
          event.contentType,
          event.contentId,
          redis,
        );
      } else if (event.contentType) {
        await invalidateContentCache(config, event.tenantId, event.contentType, undefined, redis);
      } else {
        await invalidateContentCache(config, event.tenantId, undefined, undefined, redis);
      }
      break;

    case 'policy_updated':
      await invalidateTenantPolicyCache(config, event.tenantId, redis);
      break;

    case 'permissions_updated':
      if (event.userId) {
        await invalidateUserPermissionsCache(config, event.tenantId, event.userId, redis);
      }
      break;

    case 'feature_flags_updated':
      await invalidateFeatureFlagsCache(config, event.tenantId, event.userId, redis);
      break;

    case 'user_role_changed':
      if (event.userId) {
        await invalidateUserPermissionsCache(config, event.tenantId, event.userId, redis);
        await invalidateABACCache(config, event.tenantId, event.userId, redis);
      }
      break;

    case 'tenant_settings_changed':
      await invalidateTenantPolicyCache(config, event.tenantId, redis);
      await invalidateFeatureFlagsCache(config, event.tenantId, undefined, redis);
      break;

    case 'game_session_ended':
      if (event.userId) {
        await invalidateUserGameState(config, event.tenantId, event.userId, redis);
      } else {
        await invalidateTenantGameState(config, event.tenantId, redis);
      }
      break;
  }
};

export const createContentInvalidationEvent = (
  tenantId: string,
  contentType: CacheContentType,
  contentId: string,
  action: 'updated' | 'deleted',
): CacheInvalidationEvent => ({
  type: action === 'updated' ? 'content_updated' : 'content_deleted',
  tenantId,
  contentType,
  contentId,
});

export const createPolicyInvalidationEvent = (tenantId: string): CacheInvalidationEvent => ({
  type: 'policy_updated',
  tenantId,
});

export const createPermissionsInvalidationEvent = (
  tenantId: string,
  userId: string,
): CacheInvalidationEvent => ({
  type: 'permissions_updated',
  tenantId,
  userId,
});

export const createFeatureFlagsInvalidationEvent = (
  tenantId: string,
  userId?: string,
): CacheInvalidationEvent => ({
  type: 'feature_flags_updated',
  tenantId,
  ...(userId !== undefined && { userId }),
});

export const createUserRoleChangeInvalidationEvent = (
  tenantId: string,
  userId: string,
): CacheInvalidationEvent => ({
  type: 'user_role_changed',
  tenantId,
  userId,
});

export const createTenantSettingsInvalidationEvent = (
  tenantId: string,
): CacheInvalidationEvent => ({
  type: 'tenant_settings_changed',
  tenantId,
});

export const createGameSessionEndedInvalidationEvent = (
  tenantId: string,
  userId?: string,
): CacheInvalidationEvent => ({
  type: 'game_session_ended',
  tenantId,
  ...(userId !== undefined && { userId }),
});
