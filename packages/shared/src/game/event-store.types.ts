import type { GameEventType } from './event-types.js';

export interface StoredGameEvent {
  eventId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  eventType: GameEventType;
  eventData: Record<string, unknown>;
  eventVersion: number;
  sequenceNum: number;
  serverTime: Date;
  clientTime: Date | null;
}

export interface StoredSnapshot {
  snapshotId: string;
  sessionId: string;
  tenantId: string;
  sequenceNum: number;
  stateJson: Record<string, unknown>;
  createdAt: Date;
}

export interface AppendEventInput {
  sessionId: string;
  userId: string;
  tenantId: string;
  eventType: GameEventType;
  eventData: Record<string, unknown>;
  eventVersion?: number;
  clientTime?: Date | null;
}

export interface GetEventsOptions {
  fromSequence?: number;
  toSequence?: number;
  limit?: number;
}

export interface CreateSnapshotInput {
  sessionId: string;
  tenantId: string;
  sequenceNum: number;
  stateJson: Record<string, unknown>;
}

export const SNAPSHOT_INTERVAL = 50;

export function shouldCreateSnapshot(
  currentSequenceNum: number,
  lastSnapshotSequence: number | null,
): boolean {
  if (lastSnapshotSequence === null) {
    return currentSequenceNum >= SNAPSHOT_INTERVAL;
  }
  return currentSequenceNum - lastSnapshotSequence >= SNAPSHOT_INTERVAL;
}
