import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

const mockConsoleWarn = vi.fn();
vi.stubGlobal('console', {
  warn: mockConsoleWarn,
});

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
      expect(mockConsoleWarn).toHaveBeenCalledWith('[Analytics] Initialized');
    });

    it('should not log initialization message when debug is false', async () => {
      const { initAnalytics } = await import('./index');
      initAnalytics({ debug: false });
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should log event when debug is true', async () => {
      const { initAnalytics, trackEvent } = await import('./index');
      initAnalytics({ debug: true });
      mockConsoleWarn.mockClear();

      const event = { category: 'test', action: 'action' };
      trackEvent(event);
      expect(mockConsoleWarn).toHaveBeenCalledWith('[Analytics]', event);
    });

    it('should not log event when debug is false', async () => {
      const { initAnalytics, trackEvent } = await import('./index');
      initAnalytics({ debug: false });

      const event = { category: 'test', action: 'action' };
      trackEvent(event);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
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
