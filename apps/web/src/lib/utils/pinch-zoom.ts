export interface PinchZoomConfig {
  minScale: number;
  maxScale: number;
  onZoomChange?: (scale: number) => void;
}

const DEFAULT_PINCH_CONFIG: PinchZoomConfig = {
  minScale: 0.75,
  maxScale: 2.0,
};

export function createPinchZoomHandler(config: Partial<PinchZoomConfig> = {}) {
  const { minScale, maxScale, onZoomChange } = { ...DEFAULT_PINCH_CONFIG, ...config };
  let initialDistance: number | null = null;
  let initialScale: number = 1;
  let currentScale: number = 1;

  function getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return {
    onTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        if (touch1 && touch2) {
          initialDistance = getDistance(touch1, touch2);
          initialScale = currentScale;
        }
      }
    },

    onTouchMove(event: TouchEvent) {
      if (event.touches.length === 2 && initialDistance !== null) {
        event.preventDefault();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        if (touch1 && touch2) {
          const currentDistance = getDistance(touch1, touch2);
          const scale = (currentDistance / initialDistance) * initialScale;
          currentScale = Math.min(Math.max(scale, minScale), maxScale);
          onZoomChange?.(currentScale);
        }
      }
    },

    onTouchEnd() {
      initialDistance = null;
    },

    getScale(): number {
      return currentScale;
    },

    reset() {
      initialDistance = null;
      currentScale = 1;
      initialScale = 1;
    },
  };
}
