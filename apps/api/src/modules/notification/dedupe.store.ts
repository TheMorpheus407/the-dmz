import { type AuthSecurityEventType } from '@the-dmz/shared/contracts';

import type { DedupeEntry } from './notification.types.js';

export class DedupeStore {
  private store = new Map<string, DedupeEntry>();

  isDuplicate(userId: string, eventType: AuthSecurityEventType, dedupeWindowMs: number): boolean {
    const key = `${userId}:${eventType}`;
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    const now = new Date();
    const timeSinceLastSent = now.getTime() - entry.lastSentAt.getTime();

    return timeSinceLastSent < dedupeWindowMs;
  }

  record(userId: string, eventType: AuthSecurityEventType): void {
    const key = `${userId}:${eventType}`;
    this.store.set(key, {
      userId,
      eventType,
      lastSentAt: new Date(),
    });
  }

  clear(): void {
    this.store.clear();
  }
}
