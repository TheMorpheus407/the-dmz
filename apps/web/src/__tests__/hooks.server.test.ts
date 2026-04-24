import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { RequestEvent, HandleServerError } from '@sveltejs/kit';

const mockError = vi.hoisted(() => vi.fn());
const mockInfo = vi.hoisted(() => vi.fn());
const mockWarn = vi.hoisted(() => vi.fn());
const mockDebug = vi.hoisted(() => vi.fn());

vi.mock('$lib/logger', () => ({
  logger: {
    error: mockError,
    info: mockInfo,
    warn: mockWarn,
    debug: mockDebug,
  },
}));

vi.mock('$lib/config/env.js', () => ({
  loadFrontendConfig: vi.fn(() => ({
    PUBLIC_ENVIRONMENT: 'test',
    CSP_FRAME_ANCESTORS: 'none',
    CSP_CONNECT_SRC: '',
    CSP_IMG_SRC: '',
    COEP_POLICY: 'credentialless',
  })),
}));

vi.mock('@the-dmz/shared', () => ({
  buildSecurityHeadersPolicy: vi.fn(() => ({
    csp: { directives: {}, includeTrustedTypes: false },
    xFrameOptions: 'deny',
    xContentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: '',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: 'credentialless',
    crossOriginResourcePolicy: 'same-origin',
    strictTransportSecurity: null,
  })),
  buildCspHeaderValue: vi.fn(() => ''),
}));

describe('hooks.server.ts handleError', () => {
  let handleError: HandleServerError;

  const mockRequestEvent = (
    overrides: { user?: App.Locals['user'] } & Partial<Omit<App.Locals, 'user'>> = {},
  ) => {
    const userOverride = overrides.user;
    const { user: _user, ...restOverrides } = overrides;
    return {
      request: new Request('http://localhost/test'),
      url: new URL('http://localhost/test'),
      params: {},
      cookies: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(),
        has: vi.fn(),
      },
      platform: undefined,
      isSubRequest: false,
      locals: {
        user: userOverride !== undefined ? userOverride : null,
        ...restOverrides,
      },
    } as unknown as RequestEvent;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // @ts-expect-error - $lib alias resolution differs between TypeScript and Vite
    const module = await import('$lib/hooks.server.js');
    handleError = module.handleError;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error enrichment', () => {
    it('should add requestId to error object', async () => {
      const event = mockRequestEvent();
      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
      expect(typeof result?.requestId).toBe('string');
    });

    it('should generate valid UUID v4 for requestId', async () => {
      const event = mockRequestEvent();
      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result?.requestId).toMatch(uuidRegex);
    });

    it('should include tenantId from locals when user exists', async () => {
      const event = mockRequestEvent({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          tenantId: 'tenant-456',
          role: 'player',
          isActive: true,
        },
      });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('tenantId', 'tenant-456');
    });

    it('should include userId from locals when user exists', async () => {
      const event = mockRequestEvent({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          tenantId: 'tenant-456',
          role: 'player',
          isActive: true,
        },
      });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('userId', 'user-123');
    });

    it('should not include tenantId when user is null', async () => {
      const event = mockRequestEvent({ user: null });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).not.toHaveProperty('tenantId');
    });

    it('should not include userId when user is null', async () => {
      const event = mockRequestEvent({ user: null });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).not.toHaveProperty('userId');
    });

    it('should not include tenantId when user is undefined', async () => {
      const event = mockRequestEvent({ user: undefined });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).not.toHaveProperty('tenantId');
    });

    it('should not include userId when user is undefined', async () => {
      const event = mockRequestEvent({ user: undefined });

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).not.toHaveProperty('userId');
    });

    it('should include code property', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('code');
    });

    it('should preserve the original error message', async () => {
      const event = mockRequestEvent();
      const originalError = new Error('Original error message');

      const result = await handleError({
        error: originalError,
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('message', 'Original error message');
    });
  });

  describe('error logging', () => {
    it('should log error with requestId', async () => {
      const event = mockRequestEvent();

      await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(mockError).toHaveBeenCalledWith(
        'SSR Error',
        expect.objectContaining({
          requestId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        }),
      );
    });

    it('should log error with tenantId when user exists', async () => {
      const event = mockRequestEvent({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          tenantId: 'tenant-456',
          role: 'player',
          isActive: true,
        },
      });

      await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(mockError).toHaveBeenCalledWith(
        'SSR Error',
        expect.objectContaining({
          tenantId: 'tenant-456',
        }),
      );
    });

    it('should log error with userId when user exists', async () => {
      const event = mockRequestEvent({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          tenantId: 'tenant-456',
          role: 'player',
          isActive: true,
        },
      });

      await handleError({
        error: new Error('Test error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(mockError).toHaveBeenCalledWith(
        'SSR Error',
        expect.objectContaining({
          userId: 'user-123',
        }),
      );
    });

    it('should log error with status code', async () => {
      const event = mockRequestEvent();

      await handleError({
        error: new Error('Test error'),
        event,
        status: 404,
        message: 'Not Found',
      });

      expect(mockError).toHaveBeenCalledWith(
        'SSR Error',
        expect.objectContaining({
          status: 404,
        }),
      );
    });

    it('should log error with original error object', async () => {
      const event = mockRequestEvent();
      const originalError = new Error('Specific error');

      await handleError({
        error: originalError,
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(mockError).toHaveBeenCalledWith(
        'SSR Error',
        expect.objectContaining({
          error: originalError,
        }),
      );
    });
  });

  describe('different error types', () => {
    it('should handle string errors', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: 'String error',
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
      expect(result?.message).toBe('Internal Error');
    });

    it('should handle object errors', async () => {
      const event = mockRequestEvent();
      const errorObj = { custom: 'error', code: 'CUSTOM_ERROR' };

      const result = await handleError({
        error: errorObj,
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
    });

    it('should handle null error', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: null,
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
    });

    it('should handle undefined error', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: undefined,
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
    });
  });

  describe('different HTTP status codes', () => {
    it('should handle 400 Bad Request errors', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Bad request'),
        event,
        status: 400,
        message: 'Bad Request',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status', 400);
    });

    it('should handle 401 Unauthorized errors', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Unauthorized'),
        event,
        status: 401,
        message: 'Unauthorized',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status', 401);
    });

    it('should handle 403 Forbidden errors', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Forbidden'),
        event,
        status: 403,
        message: 'Forbidden',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status', 403);
    });

    it('should handle 404 Not Found errors', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Not found'),
        event,
        status: 404,
        message: 'Not Found',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status', 404);
    });

    it('should handle 500 Internal Server Error', async () => {
      const event = mockRequestEvent();

      const result = await handleError({
        error: new Error('Internal error'),
        event,
        status: 500,
        message: 'Internal Error',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status', 500);
    });
  });
});
