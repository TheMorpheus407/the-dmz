import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { loadConfig } from '../../../config.js';

import type * as SentryNode from '@sentry/node';

const mockSentryInit = vi.fn();
const mockSentryClose = vi.fn().mockResolvedValue(undefined);
const mockSentryCaptureException = vi.fn();

vi.mock('@sentry/node', async () => {
  const actual = await vi.importActual<typeof SentryNode>('@sentry/node');
  return {
    ...actual,
    default: {
      init: mockSentryInit,
      close: mockSentryClose,
      captureException: mockSentryCaptureException,
    },
    init: mockSentryInit,
    close: mockSentryClose,
    captureException: mockSentryCaptureException,
  };
});

describe('sentryPlugin', () => {
  let app: FastifyInstance | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSentryInit.mockClear();
    mockSentryClose.mockClear();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  describe('when SENTRY_DSN is configured', () => {
    it('initializes Sentry with correct options', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, {
        config: { ...config, SENTRY_DSN: 'https://key@sentry.io/123' },
      });
      await app.ready();

      expect(mockSentryInit).toHaveBeenCalledTimes(1);
      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://key@sentry.io/123',
          environment: config.NODE_ENV,
          release: config.API_VERSION,
          attachStacktrace: true,
          maxBreadcrumbs: 50,
        }),
      );
    });

    it('uses 0.1 sample rate in production', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, {
        config: {
          ...config,
          SENTRY_DSN: 'https://key@sentry.io/123',
          NODE_ENV: 'production',
        },
      });
      await app.ready();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 0.1,
          tracesSampleRate: 0.1,
        }),
      );
    });

    it('uses 1.0 sample rate in development', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, {
        config: {
          ...config,
          SENTRY_DSN: 'https://key@sentry.io/123',
          NODE_ENV: 'development',
        },
      });
      await app.ready();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleRate: 1.0,
          tracesSampleRate: 1.0,
        }),
      );
    });

    it('logs info message with DSN and environment', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: true });

      await app.register(sentryPlugin, {
        config: { ...config, SENTRY_DSN: 'https://key@sentry.io/123' },
      });
      await app.ready();

      expect(mockSentryInit).toHaveBeenCalled();
    });

    it('calls Sentry.close() in onClose hook', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, {
        config: { ...config, SENTRY_DSN: 'https://key@sentry.io/123' },
      });
      await app.ready();
      await app.close();

      expect(mockSentryClose).toHaveBeenCalledWith(2000);
    });
  });

  describe('when SENTRY_DSN is not configured', () => {
    it('does not initialize Sentry', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, { config: { ...config, SENTRY_DSN: undefined } });
      await app.ready();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    it('logs info message about disabled monitoring', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: true });

      await app.register(sentryPlugin, { config: { ...config, SENTRY_DSN: undefined } });
      await app.ready();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    it('does not call Sentry.close() in onClose hook', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await app.register(sentryPlugin, { config: { ...config, SENTRY_DSN: undefined } });
      await app.ready();
      await app.close();

      expect(mockSentryClose).not.toHaveBeenCalled();
    });
  });

  describe('with invalid DSN', () => {
    it('does not throw when SENTRY_DSN is invalid', async () => {
      const config = loadConfig();
      const { sentryPlugin } = await import('../sentry.plugin.js');
      app = fastify({ logger: false });

      await expect(
        app.register(sentryPlugin, { config: { ...config, SENTRY_DSN: 'invalid-dsn' } }),
      ).resolves.not.toThrow();
    });
  });
});
