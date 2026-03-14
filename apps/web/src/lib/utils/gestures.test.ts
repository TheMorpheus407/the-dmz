import { describe, expect, it, vi } from 'vitest';

import { createSwipeHandler, createTouchPanHandler } from './gestures';

describe('gestures', () => {
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
  });

  describe('createTouchPanHandler', () => {
    it('detects pan next', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).not.toHaveBeenCalled();
    });

    it('detects pan beyond threshold', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 50, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).toHaveBeenCalledWith('next');
    });

    it('detects pan prev', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 150, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).toHaveBeenCalledWith('prev');
    });

    it('resets state', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.reset();

      handler.onTouchEnd();

      expect(onPan).not.toHaveBeenCalled();
    });
  });
});
