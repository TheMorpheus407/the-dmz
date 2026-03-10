import { getDatabaseClient } from '../../shared/database/connection.js';

import * as narrativeRepo from './narrative.repo.js';

import type {
  Faction,
  FactionRelation,
  NarrativeEvent,
  MorpheusMessage,
  PlayerNarrativeState,
} from './narrative.repo.js';
import type { AppConfig } from '../../config.js';

export type { Faction, FactionRelation, NarrativeEvent, MorpheusMessage, PlayerNarrativeState };

export const listFactions = async (
  config: AppConfig,
  tenantId: string,
  filters?: {
    factionKey?: string;
    isActive?: boolean;
  },
): Promise<Faction[]> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findFactions(db, tenantId, filters);
};

export const getFaction = async (
  config: AppConfig,
  tenantId: string,
  factionKey: string,
): Promise<Faction | undefined> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findFactionByKey(db, tenantId, factionKey);
};

export const getFactionRelations = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<FactionRelation[]> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findFactionRelations(db, tenantId, userId);
};

export const updateFactionRelation = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  factionId: string,
  reputationDelta: number,
  currentDay: number,
): Promise<FactionRelation | undefined> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.updateFactionReputation(
    db,
    tenantId,
    userId,
    factionId,
    reputationDelta,
    currentDay,
  );
};

export const initializePlayerNarrative = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<{
  factionRelations: FactionRelation[];
  playerState: PlayerNarrativeState;
}> => {
  const db = getDatabaseClient(config);

  const factionRelations = await narrativeRepo.initializeFactionRelations(db, tenantId, userId);
  const playerState = await narrativeRepo.initializePlayerNarrativeState(db, tenantId, userId);

  return { factionRelations, playerState };
};

export const getNarrativeEvents = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  filters?: {
    eventKey?: string;
    factionKey?: string;
    isRead?: boolean;
    triggerType?: string;
  },
): Promise<NarrativeEvent[]> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findNarrativeEvents(db, tenantId, userId, filters);
};

export const triggerNarrativeEvent = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  data: {
    eventKey: string;
    factionKey?: string;
    title: string;
    description: string;
    triggerType: string;
    triggerThreshold?: number;
    dayTriggered: number;
    metadata?: Record<string, unknown>;
  },
): Promise<NarrativeEvent> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.createNarrativeEvent(db, {
    tenantId,
    userId,
    eventKey: data.eventKey,
    factionKey: data.factionKey ?? null,
    title: data.title,
    description: data.description,
    triggerType: data.triggerType,
    triggerThreshold: data.triggerThreshold ?? null,
    dayTriggered: data.dayTriggered,
    isRead: false,
    metadata: data.metadata ?? {},
  });
};

export const markEventRead = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  eventId: string,
): Promise<NarrativeEvent | undefined> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.markNarrativeEventRead(db, tenantId, userId, eventId);
};

export const getCoachingMessages = async (
  config: AppConfig,
  tenantId: string,
  context: {
    triggerType?: string;
    day?: number;
    trustScore?: number;
    threatLevel?: string;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findMorpheusMessagesForContext(db, tenantId, context);
};

export const getPlayerNarrativeState = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<PlayerNarrativeState | undefined> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.findPlayerNarrativeState(db, tenantId, userId);
};

export const showWelcomeMessage = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<{
  message: MorpheusMessage | null;
  playerState: PlayerNarrativeState;
}> => {
  const db = getDatabaseClient(config);

  const playerState = await narrativeRepo.findPlayerNarrativeState(db, tenantId, userId);

  if (!playerState) {
    throw new Error('Player narrative state not found');
  }

  if (playerState.welcomeMessageShown) {
    return { message: null, playerState };
  }

  const messages = await narrativeRepo.findMorpheusMessages(db, tenantId, {
    messageKey: 'welcome_message',
    isActive: true,
  });

  const message = messages[0];

  if (message) {
    await narrativeRepo.updatePlayerNarrativeState(db, tenantId, userId, {
      welcomeMessageShown: true,
    });
  }

  const updatedState = await narrativeRepo.findPlayerNarrativeState(db, tenantId, userId);

  return { message: message ?? null, playerState: updatedState ?? playerState };
};

export const recordMilestone = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  milestone: string,
): Promise<PlayerNarrativeState | undefined> => {
  const db = getDatabaseClient(config);
  return narrativeRepo.addMilestone(db, tenantId, userId, milestone);
};

export const checkFactionReputationEvents = async (
  config: AppConfig,
  tenantId: string,
  userId: string,
  currentDay: number,
): Promise<NarrativeEvent[]> => {
  const db = getDatabaseClient(config);

  const relations = await narrativeRepo.findFactionRelations(db, tenantId, userId);
  const factions = await narrativeRepo.findFactions(db, tenantId, { isActive: true });

  const triggeredEvents: NarrativeEvent[] = [];

  for (const relation of relations) {
    const faction = factions.find((f) => f.id === relation.factionId);
    if (!faction) continue;

    const existingEvents = await narrativeRepo.findNarrativeEvents(db, tenantId, userId, {
      factionKey: faction.factionKey,
      triggerType: 'faction_reputation',
    });

    const hasRecentEvent = existingEvents.some((e) => Math.abs(e.dayTriggered - currentDay) < 3);

    if (hasRecentEvent) continue;

    if (relation.reputation >= 80 && relation.reputation < 100) {
      const event = await narrativeRepo.createNarrativeEvent(db, {
        tenantId,
        userId,
        eventKey: `${faction.factionKey}_allied`,
        factionKey: faction.factionKey,
        title: `${faction.displayName} Offers Alliance`,
        description: `${faction.displayName} has recognized your favorable standing. They may offer preferential rates or assistance in the future.`,
        triggerType: 'faction_reputation',
        triggerThreshold: 80,
        dayTriggered: currentDay,
        isRead: false,
        metadata: {},
      });
      triggeredEvents.push(event);
    } else if (relation.reputation <= 20 && relation.reputation > 0) {
      const event = await narrativeRepo.createNarrativeEvent(db, {
        tenantId,
        userId,
        eventKey: `${faction.factionKey}_hostile`,
        factionKey: faction.factionKey,
        title: `${faction.displayName} Warns You`,
        description: `${faction.displayName} has grown hostile due to your recent decisions. Expect increased scrutiny and potential interference.`,
        triggerType: 'faction_reputation',
        triggerThreshold: 20,
        dayTriggered: currentDay,
        isRead: false,
        metadata: {},
      });
      triggeredEvents.push(event);
    } else if (relation.reputation === 0) {
      const event = await narrativeRepo.createNarrativeEvent(db, {
        tenantId,
        userId,
        eventKey: `${faction.factionKey}_burned`,
        factionKey: faction.factionKey,
        title: `${faction.displayName} Has Blacklisted You`,
        description: `${faction.displayName} has completely severed ties. They will not engage with you and may actively work against your interests.`,
        triggerType: 'faction_reputation',
        triggerThreshold: 0,
        dayTriggered: currentDay,
        isRead: false,
        metadata: {},
      });
      triggeredEvents.push(event);
    }
  }

  return triggeredEvents;
};
