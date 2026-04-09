import { describe, expect, it, vi, afterEach } from 'vitest';

describe('vi.stubGlobal cleanup - issue #1584', () => {
  describe('cleanup verification - WITH afterEach(vi.unstubAllGlobals)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('test 1 sets stub', () => {
      vi.stubGlobal('cleanupTest', 'value-from-test-1');
      expect((globalThis as unknown as Record<string, unknown>)['cleanupTest']).toBe(
        'value-from-test-1',
      );
    });

    it('test 2 does NOT see pollution (afterEach cleaned up)', () => {
      const value = (globalThis as unknown as Record<string, unknown>)['cleanupTest'];
      expect(value).toBeUndefined();
    });

    it('test 3 still does not see pollution', () => {
      const value = (globalThis as unknown as Record<string, unknown>)['cleanupTest'];
      expect(value).toBeUndefined();
    });
  });
});

describe('vi.unstubAllGlobals restores originals', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores localStorage', () => {
    const original = globalThis.localStorage;
    vi.stubGlobal('localStorage', { mock: true });
    expect(localStorage).toEqual({ mock: true });
    vi.unstubAllGlobals();
    expect(globalThis.localStorage).toBe(original);
  });

  it('restores document', () => {
    const original = globalThis.document;
    vi.stubGlobal('document', { mock: true });
    expect(document).toEqual({ mock: true });
    vi.unstubAllGlobals();
    expect(globalThis.document).toBe(original);
  });

  it('restores window', () => {
    const original = globalThis.window;
    vi.stubGlobal('window', { mock: true });
    expect(window).toEqual({ mock: true });
    vi.unstubAllGlobals();
    expect(globalThis.window).toBe(original);
  });

  it('restores console', () => {
    const original = globalThis.console;
    vi.stubGlobal('console', { mock: true });
    expect(console).toEqual({ mock: true });
    vi.unstubAllGlobals();
    expect(console).toBe(original);
  });

  it('is idempotent (can be called multiple times)', () => {
    vi.stubGlobal('test', 'value');
    vi.unstubAllGlobals();
    vi.unstubAllGlobals();
  });
});

describe('affected files require afterEach(vi.unstubAllGlobals) - issue #1584', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('theme.test.ts - needs afterEach with vi.unstubAllGlobals', () => {
    it('stubs localStorage, document, window', () => {
      vi.stubGlobal('localStorage', { getItem: vi.fn() });
      vi.stubGlobal('document', { documentElement: { dataset: {} } });
      vi.stubGlobal('window', { matchMedia: vi.fn() });
      expect(localStorage).toBeDefined();
      expect(document).toBeDefined();
      expect(window).toBeDefined();
    });
  });

  describe('session.test.ts - needs afterEach with vi.unstubAllGlobals', () => {
    it('stubs window, document', () => {
      vi.stubGlobal('window', { matchMedia: vi.fn() });
      vi.stubGlobal('document', { documentElement: { dataset: {} } });
      expect(window).toBeDefined();
      expect(document).toBeDefined();
    });
  });

  describe('persistence.test.ts - needs afterEach with vi.unstubAllGlobals', () => {
    it('stubs localStorage, window', () => {
      vi.stubGlobal('localStorage', { getItem: vi.fn() });
      vi.stubGlobal('window', { matchMedia: vi.fn() });
      expect(localStorage).toBeDefined();
      expect(window).toBeDefined();
    });
  });

  describe('crt-effects.test.ts - needs afterEach with vi.unstubAllGlobals', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('uses fake timers and stubs document', () => {
      vi.useFakeTimers();
      vi.stubGlobal('document', { documentElement: { classList: { add: vi.fn() } } });
      expect(document).toBeDefined();
    });
  });

  describe('analytics/index.test.ts - needs afterEach with vi.unstubAllGlobals', () => {
    it('stubs console', () => {
      vi.stubGlobal('console', { debug: vi.fn(), warn: vi.fn(), error: vi.fn() });
      expect(console).toBeDefined();
      expect(typeof console.debug).toBe('function');
    });
  });
});
