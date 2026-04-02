import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockSentryInit = vi.fn();
const mockSentryClose = vi.fn().mockResolvedValue(undefined);
const mockSentryCaptureException = vi.fn();
const mockSentryCaptureMessage = vi.fn();

vi.mock('@sentry/sveltekit', () => ({
  default: {
    init: mockSentryInit,
    close: mockSentryClose,
    captureException: mockSentryCaptureException,
    captureMessage: mockSentryCaptureMessage,
  },
  init: mockSentryInit,
  close: mockSentryClose,
  captureException: mockSentryCaptureException,
  captureMessage: mockSentryCaptureMessage,
}));

describe('sentry.ts Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initSentry', () => {
    it('initializes Sentry when DSN is provided', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('https://key@sentry.io/123', 'production');

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://key@sentry.io/123',
          environment: 'production',
          sampleRate: 0.1,
          tracesSampleRate: 0.1,
          attachStacktrace: true,
          maxBreadcrumbs: 50,
        }),
      );
    });

    it('does not initialize Sentry when DSN is empty', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('', 'production');

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    it('does not initialize Sentry when DSN is undefined', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry(undefined, 'production');

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    it('uses 1.0 sample rate in development', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('https://key@sentry.io/123', 'development');

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 1.0,
          tracesSampleRate: 1.0,
        }),
      );
    });

    it('uses 0.1 sample rate in production', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('https://key@sentry.io/123', 'production');

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 0.1,
          tracesSampleRate: 0.1,
        }),
      );
    });

    it('uses 1.0 sample rate in test environment', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('https://key@sentry.io/123', 'test');

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 1.0,
          tracesSampleRate: 1.0,
        }),
      );
    });

    it('uses passed environment when provided', async () => {
      const { initSentry } = await import('$lib/sentry.js');
      initSentry('https://key@sentry.io/123', 'production');

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
        }),
      );
    });
  });
});
