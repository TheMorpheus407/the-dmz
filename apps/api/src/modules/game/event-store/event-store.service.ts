import {
  type StoredGameEvent,
  type StoredSnapshot,
  type AppendEventInput,
  type GetEventsOptions,
  type CreateSnapshotInput,
  type EventStore,
  shouldCreateSnapshot,
  SNAPSHOT_INTERVAL,
  type GameState,
  type GameActionPayload,
  EventAdapterRegistry,
  createSessionStartedAdapter,
  createDayStartedAdapter,
  createDayEndedAdapter,
  createSessionPausedAdapter,
  createSessionResumedAdapter,
  createSessionAbandonedAdapter,
  createSessionCompletedAdapter,
  createEmailOpenedAdapter,
  createEmailIndicatorMarkedAdapter,
  createEmailVerificationRequestedAdapter,
  createEmailDecisionSubmittedAdapter,
  createEmailDecisionResolvedAdapter,
  createConsequencesAppliedAdapter,
  createThreatsGeneratedAdapter,
  createIncidentCreatedAdapter,
  createBreachOccurredAdapter,
  createIncidentResolvedAdapter,
  createUpgradePurchasedAdapter,
  createResourceAdjustedAdapter,
} from '@the-dmz/shared';

import { type DB } from '../../../shared/database/connection.js';
import { reduce, createInitialGameState } from '../engine/reducer.js';

import * as repo from './event-store.repo.js';

import type { GameEvent } from './event-store.repo.js';

const eventAdapterRegistry = new EventAdapterRegistry();
eventAdapterRegistry.register(createSessionStartedAdapter());
eventAdapterRegistry.register(createDayStartedAdapter());
eventAdapterRegistry.register(createDayEndedAdapter());
eventAdapterRegistry.register(createSessionPausedAdapter());
eventAdapterRegistry.register(createSessionResumedAdapter());
eventAdapterRegistry.register(createSessionAbandonedAdapter());
eventAdapterRegistry.register(createSessionCompletedAdapter());
eventAdapterRegistry.register(createEmailOpenedAdapter());
eventAdapterRegistry.register(createEmailIndicatorMarkedAdapter());
eventAdapterRegistry.register(createEmailVerificationRequestedAdapter());
eventAdapterRegistry.register(createEmailDecisionSubmittedAdapter());
eventAdapterRegistry.register(createEmailDecisionResolvedAdapter());
eventAdapterRegistry.register(createConsequencesAppliedAdapter());
eventAdapterRegistry.register(createThreatsGeneratedAdapter());
eventAdapterRegistry.register(createIncidentCreatedAdapter());
eventAdapterRegistry.register(createBreachOccurredAdapter());
eventAdapterRegistry.register(createIncidentResolvedAdapter());
eventAdapterRegistry.register(createUpgradePurchasedAdapter());
eventAdapterRegistry.register(createResourceAdjustedAdapter());

export { shouldCreateSnapshot, SNAPSHOT_INTERVAL };
export type {
  StoredGameEvent,
  StoredSnapshot,
  AppendEventInput,
  GetEventsOptions,
  CreateSnapshotInput,
};

const mapEventToStored = (event: GameEvent): StoredGameEvent => ({
  eventId: event.eventId,
  sessionId: event.sessionId,
  userId: event.userId,
  tenantId: event.tenantId,
  eventType: event.eventType as StoredGameEvent['eventType'],
  eventData: event.eventData as StoredGameEvent['eventData'],
  eventVersion: event.eventVersion,
  sequenceNum: Number(event.sequenceNum),
  serverTime: event.serverTime,
  clientTime: event.clientTime,
});

const mapSnapshotToStored = (snapshot: repo.GameStateSnapshot): StoredSnapshot => ({
  snapshotId: snapshot.snapshotId,
  sessionId: snapshot.sessionId,
  tenantId: snapshot.tenantId,
  sequenceNum: Number(snapshot.sequenceNum),
  stateJson: snapshot.stateJson as StoredSnapshot['stateJson'],
  createdAt: snapshot.createdAt,
});

export class GameEventStoreService implements EventStore {
  constructor(private readonly db: DB) {}

  async appendEvent(input: AppendEventInput): Promise<StoredGameEvent> {
    const event = await repo.appendEvent(this.db, {
      sessionId: input.sessionId,
      userId: input.userId,
      tenantId: input.tenantId,
      eventType: input.eventType,
      eventData: input.eventData,
      eventVersion: input.eventVersion ?? 1,
      clientTime: input.clientTime ?? null,
    });

    return mapEventToStored(event);
  }

  async getEvents(sessionId: string, options?: GetEventsOptions): Promise<StoredGameEvent[]> {
    const events = await repo.getEvents(this.db, sessionId, options);
    return events.map(mapEventToStored);
  }

  async getLatestSequenceNum(sessionId: string): Promise<number | null> {
    return repo.getLatestSequenceNum(this.db, sessionId);
  }

  async createSnapshot(input: CreateSnapshotInput): Promise<StoredSnapshot> {
    const snapshot = await repo.createSnapshot(this.db, {
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      sequenceNum: input.sequenceNum,
      stateJson: input.stateJson,
    });

    return mapSnapshotToStored(snapshot);
  }

  async getLatestSnapshot(sessionId: string): Promise<StoredSnapshot | null> {
    const snapshot = await repo.getLatestSnapshot(this.db, sessionId);
    return snapshot ? mapSnapshotToStored(snapshot) : null;
  }

  async deleteSnapshotsAfter(sessionId: string, sequenceNum: number): Promise<void> {
    await repo.deleteSnapshotsAfter(this.db, sessionId, sequenceNum);
  }

  async replayToState(sessionId: string): Promise<GameState> {
    const events = await this.getEvents(sessionId);

    if (events.length === 0) {
      throw new Error('No events found for session');
    }

    const firstEvent = events[0]!;
    const initialState = createInitialGameState(
      firstEvent.sessionId,
      firstEvent.userId,
      firstEvent.tenantId,
    );

    let currentState = initialState;

    for (const event of events) {
      const actionPayload = this.eventToActionPayload(event);
      if (actionPayload) {
        const result = reduce(currentState, actionPayload);
        if (result.success) {
          currentState = result.newState;
        }
      }
    }

    return currentState;
  }

  async loadStateFromSnapshot(sessionId: string): Promise<GameState> {
    const snapshot = await this.getLatestSnapshot(sessionId);

    if (!snapshot) {
      return this.replayToState(sessionId);
    }

    const eventsAfterSnapshot = await this.getEvents(sessionId, {
      fromSequence: snapshot.sequenceNum + 1,
    });

    let currentState: GameState = snapshot.stateJson as unknown as GameState;

    for (const event of eventsAfterSnapshot) {
      const actionPayload = this.eventToActionPayload(event);
      if (actionPayload) {
        const result = reduce(currentState, actionPayload);
        if (result.success) {
          currentState = result.newState;
        }
      }
    }

    return currentState;
  }

  async appendEventWithSnapshot(input: AppendEventInput): Promise<{
    event: StoredGameEvent;
    snapshotCreated?: StoredSnapshot;
  }> {
    const event = await this.appendEvent(input);

    const latestSnapshot = await this.getLatestSnapshot(input.sessionId);
    const lastSnapshotSequence = latestSnapshot?.sequenceNum ?? null;
    const currentSequence = event.sequenceNum;

    if (shouldCreateSnapshot(currentSequence, lastSnapshotSequence)) {
      const currentState = await this.loadStateFromSnapshot(input.sessionId);
      const snapshot = await this.createSnapshot({
        sessionId: input.sessionId,
        tenantId: input.tenantId,
        sequenceNum: currentSequence,
        stateJson: currentState as unknown as Record<string, unknown>,
      });

      return { event, snapshotCreated: snapshot };
    }

    return { event };
  }

  private eventToActionPayload(event: StoredGameEvent): GameActionPayload | null {
    return eventAdapterRegistry.toActionPayload(event.eventType, event.eventData);
  }
}
