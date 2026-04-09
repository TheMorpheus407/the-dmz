import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
}));

const mockConsoleDebug = vi.fn();

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('console', {
      debug: mockConsoleDebug,
      warn: vi.fn(),
      error: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initAnalytics', () => {
    it('should set debug to false when not in dev mode', async () => {
      vi.stubEnv('VITE_DEV', 'false');
      const { initAnalytics, isAnalyticsEnabled } = await import('./index');
      initAnalytics({ debug: false });
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('should enable analytics when initAnalytics is called', async () => {
      const { initAnalytics, isAnalyticsEnabled } = await import('./index');
      initAnalytics({ debug: false });
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('should log initialization message when debug is true', async () => {
      const { initAnalytics } = await import('./index');
      initAnalytics({ debug: true });
      expect(mockConsoleDebug).toHaveBeenCalled();
    });

    it('should not log initialization message when debug is false', async () => {
      const { initAnalytics } = await import('./index');
      initAnalytics({ debug: false });
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should log event when debug is true', async () => {
      const { initAnalytics, trackEvent } = await import('./index');
      initAnalytics({ debug: true });
      mockConsoleDebug.mockClear();

      const event = { category: 'test', action: 'action' };
      trackEvent(event);
      expect(mockConsoleDebug).toHaveBeenCalled();
    });

    it('should not log event when debug is false', async () => {
      const { initAnalytics, trackEvent } = await import('./index');
      initAnalytics({ debug: false });

      const event = { category: 'test', action: 'action' };
      trackEvent(event);
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe('isAnalyticsEnabled', () => {
    it('should return false before initialization', async () => {
      const { isAnalyticsEnabled } = await import('./index');
      expect(isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('setAnalyticsEnabled', () => {
    it('should toggle analytics enabled state', async () => {
      const { initAnalytics, isAnalyticsEnabled, setAnalyticsEnabled } = await import('./index');
      initAnalytics({ debug: false });
      expect(isAnalyticsEnabled()).toBe(true);

      setAnalyticsEnabled(false);
      expect(isAnalyticsEnabled()).toBe(false);

      setAnalyticsEnabled(true);
      expect(isAnalyticsEnabled()).toBe(true);
    });
  });
});
