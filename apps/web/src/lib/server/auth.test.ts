import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

vi.mock('$lib/config/dev-ports.js', () => ({
  resolveApiProxyTarget: vi.fn(),
}));

const { resolveApiProxyTarget } = await import('$lib/config/dev-ports.js');
const { getServerUser } = await import('./auth');

describe('getServerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('uses VITE_API_URL when configured', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
      API_PORT: '3001',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(resolveApiProxyTarget).toHaveBeenCalledWith(env);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.test/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    expect(result).toEqual({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      displayName: 'Test User',
      tenantId: '12345678-1234-1234-1234-123456789013',
      role: 'player',
      isActive: true,
    });
  });

  it('falls back to localhost when VITE_API_URL is not set', async () => {
    const env = {
      API_PORT: '3001',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('http://localhost:3001');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(resolveApiProxyTarget).toHaveBeenCalledWith(env);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    expect(result).toEqual({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      displayName: 'Test User',
      tenantId: '12345678-1234-1234-1234-123456789013',
      role: 'player',
      isActive: true,
    });
  });

  it('falls back to localhost with default port when API_PORT is also missing', async () => {
    const env = {};
    vi.mocked(resolveApiProxyTarget).mockReturnValue('http://localhost:3001');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(resolveApiProxyTarget).toHaveBeenCalledWith(env);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    expect(result).toEqual({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      displayName: 'Test User',
      tenantId: '12345678-1234-1234-1234-123456789013',
      role: 'player',
      isActive: true,
    });
  });

  it('returns null when response is not ok', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockRejectedValue(new Error('Network error'));

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(result).toBeNull();
  });

  it('returns null when response JSON has invalid structure', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: 'invalid',
        },
      }),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(result).toBeNull();
  });

  it('returns null when response has no data field', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(result).toBeNull();
  });

  it('returns user data when response has extra fields in user object', async () => {
    const env = {
      VITE_API_URL: 'https://api.example.test',
    };
    vi.mocked(resolveApiProxyTarget).mockReturnValue('https://api.example.test');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: '12345678-1234-1234-1234-123456789012',
            email: 'test@example.com',
            displayName: 'Test User',
            tenantId: '12345678-1234-1234-1234-123456789013',
            role: 'player',
            isActive: true,
            extraField: 'should be stripped',
            anotherExtra: 42,
          },
        },
      }),
    });

    const event = { fetch: mockFetch };
    const result = await getServerUser(event, env);

    expect(result).toEqual({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      displayName: 'Test User',
      tenantId: '12345678-1234-1234-1234-123456789013',
      role: 'player',
      isActive: true,
    });
  });
});
