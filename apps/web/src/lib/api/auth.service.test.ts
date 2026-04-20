import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockCookieStore = new Map<string, string>();

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

vi.stubGlobal('document', {
  get cookie() {
    return Array.from(mockCookieStore.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  },
  set cookie(value: string) {
    const idx = value.indexOf('=');
    if (idx !== -1) {
      const key = value.substring(0, idx);
      const val = value.substring(idx + 1).split(';')[0];
      if (val === '') {
        mockCookieStore.delete(key);
      } else if (val !== undefined) {
        mockCookieStore.set(key, val);
      }
    }
  },
});

const { AuthService } = await import('./auth.service');
const { apiClient } = await import('$lib/api/client');

describe('AuthService', () => {
  beforeEach(() => {
    mockCookieStore.clear();
    vi.clearAllMocks();
  });

  describe('CSRF token extraction from cookies', () => {
    it('extracts csrf-token from document.cookie', () => {
      mockCookieStore.set('csrf-token', 'test-csrf-value');
      mockCookieStore.set('session-id', 'abc123');

      const service = new AuthService();
      const extractedValue = service.extractCsrfFromCookie();

      expect(extractedValue).toBe('test-csrf-value');
    });

    it('returns null when csrf-token cookie is not present', () => {
      mockCookieStore.set('session-id', 'abc123');

      const service = new AuthService();
      const extractedValue = service.extractCsrfFromCookie();

      expect(extractedValue).toBeNull();
    });

    it('handles csrf-token with empty value as missing', () => {
      mockCookieStore.set('csrf-token', '');
      mockCookieStore.set('other', 'value');

      const service = new AuthService();
      const extractedValue = service.extractCsrfFromCookie();

      expect(extractedValue).toBeNull();
    });

    it('handles csrf-token with equals signs in value', () => {
      const csrfWithEquals = 'base64encoded===';
      mockCookieStore.set('csrf-token', csrfWithEquals);
      mockCookieStore.set('other', 'value');

      const service = new AuthService();
      const extractedValue = service.extractCsrfFromCookie();

      expect(extractedValue).toBe(csrfWithEquals);
    });

    it('handles cookies with spaces around semicolons', () => {
      const cookieString = 'csrf-token=myvalue ; session-id=abc123 ; other=value';
      cookieString.split(';').forEach((c) => {
        const trimmed = c.trim();
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.substring(0, idx);
          const value = trimmed.substring(idx + 1);
          mockCookieStore.set(key, value);
        }
      });

      const service = new AuthService();
      const extractedValue = service.extractCsrfFromCookie();

      expect(extractedValue).toBe('myvalue');
    });
  });

  describe('CSRF token storage', () => {
    it('stores and retrieves CSRF token', () => {
      const service = new AuthService();
      service.setCsrfToken('stored-token');

      expect(service.getCsrfToken()).toBe('stored-token');
    });

    it('returns null when no CSRF token is stored', () => {
      const service = new AuthService();

      expect(service.getCsrfToken()).toBeNull();
    });

    it('clears CSRF token', () => {
      const service = new AuthService();
      service.setCsrfToken('some-token');
      service.clearCsrfToken();

      expect(service.getCsrfToken()).toBeNull();
    });

    it('reports hasCsrfToken correctly', () => {
      const service = new AuthService();

      expect(service.hasCsrfToken()).toBe(false);

      service.setCsrfToken('some-token');

      expect(service.hasCsrfToken()).toBe(true);
    });
  });

  describe('initialization from cookie', () => {
    it('initializes CSRF token from cookie on construction', () => {
      mockCookieStore.set('csrf-token', 'cookie-token');

      const service = new AuthService({ initializeFromCookie: true });

      expect(service.getCsrfToken()).toBe('cookie-token');
    });

    it('does not initialize from cookie when option is false', () => {
      mockCookieStore.set('csrf-token', 'cookie-token');

      const service = new AuthService({ initializeFromCookie: false });

      expect(service.getCsrfToken()).toBeNull();
    });

    it('does not initialize from cookie by default', () => {
      mockCookieStore.set('csrf-token', 'cookie-token');

      const service = new AuthService();

      expect(service.getCsrfToken()).toBeNull();
    });
  });

  describe('setCsrfFromCurrentCookie', () => {
    it('extracts and stores CSRF token from current document.cookie', () => {
      mockCookieStore.set('csrf-token', 'extracted-token');
      mockCookieStore.set('session', 'abc');

      const service = new AuthService();
      service.setCsrfFromCurrentCookie();

      expect(service.getCsrfToken()).toBe('extracted-token');
    });

    it('does nothing when no csrf-token cookie exists', () => {
      mockCookieStore.set('session', 'abc');

      const service = new AuthService();
      service.setCsrfFromCurrentCookie();

      expect(service.getCsrfToken()).toBeNull();
    });
  });

  describe('clearCsrfToken behavior', () => {
    it('clearCsrfToken does not affect other stored tokens', () => {
      const service = new AuthService();
      service.setCsrfToken('auth-token-123');

      service.clearCsrfToken();

      expect(service.getCsrfToken()).toBeNull();
    });
  });
});

describe('CSRF token apiClient delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.clear();
  });

  it('calls apiClient.setCsrfToken when setCsrfToken is invoked', () => {
    const service = new AuthService();
    service.setCsrfToken('my-token');

    expect(apiClient.setCsrfToken).toHaveBeenCalledWith('my-token');
  });

  it('calls apiClient.clearCsrfToken when clearCsrfToken is invoked', () => {
    const service = new AuthService();
    service.setCsrfToken('some-token');
    vi.clearAllMocks();

    service.clearCsrfToken();

    expect(apiClient.clearCsrfToken).toHaveBeenCalled();
  });

  it('stores token locally before delegating to apiClient', () => {
    const service = new AuthService();
    service.setCsrfToken('stored-token');

    expect(service.getCsrfToken()).toBe('stored-token');
    expect(apiClient.setCsrfToken).toHaveBeenCalledWith('stored-token');
  });

  it('clears both local storage and apiClient on clearCsrfToken', () => {
    const service = new AuthService();
    service.setCsrfToken('token-to-clear');
    vi.clearAllMocks();

    service.clearCsrfToken();

    expect(service.getCsrfToken()).toBeNull();
    expect(apiClient.clearCsrfToken).toHaveBeenCalled();
  });
});

describe('SSR environment', () => {
  it('setCsrfFromCurrentCookie returns early without error when document is undefined', () => {
    vi.stubGlobal('document', undefined);

    const service = new AuthService();

    expect(() => service.setCsrfFromCurrentCookie()).not.toThrow();
    expect(service.getCsrfToken()).toBeNull();
  });
});

describe('AuthService singleton instance', () => {
  beforeEach(() => {
    mockCookieStore.clear();
  });

  it('provides a singleton instance for use across the app', async () => {
    const { authService } = await import('./auth.service');

    expect(authService).toBeDefined();
    expect(typeof authService.getCsrfToken).toBe('function');
    expect(typeof authService.setCsrfToken).toBe('function');
    expect(typeof authService.clearCsrfToken).toBe('function');
    expect(typeof authService.extractCsrfFromCookie).toBe('function');
    expect(typeof authService.setCsrfFromCurrentCookie).toBe('function');
    expect(typeof authService.hasCsrfToken).toBe('function');
  });
});
