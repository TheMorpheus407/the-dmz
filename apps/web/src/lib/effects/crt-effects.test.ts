import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

describe('crt-effects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
        },
      },
    });
    vi.mocked(document.documentElement.classList.contains).mockReturnValue(false);
    vi.mocked(document.documentElement.classList.add).mockClear();
    vi.mocked(document.documentElement.classList.remove).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('triggerFlicker', () => {
    it('adds flicker class to document element', async () => {
      const { triggerFlicker } = await import('./crt-effects');
      triggerFlicker();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-flicker--active');
    });

    it('removes flicker class after duration', async () => {
      const { triggerFlicker } = await import('./crt-effects');
      triggerFlicker();

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-flicker--active');

      vi.advanceTimersByTime(400);

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('crt-flicker--active');
    });

    it('clears previous timeout if called again', async () => {
      const { triggerFlicker } = await import('./crt-effects');
      triggerFlicker();
      vi.advanceTimersByTime(200);
      triggerFlicker();

      expect(document.documentElement.classList.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('triggerBreachFlicker', () => {
    it('triggers flicker', async () => {
      const { triggerBreachFlicker } = await import('./crt-effects');
      triggerBreachFlicker();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-flicker--active');
    });
  });

  describe('triggerThreatEscalationFlicker', () => {
    it('triggers flicker', async () => {
      const { triggerThreatEscalationFlicker } = await import('./crt-effects');
      triggerThreatEscalationFlicker();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-flicker--active');
    });
  });

  describe('clearFlicker', () => {
    it('removes flicker class immediately', async () => {
      const { triggerFlicker, clearFlicker } = await import('./crt-effects');
      triggerFlicker();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-flicker--active');

      clearFlicker();

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('crt-flicker--active');
    });

    it('clears pending timeout', async () => {
      const { triggerFlicker, clearFlicker } = await import('./crt-effects');
      triggerFlicker();
      clearFlicker();

      vi.advanceTimersByTime(400);

      expect(document.documentElement.classList.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerGlitch', () => {
    it('adds glitch class to document element', async () => {
      const { triggerGlitch } = await import('./crt-effects');
      triggerGlitch();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-glitch--active');
    });

    it('removes glitch class after duration', async () => {
      const { triggerGlitch } = await import('./crt-effects');
      triggerGlitch();

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-glitch--active');

      vi.advanceTimersByTime(600);

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('crt-glitch--active');
    });

    it('clears previous timeout if called again', async () => {
      const { triggerGlitch } = await import('./crt-effects');
      triggerGlitch();
      vi.advanceTimersByTime(200);
      triggerGlitch();

      expect(document.documentElement.classList.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('triggerMorpheusGlitch', () => {
    it('triggers glitch', async () => {
      const { triggerMorpheusGlitch } = await import('./crt-effects');
      triggerMorpheusGlitch();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-glitch--active');
    });
  });

  describe('clearGlitch', () => {
    it('removes glitch class immediately', async () => {
      const { triggerGlitch, clearGlitch } = await import('./crt-effects');
      triggerGlitch();
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('crt-glitch--active');

      clearGlitch();

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('crt-glitch--active');
    });
  });

  describe('browser check', () => {
    it('does nothing when not in browser', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ browser: false }));

      const { triggerFlicker } = await import('./crt-effects');
      triggerFlicker();

      expect(document.documentElement.classList.add).not.toHaveBeenCalled();

      vi.doMock('$app/environment', () => ({ browser: true }));
      vi.resetModules();
    });
  });
});
