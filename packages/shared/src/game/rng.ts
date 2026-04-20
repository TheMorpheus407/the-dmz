export interface RNG {
  create(seed: bigint): RNGInstance;
}

export interface RNGInstance {
  nextInt(min: number, max: number): number;
  nextFloat(): number;
  shuffle<T>(array: T[]): T[];
  pick<T>(array: T[]): T;
  pickN<T>(array: T[], n: number): T[];
  uuid(context: string): string;
  getState(): RNGState;
}

export interface RNGState {
  state0: number;
  state1: number;
}

function mulberry32(state: number): () => number {
  return function () {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function splitSeed(seed: bigint): [number, number] {
  const low = Number(seed & 0xffffffffn);
  const high = Number((seed >> 32n) & 0xffffffffn);
  return [low, high];
}

export const rng: RNG = {
  create(seed: bigint): RNGInstance {
    const [state0, state1] = splitSeed(seed);
    let s0 = state0 === 0 ? 1 : state0;
    let s1 = state1 === 0 ? 1 : state1;
    let counter = 0;

    const random = (): number => {
      if (counter % 2 === 0) {
        const randomValue = mulberry32(s0)();
        s0 = Math.imul(s0 ^ (s0 >>> 15), s0 | 1);
        s0 = ((s0 + Math.imul(s0 ^ (s0 >>> 7), s0 | 61)) ^ (s0 >>> 14)) >>> 0;
        counter++;
        return randomValue;
      } else {
        const randomValue = mulberry32(s1)();
        s1 = Math.imul(s1 ^ (s1 >>> 15), s1 | 1);
        s1 = ((s1 + Math.imul(s1 ^ (s1 >>> 7), s1 | 61)) ^ (s1 >>> 14)) >>> 0;
        counter++;
        return randomValue;
      }
    };

    return {
      nextInt(min: number, max: number): number {
        if (min > max) {
          throw new Error('min must be less than or equal to max');
        }
        if (min === max) {
          return min;
        }
        const range = max - min + 1;
        const float = random();
        return min + Math.floor(float * range);
      },

      nextFloat(): number {
        return random();
      },

      shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
          const j = this.nextInt(0, i);
          const temp = array[i]!;
          array[i] = array[j]!;
          array[j] = temp;
        }
        return array;
      },

      pick<T>(array: T[]): T {
        if (array.length === 0) {
          throw new Error('Cannot pick from empty array');
        }
        const index = this.nextInt(0, array.length - 1);
        return array[index]!;
      },

      pickN<T>(array: T[], n: number): T[] {
        if (n < 0) {
          throw new Error('n must be non-negative');
        }
        if (n > array.length) {
          throw new Error('n cannot exceed array length');
        }
        if (n === 0) {
          return [];
        }
        if (n === array.length) {
          return this.shuffle([...array]);
        }
        const shuffled = this.shuffle([...array]);
        return shuffled.slice(0, n);
      },

      uuid(context: string): string {
        const combined = `${seed}-${context}-${counter}`;
        const hash = hashString(combined);
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
          bytes[i] = (hash >> (i * 8)) & 0xff;
        }
        bytes[6] = (bytes[6]! & 0x0f) | 0x40;
        bytes[8] = (bytes[8]! & 0x3f) | 0x80;

        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      },

      getState(): RNGState {
        return { state0: s0, state1: s1 };
      },
    };
  },
};

function hashString(str: string): number {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ char, 2654435761);
    hash2 = Math.imul(hash2 ^ char, 1597334677);
  }

  hash1 = (hash1 ^ (hash1 >>> 16)) >>> 0;
  hash2 = (hash2 ^ (hash2 >>> 16)) >>> 0;

  return (hash1 << 16) | (hash2 >>> 16);
}

export function generateSeed(): bigint {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return BigInt(
    '0x' +
      Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
  );
}
