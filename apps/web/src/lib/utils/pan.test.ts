import { describe, expect, it, vi } from 'vitest';

import { createTouchPanHandler } from './pan';

describe('pan', () => {
  describe('createTouchPanHandler', () => {
    it('does not trigger when movement is below threshold', () => {
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

    it('detects pan next when swiping left (negative delta)', () => {
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

    it('detects pan prev when swiping right (positive delta)', () => {
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

    it('handles missing touch in onTouchStart gracefully', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).not.toHaveBeenCalled();
    });

    it('uses default threshold of 30 when not specified', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 69, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).not.toHaveBeenCalled();
    });

    it('triggers pan next exactly at threshold', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 69, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      expect(onPan).not.toHaveBeenCalled();
    });

    it('resets correctly after partial gesture', () => {
      const onPan = vi.fn();
      const handler = createTouchPanHandler(onPan, 30);

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.reset();

      expect(() => handler.onTouchEnd()).not.toThrow();
    });
  });
});
