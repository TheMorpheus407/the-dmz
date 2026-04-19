import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { AuthSecurityEventType } from '@the-dmz/shared/contracts';

import { ThrottleStore } from '../throttle.store.js';

const EVENT_TYPE = AuthSecurityEventType.PASSWORD_RESET_REQUESTED;
const USER_ID = 'user-1';
const THROTTLE_LIMIT = 3;
const THROTTLE_WINDOW_MS = 3600000;

describe('ThrottleStore', () => {
  let store: ThrottleStore;

  beforeEach(() => {
    store = new ThrottleStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isThrottled', () => {
    it('returns false for first request', () => {
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });

    it('returns false for requests under the limit', () => {
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });

    it('returns true when limit is exceeded', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(true);
    });

    it('returns false when count equals limit exactly', () => {
      expect(store.isThrottled(USER_ID, EVENT_TYPE, 3, THROTTLE_WINDOW_MS)).toBe(false);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, 3, THROTTLE_WINDOW_MS)).toBe(false);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, 3, THROTTLE_WINDOW_MS)).toBe(false);
    });

    it('with throttleLimit=0 immediately returns true', () => {
      expect(store.isThrottled(USER_ID, EVENT_TYPE, 0, THROTTLE_WINDOW_MS)).toBe(true);
    });

    it('with throttleWindowMs=0 uses single-shot behavior', () => {
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, 0)).toBe(false);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, 0)).toBe(false);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, 0)).toBe(false);
    });

    it('same user can have independent entries for multiple different event types simultaneously', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(true);
      expect(
        store.isThrottled(
          USER_ID,
          AuthSecurityEventType.ACCOUNT_LOCKED,
          THROTTLE_LIMIT,
          THROTTLE_WINDOW_MS,
        ),
      ).toBe(false);
      store.isThrottled(
        USER_ID,
        AuthSecurityEventType.ACCOUNT_LOCKED,
        THROTTLE_LIMIT,
        THROTTLE_WINDOW_MS,
      );
      store.isThrottled(
        USER_ID,
        AuthSecurityEventType.ACCOUNT_LOCKED,
        THROTTLE_LIMIT,
        THROTTLE_WINDOW_MS,
      );
      expect(
        store.isThrottled(
          USER_ID,
          AuthSecurityEventType.ACCOUNT_LOCKED,
          THROTTLE_LIMIT,
          THROTTLE_WINDOW_MS,
        ),
      ).toBe(true);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(true);
    });

    it('resets after throttle window expires', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(true);
      vi.advanceTimersByTime(THROTTLE_WINDOW_MS);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });

    it('different users do not affect each other', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(store.isThrottled('user-2', EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });

    it('different event types do not affect each other', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(
        store.isThrottled(
          USER_ID,
          AuthSecurityEventType.ACCOUNT_LOCKED,
          THROTTLE_LIMIT,
          THROTTLE_WINDOW_MS,
        ),
      ).toBe(false);
    });

    it('after clear, user can send again', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.clear();
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });

    it('partial window expiry resets count', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      vi.advanceTimersByTime(THROTTLE_WINDOW_MS - 1);
      const result = store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      expect(result).toBe(false);
    });

    it('exact window expiry resets count', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      vi.advanceTimersByTime(THROTTLE_WINDOW_MS);
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.isThrottled('user-2', EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS);
      store.clear();
      expect(store.isThrottled(USER_ID, EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
      expect(store.isThrottled('user-2', EVENT_TYPE, THROTTLE_LIMIT, THROTTLE_WINDOW_MS)).toBe(
        false,
      );
    });
  });
});
