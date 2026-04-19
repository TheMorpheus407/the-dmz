import { describe, expect, it, vi } from 'vitest';

import {
  createSwipeHandler,
  type SwipeDirection,
  type SwipeConfig,
  type GestureState,
} from './swipe';

describe('swipe', () => {
  describe('createSwipeHandler', () => {
    it('detects swipe left', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).toHaveBeenCalledWith('left');
    });

    it('detects swipe right', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 170, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('detects swipe up', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 30 }],
      } as unknown as TouchEvent);

      expect(onSwipe).toHaveBeenCalledWith('up');
    });

    it('detects swipe down', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 170 }],
      } as unknown as TouchEvent);

      expect(onSwipe).toHaveBeenCalledWith('down');
    });

    it('does not trigger on small movement', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe, { minSwipeDistance: 50 });

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 120, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('does not trigger on slow movement', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe, { maxSwipeTime: 500 });

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(600);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      vi.useRealTimers();

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('resets state', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.reset();

      handler.onTouchEnd({
        changedTouches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('returns current position via getCurrentPosition', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      const position = handler.getCurrentPosition();
      expect(position.startX).toBe(100);
      expect(position.startY).toBe(100);
      expect(position.x).toBe(100);
      expect(position.y).toBe(100);
    });

    it('handles missing touch in onTouchStart gracefully', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('handles missing touch in onTouchEnd gracefully', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [],
      } as unknown as TouchEvent);

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('uses default config when no config provided', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe);

      expect(handler).toBeDefined();
    });

    it('allows custom config via partial config', () => {
      const onSwipe = vi.fn();
      const handler = createSwipeHandler(onSwipe, {
        minSwipeDistance: 100,
        maxSwipeTime: 1000,
      });

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd({
        changedTouches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(onSwipe).toHaveBeenCalledWith('left');
    });
  });

  describe('SwipeDirection type', () => {
    it('accepts valid directions', () => {
      const directions: SwipeDirection[] = ['left', 'right', 'up', 'down'];
      expect(directions).toBeDefined();
    });
  });

  describe('GestureState interface', () => {
    it('has required properties', () => {
      const state: GestureState = {
        startX: 0,
        startY: 0,
        startTime: 0,
      };
      expect(state.startX).toBe(0);
      expect(state.startY).toBe(0);
      expect(state.startTime).toBe(0);
    });
  });

  describe('SwipeConfig interface', () => {
    it('has required properties', () => {
      const config: SwipeConfig = {
        minSwipeDistance: 50,
        maxSwipeTime: 500,
      };
      expect(config.minSwipeDistance).toBe(50);
      expect(config.maxSwipeTime).toBe(500);
    });
  });
});
