import { writable, derived, get } from 'svelte/store';

import {
  login,
  register,
  logout as apiLogout,
  getCurrentUser,
  updatePreferences,
  getMfaStatus,
} from '$lib/api/auth';
import { authService } from '$lib/api/auth.service';
import type { CategorizedApiError } from '$lib/api/types';
import type { LoginInput, RegisterInput } from '@the-dmz/shared/schemas';
import { logger } from '$lib/logger';
import { SessionStatus, UserRole } from '$lib/constants/session';

import { themeStore } from './theme';

import type { Readable } from 'svelte/store';

export type SessionStatus =
  | 'anonymous'
  | 'authenticating'
  | 'authenticated'
  | 'expired'
  | 'revoked'
  | 'policy_denied'
  | 'mfa_required';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: string;
  isActive: boolean;
}

export interface MfaState {
  mfaRequired: boolean;
  mfaVerified: boolean;
  method: string | null;
  mfaVerifiedAt: string | null;
  hasCredentials: boolean;
}

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  effectivePreferences?: unknown;
  lockedPreferenceKeys: string[];
  mfa: MfaState | null;
}

export const initialSessionState: SessionState = {
  status: SessionStatus.ANONYMOUS,
  user: null,
  effectivePreferences: undefined,
  lockedPreferenceKeys: [],
  mfa: null,
};

async function syncPreferencesToServer(preferences: {
  theme?: string;
  enableTerminalEffects?: boolean;
  effects?: unknown;
  fontSize?: number;
}): Promise<void> {
  const themePrefs: {
    theme?: 'green' | 'amber' | 'high-contrast' | 'enterprise' | 'admin-light' | 'admin-dark';
    enableTerminalEffects?: boolean;
    effects?: {
      scanlines: boolean;
      curvature: boolean;
      glow: boolean;
      noise: boolean;
      vignette: boolean;
      flicker: boolean;
    };
    fontSize?: number;
  } = {};

  if (preferences.theme !== undefined) {
    themePrefs.theme = preferences.theme as
      | 'green'
      | 'amber'
      | 'high-contrast'
      | 'enterprise'
      | 'admin-light'
      | 'admin-dark';
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
      flicker: boolean;
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
    logger.error('Failed to sync preferences', { error: result.error });
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
      set({
        status: SessionStatus.AUTHENTICATING,
        user: null,
        lockedPreferenceKeys: [],
        mfa: null,
      });

      const result = await getCurrentUser();

      if (result.error) {
        if (result.error.category === 'authentication') {
          if (result.error.code === 'AUTH_SESSION_REVOKED') {
            set({ status: SessionStatus.REVOKED, user: null, lockedPreferenceKeys: [], mfa: null });
          } else if (
            result.error.code === 'AUTH_SESSION_EXPIRED' ||
            result.error.code === 'AUTH_TOKEN_EXPIRED'
          ) {
            set({ status: SessionStatus.EXPIRED, user: null, lockedPreferenceKeys: [], mfa: null });
          } else {
            set({
              status: SessionStatus.ANONYMOUS,
              user: null,
              lockedPreferenceKeys: [],
              mfa: null,
            });
          }
        } else if (result.error.category === 'authorization') {
          set({
            status: SessionStatus.POLICY_DENIED,
            user: null,
            lockedPreferenceKeys: [],
            mfa: null,
          });
        } else {
          set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
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

        let mfaState: MfaState | null = null;
        if (result.data.user.role === UserRole.SUPER_ADMIN) {
          const mfaResult = await getMfaStatus();
          if (mfaResult.data) {
            mfaState = {
              mfaRequired: mfaResult.data.mfaRequired,
              mfaVerified: mfaResult.data.mfaVerified,
              method: mfaResult.data.method,
              mfaVerifiedAt: mfaResult.data.mfaVerifiedAt,
              hasCredentials: mfaResult.data.hasCredentials,
            };
          }
        }

        if (mfaState?.mfaRequired && !mfaState?.mfaVerified) {
          set({
            status: SessionStatus.MFA_REQUIRED,
            user: result.data.user,
            effectivePreferences,
            lockedPreferenceKeys,
            mfa: mfaState,
          });
        } else {
          set({
            status: SessionStatus.AUTHENTICATED,
            user: result.data.user,
            effectivePreferences,
            lockedPreferenceKeys,
            mfa: mfaState,
          });
        }
      }
    },

    async login(credentials: LoginInput): Promise<{ error?: CategorizedApiError }> {
      set({
        status: SessionStatus.AUTHENTICATING,
        user: null,
        lockedPreferenceKeys: [],
        mfa: null,
      });

      const result = await login(credentials);

      if (result.error) {
        set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
        return { error: result.error };
      }

      if (result.data) {
        authService.setCsrfFromCurrentCookie();

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
          status: SessionStatus.AUTHENTICATED,
          user: result.data.user,
          effectivePreferences,
          lockedPreferenceKeys,
          mfa: null,
        });
        return {};
      }

      set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
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
      set({
        status: SessionStatus.AUTHENTICATING,
        user: null,
        lockedPreferenceKeys: [],
        mfa: null,
      });

      const result = await register(credentials);

      if (result.error) {
        set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
        return { error: result.error };
      }

      if (result.data) {
        authService.setCsrfFromCurrentCookie();

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
          status: SessionStatus.AUTHENTICATED,
          user: result.data.user,
          effectivePreferences,
          lockedPreferenceKeys,
          mfa: null,
        });
        return {};
      }

      set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
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
      authService.clearCsrfToken();
      await apiLogout();
      themeStore.clearPendingSync();
      themeStore.init();
      set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
    },

    expire(): void {
      set({ status: SessionStatus.EXPIRED, user: null, lockedPreferenceKeys: [], mfa: null });
    },

    revoke(): void {
      set({ status: SessionStatus.REVOKED, user: null, lockedPreferenceKeys: [], mfa: null });
    },

    policyDeny(): void {
      set({ status: SessionStatus.POLICY_DENIED, user: null, lockedPreferenceKeys: [], mfa: null });
    },

    clear(): void {
      themeStore.clearPendingSync();
      themeStore.init();
      set({ status: SessionStatus.ANONYMOUS, user: null, lockedPreferenceKeys: [], mfa: null });
    },
  };
}

export const sessionStore = createSessionStore();

export const isAuthenticated: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.AUTHENTICATED,
);

export const isAuthenticating: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.AUTHENTICATING,
);

export const isAnonymous: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.ANONYMOUS,
);

export const isExpired: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.EXPIRED,
);

export const isRevoked: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.REVOKED,
);

export const isPolicyDenied: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.POLICY_DENIED,
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
  ($session) => $session.user?.role === UserRole.ADMIN,
);

export const isPlayer: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.user?.role === UserRole.PLAYER || $session.user?.role === UserRole.ADMIN,
);

export const effectivePreferences: Readable<unknown> = derived(
  sessionStore,
  ($session) => $session.effectivePreferences,
);

export const lockedPreferenceKeys: Readable<string[]> = derived(
  sessionStore,
  ($session) => $session.lockedPreferenceKeys,
);

export const mfaState: Readable<MfaState | null> = derived(
  sessionStore,
  ($session) => $session.mfa,
);

export const isMfaRequired: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.status === SessionStatus.MFA_REQUIRED,
);

export const isSuperAdmin: Readable<boolean> = derived(
  sessionStore,
  ($session) => $session.user?.role === UserRole.SUPER_ADMIN,
);
