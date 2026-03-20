import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { moderationAction, type ActionType } from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

export interface PlayerRestriction {
  actionType: ActionType;
  reason?: string | null;
  expiresAt: Date | null;
  reportId?: string | null;
}

export interface EnforcementResult {
  allowed: boolean;
  restriction?: PlayerRestriction;
  retryAfterMs?: number;
}

const ACTION_RESTRICTIONS: Record<string, ActionType[]> = {
  send_message: ['mute', 'mute_duration', 'ban'],
  send_friend_request: ['ban'],
  create_forum_post: ['mute', 'mute_duration', 'ban'],
  create_chat_room: ['mute', 'mute_duration', 'ban'],
};

export async function checkPlayerRestrictions(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<PlayerRestriction[]> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const activeActions = await db.query.moderationAction.findMany({
    where: and(eq(moderationAction.playerId, playerId), eq(moderationAction.tenantId, tenantId)),
  });

  return activeActions
    .filter((action) => action.expiresAt === null || action.expiresAt > now)
    .map((action) => ({
      actionType: action.actionType as ActionType,
      reason: action.reason,
      expiresAt: action.expiresAt,
      reportId: action.reportId,
    }));
}

export async function isActionAllowed(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  action: string,
): Promise<EnforcementResult> {
  const restrictions = await checkPlayerRestrictions(config, tenantId, playerId);

  if (restrictions.length === 0) {
    return { allowed: true };
  }

  const blockingTypes = ACTION_RESTRICTIONS[action] ?? ['ban'];

  for (const restriction of restrictions) {
    if (blockingTypes.includes(restriction.actionType)) {
      const result: EnforcementResult = {
        allowed: false,
        restriction,
      };
      if (restriction.expiresAt) {
        result.retryAfterMs = Math.max(0, restriction.expiresAt.getTime() - Date.now());
      }
      return result;
    }
  }

  return { allowed: true };
}

export async function getPlayerRestrictionStatus(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<{
  isMuted: boolean;
  isBanned: boolean;
  isRestricted: boolean;
  muteExpiresAt: Date | null;
  banExpiresAt: Date | null;
}> {
  const restrictions = await checkPlayerRestrictions(config, tenantId, playerId);

  const muteRestriction = restrictions.find(
    (r) => r.actionType === 'mute' || r.actionType === 'mute_duration',
  );
  const banRestriction = restrictions.find((r) => r.actionType === 'ban');
  const restrictionAction = restrictions.find((r) => r.actionType === 'restriction');

  return {
    isMuted: muteRestriction !== undefined,
    isBanned: banRestriction !== undefined,
    isRestricted: restrictionAction !== undefined,
    muteExpiresAt: muteRestriction?.expiresAt ?? null,
    banExpiresAt: banRestriction?.expiresAt ?? null,
  };
}
