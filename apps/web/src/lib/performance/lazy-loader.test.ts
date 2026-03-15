import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

import { lazyImport, createDeferredLoader } from './lazy-loader';

describe('lazy-loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('lazyImport', () => {
    it('should return the default export from a module', async () => {
      const mockModule = { default: 'test-value', named: 'named-value' };
      const importer = async () => mockModule;

      const result = await lazyImport(importer);
      expect(result).toBe('test-value');
    });

    it('should return the module directly if no default export', async () => {
      const mockModule = { foo: 'bar' };
      const importer = async () => mockModule;

      const result = await lazyImport(importer);
      expect(result).toEqual({ foo: 'bar' });
    });
  });

  describe('createDeferredLoader', () => {
    it('should not execute load function until trigger returns true', async () => {
      const loadFn = vi.fn().mockResolvedValue('loaded');
      const trigger = vi.fn().mockReturnValue(false);

      const loader = createDeferredLoader(loadFn, trigger);

      const result = await loader.execute();

      expect(result).toBeNull();
      expect(loadFn).not.toHaveBeenCalled();
      expect(trigger).toHaveBeenCalled();
    });

    it('should execute load function when trigger returns true', async () => {
      const loadFn = vi.fn().mockResolvedValue('loaded');
      const trigger = vi.fn().mockReturnValue(true);

      const loader = createDeferredLoader(loadFn, trigger);

      const result = await loader.execute();

      expect(result).toBe('loaded');
      expect(loadFn).toHaveBeenCalledTimes(1);
    });

    it('should cache the result after execution', async () => {
      const loadFn = vi.fn().mockResolvedValue('loaded');
      const trigger = vi.fn().mockReturnValue(true);

      const loader = createDeferredLoader(loadFn, trigger);

      await loader.execute();
      await loader.execute();

      expect(loadFn).toHaveBeenCalledTimes(1);
    });

    it('should return current state', () => {
      const loadFn = vi.fn();
      const trigger = vi.fn();

      const loader = createDeferredLoader(loadFn, trigger);

      const state = loader.getState();
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('executed');
    });

    it('should reset the loader state', async () => {
      const loadFn = vi.fn().mockResolvedValue('loaded');
      const trigger = vi.fn().mockReturnValue(true);

      const loader = createDeferredLoader(loadFn, trigger);

      await loader.execute();
      expect(loader.getState().executed).toBe(true);

      loader.reset();
      expect(loader.getState().executed).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const loadFn = vi.fn().mockRejectedValue(new Error('Load failed'));
      const trigger = vi.fn().mockReturnValue(true);

      const loader = createDeferredLoader(loadFn, trigger);

      const result = await loader.execute();

      expect(result).toBeNull();
      expect(loader.getState().error).toBeDefined();
    });
  });
});
