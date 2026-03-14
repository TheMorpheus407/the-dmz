import type { DayPhase } from '@the-dmz/shared/types';

import { getDB, type StoredGameState } from './idb';

export interface GameStateInput {
  dayNumber: number;
  phase: DayPhase;
  resources: unknown;
  wallet: number;
}

export async function saveGameState(
  sessionId: string,
  state: GameStateInput,
): Promise<StoredGameState> {
  const db = await getDB();
  const stored: StoredGameState = {
    sessionId,
    dayNumber: state.dayNumber,
    phase: state.phase,
    resources: state.resources,
    wallet: state.wallet,
    lastSyncedAt: Date.now(),
  };

  await db.put('gameState', stored);
  return stored;
}

export async function loadGameState(sessionId: string): Promise<StoredGameState | undefined> {
  const db = await getDB();
  return db.get('gameState', sessionId);
}

export async function deleteGameState(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('gameState', sessionId);
}

export async function getAllGameStates(): Promise<StoredGameState[]> {
  const db = await getDB();
  return db.getAll('gameState');
}

export async function clearAllGameStates(): Promise<void> {
  const db = await getDB();
  await db.clear('gameState');
}

export async function markGameStateSynced(sessionId: string): Promise<void> {
  const db = await getDB();
  const state = await db.get('gameState', sessionId);

  if (state) {
    state.lastSyncedAt = Date.now();
    await db.put('gameState', state);
  }
}

export async function getUnsyncedGameStates(): Promise<StoredGameState[]> {
  const all = await getAllGameStates();
  const now = Date.now();
  const SYNC_THRESHOLD_MS = 5 * 60 * 1000;

  return all.filter((state) => now - state.lastSyncedAt > SYNC_THRESHOLD_MS);
}
