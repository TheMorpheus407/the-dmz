import { generateId } from '../../shared/utils/id.js';

interface PseudonymizationResult {
  success: boolean;
  pseudonymousId?: string;
  error?: string;
}

interface ReverseLookupResult {
  success: boolean;
  originalUserId?: string;
  error?: string;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export class PseudonymizationService {
  private readonly encryptionKey: string;
  private readonly mappingCache: Map<string, CacheEntry> = new Map();
  private readonly reverseCache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTLMs: number;

  constructor(encryptionKey?: string, ttlMs?: number) {
    this.encryptionKey = encryptionKey || this.generateDefaultKey();
    this.defaultTTLMs = ttlMs || DEFAULT_TTL_MS;
  }

  private getCurrentTime(): number {
    return Date.now();
  }

  private getWithTTL(map: Map<string, CacheEntry>, key: string): string | undefined {
    const entry = map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < this.getCurrentTime()) {
      map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setWithTTL(
    map: Map<string, CacheEntry>,
    key: string,
    value: string,
    ttlMs?: number,
  ): void {
    map.set(key, {
      value,
      expiresAt: this.getCurrentTime() + (ttlMs || this.defaultTTLMs),
    });
  }

  private touchWithTTL(map: Map<string, CacheEntry>, key: string, ttlMs?: number): void {
    const entry = map.get(key);
    if (entry && entry.expiresAt >= this.getCurrentTime()) {
      entry.expiresAt = this.getCurrentTime() + (ttlMs || this.defaultTTLMs);
    }
  }

  private generateDefaultKey(): string {
    return generateId();
  }

  public async createPseudonymousId(
    originalUserId: string,
    _tenantId: string,
  ): Promise<PseudonymizationResult> {
    try {
      const existingMapping = this.getWithTTL(this.mappingCache, originalUserId);
      if (existingMapping) {
        return {
          success: true,
          pseudonymousId: existingMapping,
        };
      }

      const pseudonymousId = generateId();
      this.encryptKey(originalUserId, pseudonymousId);

      this.setWithTTL(this.mappingCache, originalUserId, pseudonymousId);
      this.setWithTTL(this.reverseCache, pseudonymousId, originalUserId);

      return {
        success: true,
        pseudonymousId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating pseudonymous ID',
      };
    }
  }

  public async reversePseudonymousId(pseudonymousId: string): Promise<ReverseLookupResult> {
    try {
      const cachedOriginal = this.getWithTTL(this.reverseCache, pseudonymousId);
      if (cachedOriginal) {
        return {
          success: true,
          originalUserId: cachedOriginal,
        };
      }

      return {
        success: false,
        error: 'Reverse lookup not found in cache - requires database access',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reversing pseudonymous ID',
      };
    }
  }

  public async anonymizeUserId(userId: string): Promise<string> {
    const hash = await this.simpleHash(userId);
    return `anon_${hash.substring(0, 16)}`;
  }

  public getPseudonymousIdOrFallback(originalUserId: string): string {
    const cached = this.getWithTTL(this.mappingCache, originalUserId);
    if (cached) {
      this.touchWithTTL(this.mappingCache, originalUserId);
      return cached;
    }
    return originalUserId;
  }

  public hasPseudonymMapping(userId: string): boolean {
    const entry = this.mappingCache.get(userId);
    if (!entry) return false;
    if (entry.expiresAt < this.getCurrentTime()) {
      this.mappingCache.delete(userId);
      return false;
    }
    return true;
  }

  public clearCache(): void {
    this.mappingCache.clear();
    this.reverseCache.clear();
  }

  public getCacheSize(): number {
    const now = this.getCurrentTime();
    for (const [key, entry] of this.mappingCache) {
      if (entry.expiresAt < now) {
        this.mappingCache.delete(key);
      }
    }
    for (const [key, entry] of this.reverseCache) {
      if (entry.expiresAt < now) {
        this.reverseCache.delete(key);
      }
    }
    return this.mappingCache.size;
  }

  public removeUser(userId: string): void {
    const pseudonymousId = this.mappingCache.get(userId)?.value;
    this.mappingCache.delete(userId);
    if (pseudonymousId) {
      this.reverseCache.delete(pseudonymousId);
    }
  }

  private encryptKey(originalId: string, pseudonymousId: string): string {
    const combined = `${originalId}:${pseudonymousId}:${this.encryptionKey}`;
    return Buffer.from(combined).toString('base64');
  }

  public decryptMappingKey(
    encryptedKey: string,
  ): { originalId: string; pseudonymousId: string } | null {
    try {
      const decrypted = Buffer.from(encryptedKey, 'base64').toString('utf-8');
      const parts = decrypted.split(':');
      if (parts.length >= 2) {
        return {
          originalId: parts[0]!,
          pseudonymousId: parts[1]!,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async simpleHash(input: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  public sanitizeEventForAnalytics(event: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...event };

    delete sanitized['userId'];
    delete sanitized['email'];
    delete sanitized['emailAddress'];
    delete sanitized['ipAddress'];
    delete sanitized['ip'];

    if (sanitized['payload']) {
      const payload = sanitized['payload'] as Record<string, unknown>;
      delete payload['email'];
      delete payload['emailAddress'];
      delete payload['ipAddress'];
      delete payload['ip'];

      if (payload['emailContent']) {
        delete payload['emailContent'];
      }
    }

    return sanitized;
  }

  public isSafeForAnalyticsStorage(payload: Record<string, unknown>): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'apiKey',
      'creditCard',
      'ssn',
      'socialSecurity',
    ];

    for (const field of sensitiveFields) {
      if (payload[field]) {
        return false;
      }
    }

    return true;
  }
}
