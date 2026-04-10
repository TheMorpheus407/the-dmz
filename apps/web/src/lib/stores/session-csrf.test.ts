import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
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

vi.mock('$lib/api/client', () => ({
  apiClient: {
    setCsrfToken: vi.fn(),
    clearCsrfToken: vi.fn(),
    getCsrfToken: vi.fn(),
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

import { sessionStore } from './session';

const { login, register, logout, getCurrentUser } = await import('$lib/api/auth');
const { authService } = await import('$lib/api/auth.service');
const { apiClient } = await import('$lib/api/client');

describe('sessionStore CSRF abstraction', () => {
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

  describe('login CSRF handling', () => {
    it('calls authService.setCsrfFromCurrentCookie after successful login', async () => {
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

    it('does NOT directly call apiClient.setCsrfToken after login', async () => {
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

      expect(apiClient.setCsrfToken).not.toHaveBeenCalled();
    });
  });

  describe('register CSRF handling', () => {
    it('calls authService.setCsrfFromCurrentCookie after successful registration', async () => {
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

    it('does NOT directly call apiClient.setCsrfToken after registration', async () => {
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

      expect(apiClient.setCsrfToken).not.toHaveBeenCalled();
    });
  });

  describe('logout CSRF handling', () => {
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

    it('does NOT directly call apiClient.clearCsrfToken during logout', async () => {
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

      expect(apiClient.clearCsrfToken).not.toHaveBeenCalled();
    });
  });
});
