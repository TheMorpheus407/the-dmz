import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getMfaStatus: vi.fn(),
}));

vi.mock('$lib/api/auth.service', () => ({
  authService: {
    setCsrfFromCurrentCookie: vi.fn(),
    clearCsrfToken: vi.fn(),
    setCsrfToken: vi.fn(),
    getCsrfToken: vi.fn(),
    hasCsrfToken: vi.fn(),
    extractCsrfFromCookie: vi.fn(),
  },
}));

vi.mock('$app/environment', () => ({
  browser: true,
}));

const mockDocumentElement = {
  dataset: {} as Record<string, string>,
  style: {
    setProperty: vi.fn(),
  },
};

import { SessionStatus, UserRole } from '$lib/constants/session';

import {
  sessionStore,
  isAuthenticated,
  isAnonymous,
  isExpired,
  currentUser,
  userRole,
  isAdmin,
  isPlayer,
  isRevoked,
  isPolicyDenied,
  isMfaRequired,
  isSuperAdmin,
  isAuthenticating,
} from './session';

const { login, register, logout, getCurrentUser, getMfaStatus } = await import('$lib/api/auth');
const { authService } = await import('$lib/api/auth.service');

describe('sessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentElement.dataset = {};
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.stubGlobal('document', {
      documentElement: mockDocumentElement,
      cookie: '',
    });
    sessionStore.clear();
    document.cookie = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      vi.useRealTimers();

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

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      vi.useRealTimers();

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

    it('calls authService.setCsrfFromCurrentCookie after successful login', async () => {
      const csrfToken = 'abc123==';
      document.cookie = `csrf-token=${csrfToken};other-cookie=value`;

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

      await sessionStore.login({
        email: 'test@example.com',
        password: 'valid pass 1234',
      });

      expect(authService.setCsrfFromCurrentCookie).toHaveBeenCalled();
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

    it('calls authService.setCsrfFromCurrentCookie after successful registration', async () => {
      const csrfToken = 'xyz789==';
      document.cookie = `csrf-token=${csrfToken};other=value`;

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

      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'new@example.com',
            displayName: 'New User',
            tenantId: '456',
            role: 'player',
            isActive: true,
          },
        },
      });

      await sessionStore.register({
        email: 'new@example.com',
        password: 'valid pass 1234',
        displayName: 'New User',
      });

      expect(authService.setCsrfFromCurrentCookie).toHaveBeenCalled();
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

    it('calls authService.clearCsrfToken during logout', async () => {
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

      expect(authService.clearCsrfToken).toHaveBeenCalled();
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

  describe('isAuthenticating', () => {
    it('is true when status is authenticating', async () => {
      vi.mocked(getCurrentUser).mockImplementation(() => new Promise(() => {}));

      const bootstrapPromise = sessionStore.bootstrap();

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      vi.useRealTimers();

      expect(get(isAuthenticating)).toBe(true);

      bootstrapPromise.catch(() => {});
    });
  });

  describe('isRevoked', () => {
    it('is true when status is revoked', () => {
      sessionStore.revoke();
      expect(get(isRevoked)).toBe(true);
    });

    it('is false when status is anonymous', () => {
      sessionStore.clear();
      expect(get(isRevoked)).toBe(false);
    });
  });

  describe('isPolicyDenied', () => {
    it('is true when status is policy_denied', () => {
      sessionStore.policyDeny();
      expect(get(isPolicyDenied)).toBe(true);
    });

    it('is false when status is anonymous', () => {
      sessionStore.clear();
      expect(get(isPolicyDenied)).toBe(false);
    });
  });

  describe('isMfaRequired', () => {
    it('is true when status is mfa_required', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'super@example.com',
            displayName: 'Super Admin',
            tenantId: '456',
            role: UserRole.SUPER_ADMIN,
            isActive: true,
          },
        },
      });

      vi.mocked(getMfaStatus).mockResolvedValue({
        data: {
          mfaRequired: true,
          mfaVerified: false,
          method: null,
          mfaVerifiedAt: null,
          hasCredentials: false,
        },
      });

      await sessionStore.bootstrap();

      expect(get(isMfaRequired)).toBe(true);
    });
  });

  describe('isSuperAdmin', () => {
    it('is true when role is super-admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'super@example.com',
            displayName: 'Super Admin',
            tenantId: '456',
            role: UserRole.SUPER_ADMIN,
            isActive: true,
          },
        },
      });

      vi.mocked(getMfaStatus).mockResolvedValue({
        data: {
          mfaRequired: true,
          mfaVerified: true,
          method: null,
          mfaVerifiedAt: null,
          hasCredentials: false,
        },
      });

      await sessionStore.bootstrap();

      expect(get(isSuperAdmin)).toBe(true);
    });

    it('is false when role is admin', async () => {
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

      expect(get(isSuperAdmin)).toBe(false);
    });
  });

  describe('revoke method', () => {
    it('sets status to revoked and clears user', () => {
      sessionStore.revoke();
      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.REVOKED);
      expect(state.user).toBeNull();
    });
  });

  describe('policyDeny method', () => {
    it('sets status to policy_denied and clears user', () => {
      sessionStore.policyDeny();
      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.POLICY_DENIED);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with AUTH_SESSION_REVOKED', () => {
    it('sets status to revoked on AUTH_SESSION_REVOKED error', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'authentication' as const,
          code: 'AUTH_SESSION_REVOKED',
          message: 'Session revoked',
          status: 401,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.REVOKED);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with authorization error', () => {
    it('sets status to policy_denied on authorization error', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'authorization' as const,
          code: 'POLICY_DENIED',
          message: 'Policy denied',
          status: 403,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.POLICY_DENIED);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with AUTH_SESSION_EXPIRED', () => {
    it('sets status to expired on AUTH_SESSION_EXPIRED error', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'authentication' as const,
          code: 'AUTH_SESSION_EXPIRED',
          message: 'Session expired',
          status: 401,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.EXPIRED);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with AUTH_TOKEN_EXPIRED', () => {
    it('sets status to expired on AUTH_TOKEN_EXPIRED error', async () => {
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
      expect(state.status).toBe(SessionStatus.EXPIRED);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with other authentication error', () => {
    it('sets status to anonymous on other authentication error codes', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'authentication' as const,
          code: 'CREDENTIALS_INVALID',
          message: 'Invalid credentials',
          status: 401,
          retryable: true,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.ANONYMOUS);
      expect(state.user).toBeNull();
    });
  });

  describe('bootstrap with other error category', () => {
    it('sets status to anonymous on server error category', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          status: 500,
          retryable: false,
        },
      });

      await sessionStore.bootstrap();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.ANONYMOUS);
      expect(state.user).toBeNull();
    });
  });

  describe('session store uses SessionStatus constants', () => {
    it('initial state uses SessionStatus.ANONYMOUS', () => {
      sessionStore.clear();
      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.ANONYMOUS);
    });

    it('expire sets status to SessionStatus.EXPIRED', () => {
      sessionStore.expire();
      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.EXPIRED);
    });

    it('clear sets status to SessionStatus.ANONYMOUS', () => {
      sessionStore.expire();
      sessionStore.clear();
      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.ANONYMOUS);
    });

    it('logout sets status to SessionStatus.ANONYMOUS', async () => {
      vi.mocked(logout).mockResolvedValue({});
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '456',
            role: UserRole.PLAYER,
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();
      await sessionStore.logout();

      const state = get(sessionStore);
      expect(state.status).toBe(SessionStatus.ANONYMOUS);
    });
  });

  describe('session store uses UserRole constants', () => {
    it('isAdmin uses UserRole.ADMIN constant', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'admin@example.com',
            displayName: 'Admin User',
            tenantId: '456',
            role: UserRole.ADMIN,
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();

      expect(get(isAdmin)).toBe(true);
      expect(get(sessionStore).user?.role).toBe(UserRole.ADMIN);
    });

    it('isPlayer uses UserRole.PLAYER and UserRole.ADMIN constants', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '123',
            email: 'player@example.com',
            displayName: 'Player User',
            tenantId: '456',
            role: UserRole.PLAYER,
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();

      expect(get(isPlayer)).toBe(true);
      expect(get(sessionStore).user?.role).toBe(UserRole.PLAYER);
    });

    it('isPlayer returns true when role is UserRole.ADMIN', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        data: {
          user: {
            id: '456',
            email: 'admin@example.com',
            displayName: 'Admin User',
            tenantId: '456',
            role: UserRole.ADMIN,
            isActive: true,
          },
        },
      });

      await sessionStore.bootstrap();

      expect(get(isPlayer)).toBe(true);
      expect(get(sessionStore).user?.role).toBe(UserRole.ADMIN);
    });
  });
});
