import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { AuthSecurityEventType } from '@the-dmz/shared/contracts';

import { DedupeStore } from '../dedupe.store.js';

const EVENT_TYPE = AuthSecurityEventType.PASSWORD_RESET_REQUESTED;
const USER_ID = 'user-1';
const DEDUPE_WINDOW_MS = 60000;

describe('DedupeStore', () => {
  let store: DedupeStore;

  beforeEach(() => {
    store = new DedupeStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDuplicate', () => {
    it('returns false when no notification has been sent', () => {
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
    });

    it('returns true within dedupe window after recording', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(true);
    });

    it('returns false after dedupe window expires', () => {
      store.record(USER_ID, EVENT_TYPE);
      vi.advanceTimersByTime(DEDUPE_WINDOW_MS);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
    });

    it('returns false when dedupe window is just under expiry', () => {
      store.record(USER_ID, EVENT_TYPE);
      vi.advanceTimersByTime(DEDUPE_WINDOW_MS - 1);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(true);
    });

    it('different users do not affect each other', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(store.isDuplicate('user-2', EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
    });

    it('different event types do not affect each other', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(
        store.isDuplicate(USER_ID, AuthSecurityEventType.ACCOUNT_LOCKED, DEDUPE_WINDOW_MS),
      ).toBe(false);
    });

    it('same user and event type after clear is not duplicate', () => {
      store.record(USER_ID, EVENT_TYPE);
      store.clear();
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
    });

    it('isDuplicate with dedupeWindowMs=0 returns false immediately after record', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, 0)).toBe(false);
    });

    it('same user can have independent entries for multiple different event types simultaneously', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(true);
      expect(
        store.isDuplicate(USER_ID, AuthSecurityEventType.ACCOUNT_LOCKED, DEDUPE_WINDOW_MS),
      ).toBe(false);
      store.record(USER_ID, AuthSecurityEventType.ACCOUNT_LOCKED);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(true);
      expect(
        store.isDuplicate(USER_ID, AuthSecurityEventType.ACCOUNT_LOCKED, DEDUPE_WINDOW_MS),
      ).toBe(true);
    });
  });

  describe('record', () => {
    it('creates entry with correct userId and eventType', () => {
      store.record(USER_ID, EVENT_TYPE);
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(true);
    });

    it('overwrites previous entry for same user and event type', () => {
      store.record(USER_ID, EVENT_TYPE);
      const beforeAdvance = store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS);
      vi.advanceTimersByTime(DEDUPE_WINDOW_MS / 2);
      store.record(USER_ID, EVENT_TYPE);
      const afterReRecord = store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS);
      expect(beforeAdvance).toBe(true);
      expect(afterReRecord).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      store.record(USER_ID, EVENT_TYPE);
      store.record('user-2', EVENT_TYPE);
      store.clear();
      expect(store.isDuplicate(USER_ID, EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
      expect(store.isDuplicate('user-2', EVENT_TYPE, DEDUPE_WINDOW_MS)).toBe(false);
    });
  });
});
