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
  type DecisionType,
} from '@the-dmz/shared';

import { type DB } from '../../../shared/database/connection.js';
import { reduce, createInitialGameState } from '../engine/reducer.js';

import * as repo from './event-store.repo.js';

import type { GameEvent } from './event-store.repo.js';

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
    switch (event.eventType) {
      case 'game.session.started':
        return { type: 'ACK_DAY_START' };
      case 'game.day.started':
        return { type: 'ACK_DAY_START' };
      case 'game.email.opened':
        return {
          type: 'OPEN_EMAIL',
          emailId: (event.eventData as { emailId?: string }).emailId ?? '',
        };
      case 'game.email.indicator_marked':
        return {
          type: 'MARK_INDICATOR',
          emailId: (event.eventData as { emailId?: string }).emailId ?? '',
          indicatorType: (event.eventData as { indicatorType?: string }).indicatorType ?? '',
        };
      case 'game.email.verification_requested':
        return {
          type: 'REQUEST_VERIFICATION',
          emailId: (event.eventData as { emailId?: string }).emailId ?? '',
        };
      case 'game.email.decision_submitted':
        return {
          type: 'SUBMIT_DECISION',
          emailId: (event.eventData as { emailId?: string }).emailId ?? '',
          decision: ((event.eventData as { decision?: string }).decision as DecisionType) ?? 'deny',
          timeSpentMs: (event.eventData as { timeSpentMs?: number }).timeSpentMs ?? 0,
        };
      case 'game.email.decision_resolved':
        return {
          type: 'CLOSE_VERIFICATION',
          emailId: (event.eventData as { emailId?: string }).emailId ?? '',
        };
      case 'game.consequences.applied':
        return {
          type: 'APPLY_CONSEQUENCES',
          dayNumber: (event.eventData as { day?: number }).day ?? 1,
        };
      case 'game.threats.generated':
        return {
          type: 'PROCESS_THREATS',
          dayNumber: (event.eventData as { day?: number }).day ?? 1,
        };
      case 'game.incident.created':
        return {
          type: 'PROCESS_THREATS',
          dayNumber: (event.eventData as { day?: number }).day ?? 1,
        };
      case 'game.incident.resolved':
        return {
          type: 'RESOLVE_INCIDENT',
          incidentId: (event.eventData as { incidentId?: string }).incidentId ?? '',
          responseActions:
            (event.eventData as { responseActions?: string[] }).responseActions ?? [],
        };
      case 'game.breach.occurred':
        return {
          type: 'PROCESS_THREATS',
          dayNumber: (event.eventData as { day?: number }).day ?? 1,
        };
      case 'game.upgrade.purchased':
        return {
          type: 'PURCHASE_UPGRADE',
          upgradeId: (event.eventData as { upgradeId?: string }).upgradeId ?? '',
        };
      case 'game.resource.adjusted':
        return {
          type: 'ADJUST_RESOURCE',
          resourceId: (event.eventData as { resourceId?: string }).resourceId ?? '',
          delta: (event.eventData as { delta?: number }).delta ?? 0,
        };
      case 'game.day.ended':
        return { type: 'ADVANCE_DAY' };
      case 'game.session.paused':
        return { type: 'PAUSE_SESSION' };
      case 'game.session.resumed':
        return { type: 'RESUME_SESSION' };
      case 'game.session.abandoned':
        return {
          type: 'ABANDON_SESSION' as const,
          reason: (event.eventData as { reason?: string }).reason ?? '',
        };
      case 'game.session.completed':
        return { type: 'ABANDON_SESSION' as const };
      default:
        return null;
    }
  }
}
