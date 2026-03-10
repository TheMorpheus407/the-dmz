import { and, eq } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import {
  factions,
  factionRelations,
  narrativeEvents,
  morpheusMessages,
  playerNarrativeState,
  type Faction,
  type FactionRelation,
  type NarrativeEvent,
  type MorpheusMessage,
  type PlayerNarrativeState,
} from '../../db/schema/content/index.js';

export type { Faction, FactionRelation, NarrativeEvent, MorpheusMessage, PlayerNarrativeState };

export const findFactions = async (
  db: DB,
  tenantId: string,
  filters?: {
    factionKey?: string;
    isActive?: boolean;
  },
): Promise<Faction[]> => {
  const conditions = [eq(factions.tenantId, tenantId)];

  if (filters?.factionKey) {
    conditions.push(eq(factions.factionKey, filters.factionKey));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(factions.isActive, filters.isActive));
  }

  return db
    .select()
    .from(factions)
    .where(and(...conditions));
};

export const findFactionByKey = async (
  db: DB,
  tenantId: string,
  factionKey: string,
): Promise<Faction | undefined> => {
  const results = await db
    .select()
    .from(factions)
    .where(and(eq(factions.tenantId, tenantId), eq(factions.factionKey, factionKey)));

  return results[0];
};

export const findFactionById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<Faction | undefined> => {
  const results = await db
    .select()
    .from(factions)
    .where(and(eq(factions.id, id), eq(factions.tenantId, tenantId)));

  return results[0];
};

export const findFactionRelations = async (
  db: DB,
  tenantId: string,
  userId: string,
): Promise<FactionRelation[]> => {
  return db
    .select()
    .from(factionRelations)
    .where(and(eq(factionRelations.tenantId, tenantId), eq(factionRelations.userId, userId)));
};

export const findFactionRelation = async (
  db: DB,
  tenantId: string,
  userId: string,
  factionId: string,
): Promise<FactionRelation | undefined> => {
  const results = await db
    .select()
    .from(factionRelations)
    .where(
      and(
        eq(factionRelations.tenantId, tenantId),
        eq(factionRelations.userId, userId),
        eq(factionRelations.factionId, factionId),
      ),
    );

  return results[0];
};

export const upsertFactionRelation = async (
  db: DB,
  data: Omit<FactionRelation, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FactionRelation> => {
  const existing = await findFactionRelation(db, data.tenantId, data.userId, data.factionId);

  if (existing) {
    const [updated] = await db
      .update(factionRelations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(factionRelations.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db.insert(factionRelations).values(data).returning();
  return created!;
};

export const initializeFactionRelations = async (
  db: DB,
  tenantId: string,
  userId: string,
): Promise<FactionRelation[]> => {
  const tenantFactions = await findFactions(db, tenantId, { isActive: true });

  const relations: FactionRelation[] = [];
  for (const faction of tenantFactions) {
    const relation = await upsertFactionRelation(db, {
      tenantId,
      userId,
      factionId: faction.id,
      reputation: faction.initialReputation,
      lastInteractionDay: 0,
      interactionCount: 0,
    });
    relations.push(relation);
  }

  return relations;
};

export const updateFactionReputation = async (
  db: DB,
  tenantId: string,
  userId: string,
  factionId: string,
  reputationDelta: number,
  currentDay: number,
): Promise<FactionRelation | undefined> => {
  const existing = await findFactionRelation(db, tenantId, userId, factionId);

  if (!existing) {
    return undefined;
  }

  const newReputation = Math.max(0, Math.min(100, existing.reputation + reputationDelta));

  const [updated] = await db
    .update(factionRelations)
    .set({
      reputation: newReputation,
      lastInteractionDay: currentDay,
      interactionCount: existing.interactionCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(factionRelations.id, existing.id))
    .returning();

  return updated;
};

export const findNarrativeEvents = async (
  db: DB,
  tenantId: string,
  userId: string,
  filters?: {
    eventKey?: string;
    factionKey?: string;
    isRead?: boolean;
    triggerType?: string;
  },
): Promise<NarrativeEvent[]> => {
  const conditions = [eq(narrativeEvents.tenantId, tenantId), eq(narrativeEvents.userId, userId)];

  if (filters?.eventKey) {
    conditions.push(eq(narrativeEvents.eventKey, filters.eventKey));
  }
  if (filters?.factionKey) {
    conditions.push(eq(narrativeEvents.factionKey, filters.factionKey));
  }
  if (filters?.isRead !== undefined) {
    conditions.push(eq(narrativeEvents.isRead, filters.isRead));
  }
  if (filters?.triggerType) {
    conditions.push(eq(narrativeEvents.triggerType, filters.triggerType));
  }

  return db
    .select()
    .from(narrativeEvents)
    .where(and(...conditions))
    .orderBy(narrativeEvents.createdAt);
};

export const createNarrativeEvent = async (
  db: DB,
  data: Omit<NarrativeEvent, 'id' | 'createdAt'>,
): Promise<NarrativeEvent> => {
  const [created] = await db.insert(narrativeEvents).values(data).returning();
  return created!;
};

export const markNarrativeEventRead = async (
  db: DB,
  tenantId: string,
  userId: string,
  eventId: string,
): Promise<NarrativeEvent | undefined> => {
  const [updated] = await db
    .update(narrativeEvents)
    .set({ isRead: true })
    .where(
      and(
        eq(narrativeEvents.id, eventId),
        eq(narrativeEvents.tenantId, tenantId),
        eq(narrativeEvents.userId, userId),
      ),
    )
    .returning();

  return updated;
};

export const findMorpheusMessages = async (
  db: DB,
  tenantId: string,
  filters?: {
    messageKey?: string;
    triggerType?: string;
    isActive?: boolean;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const conditions = [eq(morpheusMessages.tenantId, tenantId)];

  if (filters?.messageKey) {
    conditions.push(eq(morpheusMessages.messageKey, filters.messageKey));
  }
  if (filters?.triggerType) {
    conditions.push(eq(morpheusMessages.triggerType, filters.triggerType));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(morpheusMessages.isActive, filters.isActive));
  }
  if (filters?.factionKey) {
    conditions.push(eq(morpheusMessages.factionKey, filters.factionKey));
  }

  return db
    .select()
    .from(morpheusMessages)
    .where(and(...conditions));
};

export const findMorpheusMessagesForContext = async (
  db: DB,
  tenantId: string,
  context: {
    triggerType?: string;
    day?: number;
    trustScore?: number;
    threatLevel?: string;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const messages = await findMorpheusMessages(db, tenantId, { isActive: true });

  return messages.filter((msg) => {
    if (
      context.triggerType &&
      msg.triggerType !== context.triggerType &&
      msg.triggerType !== 'general'
    ) {
      return false;
    }

    if (msg.minDay !== null && context.day !== undefined && context.day < msg.minDay) {
      return false;
    }
    if (msg.maxDay !== null && context.day !== undefined && context.day > msg.maxDay) {
      return false;
    }

    if (
      msg.minTrustScore !== null &&
      context.trustScore !== undefined &&
      context.trustScore < msg.minTrustScore
    ) {
      return false;
    }
    if (
      msg.maxTrustScore !== null &&
      context.trustScore !== undefined &&
      context.trustScore > msg.maxTrustScore
    ) {
      return false;
    }

    if (msg.minThreatLevel !== null && context.threatLevel !== undefined) {
      const threatLevels = ['low', 'guarded', 'elevated', 'high', 'severe'];
      const msgLevel = threatLevels.indexOf(msg.minThreatLevel ?? '');
      const contextLevel = threatLevels.indexOf(context.threatLevel);
      if (contextLevel < msgLevel) {
        return false;
      }
    }

    if (msg.maxThreatLevel !== null && context.threatLevel !== undefined) {
      const threatLevels = ['low', 'guarded', 'elevated', 'high', 'severe'];
      const msgLevel = threatLevels.indexOf(msg.maxThreatLevel ?? '');
      const contextLevel = threatLevels.indexOf(context.threatLevel);
      if (contextLevel > msgLevel) {
        return false;
      }
    }

    if (
      msg.factionKey !== null &&
      context.factionKey !== undefined &&
      msg.factionKey !== context.factionKey
    ) {
      return false;
    }

    return true;
  });
};

export const findPlayerNarrativeState = async (
  db: DB,
  tenantId: string,
  userId: string,
): Promise<PlayerNarrativeState | undefined> => {
  const results = await db
    .select()
    .from(playerNarrativeState)
    .where(
      and(eq(playerNarrativeState.tenantId, tenantId), eq(playerNarrativeState.userId, userId)),
    );

  return results[0];
};

export const createPlayerNarrativeState = async (
  db: DB,
  data: Omit<PlayerNarrativeState, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PlayerNarrativeState> => {
  const [created] = await db.insert(playerNarrativeState).values(data).returning();
  return created!;
};

export const initializePlayerNarrativeState = async (
  db: DB,
  tenantId: string,
  userId: string,
): Promise<PlayerNarrativeState> => {
  const existing = await findPlayerNarrativeState(db, tenantId, userId);
  if (existing) {
    return existing;
  }

  return createPlayerNarrativeState(db, {
    tenantId,
    userId,
    currentSeason: 1,
    currentChapter: 1,
    currentAct: 1,
    milestonesReached: [],
    conversationsCompleted: [],
    lastMorpheusMessageDay: 0,
    welcomeMessageShown: false,
    metadata: {},
  });
};

export const updatePlayerNarrativeState = async (
  db: DB,
  tenantId: string,
  userId: string,
  data: Partial<
    Pick<
      PlayerNarrativeState,
      | 'currentSeason'
      | 'currentChapter'
      | 'currentAct'
      | 'milestonesReached'
      | 'conversationsCompleted'
      | 'lastMorpheusMessageDay'
      | 'welcomeMessageShown'
      | 'metadata'
    >
  >,
): Promise<PlayerNarrativeState | undefined> => {
  const existing = await findPlayerNarrativeState(db, tenantId, userId);

  if (!existing) {
    return undefined;
  }

  const [updated] = await db
    .update(playerNarrativeState)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(playerNarrativeState.id, existing.id))
    .returning();

  return updated;
};

export const addMilestone = async (
  db: DB,
  tenantId: string,
  userId: string,
  milestone: string,
): Promise<PlayerNarrativeState | undefined> => {
  const existing = await findPlayerNarrativeState(db, tenantId, userId);

  if (!existing) {
    return undefined;
  }

  const milestones = existing.milestonesReached as string[];
  if (!milestones.includes(milestone)) {
    const updatedMilestones = [...milestones, milestone];
    const [updated] = await db
      .update(playerNarrativeState)
      .set({ milestonesReached: updatedMilestones, updatedAt: new Date() })
      .where(eq(playerNarrativeState.id, existing.id))
      .returning();

    return updated;
  }

  return existing;
};
