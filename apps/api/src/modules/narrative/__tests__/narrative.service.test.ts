import { randomUUID } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../narrative.repo.js', () => ({
  findFactions: vi.fn(),
  findFactionByKey: vi.fn(),
  findFactionRelations: vi.fn(),
  updateFactionReputation: vi.fn(),
  initializeFactionRelations: vi.fn(),
  initializePlayerNarrativeState: vi.fn(),
  findNarrativeEvents: vi.fn(),
  createNarrativeEvent: vi.fn(),
  markNarrativeEventRead: vi.fn(),
  findMorpheusMessages: vi.fn(),
  findMorpheusMessagesForContext: vi.fn(),
  findPlayerNarrativeState: vi.fn(),
  updatePlayerNarrativeState: vi.fn(),
  addMilestone: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import * as narrativeRepo from '../narrative.repo.js';
import * as narrativeService from '../narrative.service.js';

import type { AppConfig } from '../../../config.js';

describe('NarrativeService', () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDatabaseClient>>;
  const mockConfig = { DATABASE_URL: 'postgresql://test' } as unknown as AppConfig;
  const tenantId = randomUUID();
  const userId = randomUUID();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
  });

  describe('listFactions', () => {
    it('should return all factions when no filters provided', async () => {
      const mockFactions = [
        { id: randomUUID(), factionKey: 'sovereign_compact', displayName: 'The Sovereign Compact' },
        { id: randomUUID(), factionKey: 'nexion_industries', displayName: 'Nexion Industries' },
      ];
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);

      const result = await narrativeService.listFactions(mockConfig, tenantId);

      expect(narrativeRepo.findFactions).toHaveBeenCalledWith(mockDb, tenantId, undefined);
      expect(result).toEqual(mockFactions);
    });

    it('should apply factionKey filter when provided', async () => {
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue([] as never as never);

      await narrativeService.listFactions(mockConfig, tenantId, {
        factionKey: 'sovereign_compact',
      });

      expect(narrativeRepo.findFactions).toHaveBeenCalledWith(mockDb, tenantId, {
        factionKey: 'sovereign_compact',
      });
    });

    it('should apply isActive filter when provided', async () => {
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue([] as never as never);

      await narrativeService.listFactions(mockConfig, tenantId, { isActive: true });

      expect(narrativeRepo.findFactions).toHaveBeenCalledWith(mockDb, tenantId, { isActive: true });
    });
  });

  describe('getFaction', () => {
    it('should return faction by key', async () => {
      const mockFaction = {
        id: randomUUID(),
        factionKey: 'nexion_industries',
        displayName: 'Nexion Industries',
      };
      vi.mocked(narrativeRepo.findFactionByKey).mockResolvedValue(mockFaction as never as never);

      const result = await narrativeService.getFaction(mockConfig, tenantId, 'nexion_industries');

      expect(narrativeRepo.findFactionByKey).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        'nexion_industries',
      );
      expect(result).toEqual(mockFaction);
    });

    it('should return undefined when faction not found', async () => {
      vi.mocked(narrativeRepo.findFactionByKey).mockResolvedValue(undefined as never);

      const result = await narrativeService.getFaction(mockConfig, tenantId, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getFactionRelations', () => {
    it('should return faction relations for user', async () => {
      const mockRelations = [
        {
          id: randomUUID(),
          factionId: randomUUID(),
          reputation: 50,
          lastInteractionDay: 0,
          interactionCount: 0,
        },
      ];
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);

      const result = await narrativeService.getFactionRelations(mockConfig, tenantId, userId);

      expect(narrativeRepo.findFactionRelations).toHaveBeenCalledWith(mockDb, tenantId, userId);
      expect(result).toEqual(mockRelations);
    });
  });

  describe('updateFactionRelation', () => {
    it('should update faction reputation', async () => {
      const factionId = randomUUID();
      const mockRelation = {
        id: randomUUID(),
        factionId,
        reputation: 60,
        lastInteractionDay: 5,
        interactionCount: 1,
      };
      vi.mocked(narrativeRepo.updateFactionReputation).mockResolvedValue(mockRelation as never);

      const result = await narrativeService.updateFactionRelation(
        mockConfig,
        tenantId,
        userId,
        factionId,
        10,
        5,
      );

      expect(narrativeRepo.updateFactionReputation).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        userId,
        factionId,
        10,
        5,
      );
      expect(result).toEqual(mockRelation);
    });

    it('should return undefined when relation not found', async () => {
      vi.mocked(narrativeRepo.updateFactionReputation).mockResolvedValue(undefined as never);

      const result = await narrativeService.updateFactionRelation(
        mockConfig,
        tenantId,
        userId,
        randomUUID(),
        10,
        5,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('initializePlayerNarrative', () => {
    it('should initialize faction relations and player state', async () => {
      const mockRelations = [{ id: randomUUID(), factionId: randomUUID(), reputation: 50 }];
      const mockState = { id: randomUUID(), currentSeason: 1, welcomeMessageShown: false };
      vi.mocked(narrativeRepo.initializeFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.initializePlayerNarrativeState).mockResolvedValue(mockState as never);

      const result = await narrativeService.initializePlayerNarrative(mockConfig, tenantId, userId);

      expect(narrativeRepo.initializeFactionRelations).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        userId,
      );
      expect(narrativeRepo.initializePlayerNarrativeState).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        userId,
      );
      expect(result.factionRelations).toEqual(mockRelations);
      expect(result.playerState).toEqual(mockState);
    });
  });

  describe('getNarrativeEvents', () => {
    it('should return narrative events with filters', async () => {
      const mockEvents = [
        { id: randomUUID(), eventKey: 'test_event', title: 'Test Event', isRead: false },
      ];
      vi.mocked(narrativeRepo.findNarrativeEvents).mockResolvedValue(mockEvents as never);

      const result = await narrativeService.getNarrativeEvents(mockConfig, tenantId, userId, {
        eventKey: 'test_event',
      });

      expect(narrativeRepo.findNarrativeEvents).toHaveBeenCalledWith(mockDb, tenantId, userId, {
        eventKey: 'test_event',
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('triggerNarrativeEvent', () => {
    it('should create a narrative event', async () => {
      const mockEvent = {
        id: randomUUID(),
        eventKey: 'new_event',
        title: 'New Event',
        description: 'Event description',
        triggerType: 'manual',
        dayTriggered: 5,
        isRead: false,
      };
      vi.mocked(narrativeRepo.createNarrativeEvent).mockResolvedValue(mockEvent as never);

      const result = await narrativeService.triggerNarrativeEvent(mockConfig, tenantId, userId, {
        eventKey: 'new_event',
        title: 'New Event',
        description: 'Event description',
        triggerType: 'manual',
        dayTriggered: 5,
      });

      expect(narrativeRepo.createNarrativeEvent).toHaveBeenCalledWith(mockDb, {
        tenantId,
        userId,
        eventKey: 'new_event',
        factionKey: null,
        title: 'New Event',
        description: 'Event description',
        triggerType: 'manual',
        triggerThreshold: null,
        dayTriggered: 5,
        isRead: false,
        metadata: {},
      });
      expect(result).toEqual(mockEvent);
    });

    it('should include optional fields when provided', async () => {
      const mockEvent = {
        id: randomUUID(),
        eventKey: 'faction_event',
        factionKey: 'sovereign_compact',
      };
      vi.mocked(narrativeRepo.createNarrativeEvent).mockResolvedValue(mockEvent as never);

      await narrativeService.triggerNarrativeEvent(mockConfig, tenantId, userId, {
        eventKey: 'faction_event',
        factionKey: 'sovereign_compact',
        title: 'Faction Event',
        description: 'Description',
        triggerType: 'faction_reputation',
        triggerThreshold: 80,
        dayTriggered: 10,
        metadata: { extra: 'data' },
      });

      expect(narrativeRepo.createNarrativeEvent).toHaveBeenCalledWith(mockDb, {
        tenantId,
        userId,
        eventKey: 'faction_event',
        factionKey: 'sovereign_compact',
        title: 'Faction Event',
        description: 'Description',
        triggerType: 'faction_reputation',
        triggerThreshold: 80,
        dayTriggered: 10,
        isRead: false,
        metadata: { extra: 'data' },
      });
    });
  });

  describe('markEventRead', () => {
    it('should mark event as read', async () => {
      const eventId = randomUUID();
      const mockEvent = { id: eventId, isRead: true };
      vi.mocked(narrativeRepo.markNarrativeEventRead).mockResolvedValue(mockEvent as never);

      const result = await narrativeService.markEventRead(mockConfig, tenantId, userId, eventId);

      expect(narrativeRepo.markNarrativeEventRead).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        userId,
        eventId,
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getCoachingMessages', () => {
    it('should return coaching messages for context', async () => {
      const mockMessages = [
        { id: randomUUID(), messageKey: 'welcome', title: 'Welcome', triggerType: 'first_login' },
      ];
      vi.mocked(narrativeRepo.findMorpheusMessagesForContext).mockResolvedValue(
        mockMessages as never,
      );

      const result = await narrativeService.getCoachingMessages(mockConfig, tenantId, {
        triggerType: 'first_login',
        day: 1,
      });

      expect(narrativeRepo.findMorpheusMessagesForContext).toHaveBeenCalledWith(mockDb, tenantId, {
        triggerType: 'first_login',
        day: 1,
      });
      expect(result).toEqual(mockMessages);
    });
  });

  describe('getPlayerNarrativeState', () => {
    it('should return player narrative state', async () => {
      const mockState = { id: randomUUID(), currentSeason: 1, welcomeMessageShown: false };
      vi.mocked(narrativeRepo.findPlayerNarrativeState).mockResolvedValue(mockState as never);

      const result = await narrativeService.getPlayerNarrativeState(mockConfig, tenantId, userId);

      expect(narrativeRepo.findPlayerNarrativeState).toHaveBeenCalledWith(mockDb, tenantId, userId);
      expect(result).toEqual(mockState);
    });

    it('should return undefined when state not found', async () => {
      vi.mocked(narrativeRepo.findPlayerNarrativeState).mockResolvedValue(undefined as never);

      const result = await narrativeService.getPlayerNarrativeState(mockConfig, tenantId, userId);

      expect(result).toBeUndefined();
    });
  });

  describe('showWelcomeMessage', () => {
    it('should return welcome message when not shown', async () => {
      const mockState = { id: randomUUID(), welcomeMessageShown: false };
      const mockUpdatedState = { ...mockState, welcomeMessageShown: true };
      const mockMessage = { id: randomUUID(), messageKey: 'welcome_message', title: 'Welcome!' };
      vi.mocked(narrativeRepo.findPlayerNarrativeState)
        .mockResolvedValueOnce(mockState as never)
        .mockResolvedValueOnce(mockUpdatedState as never);
      vi.mocked(narrativeRepo.findMorpheusMessages).mockResolvedValue([mockMessage] as never);
      vi.mocked(narrativeRepo.updatePlayerNarrativeState).mockResolvedValue(
        mockUpdatedState as never,
      );

      const result = await narrativeService.showWelcomeMessage(mockConfig, tenantId, userId);

      expect(result.message).toEqual(mockMessage);
      expect(result.playerState.welcomeMessageShown).toBe(true);
    });

    it('should return null message when already shown', async () => {
      const mockState = { id: randomUUID(), welcomeMessageShown: true };
      vi.mocked(narrativeRepo.findPlayerNarrativeState).mockResolvedValue(mockState as never);

      const result = await narrativeService.showWelcomeMessage(mockConfig, tenantId, userId);

      expect(result.message).toBeNull();
      expect(result.playerState.welcomeMessageShown).toBe(true);
      expect(narrativeRepo.findMorpheusMessages).not.toHaveBeenCalled();
    });
  });

  describe('recordMilestone', () => {
    it('should add milestone to player state', async () => {
      const mockState = { id: randomUUID(), milestonesReached: ['first_mission'] };
      vi.mocked(narrativeRepo.addMilestone).mockResolvedValue(mockState as never);

      const result = await narrativeService.recordMilestone(
        mockConfig,
        tenantId,
        userId,
        'first_mission',
      );

      expect(narrativeRepo.addMilestone).toHaveBeenCalledWith(
        mockDb,
        tenantId,
        userId,
        'first_mission',
      );
      expect(result).toEqual(mockState);
    });
  });

  describe('checkFactionReputationEvents', () => {
    it('should trigger alliance event at reputation 80-99', async () => {
      const factionId = randomUUID();
      const mockFactions = [
        {
          id: factionId,
          factionKey: 'sovereign_compact',
          displayName: 'The Sovereign Compact',
          initialReputation: 50,
        },
      ];
      const mockRelations = [
        { id: randomUUID(), factionId, reputation: 85, lastInteractionDay: 0 },
      ];
      const mockEvent = { id: randomUUID(), eventKey: 'sovereign_compact_allied' };
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);
      vi.mocked(narrativeRepo.findNarrativeEvents).mockResolvedValue([] as never);
      vi.mocked(narrativeRepo.createNarrativeEvent).mockResolvedValue(mockEvent as never);

      const result = await narrativeService.checkFactionReputationEvents(
        mockConfig,
        tenantId,
        userId,
        10,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.eventKey).toBe('sovereign_compact_allied');
    });

    it('should trigger hostile event at reputation 1-20', async () => {
      const factionId = randomUUID();
      const mockFactions = [
        {
          id: factionId,
          factionKey: 'nexion_industries',
          displayName: 'Nexion Industries',
          initialReputation: 50,
        },
      ];
      const mockRelations = [
        { id: randomUUID(), factionId, reputation: 15, lastInteractionDay: 0 },
      ];
      const mockEvent = { id: randomUUID(), eventKey: 'nexion_industries_hostile' };
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);
      vi.mocked(narrativeRepo.findNarrativeEvents).mockResolvedValue([] as never);
      vi.mocked(narrativeRepo.createNarrativeEvent).mockResolvedValue(mockEvent as never);

      const result = await narrativeService.checkFactionReputationEvents(
        mockConfig,
        tenantId,
        userId,
        10,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.eventKey).toBe('nexion_industries_hostile');
    });

    it('should trigger blacklist event at reputation 0', async () => {
      const factionId = randomUUID();
      const mockFactions = [
        {
          id: factionId,
          factionKey: 'librarians',
          displayName: 'The Librarians',
          initialReputation: 50,
        },
      ];
      const mockRelations = [{ id: randomUUID(), factionId, reputation: 0, lastInteractionDay: 0 }];
      const mockEvent = { id: randomUUID(), eventKey: 'librarians_burned' };
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);
      vi.mocked(narrativeRepo.findNarrativeEvents).mockResolvedValue([] as never);
      vi.mocked(narrativeRepo.createNarrativeEvent).mockResolvedValue(mockEvent as never);

      const result = await narrativeService.checkFactionReputationEvents(
        mockConfig,
        tenantId,
        userId,
        10,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.eventKey).toBe('librarians_burned');
    });

    it('should not trigger event if recent event exists', async () => {
      const factionId = randomUUID();
      const mockFactions = [
        {
          id: factionId,
          factionKey: 'sovereign_compact',
          displayName: 'The Sovereign Compact',
          initialReputation: 50,
        },
      ];
      const mockRelations = [
        { id: randomUUID(), factionId, reputation: 85, lastInteractionDay: 0 },
      ];
      const mockExistingEvents = [{ id: randomUUID(), dayTriggered: 9 }];
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);
      vi.mocked(narrativeRepo.findNarrativeEvents).mockResolvedValue(mockExistingEvents as never);

      const result = await narrativeService.checkFactionReputationEvents(
        mockConfig,
        tenantId,
        userId,
        10,
      );

      expect(result).toHaveLength(0);
      expect(narrativeRepo.createNarrativeEvent).not.toHaveBeenCalled();
    });

    it('should not trigger event for mid-range reputation', async () => {
      const factionId = randomUUID();
      const mockFactions = [
        {
          id: factionId,
          factionKey: 'hacktivists',
          displayName: 'Hacktivist Collectives',
          initialReputation: 50,
        },
      ];
      const mockRelations = [
        { id: randomUUID(), factionId, reputation: 50, lastInteractionDay: 0 },
      ];
      vi.mocked(narrativeRepo.findFactionRelations).mockResolvedValue(mockRelations as never);
      vi.mocked(narrativeRepo.findFactions).mockResolvedValue(mockFactions as never as never);

      const result = await narrativeService.checkFactionReputationEvents(
        mockConfig,
        tenantId,
        userId,
        10,
      );

      expect(result).toHaveLength(0);
      expect(narrativeRepo.createNarrativeEvent).not.toHaveBeenCalled();
    });
  });
});
