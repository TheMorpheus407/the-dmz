import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient } from '../../shared/database/redis.js';
import {
  leaderboards,
  leaderboardEntries,
  leaderboardScores,
  enterpriseLeaderboards,
  rankingCategories,
  type LeaderboardMetrics,
} from '../../db/schema/social/index.js';

import { computeCompositeScore } from './score-calculator.service.js';

import type { AppConfig } from '../../config.js';

const LEADERBOARD_KEY_PREFIX = 'leaderboard';

export interface ScoreUpdateInput {
  playerId: string;
  metrics: LeaderboardMetrics;
  riskyApprovalRate?: number;
}

export function buildLeaderboardKey(
  scope: string,
  region: string | null,
  seasonId: string,
  rankingCategory: string,
  timeFrame: string,
): string {
  const regionPart = region ?? 'global';
  return `${LEADERBOARD_KEY_PREFIX}:${scope}:${regionPart}:${seasonId}:${rankingCategory}:${timeFrame}`;
}

export async function updatePlayerScore(
  config: AppConfig,
  tenantId: string,
  input: ScoreUpdateInput,
  options?: {
    seasonId?: string;
    timeFrame?: string;
  },
): Promise<{ success: boolean; rank?: number; error?: string }> {
  const db = getDatabaseClient(config);
  const redis = getRedisClient(config);

  const seasonId = options?.seasonId ?? 'season-1';
  const timeFrame = options?.timeFrame ?? 'seasonal';

  const score = computeCompositeScore(input.metrics, input.riskyApprovalRate);

  const categories = rankingCategories;
  const results: { leaderboardId: string; rank: number }[] = [];

  for (const category of categories) {
    const leaderboard = await db.query.leaderboards.findFirst({
      where: and(
        eq(leaderboards.scope, 'global'),
        eq(leaderboards.seasonId, seasonId),
        eq(leaderboards.rankingCategory, category),
        eq(leaderboards.timeFrame, timeFrame),
        eq(leaderboards.isActive, true),
      ),
    });

    if (!leaderboard) continue;

    const existingEntry = await db.query.leaderboardEntries.findFirst({
      where: and(
        eq(leaderboardEntries.leaderboardId, leaderboard.leaderboardId),
        eq(leaderboardEntries.playerId, input.playerId),
      ),
    });

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (existingEntry) {
      await db
        .update(leaderboardEntries)
        .set({
          score,
          updatedAt: new Date(),
        })
        .where(eq(leaderboardEntries.entryId, existingEntry.entryId));
    } else {
      await db.insert(leaderboardEntries).values({
        leaderboardId: leaderboard.leaderboardId,
        playerId: input.playerId,
        tenantId,
        score,
        rank: 0,
        metrics: input.metrics,
        periodStart,
        periodEnd,
      });
    }

    if (redis) {
      const key = buildLeaderboardKey('global', null, seasonId, category, timeFrame);
      await redis.zadd(key, score, input.playerId);
      const entries = await redis.zrevrange(key, 0, -1);
      for (let i = 0; i < entries.length; i++) {
        if (entries[i]?.member === input.playerId) {
          results.push({ leaderboardId: leaderboard.leaderboardId, rank: i + 1 });
          break;
        }
      }
    }
  }

  const firstResult = results[0];
  if (firstResult) {
    return { success: true, rank: firstResult.rank };
  }

  return { success: true };
}

export async function updateEnterprisePlayerScore(
  config: AppConfig,
  tenantId: string,
  input: ScoreUpdateInput,
  options?: {
    departmentId?: string;
    corporationId?: string;
    leaderboardType?: string;
  },
): Promise<{ success: boolean; rank?: number; error?: string }> {
  const db = getDatabaseClient(config);
  const redis = getRedisClient(config);

  const leaderboardType = options?.leaderboardType ?? 'composite';

  const leaderboard = await db.query.enterpriseLeaderboards.findFirst({
    where: and(
      eq(enterpriseLeaderboards.scope, 'tenant'),
      eq(enterpriseLeaderboards.leaderboardType, leaderboardType),
      eq(enterpriseLeaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Enterprise leaderboard not found' };
  }

  const score = computeCompositeScore(input.metrics, input.riskyApprovalRate);

  const existingEntry = await db.query.leaderboardScores.findFirst({
    where: and(
      eq(leaderboardScores.leaderboardId, leaderboard.id),
      eq(leaderboardScores.playerId, input.playerId),
    ),
  });

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (existingEntry) {
    await db
      .update(leaderboardScores)
      .set({
        score,
        departmentId: options?.departmentId ?? existingEntry.departmentId,
        corporationId: options?.corporationId ?? existingEntry.corporationId,
        updatedAt: new Date(),
      })
      .where(eq(leaderboardScores.id, existingEntry.id));
  } else {
    await db.insert(leaderboardScores).values({
      leaderboardId: leaderboard.id,
      playerId: input.playerId,
      tenantId,
      departmentId: options?.departmentId ?? null,
      corporationId: options?.corporationId ?? null,
      score,
      rank: 0,
      metrics: input.metrics,
      periodStart,
      periodEnd,
    });
  }

  if (redis) {
    const key = `lb:${leaderboard.id}:${leaderboard.currentSeasonId}`;
    await redis.zadd(key, score, input.playerId);
    const entries = await redis.zrevrange(key, 0, -1);
    for (let i = 0; i < entries.length; i++) {
      if (entries[i]?.member === input.playerId) {
        const entryIdToUpdate = existingEntry?.id ?? entries[i]?.member ?? '';
        if (entryIdToUpdate) {
          await db
            .update(leaderboardScores)
            .set({ rank: i + 1 })
            .where(eq(leaderboardScores.id, entryIdToUpdate));
        }
        return { success: true, rank: i + 1 };
      }
    }
  }

  return { success: true };
}
