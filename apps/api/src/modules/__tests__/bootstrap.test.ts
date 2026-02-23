import { describe, it, expect } from 'vitest';

import {
  validateManifest,
  topologicalSort,
  getRegistrationOrder,
  type ModuleManifestEntry,
} from '../bootstrap.js';

describe('Module Manifest Validation', () => {
  describe('validateManifest', () => {
    it('should return valid for current manifest', () => {
      const result = validateManifest();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Topological Sort', () => {
  const createEntries = (
    modules: Array<{ name: string; deps: string[] }>,
  ): ModuleManifestEntry[] => {
    return modules.map((m) => ({
      name: m.name,
      pluginPath: `./${m.name}.plugin.js`,
      dependencies: m.deps,
    }));
  };

  it('should return modules in dependency order', () => {
    const entries = createEntries([
      { name: 'a', deps: [] },
      { name: 'b', deps: ['a'] },
      { name: 'c', deps: ['b'] },
    ]);

    const sorted = topologicalSort(entries);
    const names = sorted.map((e) => e.name);

    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
  });

  it('should handle multiple modules with same dependency level', () => {
    const entries = createEntries([
      { name: 'auth', deps: [] },
      { name: 'game', deps: [] },
      { name: 'analytics', deps: ['auth'] },
    ]);

    const sorted = topologicalSort(entries);
    const names = sorted.map((e) => e.name);

    expect(names).toContain('auth');
    expect(names).toContain('game');
    expect(names).toContain('analytics');
    expect(names.indexOf('auth')).toBeLessThan(names.indexOf('analytics'));
  });

  it('should handle diamond dependency pattern', () => {
    const entries = createEntries([
      { name: 'a', deps: [] },
      { name: 'b', deps: ['a'] },
      { name: 'c', deps: ['a'] },
      { name: 'd', deps: ['b', 'c'] },
    ]);

    const sorted = topologicalSort(entries);
    const names = sorted.map((e) => e.name);

    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('c'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('d'));
    expect(names.indexOf('c')).toBeLessThan(names.indexOf('d'));
  });
});

describe('getRegistrationOrder', () => {
  it('should return deterministic order', () => {
    const order1 = getRegistrationOrder();
    const order2 = getRegistrationOrder();

    expect(order1.map((e) => e.name)).toEqual(order2.map((e) => e.name));
  });

  it('should place infrastructure before modules', () => {
    const order = getRegistrationOrder();
    const names = order.map((e) => e.name);

    const infraIndex = names.indexOf('infrastructure');
    const eventBusIndex = names.indexOf('eventBus');

    expect(infraIndex).toBeLessThan(eventBusIndex);
  });

  it('should place eventBus before modules that depend on it', () => {
    const order = getRegistrationOrder();
    const names = order.map((e) => e.name);

    const eventBusIndex = names.indexOf('eventBus');
    const authIndex = names.indexOf('auth');
    const gameIndex = names.indexOf('game');

    expect(eventBusIndex).toBeLessThan(authIndex);
    expect(eventBusIndex).toBeLessThan(gameIndex);
  });
});

describe('Manifest Validation - Error Cases', () => {
  describe('validateManifest', () => {
    it('should detect missing dependencies', () => {
      const entries: ModuleManifestEntry[] = [
        { name: 'a', pluginPath: './a.js', dependencies: [] },
        { name: 'b', pluginPath: './b.js', dependencies: ['nonexistent'] },
      ];

      const result = validateManifest({ entries, moduleNames: ['a', 'b'] });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('missing_dependency');
      expect(result.errors[0]?.message).toContain(
        "Module 'b' depends on unknown module 'nonexistent'",
      );
    });

    it('should detect cycles', () => {
      const entries: ModuleManifestEntry[] = [
        { name: 'a', pluginPath: './a.js', dependencies: ['b'] },
        { name: 'b', pluginPath: './b.js', dependencies: ['a'] },
      ];

      const result = validateManifest({ entries, moduleNames: ['a', 'b'] });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('cycle');
    });

    it('should detect duplicate modules', () => {
      const entries: ModuleManifestEntry[] = [
        { name: 'a', pluginPath: './a.js', dependencies: [] },
        { name: 'a', pluginPath: './a2.js', dependencies: [] },
      ];

      const result = validateManifest({ entries, moduleNames: ['a', 'a'] });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('duplicate_module');
      expect(result.errors[0]?.message).toContain("Duplicate module registration: 'a'");
    });
  });
});
