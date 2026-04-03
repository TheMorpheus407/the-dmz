import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import { notificationStore } from './notification.store';

describe('notificationStore', () => {
  beforeEach(() => {
    notificationStore.reset();
  });

  describe('initial state', () => {
    it('should have empty notifications', () => {
      const state = get(notificationStore);
      expect(state.notifications).toEqual([]);
      expect(state.notificationQueue).toEqual([]);
    });
  });

  describe('addNotification', () => {
    it('should add notification', () => {
      const id = notificationStore.addNotification('Test message', 'info', 0);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]?.message).toBe('Test message');
      expect(state.notifications[0]?.type).toBe('info');
      expect(state.notifications[0]?.id).toBe(id);
    });

    it('should add notification with title', () => {
      notificationStore.addNotification('Test', 'info', 0, { title: 'My Title' });
      const state = get(notificationStore);
      expect(state.notifications[0]?.title).toBe('My Title');
    });

    it('should add notification with action', () => {
      const action = { label: 'View', onClick: () => {} };
      notificationStore.addNotification('Test', 'info', 0, { action });
      const state = get(notificationStore);
      expect(state.notifications[0]?.action).toBeDefined();
      expect(state.notifications[0]?.action?.label).toBe('View');
    });

    it('should add notification with source', () => {
      notificationStore.addNotification('Test', 'info', 0, { source: 'SYSOP-7' });
      const state = get(notificationStore);
      expect(state.notifications[0]?.source).toBe('SYSOP-7');
    });

    it('should queue notifications when MAX_VISIBLE (3) exceeded', () => {
      notificationStore.addNotification('Toast 1', 'info', 0);
      notificationStore.addNotification('Toast 2', 'info', 0);
      notificationStore.addNotification('Toast 3', 'info', 0);
      notificationStore.addNotification('Toast 4', 'info', 0);
      notificationStore.addNotification('Toast 5', 'info', 0);

      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(3);
      expect(state.notificationQueue).toHaveLength(2);
    });

    it('should not set timer when duration is 0', () => {
      vi.useFakeTimers();
      const id = notificationStore.addNotification('Test', 'info', 0);
      vi.advanceTimersByTime(10000);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]?.id).toBe(id);
      vi.useRealTimers();
    });

    it('should not set timer when duration is undefined (uses default)', () => {
      vi.useFakeTimers();
      notificationStore.addNotification('Test', 'info');
      vi.advanceTimersByTime(5000);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should handle duplicate IDs (different notifications)', () => {
      const id1 = notificationStore.addNotification('Test 1', 'info', 0);
      const id2 = notificationStore.addNotification('Test 2', 'info', 0);
      expect(id1).not.toBe(id2);
    });
  });

  describe('addGameNotification', () => {
    it('should use duration map for info type', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Test', 'info');
      vi.advanceTimersByTime(4999);
      let state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.advanceTimersByTime(2);
      state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should use duration map for warning type (8000ms)', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Test', 'warning');
      vi.advanceTimersByTime(7999);
      let state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.advanceTimersByTime(2);
      state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should use duration map for error type (10000ms)', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Test', 'error');
      vi.advanceTimersByTime(9999);
      let state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.advanceTimersByTime(2);
      state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should use duration map for breach type (0 - no auto removal)', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Breach!', 'breach');
      vi.advanceTimersByTime(100000);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.useRealTimers();
    });

    it('should use default duration when type not in map', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Test', 'info');
      vi.advanceTimersByTime(4999);
      let state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.advanceTimersByTime(2);
      state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should allow custom duration override', () => {
      vi.useFakeTimers();
      notificationStore.addGameNotification('Test', 'info', { duration: 1000 });
      vi.advanceTimersByTime(999);
      let state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
      vi.advanceTimersByTime(2);
      state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  describe('removeNotification', () => {
    it('should remove notification by id', () => {
      const id = notificationStore.addNotification('Test', 'info', 0);
      notificationStore.removeNotification(id);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
    });

    it('should promote queued notification when one is removed', () => {
      notificationStore.addNotification('Toast 1', 'info', 0);
      notificationStore.addNotification('Toast 2', 'info', 0);
      notificationStore.addNotification('Toast 3', 'info', 0);
      notificationStore.addNotification('Toast 4', 'info', 0);

      const stateBefore = get(notificationStore);
      const firstId = stateBefore.notifications[0]?.id;

      if (firstId) {
        notificationStore.removeNotification(firstId);
      }

      const stateAfter = get(notificationStore);
      expect(stateAfter.notifications).toHaveLength(3);
      expect(stateAfter.notifications[2]?.message).toBe('Toast 4');
      expect(stateAfter.notificationQueue).toHaveLength(0);
    });

    it('should handle removing non-existent notification', () => {
      notificationStore.addNotification('Test', 'info', 0);
      notificationStore.removeNotification('non-existent-id');
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(1);
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications and queue', () => {
      notificationStore.addNotification('Toast 1', 'info', 0);
      notificationStore.addNotification('Toast 2', 'info', 0);
      notificationStore.addNotification('Toast 3', 'info', 0);
      notificationStore.addNotification('Toast 4', 'info', 0);

      notificationStore.clearNotifications();

      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      expect(state.notificationQueue).toHaveLength(0);
    });

    it('should clear timers when clearing notifications', () => {
      vi.useFakeTimers();
      notificationStore.addNotification('Test', 'info');
      notificationStore.clearNotifications();
      vi.advanceTimersByTime(10000);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      notificationStore.addNotification('Test', 'info', 0);
      notificationStore.reset();
      const state = get(notificationStore);
      expect(state.notifications).toEqual([]);
      expect(state.notificationQueue).toEqual([]);
    });

    it('should clear timers when resetting', () => {
      vi.useFakeTimers();
      notificationStore.addNotification('Test', 'info');
      notificationStore.reset();
      vi.advanceTimersByTime(10000);
      const state = get(notificationStore);
      expect(state.notifications).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  describe('notification types', () => {
    it('should add all toast types', () => {
      const types = [
        'info',
        'success',
        'warning',
        'decision',
        'threat',
        'incident',
        'breach',
        'system',
        'achievement',
      ] as const;

      types.forEach((type) => {
        const id = notificationStore.addNotification(`Test ${type}`, type, 0);
        const state = get(notificationStore);
        const allNotifs = [...state.notifications, ...state.notificationQueue];
        const notif = allNotifs.find((n) => n.id === id);
        expect(notif?.type).toBe(type);
      });
    });

    it('should add error toast type', () => {
      const id = notificationStore.addNotification('Error test', 'error', 0);
      const state = get(notificationStore);
      const allNotifs = [...state.notifications, ...state.notificationQueue];
      const notif = allNotifs.find((n) => n.id === id);
      expect(notif?.type).toBe('error');
    });
  });
});
