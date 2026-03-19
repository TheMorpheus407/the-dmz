import { eq, and, sql, desc, asc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  endorsementTags,
  endorsements,
  endorsementDecay,
  type EndorsementTag,
  type NewEndorsementTag,
  type Endorsement,
  type NewEndorsement,
  type EndorsementDecay,
  type NewEndorsementDecay,
  ENDORSEMENT_DECAY_DAYS,
  ENDORSEMENT_BASE_IMPACT,
} from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

export type {
  EndorsementTag,
  NewEndorsementTag,
  Endorsement,
  NewEndorsement,
  EndorsementDecay,
  NewEndorsementDecay,
};

export interface EndorsementSubmission {
  sessionId: string;
  endorsedPlayerId: string;
  tagIds: string[];
}

export interface EndorsementResult {
  success: boolean;
  endorsement?: Endorsement;
  error?: string;
}

export interface EndorsementWithTag extends Endorsement {
  tag: EndorsementTag;
}

export interface EndorsementSummary {
  playerId: string;
  totalReceived: number;
  totalGiven: number;
  tagBreakdown: {
    tagKey: string;
    displayName: string;
    count: number;
    recentCount: number;
  }[];
  endorsementRate: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const MAX_TAGS_PER_SESSION = 3;
const MAX_ENDORSEMENTS_PER_DAY = 10;

export const ENDORSEMENT_TAG_SEEDS: Omit<NewEndorsementTag, 'id' | 'createdAt'>[] = [
  {
    tagKey: 'careful_verifier',
    displayName: 'Careful Verifier',
    description: 'Consistently requested verification and caught discrepancies',
    isActive: true,
  },
  {
    tagKey: 'clear_communicator',
    displayName: 'Clear Communicator',
    description: 'Provided clear rationale for decisions',
    isActive: true,
  },
  {
    tagKey: 'steady_incident_commander',
    displayName: 'Steady Incident Commander',
    description: 'Calm and effective during incidents',
    isActive: true,
  },
  {
    tagKey: 'quick_responder',
    displayName: 'Quick Responder',
    description: 'Fast and accurate decision-making',
    isActive: true,
  },
  {
    tagKey: 'team_player',
    displayName: 'Team Player',
    description: 'Supported partner and collaborated effectively',
    isActive: true,
  },
  {
    tagKey: 'threat_hunter',
    displayName: 'Threat Hunter',
    description: 'Excellent at identifying subtle threats',
    isActive: true,
  },
];

async function getEndorsementCountToday(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<number> {
  const db = getDatabaseClient(config);
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(endorsements)
    .where(
      and(
        eq(endorsements.tenantId, tenantId),
        eq(endorsements.endorserPlayerId, playerId),
        sql`${endorsements.createdAt} >= ${oneDayAgo}`,
      ),
    );

  return result[0]?.count ?? 0;
}

export async function seedEndorsementTags(config: AppConfig): Promise<void> {
  const db = getDatabaseClient(config);

  for (const tagSeed of ENDORSEMENT_TAG_SEEDS) {
    const existing = await db.query.endorsementTags.findFirst({
      where: eq(endorsementTags.tagKey, tagSeed.tagKey),
    });

    if (!existing) {
      await db.insert(endorsementTags).values(tagSeed);
    }
  }
}

export async function listActiveEndorsementTags(config: AppConfig): Promise<EndorsementTag[]> {
  const db = getDatabaseClient(config);

  const tags = await db.query.endorsementTags.findMany({
    where: eq(endorsementTags.isActive, true),
    orderBy: asc(endorsementTags.displayName),
  });

  return tags;
}

export async function getEndorsementTagById(
  config: AppConfig,
  tagId: string,
): Promise<EndorsementTag | null> {
  const db = getDatabaseClient(config);

  const tag = await db.query.endorsementTags.findFirst({
    where: eq(endorsementTags.id, tagId),
  });

  return tag ?? null;
}

export async function deactivateEndorsementTag(
  config: AppConfig,
  tagId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabaseClient(config);

  const tag = await db.query.endorsementTags.findFirst({
    where: eq(endorsementTags.id, tagId),
  });

  if (!tag) {
    return { success: false, error: 'Tag not found' };
  }

  await db.update(endorsementTags).set({ isActive: false }).where(eq(endorsementTags.id, tagId));

  return { success: true };
}

export async function submitEndorsement(
  config: AppConfig,
  tenantId: string,
  endorserPlayerId: string,
  submission: EndorsementSubmission,
): Promise<EndorsementResult> {
  const { sessionId, endorsedPlayerId, tagIds } = submission;

  if (endorserPlayerId === endorsedPlayerId) {
    return { success: false, error: 'Cannot endorse yourself' };
  }

  if (tagIds.length === 0) {
    return { success: false, error: 'At least one tag is required' };
  }

  if (tagIds.length > MAX_TAGS_PER_SESSION) {
    return { success: false, error: `Maximum ${MAX_TAGS_PER_SESSION} tags per endorsement` };
  }

  const dailyCount = await getEndorsementCountToday(config, tenantId, endorserPlayerId);
  if (dailyCount >= MAX_ENDORSEMENTS_PER_DAY) {
    return { success: false, error: 'Daily endorsement limit reached' };
  }

  const db = getDatabaseClient(config);

  const existingEndorsement = await db.query.endorsements.findFirst({
    where: and(
      eq(endorsements.sessionId, sessionId),
      eq(endorsements.endorserPlayerId, endorserPlayerId),
      eq(endorsements.endorsedPlayerId, endorsedPlayerId),
    ),
  });

  if (existingEndorsement) {
    return { success: false, error: 'Endorsement already exists for this session and player' };
  }

  for (const tagId of tagIds) {
    const duplicateTag = await db.query.endorsements.findFirst({
      where: and(
        eq(endorsements.sessionId, sessionId),
        eq(endorsements.endorserPlayerId, endorserPlayerId),
        eq(endorsements.endorsedPlayerId, endorsedPlayerId),
        eq(endorsements.tagId, tagId),
      ),
    });

    if (duplicateTag) {
      return { success: false, error: 'Duplicate tag endorsement for this session' };
    }
  }

  const createdEndorsements: Endorsement[] = [];

  for (const tagId of tagIds) {
    const result = await db
      .insert(endorsements)
      .values({
        sessionId,
        endorserPlayerId,
        endorsedPlayerId,
        tagId,
        tenantId,
      })
      .returning();

    const endorsement = result[0];
    if (!endorsement) {
      return { success: false, error: 'Failed to create endorsement' };
    }

    await db.insert(endorsementDecay).values({
      endorsementId: endorsement.id,
      reputationImpact: ENDORSEMENT_BASE_IMPACT,
      decaySchedule: {
        initialDecay: 0.9,
        decayIntervalDays: 30,
        finalDecay: 0.1,
      },
    });

    createdEndorsements.push(endorsement);
  }

  const firstEndorsement = createdEndorsements[0];
  if (!firstEndorsement) {
    return { success: false, error: 'Failed to create endorsement' };
  }

  return { success: true, endorsement: firstEndorsement };
}

export async function getReceivedEndorsements(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<EndorsementWithTag>> {
  const db = getDatabaseClient(config);
  const offset = (page - 1) * pageSize;

  const endorsementsResult = await db
    .select({
      endorsement: endorsements,
      tag: endorsementTags,
    })
    .from(endorsements)
    .innerJoin(endorsementTags, eq(endorsements.tagId, endorsementTags.id))
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorsedPlayerId, playerId)))
    .orderBy(desc(endorsements.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(endorsements)
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorsedPlayerId, playerId)));

  const total = countResult[0]?.count ?? 0;

  const data: EndorsementWithTag[] = endorsementsResult.map((row) => ({
    ...row.endorsement,
    tag: row.tag,
  }));

  return {
    data,
    total,
    page,
    pageSize,
    hasMore: offset + data.length < total,
  };
}

export async function getGivenEndorsements(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<EndorsementWithTag>> {
  const db = getDatabaseClient(config);
  const offset = (page - 1) * pageSize;

  const endorsementsResult = await db
    .select({
      endorsement: endorsements,
      tag: endorsementTags,
    })
    .from(endorsements)
    .innerJoin(endorsementTags, eq(endorsements.tagId, endorsementTags.id))
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorserPlayerId, playerId)))
    .orderBy(desc(endorsements.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(endorsements)
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorserPlayerId, playerId)));

  const total = countResult[0]?.count ?? 0;

  const data: EndorsementWithTag[] = endorsementsResult.map((row) => ({
    ...row.endorsement,
    tag: row.tag,
  }));

  return {
    data,
    total,
    page,
    pageSize,
    hasMore: offset + data.length < total,
  };
}

export async function getEndorsementSummary(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<EndorsementSummary> {
  const db = getDatabaseClient(config);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const receivedEndorsements = await db
    .select({
      endorsement: endorsements,
      tag: endorsementTags,
    })
    .from(endorsements)
    .innerJoin(endorsementTags, eq(endorsements.tagId, endorsementTags.id))
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorsedPlayerId, playerId)));

  const givenEndorsements = await db
    .select({ count: sql<number>`count(*)` })
    .from(endorsements)
    .where(and(eq(endorsements.tenantId, tenantId), eq(endorsements.endorserPlayerId, playerId)));

  const totalGiven = givenEndorsements[0]?.count ?? 0;

  const tagBreakdownMap = new Map<
    string,
    { tagKey: string; displayName: string; count: number; recentCount: number }
  >();

  for (const row of receivedEndorsements) {
    const endorsement = row.endorsement;
    const tag = row.tag;
    const existing = tagBreakdownMap.get(endorsement.tagId);
    const isRecent = endorsement.createdAt >= thirtyDaysAgo;

    if (existing) {
      existing.count++;
      if (isRecent) {
        existing.recentCount++;
      }
    } else {
      tagBreakdownMap.set(endorsement.tagId, {
        tagKey: tag.tagKey,
        displayName: tag.displayName,
        count: 1,
        recentCount: isRecent ? 1 : 0,
      });
    }
  }

  return {
    playerId,
    totalReceived: receivedEndorsements.length,
    totalGiven,
    tagBreakdown: Array.from(tagBreakdownMap.values()),
    endorsementRate: receivedEndorsements.length / Math.max(totalGiven, 1),
  };
}

export async function calculateDecayedImpact(
  config: AppConfig,
  endorsementId: string,
): Promise<number> {
  const db = getDatabaseClient(config);

  const decay = await db.query.endorsementDecay.findFirst({
    where: eq(endorsementDecay.endorsementId, endorsementId),
  });

  if (!decay) {
    return 0;
  }

  if (decay.decayedAt) {
    return 0;
  }

  const daysSinceCreation = Math.floor(
    (Date.now() - decay.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceCreation >= ENDORSEMENT_DECAY_DAYS) {
    await db
      .update(endorsementDecay)
      .set({ decayedAt: new Date() })
      .where(eq(endorsementDecay.id, decay.id));
    return 0;
  }

  const schedule = decay.decaySchedule as {
    initialDecay: number;
    decayIntervalDays: number;
    finalDecay: number;
  };

  const intervals = Math.floor(daysSinceCreation / schedule.decayIntervalDays);
  let decayFactor: number;

  if (intervals === 0) {
    decayFactor = 1;
  } else {
    decayFactor =
      schedule.initialDecay *
      Math.pow(1 - (schedule.initialDecay - schedule.finalDecay) / intervals, intervals);
  }

  return Math.floor(decay.reputationImpact * Math.max(schedule.finalDecay, decayFactor));
}

export async function getActiveEndorsementsForPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<Endorsement[]> {
  const db = getDatabaseClient(config);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ENDORSEMENT_DECAY_DAYS);

  const activeEndorsements = await db.query.endorsements.findMany({
    where: and(
      eq(endorsements.tenantId, tenantId),
      eq(endorsements.endorsedPlayerId, playerId),
      sql`${endorsements.createdAt} >= ${cutoffDate}`,
    ),
  });

  return activeEndorsements;
}
