import { describe, expect, it } from 'vitest';

import {
  getErrorCopy,
  getSurfaceFromPath,
  getSeverity,
  getAriaLivePriority,
} from '$lib/api/error-copy';
import type { CategorizedApiError } from '$lib/api/types';

describe('error-copy', () => {
  const baseError: CategorizedApiError = {
    category: 'authentication',
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Token expired',
    status: 401,
    retryable: false,
  };

  describe('getErrorCopy', () => {
    it('returns game surface copy for game route', () => {
      const copy = getErrorCopy(baseError, 'game');
      expect(copy.title).toBe('AUTH_FAILURE');
      expect(copy.message).toContain('Session token');
    });

    it('returns admin surface copy for admin route', () => {
      const copy = getErrorCopy(baseError, 'admin');
      expect(copy.title).toBe('Authentication Failed');
      expect(copy.message).toContain('session has expired');
    });

    it('returns auth surface copy for auth route', () => {
      const copy = getErrorCopy(baseError, 'auth');
      expect(copy.title).toBe('Sign In Failed');
      expect(copy.message).toContain('Invalid email');
    });

    it('returns public surface copy for public route', () => {
      const copy = getErrorCopy(baseError, 'public');
      expect(copy.title).toBe('Please Sign In');
      expect(copy.message).toContain('need to be signed in');
    });

    it('includes request ID for admin surface', () => {
      const errorWithRequestId: CategorizedApiError = {
        ...baseError,
        requestId: 'req-123',
      };
      const copy = getErrorCopy(errorWithRequestId, 'admin');
      expect(copy.message).toContain('req-123');
    });

    it('excludes request ID for non-admin surfaces', () => {
      const errorWithRequestId: CategorizedApiError = {
        ...baseError,
        requestId: 'req-123',
      };
      const copy = getErrorCopy(errorWithRequestId, 'game');
      expect(copy.message).not.toContain('req-123');
    });
  });

  describe('getSurfaceFromPath', () => {
    it('returns game for game routes', () => {
      expect(getSurfaceFromPath('/game')).toBe('game');
      expect(getSurfaceFromPath('/game/')).toBe('game');
      expect(getSurfaceFromPath('/game/some/page')).toBe('game');
    });

    it('returns admin for admin routes', () => {
      expect(getSurfaceFromPath('/admin')).toBe('admin');
      expect(getSurfaceFromPath('/admin/')).toBe('admin');
      expect(getSurfaceFromPath('/admin/users')).toBe('admin');
    });

    it('returns auth for auth routes', () => {
      expect(getSurfaceFromPath('/login')).toBe('auth');
      expect(getSurfaceFromPath('/register')).toBe('auth');
    });

    it('returns public for unknown routes', () => {
      expect(getSurfaceFromPath('/about')).toBe('public');
      expect(getSurfaceFromPath('/docs')).toBe('public');
      expect(getSurfaceFromPath('/')).toBe('public');
    });
  });

  describe('getSeverity', () => {
    it('returns high for authentication errors', () => {
      expect(getSeverity('authentication')).toBe('high');
    });

    it('returns high for authorization errors', () => {
      expect(getSeverity('authorization')).toBe('high');
    });

    it('returns medium for rate limiting errors', () => {
      expect(getSeverity('rate_limiting')).toBe('medium');
    });

    it('returns medium for server errors', () => {
      expect(getSeverity('server')).toBe('medium');
    });

    it('returns medium for network errors', () => {
      expect(getSeverity('network')).toBe('medium');
    });

    it('returns low for validation errors', () => {
      expect(getSeverity('validation')).toBe('low');
    });
  });

  describe('getAriaLivePriority', () => {
    it('returns assertive for high severity errors', () => {
      expect(getAriaLivePriority('authentication')).toBe('assertive');
      expect(getAriaLivePriority('authorization')).toBe('assertive');
    });

    it('returns polite for medium severity errors', () => {
      expect(getAriaLivePriority('rate_limiting')).toBe('polite');
      expect(getAriaLivePriority('server')).toBe('polite');
      expect(getAriaLivePriority('network')).toBe('polite');
    });

    it('returns polite for low severity errors', () => {
      expect(getAriaLivePriority('validation')).toBe('polite');
    });
  });
});
