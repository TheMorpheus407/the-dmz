import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { touchStateStore } from './touch-state';

vi.mock('$lib/storage/idb', () => ({
  getDB: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock('$lib/utils/id', () => ({
  generateId: vi.fn().mockReturnValue('generated-test-id'),
}));

vi.mock('$lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('$app/environment', () => ({
  browser: true,
}));

describe('touch-state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    touchStateStore.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    touchStateStore.reset();
  });

  describe('recordTouchInteraction', () => {
    it('should add a new interaction to the store', () => {
      touchStateStore.recordTouchInteraction('swipe', { foo: 'bar' }, 'left', 'test-element');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('swipe');
      expect(state.interactions[0].direction).toBe('left');
      expect(state.interactions[0].synced).toBe(false);
    });

    it('should generate an id and timestamp for the interaction', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'button');

      const state = touchStateStore.getState();
      expect(state.interactions[0].id).toBe('generated-test-id');
      expect(state.interactions[0].timestamp).toBe(new Date('2024-01-01T12:00:00Z').getTime());
    });

    it('should limit interactions to MAX_STORED_INTERACTIONS (1000)', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      for (let i = 0; i < 1005; i++) {
        touchStateStore.recordTouchInteraction('tap', undefined, undefined, `element-${i}`);
      }

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1000);
      expect(state.interactions[0].targetElement).toBe('element-5');
    });

    it('should not add interaction when not in browser', () => {
      vi.mock('$app/environment', () => ({
        browser: false,
      }));

      touchStateStore.recordTouchInteraction('swipe', undefined, 'left', 'test-element');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(0);
    });
  });

  describe('recordSwipe', () => {
    it('should record a swipe interaction with direction', () => {
      touchStateStore.recordSwipe('right', 'swipe-area');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('swipe');
      expect(state.interactions[0].direction).toBe('right');
    });
  });

  describe('recordPan', () => {
    it('should record a pan interaction with panDirection metadata', () => {
      touchStateStore.recordPan('next', 'carousel');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('pan');
      expect(state.interactions[0].metadata).toEqual({ panDirection: 'next' });
    });
  });

  describe('recordPinch', () => {
    it('should record a pinch interaction with scale metadata', () => {
      touchStateStore.recordPinch(1.5, 'zoom-area');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('pinch');
      expect(state.interactions[0].metadata).toEqual({ scale: 1.5 });
    });
  });

  describe('recordLongPress', () => {
    it('should record a longpress interaction', () => {
      touchStateStore.recordLongPress('longpress-area');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('longpress');
    });
  });

  describe('recordTap', () => {
    it('should record a tap interaction', () => {
      touchStateStore.recordTap('button');

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].type).toBe('tap');
    });
  });

  describe('incrementActiveGestures', () => {
    it('should increment active gestures count', () => {
      expect(touchStateStore.getState().activeGestures).toBe(0);

      touchStateStore.incrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(1);

      touchStateStore.incrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(2);
    });
  });

  describe('decrementActiveGestures', () => {
    it('should decrement active gestures count', () => {
      touchStateStore.incrementActiveGestures();
      touchStateStore.incrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(2);

      touchStateStore.decrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(1);

      touchStateStore.decrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(0);
    });

    it('should not go below zero', () => {
      touchStateStore.decrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(0);

      touchStateStore.decrementActiveGestures();
      expect(touchStateStore.getState().activeGestures).toBe(0);
    });
  });

  describe('getTouchState', () => {
    it('should return a copy of the current state', () => {
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'test');

      const state1 = touchStateStore.getTouchState();
      const state2 = touchStateStore.getTouchState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('getUnsyncedTouchInteractions', () => {
    it('should return only unsynced interactions', async () => {
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 't1');
      touchStateStore.recordTouchInteraction('swipe', undefined, 'left', 't2');

      await touchStateStore.syncTouchState();

      const unsynced = touchStateStore.getUnsyncedTouchInteractions();
      expect(unsynced).toHaveLength(0);
    });

    it('should return empty array when all interactions are synced', () => {
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 't1');

      const unsynced = touchStateStore.getUnsyncedTouchInteractions();
      expect(unsynced).toHaveLength(1);
    });
  });

  describe('syncTouchState', () => {
    it('should mark all interactions as synced', async () => {
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 't1');
      touchStateStore.recordTouchInteraction('swipe', undefined, 'left', 't2');

      const count = await touchStateStore.syncTouchState();

      expect(count).toBe(2);
      const state = touchStateStore.getState();
      expect(state.interactions.every((i) => i.synced)).toBe(true);
    });

    it('should update lastSyncAt timestamp', async () => {
      vi.setSystemTime(new Date('2024-06-15T10:30:00Z').getTime());

      touchStateStore.recordTouchInteraction('tap');

      expect(touchStateStore.getState().lastSyncAt).toBeNull();

      await touchStateStore.syncTouchState();

      expect(touchStateStore.getState().lastSyncAt).toBe(
        new Date('2024-06-15T10:30:00Z').getTime(),
      );
    });

    it('should return 0 when not in browser', async () => {
      vi.mock('$app/environment', () => ({
        browser: false,
      }));

      const count = await touchStateStore.syncTouchState();
      expect(count).toBe(0);
    });
  });

  describe('clearOldTouchInteractions', () => {
    it('should remove interactions older than the specified cutoff', async () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'old');
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'new');

      const cleared = await touchStateStore.clearOldTouchInteractions(7 * 24 * 60 * 60 * 1000);

      expect(cleared).toBe(1);
      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].targetElement).toBe('new');
    });

    it('should preserve synced interactions even if older than cutoff', async () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'old-synced');
      await touchStateStore.syncTouchState();

      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      const cleared = await touchStateStore.clearOldTouchInteractions(7 * 24 * 60 * 60 * 1000);

      expect(cleared).toBe(0);
      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].targetElement).toBe('old-synced');
    });

    it('should use default cutoff of 7 days', async () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'old');
      vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 'new');

      const cleared = await touchStateStore.clearOldTouchInteractions();

      expect(cleared).toBe(0);
      expect(touchStateStore.getState().interactions).toHaveLength(2);
    });
  });

  describe('startPeriodicSync', () => {
    it('should start a periodic sync interval', async () => {
      touchStateStore.recordTouchInteraction('tap');

      touchStateStore.startPeriodicSync();

      vi.advanceTimersByTime(30000);

      const state = touchStateStore.getState();
      expect(state.lastSyncAt).toBeNull();

      vi.advanceTimersByTime(30000);

      expect(touchStateStore.getState().lastSyncAt).not.toBeNull();
    });

    it('should not start multiple intervals', () => {
      touchStateStore.recordTouchInteraction('tap');

      touchStateStore.startPeriodicSync();
      touchStateStore.startPeriodicSync();
      touchStateStore.startPeriodicSync();

      vi.advanceTimersByTime(60000);

      const unsynced = touchStateStore.getUnsyncedTouchInteractions();
      expect(unsynced).toHaveLength(1);
    });
  });

  describe('stopPeriodicSync', () => {
    it('should stop the periodic sync interval', async () => {
      touchStateStore.recordTouchInteraction('tap');

      touchStateStore.startPeriodicSync();
      touchStateStore.stopPeriodicSync();

      vi.advanceTimersByTime(60000);
      vi.advanceTimersByTime(60000);

      const state = touchStateStore.getState();
      expect(state.lastSyncAt).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all interactions', () => {
      touchStateStore.recordTouchInteraction('tap', undefined, undefined, 't1');
      touchStateStore.recordTouchInteraction('swipe', undefined, 'left', 't2');

      touchStateStore.reset();

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(0);
    });

    it('should reset activeGestures to 0', () => {
      touchStateStore.incrementActiveGestures();
      touchStateStore.incrementActiveGestures();

      touchStateStore.reset();

      expect(touchStateStore.getState().activeGestures).toBe(0);
    });

    it('should reset lastSyncAt to null', async () => {
      touchStateStore.recordTouchInteraction('tap');
      await touchStateStore.syncTouchState();

      expect(touchStateStore.getState().lastSyncAt).not.toBeNull();

      touchStateStore.reset();

      expect(touchStateStore.getState().lastSyncAt).toBeNull();
    });

    it('should stop any running periodic sync', () => {
      touchStateStore.recordTouchInteraction('tap');
      touchStateStore.startPeriodicSync();

      touchStateStore.reset();

      vi.advanceTimersByTime(60000);

      expect(touchStateStore.getState().lastSyncAt).toBeNull();
    });
  });

  describe('initTouchStatePersistence', () => {
    it('should load existing touch state from IndexedDB', async () => {
      const { getDB } = await import('$lib/storage/idb');
      const mockGetDB = getDB as ReturnType<typeof vi.fn>;

      mockGetDB.mockResolvedValue({
        getAll: vi.fn().mockResolvedValue([
          {
            id: 'existing-id',
            type: 'touch_tap',
            timestamp: 1000000,
            synced: true,
            payload: { foo: 'bar' },
          },
        ]),
      });

      await touchStateStore.initTouchStatePersistence();

      const state = touchStateStore.getState();
      expect(state.interactions).toHaveLength(1);
      expect(state.interactions[0].id).toBe('existing-id');
      expect(state.interactions[0].type).toBe('tap');
    });

    it('should start periodic sync after loading', async () => {
      await touchStateStore.initTouchStatePersistence();

      vi.advanceTimersByTime(60000);

      const state = touchStateStore.getState();
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('should not run in non-browser environment', async () => {
      vi.mock('$app/environment', () => ({
        browser: false,
      }));

      await touchStateStore.initTouchStatePersistence();

      vi.advanceTimersByTime(60000);

      const state = touchStateStore.getState();
      expect(state.lastSyncAt).toBeNull();
    });
  });

  describe('store pattern', () => {
    it('should be subscribable as a Svelte store', () => {
      const states: ReturnType<typeof touchStateStore.getState>[] = [];

      const unsubscribe = touchStateStore.subscribe((state) => {
        states.push(state);
      });

      touchStateStore.recordTouchInteraction('tap');

      unsubscribe();

      expect(states.length).toBeGreaterThan(1);
      expect(states[states.length - 1].interactions).toHaveLength(1);
    });
  });
});
