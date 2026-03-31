import { eq, and, desc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  enterpriseLeaderboards,
  leaderboardScores,
  playerProfiles,
  type LeaderboardMetrics,
  type EnterpriseScope,
  type PrivacyLevel,
  type LeaderboardType,
} from '../../db/schema/social/index.js';
import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths

import { filterEntriesByPrivacy } from './privacy-filter.service.js';

import type { AppConfig } from '../../config.js';

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

function buildEnterpriseEntriesWithPlayer(
  entries: (typeof leaderboardScores.$inferSelect)[],
  playerMap: Map<string, typeof playerProfiles.$inferSelect>,
): EnterpriseLeaderboardEntry[] {
  return entries.map((entry) => {
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

  const entriesWithPlayer = buildEnterpriseEntriesWithPlayer(entries, playerMap);

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
): Promise<{ success: boolean; rank?: number; score?: number; error?: string }> {
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
