import { randomUUID } from 'crypto';

import { GAME_ENGINE_EVENTS } from '../game/engine/index.js';

import type { DomainEvent } from '../../shared/events/event-types.js';
import type { AchievementService } from './achievement.service.js';

export const ACHIEVEMENT_EVENTS = {
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
} as const;

export type AchievementUnlockedEventType =
  (typeof ACHIEVEMENT_EVENTS)[keyof typeof ACHIEVEMENT_EVENTS];

export interface AchievementUnlockNotification {
  playerId: string;
  achievementId: string;
  achievementKey: string;
  achievementTitle: string;
  achievementPoints: number;
  timestamp: string;
}

export interface AchievementUnlockedPayload {
  playerId: string;
  userId: string;
  tenantId: string;
  achievementId: string;
  achievementKey: string;
  achievementTitle: string;
  achievementCategory: string;
  achievementPoints: number;
  xpAwarded: number;
  didLevelUp: boolean;
  newLevel?: number;
  timestamp: string;
}

export function createAchievementUnlockedEvent(
  source: string,
  correlationId: string | undefined,
  payload: AchievementUnlockedPayload,
): DomainEvent<AchievementUnlockedPayload> {
  return {
    eventId: randomUUID(),
    eventType: ACHIEVEMENT_EVENTS.ACHIEVEMENT_UNLOCKED,
    timestamp: new Date().toISOString(),
    correlationId: correlationId ?? '',
    tenantId: payload.tenantId,
    userId: payload.userId,
    source,
    version: 1,
    payload,
  };
}

export const ACHIEVEMENT_EVENT_TYPES = [
  GAME_ENGINE_EVENTS.DECISION_APPROVED,
  GAME_ENGINE_EVENTS.DECISION_DENIED,
  GAME_ENGINE_EVENTS.DECISION_FLAGGED,
  GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
  GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED,
  GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED,
  GAME_ENGINE_EVENTS.VERIFICATION_RESULT,
  GAME_ENGINE_EVENTS.INCIDENT_CREATED,
  GAME_ENGINE_EVENTS.INCIDENT_RESOLVED,
  GAME_ENGINE_EVENTS.SESSION_COMPLETED,
  GAME_ENGINE_EVENTS.SESSION_STARTED,
  GAME_ENGINE_EVENTS.LEVEL_UP,
  GAME_ENGINE_EVENTS.UPGRADE_PURCHASED,
  GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED,
] as const;

export type AchievementEventType = (typeof ACHIEVEMENT_EVENT_TYPES)[number];

export function isAchievementEventType(eventType: string): eventType is AchievementEventType {
  return ACHIEVEMENT_EVENT_TYPES.includes(eventType as AchievementEventType);
}

export interface AchievementEventHandler {
  (event: DomainEvent<Record<string, unknown>>, service: AchievementService): Promise<void>;
}

export async function handleAchievementEvent(
  event: DomainEvent<Record<string, unknown>>,
  service: AchievementService,
): Promise<void> {
  if (!isAchievementEventType(event.eventType)) {
    return;
  }

  try {
    const results = await service.processGameEvent(event);

    for (const result of results) {
      if (result.success && result.achievement) {
        console.warn(`Achievement unlocked: ${result.achievement.achievementKey}`, {
          playerId: event.payload['userId'],
          achievementKey: result.achievement.achievementKey,
          points: result.xpAwarded,
        });
      }
    }
  } catch (error) {
    console.error('Error processing achievement event:', error);
  }
}

export function createAchievementEventHandlers(service: AchievementService): Array<{
  eventType: string;
  handler: (event: DomainEvent<Record<string, unknown>>) => Promise<void>;
}> {
  return ACHIEVEMENT_EVENT_TYPES.map((eventType) => ({
    eventType,
    handler: (event: DomainEvent<Record<string, unknown>>) =>
      handleAchievementEvent(event, service),
  }));
}
