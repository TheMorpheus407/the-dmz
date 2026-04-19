import { describe, expect, it, vi } from 'vitest';

import { createLongPressHandler, type LongPressConfig } from './long-press';

describe('long-press', () => {
  describe('createLongPressHandler', () => {
    it('triggers long press after duration', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(600);
      vi.useRealTimers();

      expect(onLongPress).toHaveBeenCalled();
    });

    it('does not trigger on short press (released before duration)', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(400);
      handler.onTouchEnd({} as unknown as TouchEvent);
      vi.useRealTimers();

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('triggers onPressStart callback immediately on touch start', () => {
      const onPressStart = vi.fn();
      const handler = createLongPressHandler({
        duration: 500,
        onLongPress: vi.fn(),
        onPressStart,
      });

      handler.onTouchStart({} as unknown as TouchEvent);

      expect(onPressStart).toHaveBeenCalled();
    });

    it('cancels long press on touch move', () => {
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

    it('resets state and cancels pending long press', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      handler.reset();

      vi.useFakeTimers();
      vi.advanceTimersByTime(500);
      vi.useRealTimers();

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('triggers onPressEnd on early release', () => {
      const onPressEnd = vi.fn();
      const handler = createLongPressHandler({
        duration: 500,
        onLongPress: vi.fn(),
        onPressEnd,
      });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(200);
      handler.onTouchEnd({} as unknown as TouchEvent);
      vi.useRealTimers();

      expect(onPressEnd).toHaveBeenCalled();
    });

    it('only triggers onLongPress once even if held beyond duration', () => {
      const onLongPress = vi.fn();
      const handler = createLongPressHandler({ duration: 500, onLongPress });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(600);
      vi.advanceTimersByTime(100);
      vi.useRealTimers();

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('handles touch move after long press is triggered', () => {
      const onLongPress = vi.fn();
      const onPressEnd = vi.fn();
      const handler = createLongPressHandler({
        duration: 500,
        onLongPress,
        onPressEnd,
      });

      handler.onTouchStart({} as unknown as TouchEvent);

      vi.useFakeTimers();
      vi.advanceTimersByTime(600);
      vi.useRealTimers();

      expect(onLongPress).toHaveBeenCalled();

      handler.onTouchMove();

      expect(onPressEnd).toHaveBeenCalled();
    });
  });

  describe('LongPressConfig interface', () => {
    it('requires duration and onLongPress', () => {
      const config: LongPressConfig = {
        duration: 500,
        onLongPress: vi.fn(),
      };
      expect(config.duration).toBe(500);
      expect(config.onLongPress).toBeDefined();
    });

    it('accepts optional onPressStart', () => {
      const config: LongPressConfig = {
        duration: 500,
        onLongPress: vi.fn(),
        onPressStart: vi.fn(),
      };
      expect(config.onPressStart).toBeDefined();
    });

    it('accepts optional onPressEnd', () => {
      const config: LongPressConfig = {
        duration: 500,
        onLongPress: vi.fn(),
        onPressEnd: vi.fn(),
      };
      expect(config.onPressEnd).toBeDefined();
    });
  });
});
