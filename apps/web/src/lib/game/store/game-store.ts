import { writable, get } from 'svelte/store';

import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import type { GamePhase } from '$lib/game/state/state-machine';
import type { CategorizedApiError } from '$lib/api/types';
import { bootstrapGameSession, getGameSession } from '$lib/api/game';
import type { QueuedAction, GameAction } from '$lib/game/services/action-queue';
import type { GameEvent } from '$lib/game/state/events';

import { sessionStore, currentPhase, currentDay } from './session-store';
import { playerStore, playerResources } from './player-store';
import { facilityStore, facilityState } from './facility-store';
import { threatStore, threatLevel } from './threat-store';
import {
  gameActivityStore,
  selectedEmail,
  pendingDecisions,
  completedDecisions,
  actionQueueLength,
  eventCount,
  type Email,
  type Decision,
} from './game-activity-store';
import { syncStore, isLoading, hasError } from './sync-store';

import type { PlayerState } from './player-store';
import type { FacilityState } from './facility-store';
import type { ThreatState } from './threat-store';
import type { Readable } from 'svelte/store';

export type { PlayerState, FacilityState, ThreatState, Email, Decision };

export interface SessionInfo {
  id: string | null;
  day: number;
  phase: GamePhase;
  startedAt: string | null;
}

export type SessionInfoNullable = SessionInfo | null;

export interface GameStoreState {
  isLoading: boolean;
  isInitialized: boolean;
  error: CategorizedApiError | null;
  session: SessionInfoNullable;
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

export interface GameStore extends Readable<GameStoreState> {
  get(): GameStoreState;
  bootstrap(): Promise<{ error?: CategorizedApiError }>;
  fetchState(): Promise<{ error?: CategorizedApiError }>;
  applyServerState(serverState: GameSessionBootstrap): void;
  setPhase(phase: GamePhase): void;
  selectEmail(emailId: string | null): void;
  markEmailAsRead(emailId: string): void;
  flagEmail(emailId: string, flagged: boolean): void;
  setEmails(emails: Email[]): void;
  addDecision(decision: Decision): void;
  resolveDecision(decisionId: string, resolution: 'approve' | 'deny'): void;
  updatePlayer(partial: Partial<PlayerState>): void;
  updateFacility(partial: Partial<FacilityState>): void;
  updateThreat(partial: Partial<ThreatState>): void;
  advanceDay(): void;
  enqueue(action: GameAction): void;
  dequeue(actionId: string): void;
  clearActionQueue(): void;
  addEvent(event: GameEvent): void;
  reconcile(events: GameEvent[]): void;
  optimisticUpdate(updater: (state: GameStoreState) => GameStoreState): void;
  rollback(): void;
  reset(): void;
}

function createGameStore(): GameStore {
  const gameWritable = writable<GameStoreState>({
    isLoading: false,
    isInitialized: false,
    error: null,
    session: null,
    player: { trust: 100, funds: 1000, intelFragments: 0 },
    facility: { rackSpace: 10, power: 100, cooling: 100, bandwidth: 1000, clients: 5 },
    threat: { level: 'low', activeIncidents: 0 },
    inbox: { emails: [], selectedEmailId: null },
    decisions: { pending: [], completed: [] },
    actionQueue: [],
    eventHistory: [],
    lastSyncAt: null,
  });

  function syncAll() {
    const session = sessionStore.get();
    gameWritable.set({
      isLoading: syncStore.get().isLoading,
      isInitialized: syncStore.get().isInitialized,
      error: syncStore.get().error,
      session: session.id === null ? null : session,
      player: playerStore.get(),
      facility: facilityStore.get(),
      threat: threatStore.get(),
      inbox: gameActivityStore.get().inbox,
      decisions: gameActivityStore.get().decisions,
      actionQueue: gameActivityStore.get().actionQueue,
      eventHistory: gameActivityStore.get().eventHistory,
      lastSyncAt: syncStore.get().lastSyncAt,
    });
  }

  syncStore.subscribe(() => syncAll());
  sessionStore.subscribe(() => syncAll());
  playerStore.subscribe(() => syncAll());
  facilityStore.subscribe(() => syncAll());
  threatStore.subscribe(() => syncAll());
  gameActivityStore.subscribe(() => syncAll());

  return {
    subscribe: gameWritable.subscribe,

    get(): GameStoreState {
      return get(gameWritable);
    },

    async bootstrap(): Promise<{ error?: CategorizedApiError }> {
      syncStore.optimisticUpdate((state) => ({ ...state, isLoading: true, error: null }));

      const result = await bootstrapGameSession();

      if (result.error) {
        syncStore.optimisticUpdate((state) => ({
          ...state,
          isLoading: false,
          error: result.error ?? null,
        }));
        syncAll();
        return { error: result.error };
      }

      if (result.data) {
        this.applyServerState(result.data);
      }

      syncStore.optimisticUpdate((state) => ({
        ...state,
        isLoading: false,
        isInitialized: true,
        lastSyncAt: new Date().toISOString(),
      }));
      syncAll();
      return {};
    },

    async fetchState(): Promise<{ error?: CategorizedApiError }> {
      syncStore.optimisticUpdate((state) => ({ ...state, isLoading: true, error: null }));

      const result = await getGameSession();

      if (result.error) {
        syncStore.optimisticUpdate((state) => ({
          ...state,
          isLoading: false,
          error: result.error ?? null,
        }));
        syncAll();
        return { error: result.error };
      }

      if (result.data) {
        this.applyServerState(result.data);
      }

      syncStore.optimisticUpdate((state) => ({
        ...state,
        isLoading: false,
        lastSyncAt: new Date().toISOString(),
      }));
      syncAll();
      return {};
    },

    applyServerState(serverState: GameSessionBootstrap): void {
      sessionStore.setSession(serverState.sessionId, serverState.day, serverState.createdAt);

      playerStore.setPlayer(100, serverState.funds, 0);

      facilityStore.setFacility({
        rackSpace: 10,
        power: 100,
        cooling: 100,
        bandwidth: 1000,
        clients: serverState.clientCount,
      });

      threatStore.setThreatLevel(serverState.threatLevel);
      threatStore.setActiveIncidents(0);

      syncStore.setInitialized();
      syncAll();
    },

    setPhase(phase: GamePhase): void {
      sessionStore.setPhase(phase);
      syncAll();
    },

    selectEmail(emailId: string | null): void {
      gameActivityStore.selectEmail(emailId);
      syncAll();
    },

    markEmailAsRead(emailId: string): void {
      gameActivityStore.markEmailAsRead(emailId);
      syncAll();
    },

    flagEmail(emailId: string, flagged: boolean): void {
      gameActivityStore.flagEmail(emailId, flagged);
      syncAll();
    },

    setEmails(emails: Email[]): void {
      gameActivityStore.setEmails(emails);
      syncAll();
    },

    addDecision(decision: Decision): void {
      gameActivityStore.addDecision(decision);
      syncAll();
    },

    resolveDecision(decisionId: string, resolution: 'approve' | 'deny'): void {
      gameActivityStore.resolveDecision(decisionId, resolution);
      syncAll();
    },

    updatePlayer(partial: Partial<PlayerState>): void {
      playerStore.updatePlayer(partial);
      syncAll();
    },

    updateFacility(partial: Partial<FacilityState>): void {
      facilityStore.updateFacility(partial);
      syncAll();
    },

    updateThreat(partial: Partial<ThreatState>): void {
      threatStore.updateThreat(partial);
      syncAll();
    },

    advanceDay(): void {
      sessionStore.advanceDay();
      gameActivityStore.clearDecisions();
      syncAll();
    },

    enqueue(action: GameAction): void {
      gameActivityStore.enqueue(action);
      syncAll();
    },

    dequeue(actionId: string): void {
      gameActivityStore.dequeue(actionId);
      syncAll();
    },

    clearActionQueue(): void {
      gameActivityStore.clearActionQueue();
      syncAll();
    },

    addEvent(event: GameEvent): void {
      gameActivityStore.addEvent(event);
      syncAll();
    },

    reconcile(events: GameEvent[]): void {
      gameActivityStore.reconcile(events);
      syncStore.optimisticUpdate((state) => ({
        ...state,
        lastSyncAt: new Date().toISOString(),
      }));
      syncAll();
    },

    optimisticUpdate(updater: (state: GameStoreState) => GameStoreState): void {
      const currentState = this.get();
      const newState = updater(currentState);
      playerStore.updatePlayer(newState.player);
      facilityStore.updateFacility(newState.facility);
      threatStore.updateThreat(newState.threat);
      syncAll();
    },

    rollback(): void {
      syncStore.rollback();
      syncAll();
    },

    reset(): void {
      syncStore.reset();
      sessionStore.reset();
      playerStore.reset();
      facilityStore.reset();
      threatStore.reset();
      gameActivityStore.reset();
      syncAll();
    },
  };
}

export const gameStore = createGameStore();

export {
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
};
