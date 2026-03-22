import { eq, and, desc, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  reputationScores,
  reputationHistory,
  endorsements,
  endorsementDecay,
  type ReputationScore,
  type NewReputationScore,
  type ReputationHistory,
  type NewReputationHistory,
  type ReputationTier,
  type ReputationHistoryReason,
  REPUTATION_TIER_THRESHOLDS,
  REPUTATION_COMPONENTS,
  REPUTATION_DEFAULT_SCORE,
} from '../../db/schema/social/index.js';
import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths

import type { PaginatedResult } from './endorsement.service.js';
import type { AppConfig } from '../../config.js';

export type {
  ReputationScore,
  NewReputationScore,
  ReputationHistory,
  NewReputationHistory,
  ReputationTier,
  ReputationHistoryReason,
};

export interface ReputationBreakdown {
  playerId: string;
  totalScore: number;
  tier: ReputationTier;
  endorsementScore: number;
  completionScore: number;
  reportPenalty: number;
  abandonmentPenalty: number;
  endorsementCount: number;
  sessionCompletionRate: number;
  verifiedReportCount: number;
  abandonedSessionCount: number;
  lastUpdatedAt: Date | null;
}

export interface ReputationPublic {
  playerId: string;
  tier: ReputationTier;
}

export interface ReputationHistoryEntry {
  id: string;
  delta: number;
  reason: ReputationHistoryReason;
  referenceId: string | null;
  scoreAfter: number;
  createdAt: Date;
}

const FEATURE_GATE_MINIMUMS: Record<string, number> = {
  join_guilds: 100,
  create_guild: 500,
  competitive_ranked: 800,
  moderate_forums: 600,
};

export function computeReputationScore(
  endorsementScore: number,
  completionScore: number,
  reportPenalty: number,
  abandonmentPenalty: number,
): number {
  const raw = endorsementScore + completionScore + reportPenalty + abandonmentPenalty;
  return Math.max(0, Math.min(1000, raw));
}

export function getReputationTier(score: number): ReputationTier {
  if (score >= REPUTATION_TIER_THRESHOLDS.diamond) return 'diamond';
  if (score >= REPUTATION_TIER_THRESHOLDS.platinum) return 'platinum';
  if (score >= REPUTATION_TIER_THRESHOLDS.gold) return 'gold';
  if (score >= REPUTATION_TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function canAccessFeature(tier: ReputationTier, feature: string): boolean {
  const minimum = FEATURE_GATE_MINIMUMS[feature];
  if (minimum === undefined) return true;
  return getReputationTierScore(tier) >= minimum;
}

function getReputationTierScore(tier: ReputationTier): number {
  switch (tier) {
    case 'diamond':
      return REPUTATION_TIER_THRESHOLDS.diamond;
    case 'platinum':
      return REPUTATION_TIER_THRESHOLDS.platinum;
    case 'gold':
      return REPUTATION_TIER_THRESHOLDS.gold;
    case 'silver':
      return REPUTATION_TIER_THRESHOLDS.silver;
    case 'bronze':
    default:
      return REPUTATION_TIER_THRESHOLDS.bronze;
  }
}

export async function getReputation(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  seasonId?: string,
): Promise<ReputationBreakdown | null> {
  const reputationEnabled = await evaluateFlag(config, tenantId, 'social.reputation_enabled');
  if (!reputationEnabled) {
    return null;
  }

  const db = getDatabaseClient(config);

  const reputation = await db.query.reputationScores.findFirst({
    where: and(
      eq(reputationScores.tenantId, tenantId),
      eq(reputationScores.playerId, playerId),
      seasonId
        ? eq(reputationScores.seasonId, seasonId)
        : sql`${reputationScores.seasonId} IS NULL`,
    ),
  });

  if (!reputation) {
    return null;
  }

  return {
    playerId: reputation.playerId,
    totalScore: reputation.totalScore,
    tier: getReputationTier(reputation.totalScore),
    endorsementScore: reputation.endorsementScore,
    completionScore: reputation.completionScore,
    reportPenalty: reputation.reportPenalty,
    abandonmentPenalty: reputation.abandonmentPenalty,
    endorsementCount: reputation.endorsementCount,
    sessionCompletionRate: parseFloat(reputation.sessionCompletionRate || '0'),
    verifiedReportCount: reputation.verifiedReportCount,
    abandonedSessionCount: reputation.abandonedSessionCount,
    lastUpdatedAt: reputation.lastUpdatedAt,
  };
}

export async function getReputationPublic(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  seasonId?: string,
): Promise<ReputationPublic | null> {
  const reputation = await getReputation(config, tenantId, playerId, seasonId);
  if (!reputation) {
    return null;
  }
  return {
    playerId: reputation.playerId,
    tier: reputation.tier,
  };
}

export async function getReputationHistory(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  page: number = 1,
  pageSize: number = 20,
  seasonId?: string,
): Promise<PaginatedResult<ReputationHistoryEntry>> {
  const db = getDatabaseClient(config);
  const offset = (page - 1) * pageSize;

  const historyResult = await db
    .select()
    .from(reputationHistory)
    .where(
      and(
        eq(reputationHistory.tenantId, tenantId),
        eq(reputationHistory.playerId, playerId),
        seasonId
          ? eq(reputationHistory.seasonId, seasonId)
          : sql`${reputationHistory.seasonId} IS NULL`,
      ),
    )
    .orderBy(desc(reputationHistory.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reputationHistory)
    .where(
      and(
        eq(reputationHistory.tenantId, tenantId),
        eq(reputationHistory.playerId, playerId),
        seasonId
          ? eq(reputationHistory.seasonId, seasonId)
          : sql`${reputationHistory.seasonId} IS NULL`,
      ),
    );

  const total = countResult[0]?.count ?? 0;

  const items: ReputationHistoryEntry[] = historyResult.map((entry) => ({
    id: entry.id,
    delta: entry.delta,
    reason: entry.reason as ReputationHistoryReason,
    referenceId: entry.referenceId,
    scoreAfter: entry.scoreAfter,
    createdAt: entry.createdAt,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + items.length < total,
  };
}

export async function getReputationLeaderboard(
  config: AppConfig,
  tenantId: string,
  page: number = 1,
  pageSize: number = 20,
  seasonId?: string,
): Promise<PaginatedResult<ReputationBreakdown & { rank: number }>> {
  const db = getDatabaseClient(config);
  const offset = (page - 1) * pageSize;

  const scoresResult = await db
    .select()
    .from(reputationScores)
    .where(
      and(
        eq(reputationScores.tenantId, tenantId),
        seasonId
          ? eq(reputationScores.seasonId, seasonId)
          : sql`${reputationScores.seasonId} IS NULL`,
      ),
    )
    .orderBy(desc(reputationScores.totalScore))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reputationScores)
    .where(
      and(
        eq(reputationScores.tenantId, tenantId),
        seasonId
          ? eq(reputationScores.seasonId, seasonId)
          : sql`${reputationScores.seasonId} IS NULL`,
      ),
    );

  const total = countResult[0]?.count ?? 0;

  const startRank = offset + 1;
  const items = scoresResult.map((score, index) => ({
    playerId: score.playerId,
    totalScore: score.totalScore,
    tier: getReputationTier(score.totalScore),
    endorsementScore: score.endorsementScore,
    completionScore: score.completionScore,
    reportPenalty: score.reportPenalty,
    abandonmentPenalty: score.abandonmentPenalty,
    endorsementCount: score.endorsementCount,
    sessionCompletionRate: parseFloat(score.sessionCompletionRate || '0'),
    verifiedReportCount: score.verifiedReportCount,
    abandonedSessionCount: score.abandonedSessionCount,
    lastUpdatedAt: score.lastUpdatedAt,
    rank: startRank + index,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + items.length < total,
  };
}

async function getOrCreateReputationScore(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  seasonId?: string,
): Promise<ReputationScore> {
  const db = getDatabaseClient(config);

  let reputation = await db.query.reputationScores.findFirst({
    where: and(
      eq(reputationScores.tenantId, tenantId),
      eq(reputationScores.playerId, playerId),
      seasonId
        ? eq(reputationScores.seasonId, seasonId)
        : sql`${reputationScores.seasonId} IS NULL`,
    ),
  });

  if (!reputation) {
    const [newReputation] = await db
      .insert(reputationScores)
      .values({
        playerId,
        tenantId,
        seasonId: seasonId ?? null,
        totalScore: REPUTATION_DEFAULT_SCORE,
        endorsementScore: 0,
        completionScore: 0,
        reportPenalty: 0,
        abandonmentPenalty: 0,
        endorsementCount: 0,
        sessionCompletionRate: '0',
        verifiedReportCount: 0,
        abandonedSessionCount: 0,
        lastUpdatedAt: new Date(),
      })
      .returning();
    if (!newReputation) {
      throw new Error('Failed to create reputation score');
    }
    reputation = newReputation;
  }

  return reputation;
}

async function recordReputationChange(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  delta: number,
  reason: ReputationHistoryReason,
  referenceId: string | null,
  scoreAfter: number,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  await db.insert(reputationHistory).values({
    playerId,
    tenantId,
    seasonId: seasonId ?? null,
    delta,
    reason,
    referenceId,
    scoreAfter,
  });
}

export async function recordEndorsementReceived(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  endorsementId: string,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  const endorsement = await db.query.endorsements.findFirst({
    where: eq(endorsements.id, endorsementId),
  });

  if (!endorsement) {
    return;
  }

  const decay = await db.query.endorsementDecay.findFirst({
    where: eq(endorsementDecay.endorsementId, endorsementId),
  });

  const baseImpact = decay?.reputationImpact ?? REPUTATION_COMPONENTS.ENDORSEMENT_IMPACT;

  const now = new Date();
  const endorsementAgeDays = Math.floor(
    (now.getTime() - endorsement.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const decayFactor = Math.max(
    1 - endorsementAgeDays / REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_DAYS,
    0,
  );
  const endorsementImpact = Math.floor(baseImpact * decayFactor);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const newEndorsementScore = reputation.endorsementScore + endorsementImpact;
  const newTotalScore = computeReputationScore(
    newEndorsementScore,
    reputation.completionScore,
    reputation.reportPenalty,
    reputation.abandonmentPenalty,
  );

  await db
    .update(reputationScores)
    .set({
      endorsementScore: newEndorsementScore,
      totalScore: newTotalScore,
      endorsementCount: reputation.endorsementCount + 1,
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    endorsementImpact,
    'endorsement_received',
    endorsementId,
    newTotalScore,
    seasonId,
  );
}

export async function recordEndorsementDecay(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  endorsementId: string,
  decayedAmount: number,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const newEndorsementScore = Math.max(0, reputation.endorsementScore - decayedAmount);
  const newTotalScore = computeReputationScore(
    newEndorsementScore,
    reputation.completionScore,
    reputation.reportPenalty,
    reputation.abandonmentPenalty,
  );

  await db
    .update(reputationScores)
    .set({
      endorsementScore: newEndorsementScore,
      totalScore: newTotalScore,
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    -decayedAmount,
    'endorsement_decayed',
    endorsementId,
    newTotalScore,
    seasonId,
  );
}

export async function recordSessionCompleted(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  sessionId: string,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const completionBonus = Math.floor(REPUTATION_COMPONENTS.COMPLETION_MAX * (1 / 100));

  const newCompletionScore = reputation.completionScore + completionBonus;
  const cappedCompletionScore = Math.min(newCompletionScore, REPUTATION_COMPONENTS.COMPLETION_MAX);
  const newTotalScore = computeReputationScore(
    reputation.endorsementScore,
    cappedCompletionScore,
    reputation.reportPenalty,
    reputation.abandonmentPenalty,
  );

  const newCompletionRate = Math.min(
    parseFloat(reputation.sessionCompletionRate || '0') + 0.01,
    1.0,
  );

  await db
    .update(reputationScores)
    .set({
      completionScore: cappedCompletionScore,
      totalScore: newTotalScore,
      sessionCompletionRate: newCompletionRate.toFixed(4),
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    completionBonus,
    'session_completed',
    sessionId,
    newTotalScore,
    seasonId,
  );
}

export async function recordSessionAbandoned(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  sessionId: string,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const abandonmentPenalty = REPUTATION_COMPONENTS.ABANDONMENT_PENALTY_PER;
  const newAbandonmentPenalty = reputation.abandonmentPenalty + abandonmentPenalty;
  const newTotalScore = computeReputationScore(
    reputation.endorsementScore,
    reputation.completionScore,
    reputation.reportPenalty,
    newAbandonmentPenalty,
  );

  const newCompletionRate = Math.max(parseFloat(reputation.sessionCompletionRate || '0') - 0.01, 0);

  await db
    .update(reputationScores)
    .set({
      abandonmentPenalty: newAbandonmentPenalty,
      totalScore: newTotalScore,
      abandonedSessionCount: reputation.abandonedSessionCount + 1,
      sessionCompletionRate: newCompletionRate.toFixed(4),
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    abandonmentPenalty,
    'session_abandoned',
    sessionId,
    newTotalScore,
    seasonId,
  );
}

export async function recordVerifiedReport(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  reportId: string,
  seasonId?: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const reportPenalty = REPUTATION_COMPONENTS.REPORT_PENALTY_PER;
  const newReportPenalty = reputation.reportPenalty + reportPenalty;
  const newTotalScore = computeReputationScore(
    reputation.endorsementScore,
    reputation.completionScore,
    newReportPenalty,
    reputation.abandonmentPenalty,
  );

  await db
    .update(reputationScores)
    .set({
      reportPenalty: newReportPenalty,
      totalScore: newTotalScore,
      verifiedReportCount: reputation.verifiedReportCount + 1,
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    reportPenalty,
    'report_verified',
    reportId,
    newTotalScore,
    seasonId,
  );
}

export async function recordReportDismissed(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  reportId: string,
  seasonId?: string,
): Promise<void> {
  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  await recordReputationChange(
    config,
    tenantId,
    playerId,
    0,
    'report_dismissed',
    reportId,
    reputation.totalScore,
    seasonId,
  );
}

export async function recalculateReputation(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  seasonId?: string,
): Promise<ReputationBreakdown | null> {
  const db = getDatabaseClient(config);

  const reputation = await getOrCreateReputationScore(config, tenantId, playerId, seasonId);

  const endorsementsList = await db.query.endorsements.findMany({
    where: and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorsedPlayerId, playerId)),
  });

  let totalEndorsementScore = 0;
  for (const endorsement of endorsementsList) {
    const decay = await db.query.endorsementDecay.findFirst({
      where: eq(endorsementDecay.endorsementId, endorsement.id),
    });

    if (decay && !decay.decayedAt) {
      const createdAt = endorsement.createdAt;
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceCreation < REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_DAYS) {
        const decayFactor = Math.max(
          1 - REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_PERCENT * Math.floor(daysSinceCreation / 90),
          0.1,
        );
        totalEndorsementScore += Math.floor((decay.reputationImpact || 10) * decayFactor);
      }
    }
  }

  const newTotalScore = computeReputationScore(
    totalEndorsementScore,
    reputation.completionScore,
    reputation.reportPenalty,
    reputation.abandonmentPenalty,
  );

  await db
    .update(reputationScores)
    .set({
      endorsementScore: totalEndorsementScore,
      totalScore: newTotalScore,
      lastUpdatedAt: new Date(),
    })
    .where(eq(reputationScores.id, reputation.id));

  return getReputation(config, tenantId, playerId, seasonId);
}
