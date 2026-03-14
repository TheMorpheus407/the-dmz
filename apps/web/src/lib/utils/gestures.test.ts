import { describe, expect, it, vi } from 'vitest';

import {
  createSwipeHandler,
  createTouchPanHandler,
  createPinchZoomHandler,
  createLongPressHandler,
  triggerHaptic,
  isHapticSupported,
} from './gestures';

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

  describe('createPinchZoomHandler', () => {
    it('detects pinch zoom in', () => {
      const onZoomChange = vi.fn();
      const handler = createPinchZoomHandler({ onZoomChange, minScale: 0.75, maxScale: 2.0 });

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(1.5);
      expect(onZoomChange).toHaveBeenCalledWith(1.5);
    });

    it('detects pinch zoom out', () => {
      const onZoomChange = vi.fn();
      const handler = createPinchZoomHandler({ onZoomChange, minScale: 0.75, maxScale: 2.0 });

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 175, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(0.75);
      expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('respects max scale limit', () => {
      const onZoomChange = vi.fn();
      const handler = createPinchZoomHandler({ onZoomChange, maxScale: 2.0 });

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 300, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(2.0);
    });

    it('respects min scale limit', () => {
      const onZoomChange = vi.fn();
      const handler = createPinchZoomHandler({ onZoomChange, minScale: 0.75 });

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 150, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(0.75);
    });

    it('resets state', () => {
      const handler = createPinchZoomHandler({});

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      handler.reset();

      expect(handler.getScale()).toBe(1);
    });
  });

  describe('createLongPressHandler', () => {
    it('triggers long press after duration', async () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(onLongPress).toHaveBeenCalled();
    });

    it('does not trigger on short press', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(400);
      handler.onTouchEnd({} as unknown as TouchEvent);
      vi.useRealTimers();

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('triggers onPressStart callback', () => {
      const onPressStart = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress: vi.fn(), onPressStart });

      handler.onTouchStart({} as unknown as TouchEvent);

      expect(onPressStart).toHaveBeenCalled();
    });

    it('cancels on touch move', () => {
      const onLongPress = vi.fn();
      const onPressEnd = vi.fn();
      const handler = createLongPressHandler({
        duration: 500,
        onLongPress,
        onPressEnd,
      });

      handler.onTouchStart({} as unknown as TouchEvent);

      handler.onTouchMove();

      vi.useFakeTimers();
      vi.advanceTimersByTime(500);
      vi.useRealTimers();

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onPressEnd).toHaveBeenCalled();
    });

    it('resets state', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      handler.reset();

      vi.useFakeTimers();
      vi.advanceTimersByTime(500);
      vi.useRealTimers();

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('haptic feedback', () => {
    it('returns false when vibrate is not supported', () => {
      const result = triggerHaptic('light');
      expect(result).toBe(false);
    });

    it('returns false when window is undefined', () => {
      const result = isHapticSupported();
      expect(result).toBe(false);
    });
  });
});
