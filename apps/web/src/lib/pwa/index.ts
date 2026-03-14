import { getUnsyncedEvents, clearOldEvents } from '$lib/storage/event-queue';
import { updatePendingEvents } from '$lib/stores/connectivity';

import { browser } from '$app/environment';

export type { PushSubscriptionData, NotificationType } from './push';

export {
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  isSubscribed,
  showLocalNotification,
} from './push';

export interface PWAState {
  installed: boolean;
  updateAvailable: boolean;
  updateVersion: string | null;
}

const pwaState: PWAState = {
  installed: false,
  updateAvailable: false,
  updateVersion: null,
};

export function getPWAState(): PWAState {
  return pwaState;
}

export async function initializePWA(): Promise<void> {
  if (!browser) {
    return;
  }

  await registerServiceWorker();
  setupUpdateNotifications();
  void setupOfflineSync();
}

async function registerServiceWorker(): Promise<void> {
  if (!browser || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    pwaState.installed = true;

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            pwaState.updateAvailable = true;
          }
        });
      }
    });

    if (registration.active) {
      console.log('Service worker is active');
    }
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

function setupUpdateNotifications(): void {
  if (!browser) {
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
  });
}

async function setupOfflineSync(): Promise<void> {
  if (!browser) {
    return;
  }

  const updatePending = async () => {
    try {
      const events = await getUnsyncedEvents();
      updatePendingEvents(events.length);
    } catch {
      updatePendingEvents(0);
    }
  };

  await updatePending();
  setInterval(() => {
    void updatePending();
  }, 5000);
}

export async function handleServiceWorkerUpdate(): Promise<void> {
  if (!browser) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (registration.waiting) {
    void registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

export async function clearOldData(): Promise<void> {
  if (!browser) {
    return;
  }

  try {
    const deletedCount = await clearOldEvents();
    console.log(`Cleared ${deletedCount} old events`);
  } catch (error) {
    console.error('Failed to clear old data:', error);
  }
}

export async function getCacheStatus(): Promise<{
  caches: string[];
  estimatedSize: string;
}> {
  if (!browser || !('caches' in window)) {
    return { caches: [], estimatedSize: '0 B' };
  }

  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const req of requests) {
      const response = await cache.match(req);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  const sizeStr = formatBytes(totalSize);

  return {
    caches: cacheNames,
    estimatedSize: sizeStr,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
