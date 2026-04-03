import { writable, derived, get } from 'svelte/store';

import type { QueuedAction, GameAction } from '$lib/game/services/action-queue';
import { enqueueAction } from '$lib/game/services/action-queue';
import type { GameEvent } from '$lib/game/state/events';
import { reconcileState } from '$lib/game/services/sync';

export interface Email {
  id: string;
  sender: string;
  senderDomain: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isFlagged: boolean;
  urgency: 'low' | 'medium' | 'high';
  faction: string;
  riskIndicators: string[];
}

export interface Decision {
  id: string;
  emailId: string;
  type: 'approve' | 'deny' | 'flag' | 'request_verification' | 'defer';
  createdAt: string;
  resolved: boolean;
}

export interface GameActivityState {
  inbox: {
    emails: Email[];
    selectedEmailId: string | null;
  };
  decisions: {
    pending: Decision[];
    completed: Decision[];
  };
  actionQueue: QueuedAction[];
  eventHistory: GameEvent[];
}

const initialState: GameActivityState = {
  inbox: {
    emails: [],
    selectedEmailId: null,
  },
  decisions: {
    pending: [],
    completed: [],
  },
  actionQueue: [],
  eventHistory: [],
};

function createGameActivityStore() {
  const { subscribe, set, update } = writable<GameActivityState>(initialState);

  return {
    subscribe,

    get(): GameActivityState {
      return get({ subscribe });
    },

    selectEmail(emailId: string | null): void {
      update((state) => ({
        ...state,
        inbox: { ...state.inbox, selectedEmailId: emailId },
      }));
    },

    markEmailAsRead(emailId: string): void {
      update((state) => ({
        ...state,
        inbox: {
          ...state.inbox,
          emails: state.inbox.emails.map((email) =>
            email.id === emailId ? { ...email, isRead: true } : email,
          ),
        },
      }));
    },

    flagEmail(emailId: string, flagged: boolean): void {
      update((state) => ({
        ...state,
        inbox: {
          ...state.inbox,
          emails: state.inbox.emails.map((email) =>
            email.id === emailId ? { ...email, isFlagged: flagged } : email,
          ),
        },
      }));
    },

    setEmails(emails: Email[]): void {
      update((state) => ({
        ...state,
        inbox: { ...state.inbox, emails },
      }));
    },

    addDecision(decision: Decision): void {
      update((state) => ({
        ...state,
        decisions: {
          ...state.decisions,
          pending: [...state.decisions.pending, decision],
        },
      }));
    },

    resolveDecision(decisionId: string, resolution: 'approve' | 'deny'): void {
      update((state) => {
        const pending = state.decisions.pending.find((d) => d.id === decisionId);
        if (!pending) return state;

        const resolved: Decision = {
          ...pending,
          type: resolution,
          resolved: true,
          createdAt: new Date().toISOString(),
        };

        return {
          ...state,
          decisions: {
            pending: state.decisions.pending.filter((d) => d.id !== decisionId),
            completed: [...state.decisions.completed, resolved],
          },
        };
      });
    },

    enqueue(action: GameAction): void {
      update((state) => ({
        ...state,
        actionQueue: enqueueAction(state.actionQueue, action),
      }));
    },

    dequeue(actionId: string): void {
      update((state) => ({
        ...state,
        actionQueue: state.actionQueue.filter((a) => a.id !== actionId),
      }));
    },

    clearActionQueue(): void {
      update((state) => ({
        ...state,
        actionQueue: [],
      }));
    },

    addEvent(event: GameEvent): void {
      update((state) => ({
        ...state,
        eventHistory: [...state.eventHistory, event],
      }));
    },

    reconcile(events: GameEvent[]): void {
      const syncResult = reconcileState(events);
      update((state) => ({
        ...state,
        eventHistory: syncResult.events,
      }));
    },

    clearDecisions(): void {
      update((state) => ({
        ...state,
        decisions: { pending: [], completed: [] },
      }));
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const gameActivityStore = createGameActivityStore();

export const selectedEmail = derived(gameActivityStore, ($activity) => {
  if (!$activity.inbox.selectedEmailId) return null;
  return $activity.inbox.emails.find((e) => e.id === $activity.inbox.selectedEmailId) ?? null;
});

export const pendingDecisions = derived(
  gameActivityStore,
  ($activity) => $activity.decisions.pending,
);

export const completedDecisions = derived(
  gameActivityStore,
  ($activity) => $activity.decisions.completed,
);

export const actionQueueLength = derived(
  gameActivityStore,
  ($activity) => $activity.actionQueue.length,
);

export const eventCount = derived(gameActivityStore, ($activity) => $activity.eventHistory.length);
