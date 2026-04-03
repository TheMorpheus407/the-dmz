import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/game/services/action-queue', () => ({
  enqueueAction: vi.fn((queue, action) => [
    ...queue,
    { ...action, queuedAt: new Date().toISOString() },
  ]),
}));

vi.mock('$lib/game/services/sync', () => ({
  reconcileState: vi.fn((events) => ({ events, state: {} })),
}));

import type { GameAction } from '$lib/game/services/action-queue';
import type { GameState } from '$lib/game/state/reducer';
import type { GameEvent } from '$lib/game/state/events';

import {
  gameActivityStore,
  selectedEmail,
  pendingDecisions,
  completedDecisions,
  actionQueueLength,
  eventCount,
} from './game-activity-store';

describe('gameActivityStore', () => {
  beforeEach(() => {
    gameActivityStore.reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(gameActivityStore);
      expect(state.inbox.emails).toEqual([]);
      expect(state.inbox.selectedEmailId).toBeNull();
      expect(state.decisions.pending).toEqual([]);
      expect(state.decisions.completed).toEqual([]);
      expect(state.actionQueue).toEqual([]);
      expect(state.eventHistory).toEqual([]);
    });

    it('selectedEmail derived returns null when no selection', () => {
      expect(get(selectedEmail)).toBeNull();
    });

    it('pendingDecisions derived returns empty array', () => {
      expect(get(pendingDecisions)).toEqual([]);
    });

    it('completedDecisions derived returns empty array', () => {
      expect(get(completedDecisions)).toEqual([]);
    });

    it('actionQueueLength derived returns 0', () => {
      expect(get(actionQueueLength)).toBe(0);
    });

    it('eventCount derived returns 0', () => {
      expect(get(eventCount)).toBe(0);
    });
  });

  describe('email management', () => {
    const mockEmail = {
      id: 'email-1',
      sender: 'test@example.com',
      senderDomain: 'example.com',
      subject: 'Test Subject',
      body: 'Test body',
      timestamp: '2026-01-01T00:00:00.000Z',
      isRead: false,
      isFlagged: false,
      urgency: 'low' as const,
      faction: 'test',
      riskIndicators: [],
    };

    describe('selectEmail', () => {
      it('selects an email', () => {
        gameActivityStore.setEmails([mockEmail]);
        gameActivityStore.selectEmail('email-1');

        const state = get(gameActivityStore);
        expect(state.inbox.selectedEmailId).toBe('email-1');
        expect(get(selectedEmail)).toEqual(mockEmail);
      });

      it('deselects when null', () => {
        gameActivityStore.setEmails([mockEmail]);
        gameActivityStore.selectEmail('email-1');
        gameActivityStore.selectEmail(null);

        const state = get(gameActivityStore);
        expect(state.inbox.selectedEmailId).toBeNull();
        expect(get(selectedEmail)).toBeNull();
      });
    });

    describe('markEmailAsRead', () => {
      it('marks email as read', () => {
        gameActivityStore.setEmails([mockEmail]);
        gameActivityStore.markEmailAsRead('email-1');

        const state = get(gameActivityStore);
        const email = state.inbox.emails.find((e) => e.id === 'email-1');
        expect(email?.isRead).toBe(true);
      });

      it('does not affect other emails', () => {
        const email2 = { ...mockEmail, id: 'email-2' };
        gameActivityStore.setEmails([mockEmail, email2]);
        gameActivityStore.markEmailAsRead('email-1');

        const state = get(gameActivityStore);
        expect(state.inbox.emails.find((e) => e.id === 'email-2')?.isRead).toBe(false);
      });
    });

    describe('flagEmail', () => {
      it('flags an email', () => {
        gameActivityStore.setEmails([mockEmail]);
        gameActivityStore.flagEmail('email-1', true);

        const state = get(gameActivityStore);
        const email = state.inbox.emails.find((e) => e.id === 'email-1');
        expect(email?.isFlagged).toBe(true);
      });

      it('unflags an email', () => {
        const flaggedEmail = { ...mockEmail, isFlagged: true };
        gameActivityStore.setEmails([flaggedEmail]);
        gameActivityStore.flagEmail('email-1', false);

        const state = get(gameActivityStore);
        const email = state.inbox.emails.find((e) => e.id === 'email-1');
        expect(email?.isFlagged).toBe(false);
      });
    });

    describe('setEmails', () => {
      it('replaces all emails', () => {
        const emails = [mockEmail, { ...mockEmail, id: 'email-2' }];
        gameActivityStore.setEmails(emails);

        const state = get(gameActivityStore);
        expect(state.inbox.emails).toHaveLength(2);
      });

      it('clears emails with empty array', () => {
        gameActivityStore.setEmails([mockEmail]);
        gameActivityStore.setEmails([]);

        const state = get(gameActivityStore);
        expect(state.inbox.emails).toEqual([]);
      });
    });
  });

  describe('decision management', () => {
    const mockDecision = {
      id: 'decision-1',
      emailId: 'email-1',
      type: 'approve' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      resolved: false,
    };

    describe('addDecision', () => {
      it('adds a decision to pending', () => {
        gameActivityStore.addDecision(mockDecision);

        const state = get(gameActivityStore);
        expect(state.decisions.pending).toHaveLength(1);
        expect(state.decisions.pending[0]).toEqual(mockDecision);
        expect(get(pendingDecisions)).toHaveLength(1);
      });
    });

    describe('resolveDecision', () => {
      it('moves pending to completed', () => {
        gameActivityStore.addDecision(mockDecision);
        gameActivityStore.resolveDecision('decision-1', 'approve');

        const state = get(gameActivityStore);
        expect(state.decisions.pending).toHaveLength(0);
        expect(state.decisions.completed).toHaveLength(1);
        const completed = state.decisions.completed[0];
        expect(completed?.resolved).toBe(true);
        expect(completed?.type).toBe('approve');
      });

      it('handles decision not found', () => {
        gameActivityStore.addDecision(mockDecision);
        gameActivityStore.resolveDecision('nonexistent', 'deny');

        const state = get(gameActivityStore);
        expect(state.decisions.pending).toHaveLength(1);
      });

      it('updates pendingDecisions derived', () => {
        gameActivityStore.addDecision(mockDecision);
        expect(get(pendingDecisions)).toHaveLength(1);

        gameActivityStore.resolveDecision('decision-1', 'deny');
        expect(get(pendingDecisions)).toHaveLength(0);
        expect(get(completedDecisions)).toHaveLength(1);
      });
    });

    describe('clearDecisions', () => {
      it('clears pending and completed', () => {
        gameActivityStore.addDecision(mockDecision);
        gameActivityStore.resolveDecision('decision-1', 'approve');
        gameActivityStore.clearDecisions();

        const state = get(gameActivityStore);
        expect(state.decisions.pending).toEqual([]);
        expect(state.decisions.completed).toEqual([]);
      });
    });
  });

  describe('action queue', () => {
    const mockAction: GameAction = {
      id: 'action-1',
      type: 'upgrade',
      payload: { targetId: 'server-1' },
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    describe('enqueue', () => {
      it('adds action to queue', () => {
        gameActivityStore.enqueue(mockAction);

        const state = get(gameActivityStore);
        expect(state.actionQueue).toHaveLength(1);
        expect(get(actionQueueLength)).toBe(1);
      });
    });

    describe('dequeue', () => {
      it('removes action by id', () => {
        gameActivityStore.enqueue(mockAction);
        gameActivityStore.dequeue('action-1');

        const state = get(gameActivityStore);
        expect(state.actionQueue).toHaveLength(0);
      });
    });

    describe('clearActionQueue', () => {
      it('clears all actions', () => {
        gameActivityStore.enqueue(mockAction);
        gameActivityStore.enqueue({
          id: 'action-2',
          type: 'upgrade',
          payload: { targetId: 'server-2' },
          createdAt: '2026-01-01T00:00:00.000Z',
        });
        gameActivityStore.clearActionQueue();

        const state = get(gameActivityStore);
        expect(state.actionQueue).toEqual([]);
        expect(get(actionQueueLength)).toBe(0);
      });
    });
  });

  describe('event management', () => {
    const mockEvent: GameEvent = {
      id: 'event-1',
      type: 'session_started',
      occurredAt: '2026-01-01T00:00:00.000Z',
      payload: {},
    };

    describe('addEvent', () => {
      it('appends event to history', () => {
        gameActivityStore.addEvent(mockEvent);

        const state = get(gameActivityStore);
        expect(state.eventHistory).toHaveLength(1);
        expect(get(eventCount)).toBe(1);
      });
    });

    describe('reconcile', () => {
      it('updates event history from reconcileState', async () => {
        const syncModule = await import('$lib/game/services/sync');
        const reconcileStateSpy = vi.spyOn(syncModule, 'reconcileState').mockReturnValue({
          events: [mockEvent, { ...mockEvent, id: 'event-2' }],
          state: {} as GameState,
        });

        gameActivityStore.reconcile([mockEvent]);

        const state = get(gameActivityStore);
        expect(state.eventHistory).toHaveLength(2);
        expect(reconcileStateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      const mockEmail = {
        id: 'email-1',
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test',
        body: 'body',
        timestamp: '2026-01-01T00:00:00.000Z',
        isRead: true,
        isFlagged: true,
        urgency: 'high' as const,
        faction: 'test',
        riskIndicators: [],
      };

      gameActivityStore.setEmails([mockEmail]);
      gameActivityStore.selectEmail('email-1');
      gameActivityStore.addDecision({
        id: 'decision-1',
        emailId: 'email-1',
        type: 'approve' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        resolved: false,
      });
      gameActivityStore.enqueue({
        id: 'action-1',
        type: 'upgrade',
        payload: {},
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      gameActivityStore.addEvent({
        id: 'event-1',
        type: 'session_started',
        occurredAt: '2026-01-01T00:00:00.000Z',
        payload: {},
      });

      gameActivityStore.reset();

      const state = get(gameActivityStore);
      expect(state.inbox.emails).toEqual([]);
      expect(state.inbox.selectedEmailId).toBeNull();
      expect(state.decisions.pending).toEqual([]);
      expect(state.decisions.completed).toEqual([]);
      expect(state.actionQueue).toEqual([]);
      expect(state.eventHistory).toEqual([]);
    });
  });

  describe('get', () => {
    it('returns current state', () => {
      const mockEmail = {
        id: 'email-1',
        sender: 'test@example.com',
        senderDomain: 'example.com',
        subject: 'Test',
        body: 'body',
        timestamp: '2026-01-01T00:00:00.000Z',
        isRead: false,
        isFlagged: false,
        urgency: 'low' as const,
        faction: 'test',
        riskIndicators: [],
      };

      gameActivityStore.setEmails([mockEmail]);
      gameActivityStore.selectEmail('email-1');

      const result = gameActivityStore.get();
      expect(result.inbox.emails).toHaveLength(1);
      expect(result.inbox.selectedEmailId).toBe('email-1');
    });
  });

  describe('edge cases', () => {
    it('handles empty queues', () => {
      gameActivityStore.dequeue('nonexistent');
      gameActivityStore.resolveDecision('nonexistent', 'deny');

      const state = get(gameActivityStore);
      expect(state.actionQueue).toEqual([]);
      expect(state.decisions.pending).toEqual([]);
    });

    it('handles invalid email IDs', () => {
      gameActivityStore.markEmailAsRead('nonexistent');
      gameActivityStore.flagEmail('nonexistent', true);
      gameActivityStore.selectEmail('nonexistent');

      const state = get(gameActivityStore);
      expect(state.inbox.selectedEmailId).toBe('nonexistent');
    });
  });
});
