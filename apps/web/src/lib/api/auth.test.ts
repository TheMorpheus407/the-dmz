import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import('./client');

const { login, register, refresh, logout, getCurrentUser } = await import('./auth');

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls POST /auth/login with credentials', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
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
          refreshToken: 'refresh-token',
        },
      });

      const result = await login({ email: 'test@example.com', password: 'valid pass 1234' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'valid pass 1234',
      });
      expect(result.data).toBeDefined();
    });

    it('returns error on failed login', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        error: {
          category: 'authentication',
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          status: 401,
          retryable: false,
        },
      });

      const result = await login({ email: 'test@example.com', password: 'wrong pass 1234' });

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('authentication');
    });

    it('returns error on invalid response format', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          user: 'invalid',
        },
      });

      const result = await login({ email: 'test@example.com', password: 'valid pass 1234' });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('register', () => {
    it('calls POST /auth/register with user data', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
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
          refreshToken: 'refresh-token',
        },
      });

      const result = await register({
        email: 'new@example.com',
        password: 'valid pass 1234',
        displayName: 'New User',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'valid pass 1234',
        displayName: 'New User',
      });
      expect(result.data).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('calls POST /auth/refresh with tokens', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const result = await refresh({ refreshToken: 'old-refresh-token' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result.data).toBeDefined();
    });
  });

  describe('logout', () => {
    it('calls DELETE /auth/logout', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: {
          success: true,
        },
      });

      const result = await logout();

      expect(apiClient.delete).toHaveBeenCalledWith('/auth/logout');
      expect(result.data).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    it('calls GET /auth/me', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          user: {
            id: '12345678-1234-1234-1234-123456789012',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '12345678-1234-1234-1234-123456789013',
            role: 'player',
            isActive: true,
          },
        },
      });

      const result = await getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result.data).toBeDefined();
    });

    it('returns error on 401', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'authentication',
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Token expired',
          status: 401,
          retryable: false,
        },
      });

      const result = await getCurrentUser();

      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('authentication');
    });
  });
});
