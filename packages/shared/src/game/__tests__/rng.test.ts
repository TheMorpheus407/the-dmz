import { describe, expect, it } from 'vitest';

import { generateSeed, rng } from '../rng.js';

describe('RNG', () => {
  describe('create', () => {
    it('should create an RNG instance from a seed', () => {
      const instance = rng.create(12345n);
      expect(instance).toBeDefined();
      expect(typeof instance.nextInt).toBe('function');
      expect(typeof instance.nextFloat).toBe('function');
      expect(typeof instance.shuffle).toBe('function');
      expect(typeof instance.pick).toBe('function');
      expect(typeof instance.pickN).toBe('function');
      expect(typeof instance.uuid).toBe('function');
      expect(typeof instance.getState).toBe('function');
    });

    it('should handle zero seed', () => {
      const instance = rng.create(0n);
      expect(instance.nextInt(1, 10)).toBeDefined();
    });
  });

  describe('nextInt', () => {
    it('should return integers within range [min, max] inclusive', () => {
      const instance = rng.create(42n);
      for (let i = 0; i < 100; i++) {
        const result = instance.nextInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('should return min when min equals max', () => {
      const instance = rng.create(42n);
      expect(instance.nextInt(5, 5)).toBe(5);
    });

    it('should throw for invalid range', () => {
      const instance = rng.create(42n);
      expect(() => instance.nextInt(10, 5)).toThrow();
    });

    it('should be deterministic with same seed', () => {
      const instance1 = rng.create(99999n);
      const instance2 = rng.create(99999n);

      const results1: number[] = [];
      const results2: number[] = [];

      for (let i = 0; i < 100; i++) {
        results1.push(instance1.nextInt(1, 1000));
        results2.push(instance2.nextInt(1, 1000));
      }

      expect(results1).toEqual(results2);
    });
  });

  describe('nextFloat', () => {
    it('should return floats in range [0, 1)', () => {
      const instance = rng.create(42n);
      for (let i = 0; i < 100; i++) {
        const result = instance.nextFloat();
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
      }
    });

    it('should be deterministic with same seed', () => {
      const instance1 = rng.create(88888n);
      const instance2 = rng.create(88888n);

      const results1: number[] = [];
      const results2: number[] = [];

      for (let i = 0; i < 100; i++) {
        results1.push(instance1.nextFloat());
        results2.push(instance2.nextFloat());
      }

      expect(results1).toEqual(results2);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array in-place', () => {
      const instance = rng.create(42n);
      const array = [1, 2, 3, 4, 5];
      const result = instance.shuffle(array);
      expect(result).toBe(array);
    });

    it('should contain all original elements', () => {
      const instance = rng.create(42n);
      const original = [1, 2, 3, 4, 5];
      const shuffled = instance.shuffle([...original]);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should be deterministic with same seed', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const instance1 = rng.create(77777n);
      const shuffled1 = instance1.shuffle([...original]);

      const instance2 = rng.create(77777n);
      const shuffled2 = instance2.shuffle([...original]);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('should handle empty array', () => {
      const instance = rng.create(42n);
      expect(instance.shuffle([])).toEqual([]);
    });

    it('should handle single element array', () => {
      const instance = rng.create(42n);
      expect(instance.shuffle([1])).toEqual([1]);
    });
  });

  describe('pick', () => {
    it('should pick random element from array', () => {
      const instance = rng.create(42n);
      const array = ['a', 'b', 'c', 'd', 'e'];
      const picked = instance.pick(array);
      expect(array).toContain(picked);
    });

    it('should throw for empty array', () => {
      const instance = rng.create(42n);
      expect(() => instance.pick([])).toThrow();
    });

    it('should be deterministic with same seed', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];

      const instance1 = rng.create(11111n);
      const picked1 = instance1.pick(array);

      const instance2 = rng.create(11111n);
      const picked2 = instance2.pick(array);

      expect(picked1).toBe(picked2);
    });
  });

  describe('pickN', () => {
    it('should pick n unique elements from array', () => {
      const instance = rng.create(42n);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const picked = instance.pickN(array, 3);
      expect(picked.length).toBe(3);
      expect(new Set(picked).size).toBe(3);
    });

    it('should throw for n larger than array length', () => {
      const instance = rng.create(42n);
      expect(() => instance.pickN([1, 2], 5)).toThrow();
    });

    it('should throw for negative n', () => {
      const instance = rng.create(42n);
      expect(() => instance.pickN([1, 2, 3], -1)).toThrow();
    });

    it('should return empty array for n=0', () => {
      const instance = rng.create(42n);
      expect(instance.pickN([1, 2, 3], 0)).toEqual([]);
    });

    it('should return all elements if n equals array length', () => {
      const instance = rng.create(42n);
      const array = [1, 2, 3];
      const picked = instance.pickN(array, 3);
      expect(picked.length).toBe(3);
      expect(array.sort()).toEqual(picked.sort());
    });

    it('should be deterministic with same seed', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const instance1 = rng.create(55555n);
      const picked1 = instance1.pickN(array, 4);

      const instance2 = rng.create(55555n);
      const picked2 = instance2.pickN(array, 4);

      expect(picked1).toEqual(picked2);
    });
  });

  describe('uuid', () => {
    it('should generate valid UUID v4 format', () => {
      const instance = rng.create(42n);
      const id = instance.uuid('test');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(id).toMatch(uuidRegex);
    });

    it('should be deterministic with same seed and context', () => {
      const instance1 = rng.create(12345n);
      const uuid1 = instance1.uuid('session-1');

      const instance2 = rng.create(12345n);
      const uuid2 = instance2.uuid('session-1');

      expect(uuid1).toBe(uuid2);
    });

    it('should generate different UUIDs for different contexts', () => {
      const instance = rng.create(42n);
      const uuid1 = instance.uuid('context-a');
      const uuid2 = instance.uuid('context-b');
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const instance = rng.create(42n);
      const state = instance.getState();
      expect(state).toHaveProperty('state0');
      expect(state).toHaveProperty('state1');
    });

    it('should reflect state changes after operations', () => {
      const instance = rng.create(42n);
      const stateBefore = instance.getState();
      instance.nextInt(1, 10);
      const stateAfter = instance.getState();
      expect(stateBefore).not.toEqual(stateAfter);
    });
  });

  describe('generateSeed', () => {
    it('should generate a bigint', () => {
      const seed = generateSeed();
      expect(typeof seed).toBe('bigint');
    });

    it('should generate unique seeds', () => {
      const seeds = new Set<bigint>();
      for (let i = 0; i < 100; i++) {
        seeds.add(generateSeed());
      }
      expect(seeds.size).toBe(100);
    });

    it('should generate 64-bit seeds', () => {
      const seed = generateSeed();
      expect(seed).toBeGreaterThanOrEqual(0n);
      expect(seed).toBeLessThan(2n ** 64n);
    });
  });

  describe('full determinism verification', () => {
    it('should produce identical results across multiple operations', () => {
      const seed = 1234567890123456789n;

      const instance1 = rng.create(seed);
      const results1 = {
        int: instance1.nextInt(1, 1000),
        float: instance1.nextFloat(),
        shuffled: instance1.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pick: instance1.pick(['a', 'b', 'c', 'd', 'e']),
        pickN: instance1.pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3),
        uuid: instance1.uuid('test-context'),
      };

      const instance2 = rng.create(seed);
      const results2 = {
        int: instance2.nextInt(1, 1000),
        float: instance2.nextFloat(),
        shuffled: instance2.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pick: instance2.pick(['a', 'b', 'c', 'd', 'e']),
        pickN: instance2.pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3),
        uuid: instance2.uuid('test-context'),
      };

      expect(results1.int).toBe(results2.int);
      expect(results1.float).toBe(results2.float);
      expect(results1.shuffled).toEqual(results2.shuffled);
      expect(results1.pick).toBe(results2.pick);
      expect(results1.pickN).toEqual(results2.pickN);
      expect(results1.uuid).toBe(results2.uuid);
    });
  });
});
