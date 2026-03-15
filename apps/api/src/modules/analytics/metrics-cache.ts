export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MetricsCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTtlMs: number;

  public constructor(defaultTtlMs: number = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    return factory().then((data) => {
      this.set(key, data, ttlMs);
      return data;
    });
  }
}

export const metricsCache = new MetricsCache(60000);
