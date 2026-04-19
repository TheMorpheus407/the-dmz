import { describe, expect, it, vi } from 'vitest';

import { createPinchZoomHandler, type PinchZoomConfig } from './pinch-zoom';

describe('pinch-zoom', () => {
  describe('createPinchZoomHandler', () => {
    it('detects pinch zoom in (scale > 1)', () => {
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

    it('detects pinch zoom out (scale < 1)', () => {
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
      expect(onZoomChange).toHaveBeenCalledWith(2.0);
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
      expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('resets state to scale 1', () => {
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

    it('initializes with scale 1', () => {
      const handler = createPinchZoomHandler({});
      expect(handler.getScale()).toBe(1);
    });

    it('does not zoom with single touch', () => {
      const onZoomChange = vi.fn();
      const handler = createPinchZoomHandler({ onZoomChange });

      handler.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(1);
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it('cleans up initialDistance on onTouchEnd', () => {
      const handler = createPinchZoomHandler({});

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchEnd();

      handler.onTouchMove({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(1);
    });

    it('handles missing touches gracefully in onTouchStart', () => {
      const handler = createPinchZoomHandler({});

      handler.onTouchStart({
        touches: [],
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(1);
    });

    it('handles missing touches gracefully in onTouchMove', () => {
      const handler = createPinchZoomHandler({});

      handler.onTouchStart({
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
      } as unknown as TouchEvent);

      handler.onTouchMove({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);

      expect(handler.getScale()).toBe(1);
    });
  });

  describe('PinchZoomConfig interface', () => {
    it('has required properties', () => {
      const config: PinchZoomConfig = {
        minScale: 0.5,
        maxScale: 3.0,
      };
      expect(config.minScale).toBe(0.5);
      expect(config.maxScale).toBe(3.0);
    });

    it('accepts optional onZoomChange callback', () => {
      const config: PinchZoomConfig = {
        minScale: 0.5,
        maxScale: 3.0,
        onZoomChange: vi.fn(),
      };
      expect(config.onZoomChange).toBeDefined();
    });
  });
});
