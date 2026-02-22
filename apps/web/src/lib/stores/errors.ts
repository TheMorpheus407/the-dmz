import { writable, get } from 'svelte/store';

import type { CategorizedApiError } from '$lib/api/types';
import type { RouteSurface } from '$lib/api/error-copy';

export interface ErrorState {
  error: CategorizedApiError | null;
  surface: RouteSurface;
  timestamp: number;
}

export interface ToastError extends ErrorState {
  id: string;
  dismissed: boolean;
}

function createErrorStore() {
  const { subscribe, set } = writable<ErrorState>({
    error: null,
    surface: 'public',
    timestamp: 0,
  });

  return {
    subscribe,

    setError(error: CategorizedApiError, surface: RouteSurface): void {
      set({
        error,
        surface,
        timestamp: Date.now(),
      });
    },

    clearError(): void {
      set({
        error: null,
        surface: 'public',
        timestamp: 0,
      });
    },

    getError(): ErrorState {
      return get({ subscribe });
    },
  };
}

function createToastStore() {
  const { subscribe, set, update } = writable<ToastError[]>([]);

  return {
    subscribe,

    add(error: CategorizedApiError, surface: RouteSurface): string {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: ToastError = {
        id,
        error,
        surface,
        timestamp: Date.now(),
        dismissed: false,
      };

      update((toasts) => [...toasts, toast]);
      return id;
    },

    dismiss(id: string): void {
      update((toasts) => toasts.map((t) => (t.id === id ? { ...t, dismissed: true } : t)));
    },

    remove(id: string): void {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },

    clear(): void {
      set([]);
    },

    getAll(): ToastError[] {
      return get({ subscribe });
    },
  };
}

export const errorStore = createErrorStore();
export const toastErrorStore = createToastStore();
