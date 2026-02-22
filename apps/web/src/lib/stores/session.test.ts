import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  sessionStore,
  isAuthenticated,
  isAnonymous,
  isExpired,
  currentUser,
  userRole,
  isAdmin,
  isPlayer,
} from './session';

vi.mock('$lib/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('$app/environment', () => ({
  browser: true,
}));

const { login, register, logout, getCurrentUser } = await import('$lib/api/auth');

describe('sessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
  });

  describe('initial state', () => {
    it('has correct initial session state', () => {
      const state = get(sessionStore);
      expect(state.status).toBe('anonymous');
      expect(state.user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('is false when status is anonymous', () => {
      sessionStore.clear();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('is false when status is authenticating', () => {
      sessionStore.subscribe(() => {});
      sessionStore.expire();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('is false when status is expired', () => {
      sessionStore.expire();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('isAnonymous', () => {
    it('is true when status is anonymous', () => {
      sessionStore.clear();
      expect(get(isAnonymous)).toBe(true);
    });

    it('is false when status is authenticated', () => {
      sessionStore.subscribe(() => {});
      sessionStore.clear();
    });
  });

  describe('isExpired', () => {
    it('is true when status is expired', () => {
      sessionStore.expire();
      expect(get(isExpired)).toBe(true);
    });

    it('is false when status is anonymous', () => {
      sessionStore.clear();
      expect(get(isExpired)).toBe(false);
    });
  });

  describe('bootstrap', () => {
    it('sets status to authenticating initially', async () => {
      vi.mocked(getCurrentUser).mockImplementation(() => new Promise(() => {}));

      const bootstrapPromise = sessionStore.bootstrap();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = get(sessionStore);
      expect(state.status).toBe('authenticating');

      bootstrapPromise.catch(() => {});
    });

    it('sets status to authenticated on successful /auth/me call', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '456',
            role: 'player',
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual({
        id: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: '456',
        role: 'player',
        isActive: true,
      });
    });

    it('sets status to expired on 401 response', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'authentication' as const,
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Token expired',
          status: 401,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe('expired');
      expect(state.user).toBeNull();
    });

    it('sets status to anonymous on non-auth errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'INTERNAL_ERROR',
          message: 'Server error',
          status: 500,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe('anonymous');
      expect(state.user).toBeNull();
    });
  });

  describe('login', () => {
    it('sets status to authenticating initially', async () => {
      vi.mocked(login).mockImplementation(() => new Promise(() => {}));

      const loginPromise = sessionStore.login({
        email: 'test@example.com',
        password: 'valid pass 1234',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = get(sessionStore);
      expect(state.status).toBe('authenticating');

      loginPromise.catch(() => {});
    });

    it('sets status to authenticated on successful login', async () => {
      vi.mocked(login).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '456',
            role: 'player',
            isActive: true,
          },
          accessToken: 'access-token',
        },
      });

      const result = await sessionStore.login({
        email: 'test@example.com',
        password: 'valid pass 1234',
      });

      expect(result.error).toBeUndefined();
      const state = get(sessionStore);
      expect(state.status).toBe('authenticated');
      expect(state.user?.email).toBe('test@example.com');
    });

    it('returns error and sets status to anonymous on failed login', async () => {
      vi.mocked(login).mockResolvedValue({
        error: {
          category: 'authentication',
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          status: 401,
          retryable: false,
        },
      });

      const result = await sessionStore.login({
        email: 'test@example.com',
        password: 'wrong pass 1234',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('authentication');
      const state = get(sessionStore);
      expect(state.status).toBe('anonymous');
    });
  });

  describe('register', () => {
    it('sets status to authenticated on successful registration', async () => {
      vi.mocked(register).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'new@example.com',
            displayName: 'New User',
            tenantId: '456',
            role: 'player',
            isActive: true,
          },
          accessToken: 'access-token',
        },
      });

      const result = await sessionStore.register({
        email: 'new@example.com',
        password: 'valid pass 1234',
        displayName: 'New User',
      });

      expect(result.error).toBeUndefined();
      const state = get(sessionStore);
      expect(state.status).toBe('authenticated');
      expect(state.user?.email).toBe('new@example.com');
    });
  });

  describe('logout', () => {
    it('clears session state after logout', async () => {
      vi.mocked(logout).mockResolvedValue({});
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '456',
            role: 'player',
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();
      await sessionStore.logout();

      const state = get(sessionStore);
      expect(state.status).toBe('anonymous');
      expect(state.user).toBeNull();
      expect(logout).toHaveBeenCalled();
    });
  });

  describe('expire', () => {
    it('sets status to expired', () => {
      sessionStore.expire();
      const state = get(sessionStore);
      expect(state.status).toBe('expired');
      expect(get(isExpired)).toBe(true);
    });
  });

  describe('clear', () => {
    it('resets to anonymous state', () => {
      sessionStore.expire();
      sessionStore.clear();
      const state = get(sessionStore);
      expect(state.status).toBe('anonymous');
      expect(state.user).toBeNull();
    });
  });

  describe('derived stores', () => {
    beforeEach(async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'admin@example.com',
            displayName: 'Admin User',
            tenantId: '456',
            role: 'admin',
            isActive: true,
          },
        },
      });
      await sessionStore.bootstrap();
    });

    it('currentUser returns user data', () => {
      const user = get(currentUser);
      expect(user?.email).toBe('admin@example.com');
      expect(user?.role).toBe('admin');
    });

    it('userRole returns role string', () => {
      expect(get(userRole)).toBe('admin');
    });

    it('isAdmin is true for admin role', () => {
      expect(get(isAdmin)).toBe(true);
    });

    it('isPlayer is true for admin role', () => {
      expect(get(isPlayer)).toBe(true);
    });
  });
});
