import { generateId } from '$lib/utils/id';
import { getDB } from '$lib/storage/idb';
import { logger } from '$lib/logger';
import { parseFrontendEnv } from '@the-dmz/shared';

import { browser } from '$app/environment';

export type NotificationType = 'newDay' | 'threat' | 'achievement' | 'social';

export interface PushSubscriptionData {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: number;
}

let subscription: PushSubscription | null = null;

export async function isPushSupported(): Promise<boolean> {
  if (!browser) {
    return false;
  }

  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!browser) {
    return 'denied';
  }

  if (!('Notification' in window)) {
    return 'denied';
  }

  return Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!browser) {
    return null;
  }

  try {
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      logger.warn('Push notification permission denied');
      return null;
    }

    const vapidKey = getVapidPublicKey();
    if (!vapidKey) {
      logger.warn('VAPID public key not configured');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await saveSubscription(subscription);
    return subscription;
  } catch (error) {
    logger.error('Failed to subscribe to push', { error });
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!browser || !subscription) {
    return false;
  }

  try {
    await subscription.unsubscribe();
    subscription = null;
    return true;
  } catch (error) {
    logger.error('Failed to unsubscribe from push', { error });
    return false;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!browser) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    logger.error('Failed to get push subscription', { error });
    return null;
  }
}

export async function isSubscribed(): Promise<boolean> {
  const sub = await getCurrentSubscription();
  return sub !== null;
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const db = await getDB();
  const subJson = sub.toJSON();
  const data: PushSubscriptionData = {
    id: generateId(),
    endpoint: sub.endpoint,
    keys: {
      p256dh: (subJson.keys as Record<string, string>)?.['p256dh'] || '',
      auth: (subJson.keys as Record<string, string>)?.['auth'] || '',
    },
    createdAt: Date.now(),
  };

  await db.put('pushSubscriptions', data);
}

export async function getStoredSubscriptions(): Promise<PushSubscriptionData[]> {
  const db = await getDB();
  return db.getAll('pushSubscriptions');
}

function getVapidPublicKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return parseFrontendEnv(env).VITE_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
}

export async function showLocalNotification(
  title: string,
  options?: NotificationOptions,
): Promise<Notification | null> {
  if (!browser || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options,
  });
}
