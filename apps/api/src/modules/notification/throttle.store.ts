import { type AuthSecurityEventType } from '@the-dmz/shared/contracts';

import type { ThrottleEntry } from './notification.types.js';

export class ThrottleStore {
  private store = new Map<string, ThrottleEntry>();

  isThrottled(
    userId: string,
    eventType: AuthSecurityEventType,
    throttleLimit: number,
    throttleWindowMs: number,
  ): boolean {
    const key = `${userId}:${eventType}`;
    const entry = this.store.get(key);

    if (!entry) {
      if (throttleLimit === 0) {
        return true;
      }
      this.store.set(key, {
        userId,
        eventType,
        count: 1,
        windowStart: new Date(),
      });
      return false;
    }

    const now = new Date();
    const timeSinceWindowStart = now.getTime() - entry.windowStart.getTime();

    if (timeSinceWindowStart >= throttleWindowMs) {
      if (throttleLimit === 0) {
        return true;
      }
      entry.count = 1;
      entry.windowStart = now;
      return false;
    }

    if (entry.count >= throttleLimit) {
      return true;
    }

    entry.count++;
    return false;
  }

  clear(): void {
    this.store.clear();
  }
}
