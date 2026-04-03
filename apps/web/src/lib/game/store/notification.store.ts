import { writable } from 'svelte/store';

import type { Toast, ToastAction, ToastType } from './types';

interface NotificationState {
  notifications: Toast[];
  notificationQueue: Toast[];
}

const initialState: NotificationState = {
  notifications: [],
  notificationQueue: [],
};

function createNotificationStore() {
  const { subscribe, set, update } = writable<NotificationState>(initialState);

  const DURATION_MAP: Record<ToastType, number> = {
    info: 5000,
    success: 5000,
    warning: 8000,
    error: 10000,
    decision: 5000,
    threat: 8000,
    incident: 10000,
    breach: 0,
    system: 4000,
    achievement: 6000,
  };

  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function removeNotification(id: string) {
    update((state) => {
      const filtered: Toast[] = state.notifications.filter((n) => n.id !== id);
      const shouldPromote =
        filtered.length < state.notifications.length && state.notificationQueue.length > 0;

      if (shouldPromote && state.notificationQueue.length > 0) {
        const [first, ...rest] = state.notificationQueue;
        if (first) {
          const newNotifications: Toast[] = [...filtered, first];
          return {
            ...state,
            notifications: newNotifications,
            notificationQueue: rest,
          };
        }
      }

      return { ...state, notifications: filtered };
    });

    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  return {
    subscribe,

    addNotification(
      message: string,
      type: Toast['type'] = 'info',
      duration: number | undefined = 5000,
      options?: { title?: string; action?: ToastAction; source?: string },
    ): string {
      const id = crypto.randomUUID();
      const toast: Toast = {
        id,
        message,
        type,
        duration,
        createdAt: Date.now(),
      };

      if (options?.title) {
        toast.title = options.title;
      }
      if (options?.action) {
        toast.action = options.action;
      }
      if (options?.source) {
        toast.source = options.source;
      }

      update((state) => {
        const MAX_VISIBLE = 3;
        const currentVisible = state.notifications.length;

        if (currentVisible >= MAX_VISIBLE) {
          return {
            ...state,
            notificationQueue: [...state.notificationQueue, toast],
          };
        }

        return { ...state, notifications: [...state.notifications, toast] };
      });

      if (duration && duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);
        timers.set(id, timer);
      }

      return id;
    },

    addGameNotification(
      message: string,
      type: Toast['type'],
      options?: { title?: string; duration?: number; action?: ToastAction; source?: string },
    ): string {
      const duration = options?.duration ?? DURATION_MAP[type] ?? 5000;
      return this.addNotification(message, type, duration, options);
    },

    removeNotification,

    clearNotifications() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      update((state) => ({ ...state, notifications: [], notificationQueue: [] }));
    },

    reset() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      set(initialState);
    },
  };
}

export const notificationStore = createNotificationStore();
