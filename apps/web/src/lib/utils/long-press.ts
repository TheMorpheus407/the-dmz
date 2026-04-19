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
