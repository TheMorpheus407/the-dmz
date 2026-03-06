import {
  type StoredGameEvent,
  type StoredSnapshot,
  type AppendEventInput,
  type GetEventsOptions,
  type CreateSnapshotInput,
  shouldCreateSnapshot,
  SNAPSHOT_INTERVAL,
} from './event-store.types.js';

export interface EventStore {
  appendEvent(input: AppendEventInput): Promise<StoredGameEvent>;
  getEvents(sessionId: string, options?: GetEventsOptions): Promise<StoredGameEvent[]>;
  getLatestSequenceNum(sessionId: string): Promise<number | null>;
  createSnapshot(input: CreateSnapshotInput): Promise<StoredSnapshot>;
  getLatestSnapshot(sessionId: string): Promise<StoredSnapshot | null>;
  deleteSnapshotsAfter(sessionId: string, sequenceNum: number): Promise<void>;
}

export type {
  StoredGameEvent,
  StoredSnapshot,
  AppendEventInput,
  GetEventsOptions,
  CreateSnapshotInput,
};

export { shouldCreateSnapshot, SNAPSHOT_INTERVAL };
