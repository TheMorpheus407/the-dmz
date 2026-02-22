import { writable, derived, get } from 'svelte/store';

import {
  login,
  register,
  logout as apiLogout,
  getCurrentUser,
  updatePreferences,
} from '$lib/api/auth';
import { apiClient } from '$lib/api/client';
import type { CategorizedApiError } from '$lib/api/types';
import type { LoginInput, RegisterInput } from '@the-dmz/shared/schemas';

import { themeStore } from './theme';

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
  effectivePreferences?: unknown;
  lockedPreferenceKeys: string[];
}

export const initialSessionState: SessionState = {
  status: 'anonymous',
  user: null,
  effectivePreferences: undefined,
  lockedPreferenceKeys: [],
};

async function syncPreferencesToServer(preferences: {
  theme?: string;
  enableTerminalEffects?: boolean;
  effects?: unknown;
  fontSize?: number;
}): Promise<void> {
  const themePrefs: {
    theme?: 'green' | 'amber' | 'high-contrast' | 'enterprise';
    enableTerminalEffects?: boolean;
    effects?: {
      scanlines: boolean;
      curvature: boolean;
      glow: boolean;
      noise: boolean;
      vignette: boolean;
    };
    fontSize?: number;
  } = {};

  if (preferences.theme !== undefined) {
    themePrefs.theme = preferences.theme as 'green' | 'amber' | 'high-contrast' | 'enterprise';
  }
  if (preferences.enableTerminalEffects !== undefined) {
    themePrefs.enableTerminalEffects = preferences.enableTerminalEffects;
  }
  if (preferences.effects !== undefined) {
    themePrefs.effects = preferences.effects as {
      scanlines: boolean;
      curvature: boolean;
      glow: boolean;
      noise: boolean;
      vignette: boolean;
    };
  }
  if (preferences.fontSize !== undefined) {
    themePrefs.fontSize = preferences.fontSize;
  }

  const updateInput: { themePreferences?: typeof themePrefs } = {};
  if (Object.keys(themePrefs).length > 0) {
    updateInput.themePreferences = themePrefs;
  }

  const result = await updatePreferences(updateInput);

  if (result.error) {
    console.error('Failed to sync preferences:', result.error);
  }
}

function createSessionStore() {
  const { subscribe, set } = writable<SessionState>(initialSessionState);

  themeStore.setSyncCallback(syncPreferencesToServer);

  return {
    subscribe,

    get(): SessionState {
      return get({ subscribe });
    },

    async bootstrap(): Promise<void> {
      set({ status: 'authenticating', user: null, lockedPreferenceKeys: [] });

      const result = await getCurrentUser();

      if (result.error) {
        if (result.error.category === 'authentication') {
          set({ status: 'expired', user: null, lockedPreferenceKeys: [] });
        } else {
          set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
        }
        return;
      }

      if (result.data) {
        const effectivePreferences = result.data.effectivePreferences;
        const lockedPreferenceKeys: string[] = [];

        if (result.data.profile?.policyLockedPreferences) {
          const locked = result.data.profile.policyLockedPreferences;
          if (locked.theme) lockedPreferenceKeys.push('theme');
          if (locked.enableTerminalEffects) lockedPreferenceKeys.push('enableTerminalEffects');
          if (locked.effects && Object.keys(locked.effects).length > 0)
            lockedPreferenceKeys.push('effects');
          if (locked.fontSize) lockedPreferenceKeys.push('fontSize');
          if (locked.reducedMotion) lockedPreferenceKeys.push('reducedMotion');
          if (locked.highContrast) lockedPreferenceKeys.push('highContrast');
        }

        themeStore.applyEffectivePreferences(effectivePreferences, lockedPreferenceKeys);

        set({
          status: 'authenticated',
          user: result.data.user,
          effectivePreferences,
          lockedPreferenceKeys,
        });
      }
    },

    async login(credentials: LoginInput): Promise<{ error?: CategorizedApiError }> {
      set({ status: 'authenticating', user: null, lockedPreferenceKeys: [] });

      const result = await login(credentials);

      if (result.error) {
        set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
        return { error: result.error };
      }

      if (result.data) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf-token' && value) {
            apiClient.setCsrfToken(value);
            break;
          }
        }

        const meResult = await getCurrentUser();
        let effectivePreferences: unknown;
        const lockedPreferenceKeys: string[] = [];

        if (meResult.data) {
          effectivePreferences = meResult.data.effectivePreferences;

          if (meResult.data.profile?.policyLockedPreferences) {
            const locked = meResult.data.profile.policyLockedPreferences;
            if (locked.theme) lockedPreferenceKeys.push('theme');
            if (locked.enableTerminalEffects) lockedPreferenceKeys.push('enableTerminalEffects');
            if (locked.effects && Object.keys(locked.effects).length > 0)
              lockedPreferenceKeys.push('effects');
            if (locked.fontSize) lockedPreferenceKeys.push('fontSize');
            if (locked.reducedMotion) lockedPreferenceKeys.push('reducedMotion');
            if (locked.highContrast) lockedPreferenceKeys.push('highContrast');
          }

          themeStore.applyEffectivePreferences(effectivePreferences, lockedPreferenceKeys);
        }

        set({
          status: 'authenticated',
          user: result.data.user,
          effectivePreferences,
          lockedPreferenceKeys,
        });
        return {};
      }

      set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
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
      set({ status: 'authenticating', user: null, lockedPreferenceKeys: [] });

      const result = await register(credentials);

      if (result.error) {
        set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
        return { error: result.error };
      }

      if (result.data) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf-token' && value) {
            apiClient.setCsrfToken(value);
            break;
          }
        }

        const meResult = await getCurrentUser();
        let effectivePreferences: unknown;
        const lockedPreferenceKeys: string[] = [];

        if (meResult.data) {
          effectivePreferences = meResult.data.effectivePreferences;

          if (meResult.data.profile?.policyLockedPreferences) {
            const locked = meResult.data.profile.policyLockedPreferences;
            if (locked.theme) lockedPreferenceKeys.push('theme');
            if (locked.enableTerminalEffects) lockedPreferenceKeys.push('enableTerminalEffects');
            if (locked.effects && Object.keys(locked.effects).length > 0)
              lockedPreferenceKeys.push('effects');
            if (locked.fontSize) lockedPreferenceKeys.push('fontSize');
            if (locked.reducedMotion) lockedPreferenceKeys.push('reducedMotion');
            if (locked.highContrast) lockedPreferenceKeys.push('highContrast');
          }

          themeStore.applyEffectivePreferences(effectivePreferences, lockedPreferenceKeys);
        }

        set({
          status: 'authenticated',
          user: result.data.user,
          effectivePreferences,
          lockedPreferenceKeys,
        });
        return {};
      }

      set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
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
      apiClient.clearCsrfToken();
      await apiLogout();
      themeStore.clearPendingSync();
      themeStore.init();
      set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
    },

    expire(): void {
      set({ status: 'expired', user: null, lockedPreferenceKeys: [] });
    },

    clear(): void {
      themeStore.clearPendingSync();
      themeStore.init();
      set({ status: 'anonymous', user: null, lockedPreferenceKeys: [] });
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

export const effectivePreferences: Readable<unknown> = derived(
  sessionStore,
  ($session) => $session.effectivePreferences,
);

export const lockedPreferenceKeys: Readable<string[]> = derived(
  sessionStore,
  ($session) => $session.lockedPreferenceKeys,
);
