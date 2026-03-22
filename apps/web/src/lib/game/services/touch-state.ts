import { getDB } from '$lib/storage/idb';
import { generateId } from '$lib/utils/id';
import { logger } from '$lib/logger';

import { browser } from '$app/environment';

export interface TouchInteraction {
  id: string;
  type: 'swipe' | 'pan' | 'pinch' | 'longpress' | 'tap';
  direction?: 'left' | 'right' | 'up' | 'down';
  targetElement?: string;
  timestamp: number;
  synced: boolean;
  metadata?: Record<string, unknown>;
}

export interface TouchState {
  interactions: TouchInteraction[];
  lastSyncAt: number | null;
  activeGestures: number;
}

const MAX_STORED_INTERACTIONS = 1000;
const SYNC_INTERVAL_MS = 30000;

const touchState: TouchState = {
  interactions: [],
  lastSyncAt: null,
  activeGestures: 0,
};

let syncTimer: ReturnType<typeof setInterval> | null = null;

export async function initTouchStatePersistence(): Promise<void> {
  if (!browser) return;

  await loadTouchState();
  startPeriodicSync();
}

async function loadTouchState(): Promise<void> {
  if (!browser) return;

  try {
    const db = await getDB();
    const all = await db.getAll('events');
    const touchEvents = all.filter((e) => e.type && e.type.startsWith('touch_'));

    touchState.interactions = touchEvents.slice(-MAX_STORED_INTERACTIONS).map((e) => ({
      id: e.id,
      type: e.type?.replace('touch_', '') as TouchInteraction['type'],
      timestamp: e.timestamp,
      synced: e.synced,
      metadata: e.payload as Record<string, unknown>,
    }));

    touchState.lastSyncAt =
      touchEvents.length > 0 ? Math.max(...touchEvents.map((e) => e.timestamp)) : null;
  } catch (error) {
    logger.error('Failed to load touch state', { error });
  }
}

function startPeriodicSync(): void {
  if (syncTimer) return;

  syncTimer = setInterval(() => {
    void syncTouchState();
  }, SYNC_INTERVAL_MS);
}

export function stopTouchStatePersistence(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function syncTouchState(): Promise<number> {
  if (!browser) return 0;

  try {
    await getDB();
    const unsynced = touchState.interactions.filter((i) => !i.synced);

    for (const interaction of unsynced) {
      interaction.synced = true;
    }

    touchState.lastSyncAt = Date.now();

    return unsynced.length;
  } catch (error) {
    logger.error('Failed to sync touch state', { error });
    return 0;
  }
}

export function recordTouchInteraction(
  type: TouchInteraction['type'],
  metadata?: Record<string, unknown>,
  direction?: TouchInteraction['direction'],
  targetElement?: string,
): void {
  if (!browser) return;

  const interaction: TouchInteraction = {
    id: generateId(),
    type,
    timestamp: Date.now(),
    synced: false,
    ...(direction !== undefined && { direction }),
    ...(targetElement !== undefined && { targetElement }),
    ...(metadata !== undefined && { metadata }),
  };

  touchState.interactions.push(interaction);

  if (touchState.interactions.length > MAX_STORED_INTERACTIONS) {
    touchState.interactions = touchState.interactions.slice(-MAX_STORED_INTERACTIONS);
  }
}

export function recordSwipe(
  direction: TouchInteraction['direction'],
  targetElement?: string,
): void {
  recordTouchInteraction('swipe', undefined, direction, targetElement);
}

export function recordPan(direction: 'prev' | 'next', targetElement?: string): void {
  recordTouchInteraction('pan', { panDirection: direction }, undefined, targetElement);
}

export function recordPinch(scale: number, targetElement?: string): void {
  recordTouchInteraction('pinch', { scale }, undefined, targetElement);
}

export function recordLongPress(targetElement?: string): void {
  recordTouchInteraction('longpress', undefined, undefined, targetElement);
}

export function recordTap(targetElement?: string): void {
  recordTouchInteraction('tap', undefined, undefined, targetElement);
}

export function incrementActiveGestures(): void {
  touchState.activeGestures++;
}

export function decrementActiveGestures(): void {
  touchState.activeGestures = Math.max(0, touchState.activeGestures - 1);
}

export function getTouchState(): TouchState {
  return { ...touchState };
}

export function getUnsyncedTouchInteractions(): TouchInteraction[] {
  return touchState.interactions.filter((i) => !i.synced);
}

export async function clearOldTouchInteractions(
  olderThanMs: number = 7 * 24 * 60 * 60 * 1000,
): Promise<number> {
  const cutoff = Date.now() - olderThanMs;
  const before = touchState.interactions.length;

  touchState.interactions = touchState.interactions.filter(
    (i) => i.timestamp > cutoff || !i.synced,
  );

  return before - touchState.interactions.length;
}
