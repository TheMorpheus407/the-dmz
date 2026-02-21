import { writable, derived, get } from 'svelte/store';

import { login, register, logout as apiLogout, getCurrentUser } from '$lib/api/auth';
import type { CategorizedApiError } from '$lib/api/types';
import type { LoginInput, RegisterInput } from '@the-dmz/shared/schemas';

import type { Readable } from 'svelte/store';

export type SessionStatus = 'anonymous' | 'authenticating' | 'authenticated' | 'expired';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: string;
  isActive: boolean;
}

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

export const initialSessionState: SessionState = {
  status: 'anonymous',
  user: null,
};

function createSessionStore() {
  const { subscribe, set } = writable<SessionState>(initialSessionState);

  return {
    subscribe,

    get(): SessionState {
      return get({ subscribe });
    },

    async bootstrap(): Promise<void> {
      set({ status: 'authenticating', user: null });

      const result = await getCurrentUser();

      if (result.error) {
        if (result.error.category === 'authentication') {
          set({ status: 'expired', user: null });
        } else {
          set({ status: 'anonymous', user: null });
        }
        return;
      }

      if (result.data) {
        set({
          status: 'authenticated',
          user: result.data.user,
        });
      }
    },

    async login(credentials: LoginInput): Promise<{ error?: CategorizedApiError }> {
      set({ status: 'authenticating', user: null });

      const result = await login(credentials);

      if (result.error) {
        set({ status: 'anonymous', user: null });
        return { error: result.error };
      }

      if (result.data) {
        set({
          status: 'authenticated',
          user: result.data.user,
        });
        return {};
      }

      set({ status: 'anonymous', user: null });
      return {
        error: {
          category: 'server',
          code: 'UNKNOWN_ERROR',
          message: 'Login failed',
          status: 500,
          retryable: false,
        },
      };
    },

    async register(credentials: RegisterInput): Promise<{ error?: CategorizedApiError }> {
      set({ status: 'authenticating', user: null });

      const result = await register(credentials);

      if (result.error) {
        set({ status: 'anonymous', user: null });
        return { error: result.error };
      }

      if (result.data) {
        set({
          status: 'authenticated',
          user: result.data.user,
        });
        return {};
      }

      set({ status: 'anonymous', user: null });
      return {
        error: {
          category: 'server',
          code: 'UNKNOWN_ERROR',
          message: 'Registration failed',
          status: 500,
          retryable: false,
        },
      };
    },

    async logout(): Promise<void> {
      await apiLogout();
      set({ status: 'anonymous', user: null });
    },

    expire(): void {
      set({ status: 'expired', user: null });
    },

    clear(): void {
      set({ status: 'anonymous', user: null });
    },
  };
}

export const sessionStore = createSessionStore();

export const isAuthenticated: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === 'authenticated',
);

export const isAuthenticating: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === 'authenticating',
);

export const isAnonymous: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === 'anonymous',
);

export const isExpired: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === 'expired',
);

export const currentUser: Readable<SessionUser | null> = derived(
  sessionStore,
  ($session) => $session.user,
);

export const userRole: Readable<string | null> = derived(
  sessionStore,
  ($session) => $session.user?.role ?? null,
);

export const isAdmin: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.user?.role === 'admin',
);

export const isPlayer: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.user?.role === 'player' || $session.user?.role === 'admin',
);
