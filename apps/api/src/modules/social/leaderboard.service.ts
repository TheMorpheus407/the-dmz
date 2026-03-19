import { eq, and, desc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient } from '../../shared/database/redis.js';
import {
  leaderboards,
  leaderboardEntries,
  playerProfiles,
  enterpriseLeaderboards,
  leaderboardScores,
  type Leaderboard,
  type LeaderboardMetrics,
  type ScoreWeights,
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
  rankingCategories,
  type EnterpriseScope,
  type PrivacyLevel,
  type LeaderboardType,
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

export interface EnterpriseLeaderboardEntry {
  id: string;
  leaderboardId: string;
  playerId: string;
  tenantId: string;
  departmentId: string | null;
  corporationId: string | null;
  score: number;
  rank: number;
  metrics: LeaderboardMetrics;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
  displayName?: string | null;
  avatarId?: string | null;
}

export interface EnterpriseLeaderboardResult {
  success: boolean;
  leaderboards?: EnterpriseLeaderboardEntry[];
  totalCount?: number;
  error?: string;
}

export interface TeamSummaryResult {
  success: boolean;
  teamId: string;
  averageScore: number;
  totalPlayers: number;
  topPerformers: { score: number; rank: number }[];
  error?: string;
}

export async function listEnterpriseLeaderboards(
  config: AppConfig,
  tenantId: string,
  options?: {
    scope?: EnterpriseScope;
    departmentId?: string;
    corporationId?: string;
  },
): Promise<{
  success: boolean;
  leaderboards?: (typeof enterpriseLeaderboards.$inferSelect)[];
  error?: string;
}> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const conditions: ReturnType<typeof eq>[] = [eq(enterpriseLeaderboards.isActive, true)];

  if (options?.scope) {
    conditions.push(eq(enterpriseLeaderboards.scope, options.scope));
  }
  if (options?.departmentId) {
    conditions.push(eq(enterpriseLeaderboards.orgUnitId, options.departmentId));
  }
  if (options?.corporationId) {
    conditions.push(eq(enterpriseLeaderboards.corporationId, options.corporationId));
  }

  const leaderboardList = await db.query.enterpriseLeaderboards.findMany({
    where: and(...conditions),
    orderBy: [desc(enterpriseLeaderboards.createdAt)],
  });

  return { success: true, leaderboards: leaderboardList };
}

export async function getEnterpriseLeaderboardEntries(
  config: AppConfig,
  tenantId: string,
  leaderboardId: string,
  options?: {
    limit?: number;
    offset?: number;
    departmentId?: string;
    corporationId?: string;
  },
): Promise<EnterpriseLeaderboardResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const leaderboard = await db.query.enterpriseLeaderboards.findFirst({
    where: and(
      eq(enterpriseLeaderboards.id, leaderboardId),
      eq(enterpriseLeaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Enterprise leaderboard not found' };
  }

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const conditions = [eq(leaderboardScores.leaderboardId, leaderboardId)];

  if (options?.departmentId) {
    conditions.push(eq(leaderboardScores.departmentId, options.departmentId));
  }
  if (options?.corporationId) {
    conditions.push(eq(leaderboardScores.corporationId, options.corporationId));
  }

  const entries = await db.query.leaderboardScores.findMany({
    where: and(...conditions),
    orderBy: [leaderboardScores.rank],
    limit,
    offset,
  });

  const players = await db.query.playerProfiles.findMany({
    where: eq(playerProfiles.privacyMode, 'public'),
  });

  const playerMap = new Map(players.map((p) => [p.profileId, p]));

  const entriesWithPlayer: EnterpriseLeaderboardEntry[] = entries.map((entry) => {
    const player = playerMap.get(entry.playerId);
    return {
      id: entry.id,
      leaderboardId: entry.leaderboardId,
      playerId: entry.playerId,
      tenantId: entry.tenantId,
      departmentId: entry.departmentId,
      corporationId: entry.corporationId,
      score: entry.score,
      rank: entry.rank,
      metrics: entry.metrics as LeaderboardMetrics,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      updatedAt: entry.updatedAt,
      displayName: player?.displayName ?? null,
      avatarId: player?.avatarId ?? null,
    };
  });

  const filteredEntries = filterEntriesByPrivacy(
    entriesWithPlayer,
    leaderboard.privacyLevel as PrivacyLevel,
  );

  const countResult = await db
    .select({ count: leaderboardScores.id })
    .from(leaderboardScores)
    .where(eq(leaderboardScores.leaderboardId, leaderboardId));

  const totalCount =
    typeof countResult[0]?.count === 'number' ? countResult[0].count : entries.length;

  return { success: true, leaderboards: filteredEntries, totalCount };
}

export async function getPlayerEnterprisePosition(
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

  const entry = await db.query.leaderboardScores.findFirst({
    where: and(
      eq(leaderboardScores.leaderboardId, leaderboardId),
      eq(leaderboardScores.playerId, playerId),
    ),
  });

  if (!entry) {
    return { success: false, error: 'Player not found on this leaderboard' };
  }

  return { success: true, rank: entry.rank, score: entry.score };
}

export async function getDepartmentLeaderboard(
  config: AppConfig,
  tenantId: string,
  departmentId: string,
  options?: {
    leaderboardType?: LeaderboardType;
    limit?: number;
  },
): Promise<EnterpriseLeaderboardResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const leaderboard = await db.query.enterpriseLeaderboards.findFirst({
    where: and(
      eq(enterpriseLeaderboards.scope, 'department'),
      eq(enterpriseLeaderboards.orgUnitId, departmentId),
      eq(enterpriseLeaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Department leaderboard not found' };
  }

  return getEnterpriseLeaderboardEntries(config, tenantId, leaderboard.id, {
    ...(options?.limit !== undefined ? { limit: options.limit } : {}),
    departmentId,
  });
}

export async function getCorporationLeaderboard(
  config: AppConfig,
  tenantId: string,
  corporationId: string,
  options?: {
    leaderboardType?: LeaderboardType;
    limit?: number;
  },
): Promise<EnterpriseLeaderboardResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return { success: false, error: 'Leaderboards system is disabled' };
  }

  const db = getDatabaseClient(config);

  const leaderboard = await db.query.enterpriseLeaderboards.findFirst({
    where: and(
      eq(enterpriseLeaderboards.scope, 'corporation'),
      eq(enterpriseLeaderboards.corporationId, corporationId),
      eq(enterpriseLeaderboards.isActive, true),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Corporation leaderboard not found' };
  }

  return getEnterpriseLeaderboardEntries(config, tenantId, leaderboard.id, {
    ...(options?.limit !== undefined ? { limit: options.limit } : {}),
    corporationId,
  });
}

export async function getTeamSummary(
  config: AppConfig,
  tenantId: string,
  teamId: string,
  leaderboardId: string,
): Promise<TeamSummaryResult> {
  const leaderboardsEnabled = await evaluateFlag(config, tenantId, 'social.leaderboards_enabled');
  if (!leaderboardsEnabled) {
    return {
      success: false,
      error: 'Leaderboards system is disabled',
      teamId,
      averageScore: 0,
      totalPlayers: 0,
      topPerformers: [],
    };
  }

  const db = getDatabaseClient(config);

  const entries = await db.query.leaderboardScores.findMany({
    where: and(
      eq(leaderboardScores.leaderboardId, leaderboardId),
      eq(leaderboardScores.departmentId, teamId),
    ),
    orderBy: [leaderboardScores.rank],
    limit: 10,
  });

  if (entries.length === 0) {
    return {
      success: true,
      teamId,
      averageScore: 0,
      totalPlayers: 0,
      topPerformers: [],
    };
  }

  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const averageScore = Math.round(totalScore / entries.length);
  const totalPlayers = entries.length;

  const topPerformers = entries.slice(0, 5).map((e) => ({
    score: e.score,
    rank: e.rank,
  }));

  return {
    success: true,
    teamId,
    averageScore,
    totalPlayers,
    topPerformers,
  };
}

export async function updatePrivacyLevel(
  config: AppConfig,
  tenantId: string,
  leaderboardId: string,
  privacyLevel: PrivacyLevel,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabaseClient(config);

  const leaderboard = await db.query.enterpriseLeaderboards.findFirst({
    where: and(
      eq(enterpriseLeaderboards.id, leaderboardId),
      eq(enterpriseLeaderboards.tenantId, tenantId),
    ),
  });

  if (!leaderboard) {
    return { success: false, error: 'Leaderboard not found' };
  }

  await db
    .update(enterpriseLeaderboards)
    .set({
      privacyLevel,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(enterpriseLeaderboards.id, leaderboardId),
        eq(enterpriseLeaderboards.tenantId, tenantId),
      ),
    );

  return { success: true };
}

export async function updateEnterprisePlayerScore(
  config: AppConfig,
  tenantId: string,
  input: ScoreUpdateInput,
  options?: {
    departmentId?: string;
    corporationId?: string;
    leaderboardType?: LeaderboardType;
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

function applyPrivacyFilter<T extends { displayName?: string | null; playerId: string }>(
  entries: T[],
  privacyLevel: PrivacyLevel,
): T[] {
  switch (privacyLevel) {
    case 'full_name':
      return entries;
    case 'pseudonym':
      return entries.map((e) => ({
        ...e,
        displayName: `Player ${e.playerId.slice(0, 8)}`,
      }));
    case 'anonymous_aggregate':
      return entries.map((e) => ({
        ...e,
        displayName: undefined,
        playerId: 'anonymous' as string,
      }));
    default:
      return entries;
  }
}

export function filterEntriesByPrivacy<T extends { displayName?: string | null; playerId: string }>(
  entries: T[],
  privacyLevel: PrivacyLevel,
): T[] {
  return applyPrivacyFilter(entries, privacyLevel);
}

export type { LeaderboardMetrics, ScoreWeights } from '../../db/schema/social/index.js';
