import { eq, and, desc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient } from '../../shared/database/redis.js';
import {
  leaderboards,
  leaderboardEntries,
  playerProfiles,
  type Leaderboard,
  type LeaderboardMetrics,
  type ScoreWeights,
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
  rankingCategories,
} from '../../db/schema/social/index.js';
import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths

import { listFriends } from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';

const LEADERBOARD_KEY_PREFIX = 'leaderboard';

export interface LeaderboardResult {
  success: boolean;
  leaderboards?: Leaderboard[];
  error?: string;
}

export interface LeaderboardEntriesResult {
  success: boolean;
  entries?: LeaderboardEntryWithPlayer[];
  totalCount?: number;
  error?: string;
}

export interface LeaderboardEntryWithPlayer {
  entryId: string;
  leaderboardId: string;
  playerId: string;
  tenantId: string;
  score: number;
  rank: number;
  metrics: LeaderboardMetrics;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
  displayName?: string | undefined;
  avatarId?: string | null | undefined;
  privacyMode?: string | undefined;
}

export interface PlayerRankResult {
  success: boolean;
  rank?: number;
  score?: number;
  error?: string;
}

export interface PlayerRanksResult {
  success: boolean;
  ranks?: PlayerRankInfo[];
  error?: string;
}

export interface PlayerRankInfo {
  leaderboardId: string;
  scope: string;
  region: string | null;
  rankingCategory: string;
  timeFrame: string;
  rank: number;
  score: number;
}

export interface ScoreUpdateInput {
  playerId: string;
  metrics: LeaderboardMetrics;
  riskyApprovalRate?: number;
}

export interface FriendsLeaderboardResult {
  success: boolean;
  entries?: LeaderboardEntryWithPlayer[];
  error?: string;
}

function buildLeaderboardKey(
  scope: string,
  region: string | null,
  seasonId: string,
  rankingCategory: string,
  timeFrame: string,
): string {
  const regionPart = region ?? 'global';
  return `${LEADERBOARD_KEY_PREFIX}:${scope}:${regionPart}:${seasonId}:${rankingCategory}:${timeFrame}`;
}

export function computeCompositeScore(
  metrics: LeaderboardMetrics,
  riskyApprovalRate: number = 0,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): number {
  const cappedAccuracy = Math.min(metrics.accuracy, SCORE_CAPS.accuracy);
  const cappedDecisionTime = Math.min(metrics.avgDecisionTime, SCORE_CAPS.avgDecisionTime);
  const cappedIncidents = Math.min(metrics.incidentsResolved, SCORE_CAPS.incidentsResolved);
  const cappedResourceEfficiency = Math.min(
    metrics.resourceEfficiency,
    SCORE_CAPS.resourceEfficiency,
  );
  const cappedRiskyRate = Math.min(riskyApprovalRate, SCORE_CAPS.riskyApprovalRate);

  const timeBonus =
    cappedDecisionTime > 0 ? Math.max(0, 1 - cappedDecisionTime / SCORE_CAPS.avgDecisionTime) : 1;

  const score =
    weights.accuracyWeight * cappedAccuracy +
    weights.timeWeight * timeBonus * 100 +
    weights.incidentWeight * cappedIncidents +
    weights.resourceWeight * cappedResourceEfficiency -
    weights.penaltyWeight * cappedRiskyRate;

  return Math.max(0, Math.round(score));
}

export async function listLeaderboards(
  config: AppConfig,
  tenantId: string,
  options?: {
    scope?: string | undefined;
    seasonId?: string | undefined;
    rankingCategory?: string | undefined;
    timeFrame?: string | undefined;
  },
): Promise<LeaderboardResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const conditions = [eq(leaderboards.isActive, true)];

  if (options?.scope) {
    conditions.push(eq(leaderboards.scope, options.scope));
  }
  if (options?.seasonId) {
    conditions.push(eq(leaderboards.seasonId, options.seasonId));
  }
  if (options?.rankingCategory) {
    conditions.push(eq(leaderboards.rankingCategory, options.rankingCategory));
  }
  if (options?.timeFrame) {
    conditions.push(eq(leaderboards.timeFrame, options.timeFrame));
  }

  const leaderboardList = await db.query.leaderboards.findMany({
    where: and(...conditions),
    orderBy: [desc(leaderboards.createdAt)],
  });

  return { success: true, leaderboards: leaderboardList };
}

export async function getLeaderboardById(
  config: AppConfig,
  _tenantId: string,
  leaderboardId: string,
): Promise<Leaderboard | null> {
  const db = getDatabaseClient(config);

  const leaderboard = await db.query.leaderboards.findFirst({
    where: and(eq(leaderboards.leaderboardId, leaderboardId), eq(leaderboards.isActive, true)),
  });

  return leaderboard ?? null;
}

export async function getLeaderboardEntries(
  config: AppConfig,
  tenantId: string,
  leaderboardId: string,
  options?: {
    limit?: number | undefined;
    offset?: number | undefined;
  },
): Promise<LeaderboardEntriesResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const leaderboard = await getLeaderboardById(config, tenantId, leaderboardId);
  if (!leaderboard) {
    return { success: false, error: 'Leaderboard not found' };
  }

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const entries = await db.query.leaderboardEntries.findMany({
    where: eq(leaderboardEntries.leaderboardId, leaderboardId),
    orderBy: [leaderboardEntries.rank],
    limit,
    offset,
  });

  const players = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.privacyMode, 'public'),
  });

  const playerMap = new Map(players.map((p) => [p.profileId, p]));

  const entriesWithPlayer: LeaderboardEntryWithPlayer[] = entries.map((entry) => {
    const player = playerMap.get(entry.playerId);
    return {
      entryId: entry.entryId,
      leaderboardId: entry.leaderboardId,
      playerId: entry.playerId,
      tenantId: entry.tenantId,
      score: entry.score,
      rank: entry.rank,
      metrics: entry.metrics as LeaderboardMetrics,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      updatedAt: entry.updatedAt,
      displayName: player?.displayName,
      avatarId: player?.avatarId,
      privacyMode: player?.privacyMode,
    };
  });

  const countResult = await db
    .select({ count: leaderboardEntries.entryId })
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.leaderboardId, leaderboardId));

  const totalCount =
    typeof countResult[0]?.count === 'number' ? countResult[0].count : entries.length;

  return { success: true, entries: entriesWithPlayer, totalCount };
}

export async function getPlayerPosition(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  leaderboardId: string,
): Promise<PlayerRankResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const leaderboard = await getLeaderboardById(config, tenantId, leaderboardId);
  if (!leaderboard) {
    return { success: false, error: 'Leaderboard not found' };
  }

  const entry = await db.query.leaderboardEntries.findFirst({
    where: and(
      eq(leaderboardEntries.leaderboardId, leaderboardId),
      eq(leaderboardEntries.playerId, playerId),
    ),
  });

  if (!entry) {
    return { success: false, error: 'Player not found on this leaderboard' };
  }

  return { success: true, rank: entry.rank, score: entry.score };
}

export async function getPlayerRanks(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<PlayerRanksResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const entries = await db.query.leaderboardEntries.findMany({
    where: eq(leaderboardEntries.playerId, playerId),
  });

  const leaderboardList = await db.query.leaderboards.findMany({
    where: eq(leaderboards.isActive, true),
  });

  const leaderboardMap = new Map(leaderboardList.map((lb) => [lb.leaderboardId, lb]));

  const ranks: PlayerRankInfo[] = entries
    .map((entry) => {
      const leaderboard = leaderboardMap.get(entry.leaderboardId);
      if (!leaderboard) return null;
      return {
        leaderboardId: entry.leaderboardId,
        scope: leaderboard.scope,
        region: leaderboard.region,
        rankingCategory: leaderboard.rankingCategory,
        timeFrame: leaderboard.timeFrame,
        rank: entry.rank,
        score: entry.score,
      };
    })
    .filter((r): r is PlayerRankInfo => r !== null);

  return { success: true, ranks };
}

export async function getFriendsLeaderboard(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  options?: {
    seasonId?: string | undefined;
    rankingCategory?: string | undefined;
    limit?: number | undefined;
  },
): Promise<FriendsLeaderboardResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const friends = await listFriends(config, tenantId, playerId);
  const friendIds = friends.map((f) =>
    f.requesterId === playerId ? f.addresseeId : f.requesterId,
  );

  const friendIdsWithPlayer = [playerId, ...friendIds];

  const seasonId = options?.seasonId ?? 'season-1';
  const rankingCategory = options?.rankingCategory ?? 'overall';
  const limit = options?.limit ?? 100;

  const leaderboard = await db.query.leaderboards.findFirst({
    where: and(
      eq(leaderboards.scope, 'friends'),
      eq(leaderboards.seasonId, seasonId),
      eq(leaderboards.rankingCategory, rankingCategory),
      eq(leaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Friends leaderboard not found' };
  }

  const entries = await db.query.leaderboardEntries.findMany({
    where: and(eq(leaderboardEntries.leaderboardId, leaderboard.leaderboardId)),
    orderBy: [leaderboardEntries.rank],
    limit,
  });

  const visibleEntries = entries.filter((e) => friendIdsWithPlayer.includes(e.playerId));

  const players = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.privacyMode, 'public'),
  });

  const playerMap = new Map(players.map((p) => [p.profileId, p]));

  const entriesWithPlayer: LeaderboardEntryWithPlayer[] = visibleEntries.map((entry) => {
    const player = playerMap.get(entry.playerId);
    return {
      entryId: entry.entryId,
      leaderboardId: entry.leaderboardId,
      playerId: entry.playerId,
      tenantId: entry.tenantId,
      score: entry.score,
      rank: entry.rank,
      metrics: entry.metrics as LeaderboardMetrics,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      updatedAt: entry.updatedAt,
      displayName: player?.displayName,
      avatarId: player?.avatarId,
      privacyMode: player?.privacyMode,
    };
  });

  return { success: true, entries: entriesWithPlayer };
}

export async function getGuildLeaderboard(
  config: AppConfig,
  tenantId: string,
  _guildId: string,
  options?: {
    seasonId?: string | undefined;
    rankingCategory?: string | undefined;
    limit?: number | undefined;
  },
): Promise<LeaderboardEntriesResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const seasonId = options?.seasonId ?? 'season-1';
  const rankingCategory = options?.rankingCategory ?? 'overall';
  const limit = options?.limit ?? 100;

  const leaderboard = await db.query.leaderboards.findFirst({
    where: and(
      eq(leaderboards.scope, 'guild'),
      eq(leaderboards.seasonId, seasonId),
      eq(leaderboards.rankingCategory, rankingCategory),
      eq(leaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Guild leaderboard not found' };
  }

  const entries = await db.query.leaderboardEntries.findMany({
    where: and(eq(leaderboardEntries.leaderboardId, leaderboard.leaderboardId)),
    orderBy: [leaderboardEntries.rank],
    limit,
  });

  const players = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.privacyMode, 'public'),
  });

  const playerMap = new Map(players.map((p) => [p.profileId, p]));

  const entriesWithPlayer: LeaderboardEntryWithPlayer[] = entries.map((entry) => {
    const player = playerMap.get(entry.playerId);
    return {
      entryId: entry.entryId,
      leaderboardId: entry.leaderboardId,
      playerId: entry.playerId,
      tenantId: entry.tenantId,
      score: entry.score,
      rank: entry.rank,
      metrics: entry.metrics as LeaderboardMetrics,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      updatedAt: entry.updatedAt,
      displayName: player?.displayName,
      avatarId: player?.avatarId,
      privacyMode: player?.privacyMode,
    };
  });

  return { success: true, entries: entriesWithPlayer };
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

export type { LeaderboardMetrics, ScoreWeights } from '../../db/schema/social/index.js';
