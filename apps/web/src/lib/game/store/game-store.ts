import { writable, derived, get } from 'svelte/store';

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import type { GameThreatTier } from '@the-dmz/shared/game';
import { bootstrapGameSession, getGameSession } from '$lib/api/game';
import type { CategorizedApiError } from '$lib/api/types';
import type { GamePhase } from '$lib/game/state/state-machine';
import type { QueuedAction, GameAction } from '$lib/game/services/action-queue';
import { enqueueAction } from '$lib/game/services/action-queue';
import { reconcileState } from '$lib/game/services/sync';
import type { GameEvent } from '$lib/game/state/events';

export interface PlayerState {
  trust: number;
  funds: number;
  intelFragments: number;
}

export interface FacilityState {
  rackSpace: number;
  power: number;
  cooling: number;
  bandwidth: number;
  clients: number;
}

export interface ThreatState {
  level: GameThreatTier;
  activeIncidents: number;
}

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

export interface GameStoreState {
  isLoading: boolean;
  isInitialized: boolean;
  error: CategorizedApiError | null;
  session: {
    id: string | null;
    day: number;
    phase: GamePhase;
    startedAt: string | null;
  } | null;
  player: PlayerState;
  facility: FacilityState;
  threat: ThreatState;
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
  lastSyncAt: string | null;
}

const initialPlayerState: PlayerState = {
  trust: 100,
  funds: 1000,
  intelFragments: 0,
};

const initialFacilityState: FacilityState = {
  rackSpace: 10,
  power: 100,
  cooling: 100,
  bandwidth: 1000,
  clients: 5,
};

const initialThreatState: ThreatState = {
  level: 'low',
  activeIncidents: 0,
};

const initialState: GameStoreState = {
  isLoading: false,
  isInitialized: false,
  error: null,
  session: null,
  player: { ...initialPlayerState },
  facility: { ...initialFacilityState },
  threat: { ...initialThreatState },
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
  lastSyncAt: null,
};

function createGameStore() {
  const { subscribe, set, update } = writable<GameStoreState>(initialState);

  return {
    subscribe,

    get(): GameStoreState {
      return get({ subscribe });
    },

    async bootstrap(): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await bootstrapGameSession();

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applyServerState(result.data);
      }

      update((state) => ({
        ...state,
        isLoading: false,
        isInitialized: true,
        lastSyncAt: new Date().toISOString(),
      }));
      return {};
    },

    async fetchState(): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await getGameSession();

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applyServerState(result.data);
      }

      update((state) => ({ ...state, isLoading: false, lastSyncAt: new Date().toISOString() }));
      return {};
    },

    applyServerState(serverState: GameSessionBootstrap): void {
      update((state) => {
        const newSession = {
          id: serverState.sessionId,
          day: serverState.day,
          phase: 'DAY_START' as GamePhase,
          startedAt: serverState.createdAt,
        };

        const newFacility: FacilityState = {
          rackSpace: 10,
          power: 100,
          cooling: 100,
          bandwidth: 1000,
          clients: serverState.clientCount,
        };

        const newPlayer: PlayerState = {
          trust: 100,
          funds: serverState.funds,
          intelFragments: 0,
        };

        const newThreat: ThreatState = {
          level: serverState.threatLevel,
          activeIncidents: 0,
        };

        return {
          ...state,
          session: newSession,
          player: newPlayer,
          facility: newFacility,
          threat: newThreat,
          isInitialized: true,
        };
      });
    },

    setPhase(phase: GamePhase): void {
      update((state) => {
        if (!state.session) return state;
        return {
          ...state,
          session: { ...state.session, phase },
        };
      });
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

    updatePlayer(partial: Partial<PlayerState>): void {
      update((state) => ({
        ...state,
        player: { ...state.player, ...partial },
      }));
    },

    updateFacility(partial: Partial<FacilityState>): void {
      update((state) => ({
        ...state,
        facility: { ...state.facility, ...partial },
      }));
    },

    updateThreat(partial: Partial<ThreatState>): void {
      update((state) => ({
        ...state,
        threat: { ...state.threat, ...partial },
      }));
    },

    advanceDay(): void {
      update((state) => {
        if (!state.session) return state;
        return {
          ...state,
          session: {
            ...state.session,
            day: state.session.day + 1,
            phase: 'DAY_START' as GamePhase,
          },
          decisions: { pending: [], completed: [] },
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
        lastSyncAt: new Date().toISOString(),
      }));
    },

    optimisticUpdate(updater: (state: GameStoreState) => GameStoreState): void {
      update(updater);
    },

    rollback(): void {
      void this.fetchState();
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const gameStore = createGameStore();

export const currentPhase = derived(gameStore, ($game) => $game.session?.phase ?? null);

export const currentDay = derived(gameStore, ($game) => $game.session?.day ?? 0);

export const selectedEmail = derived(gameStore, ($game) => {
  if (!$game.inbox.selectedEmailId) return null;
  return $game.inbox.emails.find((e) => e.id === $game.inbox.selectedEmailId) ?? null;
});

export const pendingDecisions = derived(gameStore, ($game) => $game.decisions.pending);

export const completedDecisions = derived(gameStore, ($game) => $game.decisions.completed);

export const playerResources = derived(gameStore, ($game) => $game.player);

export const facilityState = derived(gameStore, ($game) => $game.facility);

export const threatLevel = derived(gameStore, ($game) => $game.threat.level);

export const isLoading = derived(gameStore, ($game) => $game.isLoading);

export const hasError = derived(gameStore, ($game) => $game.error !== null);

export const actionQueueLength = derived(gameStore, ($game) => $game.actionQueue.length);

export const eventCount = derived(gameStore, ($game) => $game.eventHistory.length);
