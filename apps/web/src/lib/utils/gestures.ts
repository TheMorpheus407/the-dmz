export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface GestureState {
  startX: number;
  startY: number;
  startTime: number;
}

export interface SwipeConfig {
  minSwipeDistance: number;
  maxSwipeTime: number;
}

const DEFAULT_CONFIG: SwipeConfig = {
  minSwipeDistance: 50,
  maxSwipeTime: 500,
};

export function createSwipeHandler(
  onSwipe: (direction: SwipeDirection) => void,
  config: Partial<SwipeConfig> = {},
) {
  const { minSwipeDistance, maxSwipeTime } = { ...DEFAULT_CONFIG, ...config };
  let gestureState: GestureState | null = null;
  let currentX: number | null = null;
  let currentY: number | null = null;

  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      gestureState = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
      currentX = touch.clientX;
      currentY = touch.clientY;
    },

    onTouchMove(event: TouchEvent) {
      if (!gestureState) return;
      const touch = event.touches[0];
      if (!touch) return;
      currentX = touch.clientX;
      currentY = touch.clientY;
    },

    onTouchEnd(event: TouchEvent) {
      if (!gestureState) return;

      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - gestureState.startX;
      const deltaY = touch.clientY - gestureState.startY;
      const deltaTime = Date.now() - gestureState.startTime;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (
        deltaTime <= maxSwipeTime &&
        (absDeltaX >= minSwipeDistance || absDeltaY >= minSwipeDistance)
      ) {
        if (absDeltaX > absDeltaY) {
          onSwipe(deltaX > 0 ? 'right' : 'left');
        } else {
          onSwipe(deltaY > 0 ? 'down' : 'up');
        }
      }

      gestureState = null;
      currentX = null;
      currentY = null;
    },

    getCurrentPosition() {
      return {
        x: currentX,
        y: currentY,
        startX: gestureState?.startX,
        startY: gestureState?.startY,
      };
    },

    reset() {
      gestureState = null;
      currentX = null;
      currentY = null;
    },
  };
}

export function createTouchPanHandler(
  onPan: (direction: 'next' | 'prev') => void,
  threshold: number = 30,
) {
  let startX: number | null = null;
  let currentX: number | null = null;

  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      currentX = touch.clientX;
    },

    onTouchMove(event: TouchEvent) {
      if (startX === null) return;
      const touch = event.touches[0];
      if (!touch) return;
      currentX = touch.clientX;
    },

    onTouchEnd() {
      if (startX === null || currentX === null) return;

      const delta = currentX - startX;
      if (Math.abs(delta) >= threshold) {
        onPan(delta > 0 ? 'prev' : 'next');
      }

      startX = null;
      currentX = null;
    },

    reset() {
      startX = null;
      currentX = null;
    },
  };
}

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

export interface LongPressConfig {
  duration: number;
  onLongPress: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

export function createLongPressHandler(config: LongPressConfig) {
  const { duration, onLongPress, onPressStart, onPressEnd } = config;
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let isPressed: boolean = false;

  return {
    onTouchStart(_event: TouchEvent) {
      isPressed = true;
      onPressStart?.();
      pressTimer = setTimeout(() => {
        if (isPressed) {
          onLongPress();
          isPressed = false;
          onPressEnd?.();
        }
      }, duration);
    },

    onTouchEnd(_event: TouchEvent) {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (isPressed) {
        onPressEnd?.();
      }
      isPressed = false;
    },

    onTouchMove() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      isPressed = false;
      onPressEnd?.();
    },

    reset() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      isPressed = false;
    },
  };
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'error';

export function triggerHaptic(type: HapticType): boolean {
  if (typeof window === 'undefined' || !navigator.vibrate) {
    return false;
  }

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    error: [50, 30, 50],
  };

  navigator.vibrate(patterns[type]);
  return true;
}

export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof navigator.vibrate === 'function';
}
