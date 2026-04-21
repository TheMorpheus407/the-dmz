import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import type { CategorizedApiError } from '$lib/api/types';
import type { GameSessionRepositoryInterface } from '$lib/game/repositories/game-session.repository';

import {
  createGameStore,
  currentPhase,
  currentDay,
  selectedEmail,
  pendingDecisions,
  completedDecisions,
  playerResources,
  facilityState,
  threatLevel,
  isLoading,
  hasError,
  actionQueueLength,
  eventCount,
} from './game-store';

const mockBootstrapSession: GameSessionBootstrap = {
  schemaVersion: 1,
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  sessionId: '660e8400-e29b-41d4-a716-446655440001',
  userId: '770e8400-e29b-41d4-a716-446655440002',
  day: 1,
  funds: 1000,
  clientCount: 5,
  threatLevel: 'low',
  facilityLoadout: {
    defenseLevel: 1,
    serverLevel: 1,
    networkLevel: 1,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createMockRepository(overrides?: Partial<GameSessionRepositoryInterface>) {
  return {
    bootstrap: vi.fn().mockResolvedValue({ data: mockBootstrapSession }),
    fetchState: vi.fn().mockResolvedValue({ data: mockBootstrapSession }),
    ...overrides,
  } as GameSessionRepositoryInterface;
}

describe('gameStore', () => {
  let mockRepository: GameSessionRepositoryInterface;
  let gameStore: ReturnType<typeof createGameStore>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    gameStore = createGameStore(mockRepository);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const state = get(gameStore);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBe(null);
      expect(state.session).toBe(null);
      expect(state.inbox.emails).toEqual([]);
      expect(state.decisions.pending).toEqual([]);
      expect(state.decisions.completed).toEqual([]);
      expect(state.actionQueue).toEqual([]);
      expect(state.eventHistory).toEqual([]);
    });
  });

  describe('bootstrap', () => {
    it('should load session from server on bootstrap', async () => {
      const result = await gameStore.bootstrap();

      expect(result.error).toBeUndefined();
      expect(mockRepository.bootstrap).toHaveBeenCalled();

      const state = get(gameStore);
      expect(state.isInitialized).toBe(true);
      expect(state.session?.id).toBe(mockBootstrapSession.sessionId);
      expect(state.session?.day).toBe(1);
    });

    it('should handle bootstrap errors', async () => {
      const errorResponse: CategorizedApiError = {
        category: 'server',
        code: 'UNKNOWN_ERROR',
        message: 'Failed',
        status: 500,
        retryable: false,
      };
      mockRepository.bootstrap = vi.fn().mockResolvedValue({ error: errorResponse });

      const result = await gameStore.bootstrap();

      expect(result.error).toBeDefined();
      const state = get(gameStore);
      expect(state.error).toBeDefined();
      expect(state.isInitialized).toBe(false);
    });

    it('should set isLoading during bootstrap', async () => {
      let loadingDuringCall = false;
      mockRepository.bootstrap = vi.fn().mockImplementation(async () => {
        loadingDuringCall = get(gameStore).isLoading;
        return { data: mockBootstrapSession };
      });

      await gameStore.bootstrap();
      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('phase management', () => {
    it('should update phase', async () => {
      await gameStore.bootstrap();

      gameStore.setPhase('EMAIL_TRIAGE');

      const state = get(gameStore);
      expect(state.session?.phase).toBe('EMAIL_TRIAGE');
      expect(get(currentPhase)).toBe('EMAIL_TRIAGE');
    });
  });

  describe('email management', () => {
    it('should select an email', async () => {
      const email = {
        id: 'email-1',
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test',
        body: 'Test body',
        timestamp: new Date().toISOString(),
        isRead: false,
        isFlagged: false,
        urgency: 'low' as const,
        faction: 'test',
        riskIndicators: [],
      };

      gameStore.setEmails([email]);
      gameStore.selectEmail('email-1');

      const state = get(gameStore);
      expect(state.inbox.selectedEmailId).toBe('email-1');
      expect(get(selectedEmail)).toEqual(email);
    });

    it('should mark email as read', async () => {
      const email = {
        id: 'email-1',
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test',
        body: 'Test body',
        timestamp: new Date().toISOString(),
        isRead: false,
        isFlagged: false,
        urgency: 'low' as const,
        faction: 'test',
        riskIndicators: [],
      };

      gameStore.setEmails([email]);
      gameStore.markEmailAsRead('email-1');

      const state = get(gameStore);
      expect(state.inbox.emails[0]?.isRead).toBe(true);
    });

    it('should flag and unflag email', async () => {
      const email = {
        id: 'email-1',
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test',
        body: 'Test body',
        timestamp: new Date().toISOString(),
        isRead: false,
        isFlagged: false,
        urgency: 'low' as const,
        faction: 'test',
        riskIndicators: [],
      };

      gameStore.setEmails([email]);
      gameStore.flagEmail('email-1', true);

      let state = get(gameStore);
      expect(state.inbox.emails[0]?.isFlagged).toBe(true);

      gameStore.flagEmail('email-1', false);
      state = get(gameStore);
      expect(state.inbox.emails[0]?.isFlagged).toBe(false);
    });
  });

  describe('decision management', () => {
    it('should add a decision', () => {
      const decision = {
        id: 'decision-1',
        emailId: 'email-1',
        type: 'approve' as const,
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      gameStore.addDecision(decision);

      const state = get(gameStore);
      expect(state.decisions.pending).toHaveLength(1);
      expect(get(pendingDecisions)).toHaveLength(1);
    });

    it('should resolve a decision', () => {
      const decision = {
        id: 'decision-1',
        emailId: 'email-1',
        type: 'approve' as const,
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      gameStore.addDecision(decision);
      gameStore.resolveDecision('decision-1', 'deny');

      const state = get(gameStore);
      expect(state.decisions.pending).toHaveLength(0);
      expect(state.decisions.completed).toHaveLength(1);
      expect(state.decisions.completed[0]?.type).toBe('deny');
      expect(get(completedDecisions)).toHaveLength(1);
    });
  });

  describe('player resources', () => {
    it('should update player resources', async () => {
      await gameStore.bootstrap();

      gameStore.updatePlayer({ trust: 150, funds: 2000 });

      const state = get(gameStore);
      expect(state.player.trust).toBe(150);
      expect(state.player.funds).toBe(2000);
      expect(get(playerResources)).toEqual({ trust: 150, funds: 2000, intelFragments: 0 });
    });

    it('should update partial player resources', () => {
      gameStore.updatePlayer({ trust: 150 });

      const state = get(gameStore);
      expect(state.player.trust).toBe(150);
      expect(state.player.funds).toBe(1000);
    });
  });

  describe('facility management', () => {
    it('should update facility', async () => {
      await gameStore.bootstrap();

      gameStore.updateFacility({ rackSpace: 20, power: 150 });

      const state = get(gameStore);
      expect(state.facility.rackSpace).toBe(20);
      expect(state.facility.power).toBe(150);
      expect(get(facilityState).rackSpace).toBe(20);
    });
  });

  describe('threat management', () => {
    it('should update threat level', async () => {
      await gameStore.bootstrap();

      gameStore.updateThreat({ level: 'high', activeIncidents: 2 });

      const state = get(gameStore);
      expect(state.threat.level).toBe('high');
      expect(state.threat.activeIncidents).toBe(2);
      expect(get(threatLevel)).toBe('high');
    });
  });

  describe('day advancement', () => {
    it('should advance day and reset decisions', async () => {
      await gameStore.bootstrap();

      gameStore.addDecision({
        id: 'decision-1',
        emailId: 'email-1',
        type: 'approve',
        createdAt: new Date().toISOString(),
        resolved: false,
      });

      gameStore.advanceDay();

      const state = get(gameStore);
      expect(state.session?.day).toBe(2);
      expect(state.session?.phase).toBe('DAY_START');
      expect(get(currentDay)).toBe(2);
      expect(state.decisions.pending).toEqual([]);
      expect(state.decisions.completed).toEqual([]);
    });
  });

  describe('action queue', () => {
    it('should enqueue actions', () => {
      const action = {
        id: 'action-1',
        type: 'email_decision',
        payload: { emailId: 'email-1', decision: 'approve' },
        createdAt: new Date().toISOString(),
      };

      gameStore.enqueue(action);

      const state = get(gameStore);
      expect(state.actionQueue).toHaveLength(1);
      expect(state.actionQueue[0]?.id).toBe('action-1');
      expect(state.actionQueue[0]?.queuedAt).toBeDefined();
      expect(get(actionQueueLength)).toBe(1);
    });

    it('should dequeue actions', () => {
      const action = {
        id: 'action-1',
        type: 'email_decision',
        payload: { emailId: 'email-1', decision: 'approve' },
        createdAt: new Date().toISOString(),
      };

      gameStore.enqueue(action);
      gameStore.dequeue('action-1');

      const state = get(gameStore);
      expect(state.actionQueue).toHaveLength(0);
    });

    it('should clear action queue', () => {
      gameStore.enqueue({
        id: 'action-1',
        type: 'email_decision',
        payload: {},
        createdAt: new Date().toISOString(),
      });
      gameStore.enqueue({
        id: 'action-2',
        type: 'email_decision',
        payload: {},
        createdAt: new Date().toISOString(),
      });

      gameStore.clearActionQueue();

      const state = get(gameStore);
      expect(state.actionQueue).toHaveLength(0);
    });
  });

  describe('event history', () => {
    it('should add events', () => {
      const event = {
        id: 'event-1',
        type: 'decision_made' as const,
        occurredAt: new Date().toISOString(),
        payload: { emailId: 'email-1' },
      };

      gameStore.addEvent(event);

      const state = get(gameStore);
      expect(state.eventHistory).toHaveLength(1);
      expect(get(eventCount)).toBe(1);
    });
  });

  describe('derived stores', () => {
    it('should track loading state', () => {
      expect(get(isLoading)).toBe(false);
    });

    it('should track errors', () => {
      expect(get(hasError)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      await gameStore.bootstrap();

      gameStore.updatePlayer({ trust: 200 });
      gameStore.enqueue({
        id: 'action-1',
        type: 'test',
        payload: {},
        createdAt: new Date().toISOString(),
      });

      gameStore.reset();

      const state = get(gameStore);
      expect(state.isInitialized).toBe(false);
      expect(state.player.trust).toBe(100);
      expect(state.actionQueue).toEqual([]);
    });
  });

  describe('optimistic updates', () => {
    it('should apply optimistic updates', () => {
      gameStore.optimisticUpdate((state) => ({
        ...state,
        player: { ...state.player, trust: 250 },
      }));

      const state = get(gameStore);
      expect(state.player.trust).toBe(250);
    });
  });
});
