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

  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      gestureState = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
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
    },

    reset() {
      gestureState = null;
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
