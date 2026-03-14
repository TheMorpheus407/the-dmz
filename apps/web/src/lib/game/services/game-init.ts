import { get } from 'svelte/store';

import { connectivityStore } from '$lib/stores/connectivity';

import { offlineModeStore } from './offline-mode';

import type { OfflineGameEngine } from './offline-engine';

import { browser } from '$app/environment';

export interface OfflineInitializationResult {
  mode: 'offline' | 'online';
  hasExistingSession: boolean;
  engine?: OfflineGameEngine;
}

export async function initializeGameMode(): Promise<OfflineInitializationResult> {
  if (!browser) {
    return { mode: 'online', hasExistingSession: false };
  }

  await offlineModeStore.initialize();

  const connState = get(connectivityStore);
  const offlineState = get(offlineModeStore);

  if (!connState.online) {
    if (offlineState.hasSavedSession) {
      const engine = await offlineModeStore.resumeFromSnapshot();
      return {
        mode: 'offline',
        hasExistingSession: true,
        ...(engine && { engine }),
      };
    } else {
      await offlineModeStore.startOfflinePlay();
      const engine = offlineModeStore.getEngine();
      return {
        mode: 'offline',
        hasExistingSession: false,
        ...(engine && { engine }),
      };
    }
  }

  return {
    mode: 'online',
    hasExistingSession: offlineState.hasSavedSession,
  };
}

export async function tryResumeOfflineSession(): Promise<boolean> {
  if (!browser) return false;

  const connState = get(connectivityStore);
  if (connState.online) return false;

  const offlineState = get(offlineModeStore);
  if (!offlineState.hasSavedSession) {
    await offlineModeStore.startOfflinePlay();
    return true;
  }

  await offlineModeStore.resumeFromSnapshot();
  return true;
}

export function startOfflineSession(): void {
  if (!browser) return;
  void offlineModeStore.startOfflinePlay();
}

export async function forceOnlineMode(): Promise<void> {
  if (!browser) return;
  offlineModeStore.reset();
  await offlineModeStore.initialize();
}

export { offlineModeStore };
