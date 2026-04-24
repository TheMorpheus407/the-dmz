import { eq, and, sql } from 'drizzle-orm';

import { findActiveGameSession, updatePlayerXP } from '../game/session/game-session.repo.js';
import {
  achievementDefinitions,
  type AchievementDefinition,
  playerAchievements,
  type PlayerAchievement,
  playerProfiles,
} from '../../db/schema/social/index.js';
import { users } from '../../shared/database/schema/users.js';

import {
  createAchievementUnlockedEvent,
  type AchievementUnlockedPayload,
} from './achievement.events.js';
import {
  type AchievementCriteria,
  type AchievementProgress,
  updateProgress,
  evaluateCriteria,
  extractPlayerIdFromEvent,
  extractTenantIdFromEvent,
} from './achievement.criteria-engine.js';

import type { DatabaseClient } from '../../shared/database/connection.js';
import type { DomainEvent, EventBus } from '../../shared/events/event-types.js';

interface PlayerAchievementRow {
  playerAchievement: PlayerAchievement;
  definition: AchievementDefinition;
}

export interface AchievementWithDefinition extends PlayerAchievement {
  definition: AchievementDefinition;
}

export interface CreateAchievementParams {
  playerId: string;
  achievementId: string;
  tenantId: string;
}

export interface UnlockAchievementResult {
  success: boolean;
  achievement?: AchievementDefinition;
  xpAwarded?: number;
  didLevelUp?: boolean;
  newLevel?: number;
  error?: string;
}

export class AchievementService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly eventBus?: EventBus,
  ) {}

  private async withTenantContext<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    await this.db.execute(sql`set_config('app.current_tenant_id', ${tenantId}, true)`);
    await this.db.execute(sql`set_config('app.tenant_id', ${tenantId}, true)`);
    try {
      return await fn();
    } finally {
      await this.db.execute(sql`set_config('app.current_tenant_id', '', true)`);
      await this.db.execute(sql`set_config('app.tenant_id', '', true)`);
    }
  }

  async getAllAchievementDefinitions(tenantId: string): Promise<AchievementDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results = await this.db
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.visibility, 'visible'));

      return results;
    });
  }

  async getPlayerAchievements(
    playerId: string,
    tenantId: string,
  ): Promise<AchievementWithDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results: PlayerAchievementRow[] = await this.db
        .select({
          playerAchievement: playerAchievements,
          definition: achievementDefinitions,
        })
        .from(playerAchievements)
        .innerJoin(
          achievementDefinitions,
          eq(playerAchievements.achievementId, achievementDefinitions.id),
        )
        .where(eq(playerAchievements.playerId, playerId));

      return results.map((row: PlayerAchievementRow) => ({
        ...row.playerAchievement,
        definition: row.definition,
      }));
    });
  }

  async getPlayerUnlockedAchievements(
    playerId: string,
    tenantId: string,
  ): Promise<AchievementWithDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results: PlayerAchievementRow[] = await this.db
        .select({
          playerAchievement: playerAchievements,
          definition: achievementDefinitions,
        })
        .from(playerAchievements)
        .innerJoin(
          achievementDefinitions,
          eq(playerAchievements.achievementId, achievementDefinitions.id),
        )
        .where(and(eq(playerAchievements.playerId, playerId)));

      return results
        .map((row: PlayerAchievementRow) => ({
          ...row.playerAchievement,
          definition: row.definition,
        }))
        .filter((row) => row.unlockedAt !== null);
    });
  }

  async getPlayerInProgressAchievements(
    playerId: string,
    tenantId: string,
  ): Promise<AchievementWithDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results: PlayerAchievementRow[] = await this.db
        .select({
          playerAchievement: playerAchievements,
          definition: achievementDefinitions,
        })
        .from(playerAchievements)
        .innerJoin(
          achievementDefinitions,
          eq(playerAchievements.achievementId, achievementDefinitions.id),
        )
        .where(eq(playerAchievements.playerId, playerId));

      return results
        .map((row: PlayerAchievementRow) => ({
          ...row.playerAchievement,
          definition: row.definition,
        }))
        .filter((row) => row.unlockedAt === null);
    });
  }

  async getPublicPlayerAchievements(
    playerId: string,
    tenantId: string,
  ): Promise<AchievementWithDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results: PlayerAchievementRow[] = await this.db
        .select({
          playerAchievement: playerAchievements,
          definition: achievementDefinitions,
        })
        .from(playerAchievements)
        .innerJoin(
          achievementDefinitions,
          eq(playerAchievements.achievementId, achievementDefinitions.id),
        )
        .where(
          and(
            eq(playerAchievements.playerId, playerId),
            eq(playerAchievements.sharedToProfile, true),
            eq(achievementDefinitions.visibility, 'visible'),
          ),
        );

      return results.map((row: PlayerAchievementRow) => ({
        ...row.playerAchievement,
        definition: row.definition,
      }));
    });
  }

  async getPlayerByUserId(userId: string, tenantId: string): Promise<string | null> {
    return this.withTenantContext(tenantId, async () => {
      const profileResult = await this.db
        .select({ profileId: playerProfiles.profileId })
        .from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.userId))
        .where(eq(users.userId, userId))
        .limit(1);

      return profileResult[0]?.profileId ?? null;
    });
  }

  async getEnterpriseReportableAchievements(tenantId: string): Promise<AchievementDefinition[]> {
    return this.withTenantContext(tenantId, async () => {
      const results = await this.db
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.enterpriseReportable, true));

      return results;
    });
  }

  async toggleShareAchievement(
    playerId: string,
    achievementId: string,
    tenantId: string,
  ): Promise<boolean> {
    return this.withTenantContext(tenantId, async () => {
      const existing = await this.db
        .select()
        .from(playerAchievements)
        .where(
          and(
            eq(playerAchievements.playerId, playerId),
            eq(playerAchievements.achievementId, achievementId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return false;
      }

      const currentShareStatus = existing[0]!.sharedToProfile;

      await this.db
        .update(playerAchievements)
        .set({ sharedToProfile: !currentShareStatus })
        .where(
          and(
            eq(playerAchievements.playerId, playerId),
            eq(playerAchievements.achievementId, achievementId),
          ),
        );

      return !currentShareStatus;
    });
  }

  private async awardAchievementXPAndEmitEvent(
    playerId: string,
    userId: string,
    tenantId: string,
    achievement: AchievementDefinition,
    correlationId?: string,
  ): Promise<{ didLevelUp: boolean; newLevel?: number }> {
    const session = await findActiveGameSession(this.db, userId, tenantId);

    if (session) {
      const xpResult = await updatePlayerXP(this.db, session.id, achievement.points);
      if (xpResult && this.eventBus) {
        const payload: AchievementUnlockedPayload = {
          playerId,
          userId,
          tenantId,
          achievementId: achievement.id,
          achievementKey: achievement.achievementKey,
          achievementTitle: achievement.title,
          achievementCategory: achievement.category,
          achievementPoints: achievement.points,
          xpAwarded: achievement.points,
          didLevelUp: xpResult.didLevelUp,
          newLevel: xpResult.newLevel,
          timestamp: new Date().toISOString(),
        };

        const event = createAchievementUnlockedEvent('achievements-module', correlationId, payload);
        this.eventBus.publish(event);
      }
      return xpResult?.newLevel !== undefined
        ? { didLevelUp: xpResult?.didLevelUp ?? false, newLevel: xpResult.newLevel }
        : { didLevelUp: xpResult?.didLevelUp ?? false };
    }
    return { didLevelUp: false };
  }

  async processGameEvent(
    event: DomainEvent<Record<string, unknown>>,
  ): Promise<UnlockAchievementResult[]> {
    const playerId = extractPlayerIdFromEvent(event);
    const tenantId = extractTenantIdFromEvent(event);

    if (!playerId || !tenantId) {
      return [];
    }

    const profileResult = await this.getPlayerByUserId(playerId, tenantId);
    if (!profileResult) {
      return [];
    }

    const actualPlayerId = profileResult;

    return this.withTenantContext(tenantId, async () => {
      const matchingAchievements = await this.db.select().from(achievementDefinitions);

      const relevantAchievements = matchingAchievements.filter((def: AchievementDefinition) => {
        const criteria = def.criteria as AchievementCriteria;
        return criteria.eventType === event.eventType;
      });

      const results: UnlockAchievementResult[] = [];

      for (const achievement of relevantAchievements) {
        const criteria = achievement.criteria as AchievementCriteria;

        const existingProgress = await this.db
          .select()
          .from(playerAchievements)
          .where(
            and(
              eq(playerAchievements.playerId, actualPlayerId),
              eq(playerAchievements.achievementId, achievement.id),
            ),
          )
          .limit(1);

        let progress: AchievementProgress;

        if (existingProgress.length > 0 && existingProgress[0]) {
          progress = (existingProgress[0].progress as AchievementProgress) || {
            currentCount: 0,
            lastUpdated: new Date().toISOString(),
            eventsProcessed: [],
            completed: false,
          };
        } else {
          progress = {
            currentCount: 0,
            lastUpdated: new Date().toISOString(),
            eventsProcessed: [],
            completed: false,
          };

          await this.db.insert(playerAchievements).values({
            playerId: actualPlayerId,
            achievementId: achievement.id,
            tenantId,
            progress,
            notificationSent: false,
            sharedToProfile: false,
          });
        }

        const updatedProgress = updateProgress(progress, event, criteria);

        const shouldUnlock = evaluateCriteria(criteria, updatedProgress, event);

        if (shouldUnlock && !progress.completed) {
          await this.db
            .update(playerAchievements)
            .set({
              progress: updatedProgress,
              unlockedAt: shouldUnlock ? new Date() : null,
            })
            .where(
              and(
                eq(playerAchievements.playerId, actualPlayerId),
                eq(playerAchievements.achievementId, achievement.id),
              ),
            );

          const { didLevelUp, newLevel } = await this.awardAchievementXPAndEmitEvent(
            actualPlayerId,
            playerId,
            tenantId,
            achievement,
            event.correlationId,
          );

          results.push({
            success: true,
            achievement,
            xpAwarded: achievement.points,
            didLevelUp,
            ...(newLevel !== undefined && { newLevel }),
          });
        } else {
          await this.db
            .update(playerAchievements)
            .set({ progress: updatedProgress })
            .where(
              and(
                eq(playerAchievements.playerId, actualPlayerId),
                eq(playerAchievements.achievementId, achievement.id),
              ),
            );
        }
      }

      return results;
    });
  }

  async unlockAchievement(params: CreateAchievementParams): Promise<UnlockAchievementResult> {
    const { playerId, achievementId, tenantId } = params;

    return this.withTenantContext(tenantId, async () => {
      const existing = await this.db
        .select()
        .from(playerAchievements)
        .where(
          and(
            eq(playerAchievements.playerId, playerId),
            eq(playerAchievements.achievementId, achievementId),
          ),
        )
        .limit(1);

      if (existing.length > 0 && existing[0] && existing[0].unlockedAt !== null) {
        return { success: false, error: 'Achievement already unlocked' };
      }

      const achievementResult = await this.db
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.id, achievementId))
        .limit(1);

      if (achievementResult.length === 0 || !achievementResult[0]) {
        return { success: false, error: 'Achievement definition not found' };
      }

      const achievement = achievementResult[0];

      const profileResult = await this.db
        .select({ userId: playerProfiles.userId })
        .from(playerProfiles)
        .where(eq(playerProfiles.profileId, playerId))
        .limit(1);

      const userId = profileResult[0]?.userId ?? '';

      if (existing.length === 0) {
        await this.db.insert(playerAchievements).values({
          playerId,
          achievementId,
          tenantId,
          unlockedAt: new Date(),
          progress: {
            currentCount: 1,
            lastUpdated: new Date().toISOString(),
            eventsProcessed: [],
            completed: true,
            completedAt: new Date().toISOString(),
          },
          notificationSent: false,
          sharedToProfile: false,
        });
      } else {
        await this.db
          .update(playerAchievements)
          .set({ unlockedAt: new Date() })
          .where(
            and(
              eq(playerAchievements.playerId, playerId),
              eq(playerAchievements.achievementId, achievementId),
            ),
          );
      }

      const { didLevelUp, newLevel } = await this.awardAchievementXPAndEmitEvent(
        playerId,
        userId,
        tenantId,
        achievement,
      );

      return {
        success: true,
        achievement,
        xpAwarded: achievement.points,
        didLevelUp,
        ...(newLevel !== undefined && { newLevel }),
      };
    });
  }
}
